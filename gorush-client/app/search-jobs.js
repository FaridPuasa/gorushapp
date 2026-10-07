// Partner Search Jobs (pdu/mglobal/ewe) - trimmed filter panel + trimmed
// column table over the partner's own product, backed by
// GET /api/partner/search-jobs (server-side product scoping + filtering,
// client-side sort/paginate - see gorush-server/routes/partnerPortal.js and
// the project plan's field keep/exclude lists).
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Text, TextInput, View, ActivityIndicator, Modal, Pressable, ScrollView } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable } from '../lib/animations';

const WIDE_MAX_WIDTH = 1700;
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

function formatDMY(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function DetailField({ label, value, minWidth = 140, maxWidth = '100%', colors, scaleFont }) {
  return (
    <View style={{ minWidth, maxWidth, flexGrow: 1, flexShrink: 1 }}>
      <Text style={{ fontSize: scaleFont(10), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: scaleFont(14), fontWeight: '600', color: colors.textPrimary, flexShrink: 1 }}>{value ?? '—'}</Text>
    </View>
  );
}
function Section({ icon, title, children, colors, scaleFont }) {
  return (
    <View style={{ backgroundColor: colors.subtleBackground || colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 }}>
      <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>{icon} {title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 12 }}>{children}</View>
    </View>
  );
}

// Columns kept from the original Search Jobs table, per the project plan's
// exclusion list (drops Go Rush Remark, Job Method, Assigned To, Payment
// Method/Amount, Additional Phone No., IC/Passport No., BruHIMS No., Patient
// No., Paying Patient, Invoice/Item Screenshot, Original Tracking No., Item
// Original Price, No. of Packages, Origin, Appointment District/Location).
// Item Description/Quantity/Shipment Received are also left out here -
// gorush-server's mirrored Order model has no reliable backing field for
// them (Shipment Received doesn't exist at all; item detail lives in a loose
// `items` JSON blob) - flagged as a known gap rather than shown as guessed data.
const COLUMNS = [
  { key: 'customerRemark', label: 'Customer Remark', width: 180 },
  { key: 'doTrackingNumber', label: 'Go Rush Tracking No.', width: 150 },
  { key: 'currentStatus', label: 'Job Status', width: 130 },
  { key: 'latestLocation', label: 'Latest Location', width: 120 },
  { key: 'ageDays', label: 'Age (Days)', width: 80 },
  { key: 'jobDate', label: 'Job Date', width: 100, format: formatDMY },
  { key: 'attempt', label: 'Attempt', width: 70 },
  { key: 'receiverName', label: 'Name', width: 150 },
  { key: 'receiverPhoneNumber', label: 'Main Phone No.', width: 120 },
  { key: 'receiverAddress', label: 'Customer Address', width: 240 },
  { key: 'receiverPostalCode', label: 'Postal Code', width: 90 },
  { key: 'area', label: 'Area', width: 80 },
  { key: 'creationDate', label: 'Job Created Date', width: 120, format: formatDMY },
  { key: 'mawbNo', label: 'MAWB No.', width: 110 },
  { key: 'parcelWeight', label: 'Weight (KG)', width: 90 },
  { key: 'detrackCompletedTime', label: 'Job Date Completed', width: 140 },
];

function FilterField({ label, children, colors, scaleFont }) {
  return (
    <View style={{ minWidth: 200, flex: 1 }}>
      <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: colors.textMuted, marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

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
      style={{ minWidth: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: active ? colors.primary : 'transparent', borderWidth: active ? 0 : 1, borderColor: colors.border, opacity: disabled ? 0.4 : 1 }}
    >
      <Text style={{ fontWeight: '700', fontSize: scaleFont(13), color: active ? '#fff' : colors.textPrimary }}>{label}</Text>
    </AnimatedPressable>
  );
}
function Pagination({ page, totalPages, onChange, colors, scaleFont }) {
  const pages = useMemo(() => buildPageList(page, totalPages), [page, totalPages]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
      <PagerButton label="‹" disabled={page <= 1} onPress={() => onChange(page - 1)} colors={colors} scaleFont={scaleFont} />
      {pages.map((p, i) => (p === '…'
        ? <Text key={`gap-${i}`} style={{ paddingHorizontal: 4, color: colors.textMuted }}>…</Text>
        : <PagerButton key={p} label={String(p)} active={p === page} onPress={() => onChange(p)} colors={colors} scaleFont={scaleFont} />))}
      <PagerButton label="›" disabled={page >= totalPages} onPress={() => onChange(page + 1)} colors={colors} scaleFont={scaleFont} />
    </View>
  );
}

