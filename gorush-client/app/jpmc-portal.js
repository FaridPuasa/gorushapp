// Role-scoped view of JPMC/PJSC pharmacy orders (product 'pharmacyjpmc') -
// replaces the manual "JPMC PJSC Forms.xlsx" workbook. `jpmc` role can edit
// the JPMC Pharmacy + JPMC Finance fields; `gorush` (and `admin`, for
// support) see the identical list read-only. Route access itself is gated
// globally by AdminGuard in app/_layout.js - this page assumes it's already
// been let through.
import React, { useState, useEffect, useCallback } from 'react';
import { Text, TextInput, View, ActivityIndicator, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useTheme } from '../context/ThemeContext';
import { AnimatedPressable } from '../lib/animations';

const STATUS_OPTIONS = ['New Order', 'Entered', 'Pending Payment', 'Pending Query', 'Duplicate Order', 'Completed'];
const PATIENT_INFORMED_OPTIONS = ['', 'Yes', 'No'];
// currentStatus values actually set by grfmxstatusupdate's Detrack sync - shown verbatim
// under "GO RUSH STATUS", no renaming.
const GO_RUSH_STATUS_OPTIONS = [
  'Info Received', 'Queued for Warehouse', 'At Warehouse', 'Out for Delivery',
  'Return to Warehouse', 'Return', 'Custom Clearing', 'On Hold', 'Self Collect',
  'Completed', 'Cancelled', 'Disposed',
];
const SEARCH_DEBOUNCE_MS = 400;
const VIEW_MODES = [
  { value: 'window', label: 'Current window' },
  { value: 'date', label: 'Specific date' },
  { value: 'all', label: 'All orders' },
];

