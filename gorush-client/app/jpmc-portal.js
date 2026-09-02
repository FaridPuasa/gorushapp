// Role-scoped view of JPMC/PJSC pharmacy orders (product 'pharmacyjpmc') -
// replaces the manual "JPMC PJSC Forms.xlsx" workbook. `jpmc` role can edit
// the JPMC Pharmacy + JPMC Finance fields; `gorush` (and `admin`, for
// support) see the identical list read-only. Route access itself is gated
// globally by AdminGuard in app/_layout.js - this page assumes it's already
// been let through.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, TextInput, View, ActivityIndicator, Platform, ScrollView, Modal, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable } from '../lib/animations';

// This is a data-table page, not a form - the app's normal ~900px form
// column reads as a cramped single lane of text for a 10-column table plus a
// multi-section detail modal. Passed via PageScroll's `beforeContent` (see
// lib/formPrimitives.js), which renders outside the capped formWrapper, so
// only this page gets the wider column instead of changing the app-wide cap.
// Capped high enough (not '100%') that it stops growing on an ultra-wide
// monitor rather than stretching the table into unreadably long rows.
const WIDE_MAX_WIDTH = 1800;

const STATUS_OPTIONS = ['New Order', 'Entered', 'Pending Payment', 'Pending Query', 'Completed', 'Duplicate Order', 'Cancelled Order'];
const PATIENT_INFORMED_OPTIONS = ['Yes', 'No'];
const SEARCH_DEBOUNCE_MS = 400;
// "Current window" removed - staff triage across every window by default now
// (see the "In Process" tab below), so "All time" is the default/primary
// choice, with "Specific date" (the old per-cutover date tab) as the only
// other option.
const VIEW_MODES = [
  { value: 'all', label: 'All time' },
  { value: 'date', label: 'Specific date' },
];

// The 4 landing tabs - this is the primary way JPMC staff triage their queue,
// grouping orders into what still needs attention vs. what's done vs. what's
// dead. `statuses: null` means no filter (every status). "In Process" is a
// compound rule the server computes itself (tab=inProcess) rather than a
// plain status list - see routes/jpmc.js.
const TABS = [
  { key: 'inProcess', label: 'In Process', tabParam: 'inProcess' },
  { key: 'completed', label: 'Completed', statuses: ['Completed'] },
  { key: 'duplicateCancelled', label: 'Duplicate/Cancelled', statuses: ['Duplicate Order', 'Cancelled Order'] },
  { key: 'all', label: 'All', statuses: null },
];

// dd.mm.yyyy - display only, raw ISO stays untouched everywhere else.
function formatDMY(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

// 12-hour, e.g. "12:00pm" / "5:30am" - no leading zero on the hour.
function formatTime12(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}${ampm}`;
}

function formatDMYTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDMY(value)} ${formatTime12(value)}`;
}

function toDateOnly(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// Same pattern as admin.js's IsoDateField (not exported from there, so
// reimplemented locally rather than reaching into that file).
function DateField({ value, onChange, formStyles }) {
  const [show, setShow] = useState(false);
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value || ''}
        style={formStyles.webDatePicker}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <>
      <AnimatedPressable scaleTo={1.04} style={formStyles.datePickerButton} onPress={() => setShow(true)}>
        <Text style={formStyles.datePickerButtonText}>{value ? `📅 ${formatDMY(value)}` : 'Select date'}</Text>
      </AnimatedPressable>
      {show && (
        <DateTimePicker
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) onChange(selectedDate.toISOString().slice(0, 10));
          }}
        />
      )}
    </>
  );
}

const INACTIVE_GO_RUSH_STATUSES = ['completed', 'cancelled', 'disposed'];
function isActiveGoRushStatus(status) {
  return !INACTIVE_GO_RUSH_STATUSES.includes((status || '').toLowerCase());
}

// Days since submission - only meaningful while the job is still moving;
// a completed/cancelled/disposed job's age stops mattering once it's done.
function formatAgingDays(order) {
  if (!isActiveGoRushStatus(order.goRushStatus)) return '—';
  const submitted = new Date(order.dateTimeSubmission);
  if (Number.isNaN(submitted.getTime())) return '—';
  const days = Math.max(Math.floor((Date.now() - submitted.getTime()) / 86400000), 0);
  return `${days}d`;
}