function DetailModal({ order, onClose, colors, scaleFont }) {
  return (
    <Modal visible={!!order} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 720, maxHeight: '90%' }}>
          {order && (
            <ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ fontSize: scaleFont(18), fontWeight: '700', color: colors.textPrimary }}>{order.doTrackingNumber}</Text>
                <AnimatedPressable scaleTo={1.1} onPress={onClose}><Text style={{ fontSize: scaleFont(18), color: colors.textMuted }}>✕</Text></AnimatedPressable>
              </View>
              <Section icon="📦" title="Shipment Info" colors={colors} scaleFont={scaleFont}>
                <DetailField label="Job Status" value={order.currentStatus} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Latest Location" value={order.latestLocation} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Attempt" value={order.attempt ?? 0} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Job Date" value={formatDMY(order.jobDate)} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Job Created Date" value={formatDMY(order.creationDate)} colors={colors} scaleFont={scaleFont} />
                <DetailField label="MAWB No." value={order.mawbNo} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Latest Reason" value={order.latestReason} colors={colors} scaleFont={scaleFont} />
              </Section>
              <Section icon="👤" title="Customer Info" colors={colors} scaleFont={scaleFont}>
                <DetailField label="Name" value={order.receiverName} minWidth={180} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Main Phone No." value={order.receiverPhoneNumber} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Address" value={order.receiverAddress} minWidth={260} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Postal Code" value={order.receiverPostalCode} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Area" value={order.area} colors={colors} scaleFont={scaleFont} />
              </Section>
              <Section icon="💬" title="Remarks" colors={colors} scaleFont={scaleFont}>
                <DetailField label="Customer Remark" value={order.remarks} minWidth={260} colors={colors} scaleFont={scaleFont} />
              </Section>
              {order.history?.length > 0 && (
                <Section icon="🕒" title="Status History" colors={colors} scaleFont={scaleFont}>
                  {order.history.map((h, i) => (
                    <DetailField key={i} label={h.status || '—'} value={h.dateUpdated ? new Date(h.dateUpdated).toLocaleString('en-GB') : '—'} minWidth={160} colors={colors} scaleFont={scaleFont} />
                  ))}
                </Section>
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function PartnerSearchJobs() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const formStyles = useFormStyles();

  const [filters, setFilters] = useState({
    doTrackingNumber: '', receiverName: '', receiverAddress: '',
    jobDateFrom: '', jobDateTo: '', creationDateFrom: '', creationDateTo: '',
    area: '', currentStatus: '', latestReason: '', mawbNo: '', receiverPostalCode: '', receiverPhoneNumber: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('creationDate');
  const [sortDir, setSortDir] = useState('desc');
  const [detailOrder, setDetailOrder] = useState(null);

  // The list view omits status history (a 2000-row response is heavy enough
  // without it) - opening "View Details" shows the row's already-known
  // fields instantly, then fills in history once the single-order lookup
  // (the same endpoint the dashboard's tracking search uses) resolves.
  const openDetails = (order) => {
    setDetailOrder(order);
    if (!token || !order.doTrackingNumber) return;
    api.get(`/api/partner/tracking/${encodeURIComponent(order.doTrackingNumber)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setDetailOrder((prev) => (prev && prev.id === order.id ? res.data : prev)))
      .catch(() => {});
  };

  const setField = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const id = setTimeout(() => setAppliedFilters(filters), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [filters]);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    const params = {};
    Object.entries(appliedFilters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get('/api/partner/search-jobs', { headers: { Authorization: `Bearer ${token}` }, params })
      .then((res) => { setOrders(res.data.orders); setPage(1); })
      .catch((e) => setError(e.response?.data?.error || 'Failed to search jobs.'))
      .finally(() => setLoading(false));
  }, [token, appliedFilters]);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => {
    const copy = [...orders];
    copy.sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [orders, sortKey, sortDir]);

  const totalPages = Math.max(Math.ceil(sorted.length / PAGE_SIZE), 1);
  const pageOrders = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (!token) return null;

  const pageContent = (
    <View style={{ width: '100%', maxWidth: WIDE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24 }}>
      <Text style={[formStyles.title, { fontSize: scaleFont(26) }]}>Search Jobs</Text>

      <Card icon="🔍" title="Filters">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <FilterField label="Go Rush Tracking No." colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.doTrackingNumber} onChangeText={(v) => setField('doTrackingNumber', v)} />
          </FilterField>
          <FilterField label="Customer Name" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.receiverName} onChangeText={(v) => setField('receiverName', v)} />
          </FilterField>
          <FilterField label="Customer Address" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.receiverAddress} onChangeText={(v) => setField('receiverAddress', v)} />
          </FilterField>
          <FilterField label="Main Phone No." colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.receiverPhoneNumber} onChangeText={(v) => setField('receiverPhoneNumber', v)} />
          </FilterField>
          <FilterField label="Postal Code" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.receiverPostalCode} onChangeText={(v) => setField('receiverPostalCode', v)} />
          </FilterField>
          <FilterField label="Area" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.area} onChangeText={(v) => setField('area', v)} placeholder="e.g. B, G, JT" placeholderTextColor={colors.textMuted} />
          </FilterField>
          <FilterField label="Job Status" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.currentStatus} onChangeText={(v) => setField('currentStatus', v)} placeholder="e.g. At Warehouse" placeholderTextColor={colors.textMuted} />
          </FilterField>
          <FilterField label="Reason" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.latestReason} onChangeText={(v) => setField('latestReason', v)} />
          </FilterField>
          <FilterField label="MAWB No." colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.mawbNo} onChangeText={(v) => setField('mawbNo', v)} />
          </FilterField>
          <FilterField label="Job Date From" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.jobDateFrom} onChangeText={(v) => setField('jobDateFrom', v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
          </FilterField>
          <FilterField label="Job Date To" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.jobDateTo} onChangeText={(v) => setField('jobDateTo', v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
          </FilterField>
          <FilterField label="Job Created Date From" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.creationDateFrom} onChangeText={(v) => setField('creationDateFrom', v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
          </FilterField>
          <FilterField label="Job Created Date To" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.creationDateTo} onChangeText={(v) => setField('creationDateTo', v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
          </FilterField>
        </View>
      </Card>

      {loading && <ActivityIndicator color={colors.primary} />}
      {!loading && error && <Text style={{ color: colors.error }}>{error}</Text>}

      {!loading && !error && (
        <Card icon="📋" title={`Results (${sorted.length})`}>
          <ScrollView horizontal>
            <View>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 4 }}>
                <View style={{ width: 50 }}><Text style={{ fontWeight: '700', fontSize: scaleFont(11), color: colors.textMuted }}>S/N</Text></View>
                <View style={{ width: 90 }}><Text style={{ fontWeight: '700', fontSize: scaleFont(11), color: colors.textMuted }}>Action</Text></View>
                {COLUMNS.map((c) => (
                  <AnimatedPressable key={c.key} scaleTo={1.0} onPress={() => toggleSort(c.key)} style={{ width: c.width }}>
                    <Text style={{ fontWeight: '700', fontSize: scaleFont(11), color: colors.textMuted }}>
                      {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
              {pageOrders.map((o, i) => (
                <View key={o.id} style={{ flexDirection: 'row', paddingVertical: 8, backgroundColor: i % 2 === 1 ? colors.subtleBackground : 'transparent' }}>
                  <View style={{ width: 50 }}><Text style={{ fontSize: scaleFont(12), color: colors.textPrimary }}>{(page - 1) * PAGE_SIZE + i + 1}</Text></View>
                  <View style={{ width: 90 }}>
                    <AnimatedPressable scaleTo={1.04} onPress={() => openDetails(o)} style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' }}>
                      <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: colors.textPrimary }}>View Details</Text>
                    </AnimatedPressable>
                  </View>
                  {COLUMNS.map((c) => (
                    <View key={c.key} style={{ width: c.width }}>
                      <Text style={{ fontSize: scaleFont(12), color: colors.textPrimary }} numberOfLines={2}>
                        {c.format ? c.format(o[c.key]) : (o[c.key] ?? '—')}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} colors={colors} scaleFont={scaleFont} />
        </Card>
      )}

      <DetailModal order={detailOrder} onClose={() => setDetailOrder(null)} colors={colors} scaleFont={scaleFont} />
    </View>
  );

  return <PageScroll title="Search Jobs" beforeContent={pageContent} />;
}