// Default landing grouping - jobs still being worked vs. done vs. flagged as
// duplicate, so JPMC staff see what needs attention without having to filter
// first. Only used when no explicit pharmacyStatus filter is active - a
// filter already narrows to one bucket, so grouping would be redundant.
const PROCESSING_STATUSES = ['New Order', 'Entered', 'Pending Payment', 'Pending Query'];
const STATUS_GROUPS = [
  { key: 'processing', title: '🔄 Processing', match: (s) => !s || PROCESSING_STATUSES.includes(s) },
  { key: 'completed', title: '✅ Completed', match: (s) => s === 'Completed' },
  { key: 'duplicate', title: '⚠️ Duplicate Orders', match: (s) => s === 'Duplicate Order' },
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

function formatDMYTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatDMY(value)} ${hh}:${min}`;
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

function goRushStatusColor(status, colors) {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return colors.primary;
  if (s === 'cancelled' || s === 'disposed') return colors.error;
  if (s === 'out for delivery') return '#e67e22';
  return colors.textSecondary;
}

function OrderCard({ order, canEdit, authHeader, onSaved, formStyles, colors }) {
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

  return (
    <Card
      icon="💊"
      title={order.receiverName || 'Unnamed patient'}
      eyebrow={`${order.doTrackingNumber || 'No tracking yet'} · Submitted ${formatDMYTime(order.dateTimeSubmission)}`}
    >
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginBottom: 14 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>
          {order.appointmentPlace ? `${order.appointmentPlace} · ` : ''}PRN: {order.patientNumber || '—'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>
          {order.receiverPhoneNumber || '—'}{order.additionalPhoneNumber ? ` / ${order.additionalPhoneNumber}` : ''}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>
          {order.jobMethod || '—'} · {order.paymentMethod || '—'} · ${order.totalPrice || '0'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>{order.receiverAddress || '—'}</Text>
        {order.remarks ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Remarks from Patient: {order.remarks}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginRight: 6 }}>GO RUSH STATUS:</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: goRushStatusColor(order.goRushStatus, colors) }}>
            {order.goRushStatus || '—'}
          </Text>
        </View>
      </View>

      <Text style={[formStyles.fieldLabel, { marginBottom: 8 }]}>JPMC Pharmacy</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <View style={[formStyles.pickerContainer, { flex: 1, minWidth: 160 }]}>
          <Picker enabled={canEdit} style={formStyles.pickerControl} selectedValue={status} onValueChange={setStatus}>
            {STATUS_OPTIONS.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
          </Picker>
        </View>
        <View style={[formStyles.pickerContainer, { flex: 1, minWidth: 140 }]}>
          <Picker enabled={canEdit} style={formStyles.pickerControl} selectedValue={patientInformed} onValueChange={setPatientInformed}>
            <Picker.Item label="Patient Informed?" value="" />
            {PATIENT_INFORMED_OPTIONS.filter(Boolean).map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
          </Picker>
        </View>
      </View>
      <TextInput
        style={[formStyles.input, { marginBottom: 10 }]}
        placeholder="Remarks from Pharmacy"
        placeholderTextColor={colors.textMuted}
        value={remarks}
        onChangeText={setRemarks}
        editable={canEdit}
        multiline
      />
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <TextInput
          style={[formStyles.input, { width: 100, marginBottom: 0 }]}
          placeholder="Total $"
          placeholderTextColor={colors.textMuted}
          value={String(totalAmount)}
          onChangeText={setTotalAmount}
          editable={canEdit}
          keyboardType="numeric"
        />
        <View>
          <Text style={[formStyles.fieldLabel, { marginBottom: 6 }]}>JPMC Finance — Date Received</Text>
          {canEdit ? (
            <DateField value={dateReceived} onChange={setDateReceived} formStyles={formStyles} />
          ) : (
            <Text style={formStyles.bodyText}>{dateReceived ? formatDMY(dateReceived) : '—'}</Text>
          )}
        </View>
      </View>

      {error ? <Text style={formStyles.fieldError}>{error}</Text> : null}
      {canEdit && (
        <AnimatedPressable
          scaleTo={1.03}
          style={[formStyles.button, { alignSelf: 'flex-start', paddingHorizontal: 20 }, (!dirty || saving) && formStyles.buttonDisabled]}
          onPress={save}
          disabled={!dirty || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>{saved ? 'Saved' : 'Save'}</Text>}
        </AnimatedPressable>
      )}
    </Card>
  );
}

export default function JpmcPortal() {
  const { token, isJpmc } = useAuth();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const authHeader = { Authorization: `Bearer ${token}` };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('window');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pharmacyStatusFilter, setPharmacyStatusFilter] = useState('');
  const [goRushStatusFilter, setGoRushStatusFilter] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Any filter/view change should jump back to page 1 of "All orders" - a stale
  // page number from a previous, larger result set could land past the end.
  useEffect(() => { setPage(1); }, [viewMode, dateFilter, search, pharmacyStatusFilter, goRushStatusFilter]);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    if (viewMode === 'date' && !dateFilter) return;
    setLoading(true);
    setError(null);
    try {
      const params = { view: viewMode };
      if (search) params.search = search;
      if (pharmacyStatusFilter) params.pharmacyStatus = pharmacyStatusFilter;
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
  }, [token, viewMode, dateFilter, page, search, pharmacyStatusFilter, goRushStatusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleSaved = (id, updatedOrder) => {
    setData((prev) => (prev ? { ...prev, orders: prev.orders.map((o) => (o.id === id ? updatedOrder : o)) } : prev));
  };

  const subtitle = viewMode === 'all'
    ? 'All JPMC/PJSC orders, newest first'
    : data ? `Processing window: ${formatDMYTime(data.from)} — ${formatDMYTime(data.to)}` : 'Loading…';

  return (
    <PageScroll title="JPMC Pharmacy Orders">
      <Text style={formStyles.title}>JPMC Pharmacy Orders</Text>
      <Text style={formStyles.subtitle}>{subtitle}</Text>

      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {VIEW_MODES.map((m) => (
            <AnimatedPressable
              key={m.value}
              scaleTo={1.03}
              onPress={() => setViewMode(m.value)}
              style={[
                { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
                viewMode === m.value && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={{ fontWeight: '600', fontSize: 13, color: viewMode === m.value ? '#fff' : colors.textPrimary }}>
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
          style={[formStyles.input, { marginBottom: 10 }]}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by patient name, patient number, or tracking number"
          placeholderTextColor={colors.textMuted}
        />

        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <View style={[formStyles.pickerContainer, { flex: 1, minWidth: 180 }]}>
            <Picker style={formStyles.pickerControl} selectedValue={pharmacyStatusFilter} onValueChange={setPharmacyStatusFilter}>
              <Picker.Item label="All Pharmacy Statuses" value="" />
              {STATUS_OPTIONS.map((s) => <Picker.Item key={s} label={s} value={s} />)}
            </Picker>
          </View>
          <View style={[formStyles.pickerContainer, { flex: 1, minWidth: 180 }]}>
            <Picker style={formStyles.pickerControl} selectedValue={goRushStatusFilter} onValueChange={setGoRushStatusFilter}>
              <Picker.Item label="All GO RUSH Statuses" value="" />
              {GO_RUSH_STATUS_OPTIONS.map((s) => <Picker.Item key={s} label={s} value={s} />)}
            </Picker>
          </View>
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
          <Text style={formStyles.bodyText}>Nothing matches the current view/filters.</Text>
        </Card>
      )}

      {!loading && !error && data?.orders.length > 0 && (
        pharmacyStatusFilter ? (
          // A specific status is already selected - grouping again would be redundant.
          data.orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              canEdit={isJpmc}
              authHeader={authHeader}
              onSaved={handleSaved}
              formStyles={formStyles}
              colors={colors}
            />
          ))
        ) : (
          STATUS_GROUPS.map((group) => {
            const orders = data.orders.filter((o) => group.match(o.jpmcPharmacyStatus));
            if (orders.length === 0) return null;
            return (
              <View key={group.key} style={{ marginBottom: 10 }}>
                <Text style={[formStyles.sectionHeader, { marginBottom: 12 }]}>{group.title} ({orders.length})</Text>
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    canEdit={isJpmc}
                    authHeader={authHeader}
                    onSaved={handleSaved}
                    formStyles={formStyles}
                    colors={colors}
                  />
                ))}
              </View>
            );
          })
        )
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
    </PageScroll>
  );
}