function goRushStatusBadgeColors(status, colors) {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return { bg: colors.primaryLight || '#e6f4ea', fg: colors.primary };
  if (s === 'cancelled' || s === 'disposed') return { bg: colors.errorLight || '#fdecea', fg: colors.error };
  if (s === 'out for delivery') return { bg: '#fdf1e3', fg: '#e67e22' };
  if (s === 'at warehouse') return { bg: '#eee6fb', fg: '#7c4dff' };
  return { bg: colors.subtleBackground || colors.background, fg: colors.textSecondary };
}

const COLUMNS = [
  { key: 'processDate', label: 'Process Date', width: 120 },
  { key: 'dateTimeSubmission', label: 'Date/Time Submitted', width: 170 },
  { key: 'aging', label: 'Aging (Days)', width: 100 },
  { key: 'doTrackingNumber', label: 'Tracking No.', width: 130 },
  { key: 'jobMethod', label: 'Delivery Type', width: 170, wrap: true },
  { key: 'receiverName', label: 'Name', width: 170, bold: true },
  { key: 'patientNumber', label: 'Patient No.', width: 110 },
  { key: 'receiverAddress', label: 'Address', width: 240, wrap: true },
  { key: 'appointmentPlace', label: 'Location', width: 90 },
  { key: 'remarks', label: 'Remarks', width: 180, wrap: true },
  { key: 'jpmcPharmacyStatus', label: 'JPMC Pharmacy Status', width: 170, bold: true },
  { key: 'goRushStatus', label: 'GO RUSH Status', width: 150, badge: true },
];
// A dedicated Actions column (rather than making the whole row tappable) so
// scrolling through a long list can't accidentally open a detail card - only
// the explicit View button does that.
const ACTIONS_WIDTH = 90;
const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0) + ACTIONS_WIDTH;

function OrderTableRow({ order, onView, colors, isLast, isEven, scaleFont }) {
  return (
    <View
      style={{
        flexDirection: 'row', width: TABLE_WIDTH, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'flex-start',
        backgroundColor: isEven ? colors.subtleBackground : 'transparent',
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border,
      }}
    >
      <View style={{ width: ACTIONS_WIDTH }}>
        <AnimatedPressable
          scaleTo={1.05}
          onPress={onView}
          style={{
            flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4,
            paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
            backgroundColor: colors.subtleBackground, borderWidth: 1, borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: scaleFont(13) }}>👁️</Text>
          <Text style={{ fontSize: scaleFont(12), fontWeight: '700', color: colors.textPrimary }}>View</Text>
        </AnimatedPressable>
      </View>
      {COLUMNS.map((c) => {
        if (c.badge) {
          const badge = goRushStatusBadgeColors(order[c.key], colors);
          return (
            <View key={c.key} style={{ width: c.width }}>
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: badge.bg }}>
                <Text style={{ fontSize: scaleFont(12), fontWeight: '700', color: badge.fg }}>{order[c.key] || '—'}</Text>
              </View>
            </View>
          );
        }
        const value = c.key === 'dateTimeSubmission'
          ? formatDMYTime(order[c.key])
          : c.key === 'processDate'
            ? formatDMY(order[c.key])
            : c.key === 'aging'
              ? formatAgingDays(order)
              : c.key === 'jpmcPharmacyStatus'
                ? (order[c.key] || 'New Order')
                : (order[c.key] || '—');
        return (
          <Text
            key={c.key}
            style={{ width: c.width, paddingRight: 8, fontSize: scaleFont(13), color: colors.textPrimary, fontWeight: c.bold ? '600' : '400' }}
            numberOfLines={c.wrap ? undefined : 1}
          >
            {value}
          </Text>
        );
      })}
    </View>
  );
}

