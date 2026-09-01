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
// column reads as a cramped single lane of text for a 7-column table plus a
// multi-section detail modal. Passed via PageScroll's `beforeContent` (see
// lib/formPrimitives.js), which renders outside the capped formWrapper, so
// only this page gets the wider column instead of changing the app-wide cap.
const WIDE_MAX_WIDTH = 1300;

const STATUS_OPTIONS = ['New Order', 'Entered', 'Pending Payment', 'Pending Query', 'Completed', 'Duplicate Order', 'Cancelled Order'];
const PATIENT_INFORMED_OPTIONS = ['Yes', 'No'];
// currentStatus values actually set by grfmxstatusupdate's Detrack sync - shown verbatim
// under "GO RUSH STATUS", no renaming. Trimmed to the statuses JPMC staff actually care
// about tracking against (the warehouse-internal ones - Queued for Warehouse, Return,
// Custom Clearing, On Hold, Disposed - aren't useful filter targets for them).
const GO_RUSH_STATUS_OPTIONS = [
  'Info Received', 'At Warehouse', 'Out for Delivery', 'Return to Warehouse', 'Self Collect', 'Completed', 'Cancelled',
];
const SEARCH_DEBOUNCE_MS = 400;
const VIEW_MODES = [
  { value: 'window', label: 'Current window' },
  { value: 'date', label: 'Specific date' },
  { value: 'all', label: 'All time' },
];