function OrderTable({ orders, onSelect, colors, scaleFont }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      style={{ marginBottom: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}
    >
      <View style={{ width: TABLE_WIDTH, backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, backgroundColor: colors.subtleBackground, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ width: ACTIONS_WIDTH, fontSize: scaleFont(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Actions
          </Text>
          {COLUMNS.map((c) => (
            <Text key={c.key} style={{ width: c.width, paddingRight: 8, fontSize: scaleFont(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {c.label}
            </Text>
          ))}
        </View>
        {orders.map((order, i) => (
          <OrderTableRow
            key={order.id}
            order={order}
            onView={() => onSelect(order)}
            colors={colors}
            isLast={i === orders.length - 1}
            isEven={i % 2 === 1}
            scaleFont={scaleFont}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// Bordered, softly-tinted box grouping related fields under an uppercase label -
// matches gorushfmxupdate's "Tracking Number Search" result card (Shipment Info /
// Customer Info / Payment / etc. sections), just built with RN primitives here.
function Section({ icon, title, children, colors, scaleFont, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.subtleBackground || colors.background,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 12,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
        {icon} {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 12 }}>
        {children}
      </View>
    </View>
  );
}

// One label/value pair within a Section - the small uppercase grey label over a
// bold value, same convention as the reference tracking-search card's grid.
function DetailField({ label, value, minWidth = 140, colors, scaleFont }) {
  return (
    // flexShrink + maxWidth stop a long value (a full address, a long name)
    // from growing the box past the section's width - without them a plain
    // flexGrow item keeps expanding to fit its unwrapped text instead of
    // wrapping, and the whole card overflows sideways.
    <View style={{ minWidth, maxWidth: '100%', flexGrow: 1, flexShrink: 1 }}>
      <Text style={{ fontSize: scaleFont(10), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>
        {label}
      </Text>
      <Text style={{ fontSize: scaleFont(14), fontWeight: '600', color: colors.textPrimary, flexShrink: 1 }}>{value ?? '—'}</Text>
    </View>
  );
}

// GO RUSH status timeline - same OrderHistory data grfmxstatusupdate's own Search
// Jobs page renders, just drawn with RN primitives (dot + connector line per step,
// latest entry marked "Current").
const HISTORY_STEP_WIDTH = 160;

function StatusHistoryTimeline({ history, colors, scaleFont }) {
  if (!history || history.length === 0) return null;
  return (
    <Section icon="🕒" title="GO RUSH Status History" colors={colors} scaleFont={scaleFont}>
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ width: '100%' }}>
        <View style={{ flexDirection: 'row' }}>
          {history.map((h, i) => {
            const isCurrent = i === history.length - 1;
            const badge = goRushStatusBadgeColors(h.status, colors);
            return (
              <View key={i} style={{ width: HISTORY_STEP_WIDTH }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 14, height: 14, borderRadius: 7,
                      backgroundColor: isCurrent ? badge.fg : colors.card,
                      borderWidth: 2, borderColor: isCurrent ? badge.fg : colors.border,
                    }}
                  />
                  {i < history.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: colors.border, marginLeft: 2 }} />}
                </View>
                <View style={{ paddingTop: 8, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: scaleFont(13), fontWeight: '700', color: isCurrent ? badge.fg : colors.textPrimary }}>
                      {h.status || '—'}
                    </Text>
                    {isCurrent && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: badge.bg }}>
                        <Text style={{ fontSize: scaleFont(10), fontWeight: '700', color: badge.fg }}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: scaleFont(12), color: colors.textMuted, marginTop: 2 }}>{formatDMYTime(h.dateUpdated)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Section>
  );
}

// Full-detail card shown inside the modal when a row is tapped - both the
// read-only context (submission info, address, remarks from patient) and the
// 5 JPMC-owned editable fields, in one place.
function OrderDetail({ order, canEdit, authHeader, onSaved, onClose, formStyles, colors, scaleFont }) {
  const [status, setStatus] = useState(order.jpmcPharmacyStatus || 'New Order');
  const [patientInformed, setPatientInformed] = useState(order.jpmcPatientInformed || '');
  const [remarks, setRemarks] = useState(order.jpmcPharmacyRemarks || '');
  const [totalAmount, setTotalAmount] = useState(order.jpmcTotalAmount || '');
  const [dateReceived, setDateReceived] = useState(toDateOnly(order.jpmcFinanceDateReceived));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const dirty = (
    status !== (order.jpmcPharmacyStatus || 'New Order')
    || patientInformed !== (order.jpmcPatientInformed || '')
    || remarks !== (order.jpmcPharmacyRemarks || '')
    || totalAmount !== (order.jpmcTotalAmount || '')
    || dateReceived !== toDateOnly(order.jpmcFinanceDateReceived)
  );

  const save = async () => {
    if (totalAmount && !Number.isFinite(Number(totalAmount))) {
      setError('Total $ must be a number.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.patch(`/api/jpmc/orders/${order.id}`, {
        jpmcPharmacyStatus: status,
        jpmcPatientInformed: patientInformed,
        jpmcPharmacyRemarks: remarks,
        jpmcTotalAmount: totalAmount === '' ? null : Number(totalAmount),
        jpmcFinanceDateReceived: dateReceived || null,
      }, { headers: authHeader });
      onSaved(order.id, res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const badge = goRushStatusBadgeColors(order.goRushStatus, colors);

  return (
    <View style={{ maxHeight: '100%' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: scaleFont(18), fontWeight: '700', color: colors.textPrimary }}>{order.doTrackingNumber || 'No tracking yet'}</Text>
          <View style={{ alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: badge.bg }}>
            <Text style={{ fontSize: scaleFont(12), fontWeight: '700', color: badge.fg }}>{order.goRushStatus || '—'}</Text>
          </View>
        </View>
        <AnimatedPressable scaleTo={1.1} onPress={onClose} style={{ padding: 4 }}>
          <Text style={{ fontSize: scaleFont(18), color: colors.textMuted }}>✕</Text>
        </AnimatedPressable>
      </View>
      <ScrollView>
        <Section icon="📦" title="Order Info" colors={colors} scaleFont={scaleFont}>
          <DetailField label="Process Date" value={formatDMY(order.processDate)} colors={colors} scaleFont={scaleFont} />
          <DetailField label="Date/Time Submitted" value={formatDMYTime(order.dateTimeSubmission)} colors={colors} scaleFont={scaleFont} />
          {isActiveGoRushStatus(order.goRushStatus) && (
            <DetailField label="Aging" value={formatAgingDays(order)} colors={colors} scaleFont={scaleFont} />
          )}
          <DetailField label="Payment Method" value={order.paymentMethod} colors={colors} scaleFont={scaleFont} />
          <DetailField label="Delivery Type" value={order.jobMethod} colors={colors} scaleFont={scaleFont} />
          <DetailField label="Total Price" value={order.totalPrice ? `$${order.totalPrice}` : null} colors={colors} scaleFont={scaleFont} />
        </Section>

        <Section icon="👤" title="Customer Info" colors={colors} scaleFont={scaleFont}>
          <DetailField label="Name" value={order.receiverName} minWidth={180} colors={colors} scaleFont={scaleFont} />
          <DetailField label="Patient No." value={order.patientNumber} colors={colors} scaleFont={scaleFont} />
          <DetailField label="Location" value={order.appointmentPlace} colors={colors} scaleFont={scaleFont} />
          <DetailField label="Main Phone No." value={order.receiverPhoneNumber} colors={colors} scaleFont={scaleFont} />
          <DetailField label="Additional Phone No." value={order.additionalPhoneNumber} colors={colors} scaleFont={scaleFont} />
          <DetailField label="Customer Address" value={order.receiverAddress} minWidth={260} colors={colors} scaleFont={scaleFont} />
        </Section>

        <Section icon="💬" title="Remarks" colors={colors} scaleFont={scaleFont}>
          <DetailField label="Customer Remarks" value={order.remarks} minWidth={260} colors={colors} scaleFont={scaleFont} />
        </Section>

        <Section icon="💊" title="JPMC Pharmacy" colors={colors} scaleFont={scaleFont}>
          <View style={{ width: '100%', flexDirection: 'row', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <View style={[formStyles.pickerContainer, { flex: 1, minWidth: 160 }]}>
              <Picker enabled={canEdit} style={formStyles.pickerControl} selectedValue={status} onValueChange={setStatus}>
                {STATUS_OPTIONS.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
              </Picker>
            </View>
            <View style={[formStyles.pickerContainer, { flex: 1, minWidth: 140 }]}>
              <Picker enabled={canEdit} style={formStyles.pickerControl} selectedValue={patientInformed} onValueChange={setPatientInformed}>
                <Picker.Item label="Patient Informed?" value="" />
                {PATIENT_INFORMED_OPTIONS.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
              </Picker>
            </View>
          </View>
          <TextInput
            style={[formStyles.input, { width: '100%', marginBottom: 10 }]}
            placeholder="Remarks from Pharmacy"
            placeholderTextColor={colors.textMuted}
            value={remarks}
            onChangeText={setRemarks}
            editable={canEdit}
            multiline
          />
          <TextInput
            style={[formStyles.input, { width: 120, marginBottom: 0 }]}
            placeholder="Total $"
            placeholderTextColor={colors.textMuted}
            value={String(totalAmount)}
            onChangeText={setTotalAmount}
            editable={canEdit}
            keyboardType="numeric"
          />
        </Section>

        <Section icon="🧾" title="JPMC Finance" colors={colors} scaleFont={scaleFont}>
          <View>
            <Text style={{ fontSize: scaleFont(10), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
              Date Received
            </Text>
            {canEdit ? (
              <DateField value={dateReceived} onChange={setDateReceived} formStyles={formStyles} />
            ) : (
              <Text style={{ fontSize: scaleFont(14), fontWeight: '600', color: colors.textPrimary }}>{dateReceived ? formatDMY(dateReceived) : '—'}</Text>
            )}
          </View>
        </Section>

        <StatusHistoryTimeline history={order.goRushStatusHistory} colors={colors} scaleFont={scaleFont} />

        {error ? <Text style={formStyles.fieldError}>{error}</Text> : null}
        {canEdit && (
          <AnimatedPressable
            scaleTo={1.03}
            style={[formStyles.button, { alignSelf: 'flex-start', paddingHorizontal: 24, marginTop: 4 }, (!dirty || saving) && formStyles.buttonDisabled]}
            onPress={save}
            disabled={!dirty || saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>{saved ? 'Saved' : 'Save'}</Text>}
          </AnimatedPressable>
        )}
      </ScrollView>
    </View>
  );
}

// Builds a compact page-number list with '...' gaps, e.g. for page 8 of 66:
// [1, '...', 7, 8, 9, '...', 66] - so the pager stays a fixed, scannable
// width regardless of how many total pages there are.
function buildPageList(current, total) {
  if (total <= 1) return [1];
  const delta = 1;
  const pages = [1];
  if (current - delta > 2) pages.push('…');
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) pages.push(i);
  if (current + delta < total - 1) pages.push('…');
  if (total > 1) pages.push(total);
  return pages;
}

function PagerButton({ label, active, disabled, onPress, colors, scaleFont }) {
  return (
    <AnimatedPressable
      scaleTo={disabled ? 1 : 1.08}
      onPress={disabled ? undefined : onPress}
      style={{
        minWidth: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
        backgroundColor: active ? colors.primary : 'transparent',
        borderWidth: active ? 0 : 1, borderColor: colors.border,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontWeight: '700', fontSize: scaleFont(13), color: active ? '#fff' : colors.textPrimary }}>{label}</Text>
    </AnimatedPressable>
  );
}

// Numbered pager with first/prev/next/last jumps plus a "go to page" box -
// a flat Previous/Next pair makes reaching page 40 of 66 take 39 taps.
function Pagination({ page, totalPages, onChange, colors, formStyles, scaleFont }) {
  const [jumpValue, setJumpValue] = useState('');
  const pages = useMemo(() => buildPageList(page, totalPages), [page, totalPages]);

  const jump = () => {
    const n = parseInt(jumpValue, 10);
    if (Number.isFinite(n) && n >= 1 && n <= totalPages) onChange(n);
    setJumpValue('');
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
      <PagerButton label="«" disabled={page <= 1} onPress={() => onChange(1)} colors={colors} scaleFont={scaleFont} />
      <PagerButton label="‹" disabled={page <= 1} onPress={() => onChange(page - 1)} colors={colors} scaleFont={scaleFont} />
      {pages.map((p, i) => (
        p === '…'
          ? <Text key={`gap-${i}`} style={{ paddingHorizontal: 4, color: colors.textMuted, fontSize: scaleFont(13) }}>…</Text>
          : <PagerButton key={p} label={String(p)} active={p === page} onPress={() => onChange(p)} colors={colors} scaleFont={scaleFont} />
      ))}
      <PagerButton label="›" disabled={page >= totalPages} onPress={() => onChange(page + 1)} colors={colors} scaleFont={scaleFont} />
      <PagerButton label="»" disabled={page >= totalPages} onPress={() => onChange(totalPages)} colors={colors} scaleFont={scaleFont} />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12, gap: 6 }}>
        <Text style={{ fontSize: scaleFont(12), color: colors.textSecondary }}>Go to page</Text>
        <TextInput
          style={[formStyles.input, { width: 56, marginBottom: 0, paddingVertical: 6, textAlign: 'center' }]}
          value={jumpValue}
          onChangeText={setJumpValue}
          onSubmitEditing={jump}
          keyboardType="numeric"
          placeholder={String(page)}
          placeholderTextColor={colors.textMuted}
        />
        <AnimatedPressable scaleTo={1.05} onPress={jump} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.subtleBackground }}>
          <Text style={{ fontWeight: '600', fontSize: scaleFont(12), color: colors.textPrimary }}>Go</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

export default function JpmcPortal() {
  const { token, isJpmc } = useAuth();
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const formStyles = useFormStyles();
  const authHeader = { Authorization: `Bearer ${token}` };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('inProcess');
  const [viewMode, setViewMode] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  // Set either from tapping a table row (the matching object from `data.orders`)
  // or from the tracking-number lookup below (a standalone fetch, independent
  // of whatever tab/window is currently selected) - so it holds the full order
  // object directly rather than just an id to look up.
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Any filter/view change should jump back to page 1 of "All time" - a stale
  // page number from a previous, larger result set could land past the end.
  useEffect(() => { setPage(1); }, [activeTab, viewMode, dateFilter, search]);

  const activeTabDef = TABS.find((t) => t.key === activeTab) || TABS[0];

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    if (viewMode === 'date' && !dateFilter) return;
    setLoading(true);
    setError(null);
    try {
      const params = { view: viewMode };
      if (search) params.search = search;
      if (activeTabDef.tabParam) params.tab = activeTabDef.tabParam;
      else if (activeTabDef.statuses) params.pharmacyStatus = activeTabDef.statuses.join(',');
      if (viewMode === 'date') params.date = dateFilter;
      if (viewMode === 'all') params.page = page;
      const res = await api.get('/api/jpmc/orders', { headers: authHeader, params });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load JPMC orders.');
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, viewMode, dateFilter, page, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleSaved = (id, updatedOrder) => {
    setData((prev) => (prev ? { ...prev, orders: prev.orders.map((o) => (o.id === id ? updatedOrder : o)) } : prev));
    // Keep the open modal in sync too - it may be showing a tracking-lookup
    // result that isn't part of `data.orders` at all.
    setSelectedOrder((prev) => (prev && prev.id === id ? updatedOrder : prev));
  };

  // Quick tracking-number lookup (same idea as gorushfmxupdate's dashboard search) -
  // independent of whatever tab/window/page is currently selected, so staff can jump
  // straight to one order's card without hunting for it in the table.
  const handleTrackingLookup = async () => {
    const query = trackingQuery.trim();
    if (!query) return;
    setTrackingLoading(true);
    setTrackingError('');
    try {
      const res = await api.get('/api/jpmc/orders', { headers: authHeader, params: { view: 'all', search: query, limit: 5 } });
      const match = res.data.orders.find((o) => (o.doTrackingNumber || '').toLowerCase() === query.toLowerCase()) || res.data.orders[0];
      if (match) {
        setSelectedOrder(match);
      } else {
        setTrackingError(`No JPMC order found for "${query}".`);
      }
    } catch (e) {
      setTrackingError(e.response?.data?.error || 'Lookup failed.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const subtitle = viewMode === 'all'
    ? 'All JPMC/PJSC orders, newest first'
    : data ? `Processing window: ${formatDMYTime(data.from)} — ${formatDMYTime(data.to)}` : 'Loading…';

  const captionStyle = { fontSize: scaleFont(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 };

  const pageContent = (
    <View style={{ width: '100%', maxWidth: WIDE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24 }}>
      <Text style={[formStyles.title, { fontSize: scaleFont(26) }]}>JPMC Pharmacy Orders</Text>
      <Text style={[formStyles.subtitle, { fontSize: scaleFont(14) }]}>{subtitle}</Text>

      {/* Same idea as gorushfmxupdate's dashboard tracking search - a direct lookup that
          pops the order straight into the detail card, bypassing whatever tab/window/page
          is currently selected in the table below. */}
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <Text style={captionStyle}>Search Tracking Number</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            style={[formStyles.input, { flex: 1, marginBottom: 0, fontSize: scaleFont(14) }]}
            value={trackingQuery}
            onChangeText={(v) => { setTrackingQuery(v); if (trackingError) setTrackingError(''); }}
            onSubmitEditing={handleTrackingLookup}
            placeholder="e.g. GR200056701JP"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />
          <AnimatedPressable
            scaleTo={1.03}
            onPress={handleTrackingLookup}
            disabled={trackingLoading || !trackingQuery.trim()}
            style={[
              { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
              (trackingLoading || !trackingQuery.trim()) && { opacity: 0.5 },
            ]}
          >
            {trackingLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: scaleFont(13) }}>Search</Text>}
          </AnimatedPressable>
        </View>
        {trackingError ? <Text style={[formStyles.fieldError, { marginTop: 8, marginBottom: 0 }]}>{trackingError}</Text> : null}
      </View>

      {/* One bordered panel groups every filter, visually separate from the table below.
          The two filter rows are deliberately styled differently - solid pills for STATUS
          (the primary, always-visible triage) vs. a light segmented control for TIME RANGE
          (secondary, changed less often) - so they read as two distinct kinds of choice
          rather than one long run of identical-looking buttons. */}
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <Text style={captionStyle}>Status</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <AnimatedPressable
              key={t.key}
              scaleTo={1.03}
              onPress={() => setActiveTab(t.key)}
              style={[
                { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
                activeTab === t.key && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={{ fontWeight: '700', fontSize: scaleFont(13), color: activeTab === t.key ? '#fff' : colors.textPrimary }}>
                {t.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        <Text style={captionStyle}>Time Range</Text>
        <View style={{ flexDirection: 'row', backgroundColor: colors.subtleBackground, borderRadius: 10, padding: 4, marginBottom: 14, alignSelf: 'flex-start' }}>
          {VIEW_MODES.map((m) => (
            <AnimatedPressable
              key={m.value}
              scaleTo={1.02}
              onPress={() => setViewMode(m.value)}
              style={[
                { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 8 },
                viewMode === m.value && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
              ]}
            >
              <Text style={{ fontWeight: '600', fontSize: scaleFont(12), color: viewMode === m.value ? colors.primary : colors.textSecondary }}>
                {m.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        {viewMode === 'date' && (
          <View style={{ marginBottom: 14 }}>
            <DateField value={dateFilter} onChange={setDateFilter} formStyles={formStyles} />
          </View>
        )}

        <Text style={captionStyle}>Search</Text>
        <TextInput
          style={[formStyles.input, { marginBottom: 0, fontSize: scaleFont(14) }]}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by patient name, patient number, or tracking number"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {loading && (
        <View style={{ paddingVertical: 30, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {!loading && error && (
        <View style={[formStyles.statusBanner, formStyles.statusErrorBanner]}>
          <Text style={formStyles.statusTextError}>⚠️  {error}</Text>
        </View>
      )}

      {!loading && !error && data?.orders.length === 0 && (
        <Card icon="📭" title="No orders found">
          <Text style={formStyles.bodyText}>Nothing matches the current tab/filters.</Text>
        </Card>
      )}

      {!loading && !error && data?.orders.length > 0 && (
        <OrderTable orders={data.orders} onSelect={setSelectedOrder} colors={colors} scaleFont={scaleFont} />
      )}

      {!loading && !error && viewMode === 'all' && data && data.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          onChange={setPage}
          colors={colors}
          formStyles={formStyles}
          scaleFont={scaleFont}
        />
      )}
    </View>
  );

  return (
    <>
      <PageScroll title="JPMC Pharmacy Orders" beforeContent={pageContent} />

      <Modal visible={!!selectedOrder} transparent animationType="fade" onRequestClose={() => setSelectedOrder(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}
          onPress={() => setSelectedOrder(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 820, maxHeight: '92%' }}
          >
            {selectedOrder && (
              <OrderDetail
                order={selectedOrder}
                canEdit={isJpmc}
                authHeader={authHeader}
                onSaved={handleSaved}
                onClose={() => setSelectedOrder(null)}
                formStyles={formStyles}
                colors={colors}
                scaleFont={scaleFont}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