// The 4 landing tabs - this is the primary way JPMC staff triage their queue,
// grouping the 7 possible pharmacy statuses into what still needs attention
// vs. what's done vs. what's dead. `statuses: null` means no filter (every
// status, including any legacy row that predates this feature entirely).
const TABS = [
  { key: 'inProcess', label: 'In Process', statuses: ['New Order', 'Pending Query', 'Pending Payment', 'Entered'] },
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

function goRushStatusBadgeColors(status, colors) {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return { bg: colors.primaryLight || '#e6f4ea', fg: colors.primary };
  if (s === 'cancelled' || s === 'disposed') return { bg: colors.errorLight || '#fdecea', fg: colors.error };
  if (s === 'out for delivery') return { bg: '#fdf1e3', fg: '#e67e22' };
  if (s === 'at warehouse') return { bg: '#eee6fb', fg: '#7c4dff' };
  return { bg: colors.subtleBackground || colors.background, fg: colors.textSecondary };
}

const COLUMNS = [
  { key: 'dateTimeSubmission', label: 'Date/Time Submitted', width: 170 },
  { key: 'doTrackingNumber', label: 'Tracking No.', width: 130 },
  { key: 'receiverName', label: 'Name', width: 190 },
  { key: 'patientNumber', label: 'Patient No.', width: 110 },
  { key: 'appointmentPlace', label: 'Location', width: 90 },
  { key: 'jpmcPharmacyStatus', label: 'JPMC Pharmacy Status', width: 170 },
  { key: 'goRushStatus', label: 'GO RUSH Status', width: 150 },
];
const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

function OrderTableRow({ order, onPress, colors, isLast, scaleFont }) {
  const badge = goRushStatusBadgeColors(order.goRushStatus, colors);
  return (
    <AnimatedPressable
      scaleTo={1}
      onPress={onPress}
      style={{
        flexDirection: 'row', width: TABLE_WIDTH, paddingVertical: 12, alignItems: 'center',
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border,
      }}
    >
      <Text style={{ width: COLUMNS[0].width, fontSize: scaleFont(13), color: colors.textPrimary }}>{formatDMYTime(order.dateTimeSubmission)}</Text>
      <Text style={{ width: COLUMNS[1].width, fontSize: scaleFont(13), color: colors.textPrimary }}>{order.doTrackingNumber || '—'}</Text>
      <Text style={{ width: COLUMNS[2].width, fontSize: scaleFont(13), color: colors.textPrimary, fontWeight: '600' }} numberOfLines={1}>{order.receiverName || '—'}</Text>
      <Text style={{ width: COLUMNS[3].width, fontSize: scaleFont(13), color: colors.textPrimary }}>{order.patientNumber || '—'}</Text>
      <Text style={{ width: COLUMNS[4].width, fontSize: scaleFont(13), color: colors.textPrimary }}>{order.appointmentPlace || '—'}</Text>
      <Text style={{ width: COLUMNS[5].width, fontSize: scaleFont(13), color: colors.textPrimary, fontWeight: '600' }}>{order.jpmcPharmacyStatus || 'New Order'}</Text>
      <View style={{ width: COLUMNS[6].width }}>
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: badge.bg }}>
          <Text style={{ fontSize: scaleFont(12), fontWeight: '700', color: badge.fg }}>{order.goRushStatus || '—'}</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function OrderTable({ orders, onSelect, colors, scaleFont }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginBottom: 16 }}>
      <View style={{ width: TABLE_WIDTH }}>
        <View style={{ flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: colors.border }}>
          {COLUMNS.map((c) => (
            <Text key={c.key} style={{ width: c.width, fontSize: scaleFont(12), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>
              {c.label}
            </Text>
          ))}
        </View>
        {orders.map((order, i) => (
          <OrderTableRow key={order.id} order={order} onPress={() => onSelect(order.id)} colors={colors} isLast={i === orders.length - 1} scaleFont={scaleFont} />
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
    <View style={{ minWidth, flexGrow: 1 }}>
      <Text style={{ fontSize: scaleFont(10), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>
        {label}
      </Text>
      <Text style={{ fontSize: scaleFont(14), fontWeight: '600', color: colors.textPrimary }}>{value ?? '—'}</Text>
    </View>
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
          <DetailField label="Date/Time Submitted" value={formatDMYTime(order.dateTimeSubmission)} colors={colors} scaleFont={scaleFont} />
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

        {order.remarks ? (
          <Section icon="💬" title="Remarks from Patient" colors={colors} scaleFont={scaleFont}>
            <DetailField label="Remarks" value={order.remarks} minWidth={260} colors={colors} scaleFont={scaleFont} />
          </Section>
        ) : null}

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
  const [viewMode, setViewMode] = useState('window');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [goRushStatusFilter, setGoRushStatusFilter] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Any filter/view change should jump back to page 1 of "All time" - a stale
  // page number from a previous, larger result set could land past the end.
  useEffect(() => { setPage(1); }, [activeTab, viewMode, dateFilter, search, goRushStatusFilter]);

  const activeTabDef = TABS.find((t) => t.key === activeTab) || TABS[0];

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    if (viewMode === 'date' && !dateFilter) return;
    setLoading(true);
    setError(null);
    try {
      const params = { view: viewMode };
      if (search) params.search = search;
      if (activeTabDef.statuses) params.pharmacyStatus = activeTabDef.statuses.join(',');
      if (goRushStatusFilter) params.goRushStatus = goRushStatusFilter;
      if (viewMode === 'date') params.date = dateFilter;
      if (viewMode === 'all') params.page = page;
      const res = await api.get('/api/jpmc/orders', { headers: authHeader, params });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load JPMC orders.');
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, viewMode, dateFilter, page, search, goRushStatusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleSaved = (id, updatedOrder) => {
    setData((prev) => (prev ? { ...prev, orders: prev.orders.map((o) => (o.id === id ? updatedOrder : o)) } : prev));
  };

  const selectedOrder = useMemo(
    () => data?.orders.find((o) => o.id === selectedOrderId) || null,
    [data, selectedOrderId]
  );

  const subtitle = viewMode === 'all'
    ? 'All JPMC/PJSC orders, newest first'
    : data ? `Processing window: ${formatDMYTime(data.from)} — ${formatDMYTime(data.to)}` : 'Loading…';

  const pageContent = (
    <View style={{ width: '100%', maxWidth: WIDE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24 }}>
      <Text style={[formStyles.title, { fontSize: scaleFont(26) }]}>JPMC Pharmacy Orders</Text>
      <Text style={[formStyles.subtitle, { fontSize: scaleFont(14) }]}>{subtitle}</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
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

      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {VIEW_MODES.map((m) => (
            <AnimatedPressable
              key={m.value}
              scaleTo={1.03}
              onPress={() => setViewMode(m.value)}
              style={[
                { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
                viewMode === m.value && { backgroundColor: colors.subtleBackground, borderColor: colors.primary },
              ]}
            >
              <Text style={{ fontWeight: '600', fontSize: scaleFont(12), color: viewMode === m.value ? colors.primary : colors.textSecondary }}>
                {m.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        {viewMode === 'date' && (
          <View style={{ marginBottom: 12 }}>
            <DateField value={dateFilter} onChange={setDateFilter} formStyles={formStyles} />
          </View>
        )}

        <TextInput
          style={[formStyles.input, { marginBottom: 10, fontSize: scaleFont(14) }]}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by patient name, patient number, or tracking number"
          placeholderTextColor={colors.textMuted}
        />

        <View style={[formStyles.pickerContainer, { maxWidth: 280 }]}>
          <Picker style={formStyles.pickerControl} selectedValue={goRushStatusFilter} onValueChange={setGoRushStatusFilter}>
            <Picker.Item label="All GO RUSH Statuses" value="" />
            {GO_RUSH_STATUS_OPTIONS.map((s) => <Picker.Item key={s} label={s} value={s} />)}
          </Picker>
        </View>
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
        <OrderTable orders={data.orders} onSelect={setSelectedOrderId} colors={colors} scaleFont={scaleFont} />
      )}

      {!loading && !error && viewMode === 'all' && data && data.totalPages > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 14 }}>
          <AnimatedPressable
            scaleTo={1.03}
            style={[formStyles.button, { flex: 0, paddingHorizontal: 20 }, page <= 1 && formStyles.buttonDisabled]}
            onPress={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
          >
            <Text style={formStyles.buttonText}>Previous</Text>
          </AnimatedPressable>
          <Text style={formStyles.bodyText}>Page {data.page} of {data.totalPages}</Text>
          <AnimatedPressable
            scaleTo={1.03}
            style={[formStyles.button, { flex: 0, paddingHorizontal: 20 }, page >= data.totalPages && formStyles.buttonDisabled]}
            onPress={() => setPage((p) => Math.min(p + 1, data.totalPages))}
            disabled={page >= data.totalPages}
          >
            <Text style={formStyles.buttonText}>Next</Text>
          </AnimatedPressable>
        </View>
      )}
    </View>
  );

  return (
    <>
      <PageScroll title="JPMC Pharmacy Orders" beforeContent={pageContent} />

      <Modal visible={!!selectedOrder} transparent animationType="fade" onRequestClose={() => setSelectedOrderId(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}
          onPress={() => setSelectedOrderId(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 640, maxHeight: '90%' }}
          >
            {selectedOrder && (
              <OrderDetail
                order={selectedOrder}
                canEdit={isJpmc}
                authHeader={authHeader}
                onSaved={handleSaved}
                onClose={() => setSelectedOrderId(null)}
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
