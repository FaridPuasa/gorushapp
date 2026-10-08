// Partner Search Jobs (pdu/mglobal/ewe) - trimmed filter panel + trimmed
// column table over the partner's own product, backed by
// GET /api/partner/search-jobs (server-side product scoping + filtering,
// client-side sort/paginate - see gorush-server/routes/partnerPortal.js and
// the project plan's field keep/exclude lists).
import React, { useState, useMemo, useCallback } from 'react';
import { Text, TextInput, View, ActivityIndicator, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useTheme } from '../context/ThemeContext';
import { AnimatedPressable } from '../lib/animations';
import { copyTrackingNumbers, exportOrdersToExcel } from '../lib/partnerExport';
import { formatDMY, gdexStyleLocation, DateField, useDenseFontScale } from '../lib/partnerUi';
import TrackingDetailModal from '../components/TrackingDetailModal';

const WIDE_MAX_WIDTH = 1700;
const PAGE_SIZE = 25;

// Same option lists as grfmxstatusupdate's own Search Jobs filter form
// (searchJobs.ejs), trimmed to what applies to a single-product partner view.
const AREA_OPTIONS = ['B', 'G', 'JT', 'TUTONG', 'KB', 'LUMUT', 'SERIA', 'TEMBURONG', 'N/A'];
const JOB_STATUS_OPTIONS = [
  'Info Received', 'On Hold', 'At Warehouse', 'In Sorting Area',
  'Out for Delivery', 'Self Collect', 'Completed', 'Return to Warehouse',
];

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
  { key: 'latestLocation', label: 'Latest Location', width: 120, format: (v, row) => gdexStyleLocation(v, row.currentStatus, row) },
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
  // detrackCompletedTime only gets populated for Detrack-tracked products -
  // it's empty for GDEX/other completions even though the job really is
  // Completed. grfmxstatusupdate's own gold-standard searchJobs.ejs doesn't
  // use that field for this column either - it derives it the same way:
  // jobDate when currentStatus is Completed, blank otherwise.
  { key: 'jobDateCompletedDisplay', label: 'Job Date Completed', width: 140, format: (v, row) => (row.currentStatus === 'Completed' ? formatDMY(row.jobDate) : '—') },
];

const EMPTY_FILTERS = {
  doTrackingNumber: '', receiverName: '', receiverAddress: '',
  jobDateFrom: '', jobDateTo: '', creationDateFrom: '', creationDateTo: '',
  area: '', currentStatus: '', mawbNo: '', receiverPostalCode: '', receiverPhoneNumber: '',
};

function FilterField({ label, children, colors, scaleFont }) {
  return (
    <View style={{ minWidth: 200, flex: 1 }}>
      <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: colors.textMuted, marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

// Single-select dropdown with a leading "All" option - a reasonable
// simplification of the original's multi-select checkboxes (Picker doesn't
// support multi-select), backed by the same server-side filter either way.
function SelectField({ value, onChange, options, formStyles }) {
  return (
    <View style={formStyles.pickerContainer}>
      <Picker selectedValue={value} onValueChange={onChange} style={formStyles.pickerControl}>
        <Picker.Item label="All" value="" />
        {options.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
      </Picker>
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

// Toolbar button (Search/Export Excel/Columns) with a brief "Done" flash on
// completion, same convention dashboard.js's ToolbarButton uses.
function ToolbarButton({ label, onPress, colors, scaleFont, variant = 'default' }) {
  const bg = variant === 'primary' ? colors.primary : variant === 'success' ? colors.successLight : colors.card;
  const fg = variant === 'primary' ? '#fff' : variant === 'success' ? colors.success : colors.textPrimary;
  return (
    <AnimatedPressable
      scaleTo={1.03}
      onPress={onPress}
      style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 8, backgroundColor: bg, borderWidth: variant === 'primary' ? 0 : 1, borderColor: colors.border }}
    >
      <Text style={{ fontSize: scaleFont(13), fontWeight: '700', color: fg }}>{label}</Text>
    </AnimatedPressable>
  );
}

// "Columns" show/hide panel - a simple checkbox list toggled from a button,
// matching the original's colvis button. Click-away isn't wired (no outside-
// click listener in this codebase's convention) - a second click on the
// Columns button itself closes it.
function ColumnsPanel({ open, hidden, onToggleColumn, colors, scaleFont }) {
  if (!open) return null;
  return (
    <View style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, zIndex: 20, width: 240, maxHeight: 320 }}>
      {COLUMNS.map((c) => (
        <AnimatedPressable key={c.key} scaleTo={1.0} onPress={() => onToggleColumn(c.key)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 }}>
          <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: colors.border, backgroundColor: hidden.has(c.key) ? 'transparent' : colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            {!hidden.has(c.key) && <Text style={{ color: '#fff', fontSize: scaleFont(11), fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{ fontSize: scaleFont(12), color: colors.textPrimary, flex: 1 }} numberOfLines={1}>{c.label}</Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}

export default function PartnerSearchJobs() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { scaleFont } = useDenseFontScale();
  const formStyles = useFormStyles();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('creationDate');
  const [sortDir, setSortDir] = useState('desc');
  const [openTracking, setOpenTracking] = useState(null);
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [exported, setExported] = useState(false);

  const setField = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const visibleColumns = COLUMNS.filter((c) => !hiddenColumns.has(c.key));
  const toggleColumn = (key) => setHiddenColumns((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // Explicit Search button (not auto-search-as-you-type) - matches the
  // original's Search/Reset button pair.
  const runSearch = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setSearched(true);
    setError('');
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get('/api/partner/search-jobs', { headers: { Authorization: `Bearer ${token}` }, params })
      .then((res) => { setOrders(res.data.orders); setPage(1); })
      .catch((e) => setError(e.response?.data?.error || 'Failed to search jobs.'))
      .finally(() => setLoading(false));
  }, [token, filters]);

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setOrders([]);
    setSearched(false);
    setError('');
  };

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

  const handleExport = () => {
    exportOrdersToExcel(sorted, visibleColumns, 'Search Jobs');
    setExported(true);
    setTimeout(() => setExported(false), 1500);
  };

  if (!token) return null;

  const pageContent = (
    <View style={{ width: '100%', maxWidth: WIDE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24 }}>
      <Text style={[formStyles.title, { fontSize: scaleFont(26), marginBottom: 28 }]}>Search Jobs</Text>

      <Card icon="🔍" title="Filters">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 16 }}>
          <FilterField label="Go Rush Tracking No." colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.doTrackingNumber} onChangeText={(v) => setField('doTrackingNumber', v)} onSubmitEditing={runSearch} />
          </FilterField>
          <FilterField label="Customer Name" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.receiverName} onChangeText={(v) => setField('receiverName', v)} onSubmitEditing={runSearch} />
          </FilterField>
          <FilterField label="Customer Address" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.receiverAddress} onChangeText={(v) => setField('receiverAddress', v)} onSubmitEditing={runSearch} />
          </FilterField>
          <FilterField label="Main Phone No." colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.receiverPhoneNumber} onChangeText={(v) => setField('receiverPhoneNumber', v)} onSubmitEditing={runSearch} />
          </FilterField>
          <FilterField label="Postal Code" colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.receiverPostalCode} onChangeText={(v) => setField('receiverPostalCode', v)} onSubmitEditing={runSearch} />
          </FilterField>
          <FilterField label="Area" colors={colors} scaleFont={scaleFont}>
            <SelectField value={filters.area} onChange={(v) => setField('area', v)} options={AREA_OPTIONS} formStyles={formStyles} />
          </FilterField>
          <FilterField label="Job Status" colors={colors} scaleFont={scaleFont}>
            <SelectField value={filters.currentStatus} onChange={(v) => setField('currentStatus', v)} options={JOB_STATUS_OPTIONS} formStyles={formStyles} />
          </FilterField>
          <FilterField label="MAWB No." colors={colors} scaleFont={scaleFont}>
            <TextInput style={formStyles.input} value={filters.mawbNo} onChangeText={(v) => setField('mawbNo', v)} onSubmitEditing={runSearch} />
          </FilterField>
          <FilterField label="Job Date From" colors={colors} scaleFont={scaleFont}>
            <DateField value={filters.jobDateFrom} onChange={(v) => setField('jobDateFrom', v)} formStyles={formStyles} />
          </FilterField>
          <FilterField label="Job Date To" colors={colors} scaleFont={scaleFont}>
            <DateField value={filters.jobDateTo} onChange={(v) => setField('jobDateTo', v)} formStyles={formStyles} />
          </FilterField>
          <FilterField label="Job Created Date From" colors={colors} scaleFont={scaleFont}>
            <DateField value={filters.creationDateFrom} onChange={(v) => setField('creationDateFrom', v)} formStyles={formStyles} />
          </FilterField>
          <FilterField label="Job Created Date To" colors={colors} scaleFont={scaleFont}>
            <DateField value={filters.creationDateTo} onChange={(v) => setField('creationDateTo', v)} formStyles={formStyles} />
          </FilterField>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ToolbarButton label={loading ? 'Searching…' : '🔍 Search'} variant="primary" colors={colors} scaleFont={scaleFont} onPress={runSearch} />
            <ToolbarButton label="Reset" colors={colors} scaleFont={scaleFont} onPress={resetFilters} />
          </View>
          {searched && sorted.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <ToolbarButton label="📋 Copy Tracking No." colors={colors} scaleFont={scaleFont} onPress={() => copyTrackingNumbers(sorted)} />
              <ToolbarButton label={exported ? 'Done' : '📊 Download Excel'} variant="success" colors={colors} scaleFont={scaleFont} onPress={handleExport} />
              <View>
                <ToolbarButton label="☰ Columns" colors={colors} scaleFont={scaleFont} onPress={() => setColumnsOpen((v) => !v)} />
                <ColumnsPanel open={columnsOpen} hidden={hiddenColumns} onToggleColumn={toggleColumn} colors={colors} scaleFont={scaleFont} />
              </View>
            </View>
          )}
        </View>
      </Card>

      {loading && <ActivityIndicator color={colors.primary} />}
      {!loading && error && <Text style={{ color: colors.error }}>{error}</Text>}

      {!loading && !error && searched && (
        <Card icon="📋" title={`Results (${sorted.length})`}>
          <ScrollView horizontal>
            <View>
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden', minWidth: '100%' }}>
                <View style={{ flexDirection: 'row', backgroundColor: colors.subtleBackground, paddingVertical: 8 }}>
                  <View style={{ width: 50, paddingHorizontal: 8 }}><Text style={{ fontWeight: '700', fontSize: scaleFont(11), color: colors.textMuted, textTransform: 'uppercase' }}>S/N</Text></View>
                  {visibleColumns.map((c) => (
                    <AnimatedPressable key={c.key} scaleTo={1.0} onPress={() => toggleSort(c.key)} style={{ width: c.width, paddingHorizontal: 8 }}>
                      <Text style={{ fontWeight: '700', fontSize: scaleFont(11), color: colors.textMuted, textTransform: 'uppercase' }} numberOfLines={1}>
                        {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
                {pageOrders.length === 0 ? (
                  <View style={{ padding: 16 }}><Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>No results.</Text></View>
                ) : pageOrders.map((o, i) => (
                  <View key={o.id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, backgroundColor: i % 2 === 1 ? colors.subtleBackground : colors.card, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View style={{ width: 50, paddingHorizontal: 8 }}><Text style={{ fontSize: scaleFont(12), color: colors.textPrimary }}>{(page - 1) * PAGE_SIZE + i + 1}</Text></View>
                    {visibleColumns.map((c) => (
                      <View key={c.key} style={{ width: c.width, paddingHorizontal: 8 }}>
                        {c.key === 'doTrackingNumber' ? (
                          <AnimatedPressable scaleTo={1.0} onPress={() => setOpenTracking(o.doTrackingNumber)}>
                            <Text style={{ fontSize: scaleFont(12), color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }} numberOfLines={1}>{o.doTrackingNumber}</Text>
                          </AnimatedPressable>
                        ) : (
                          <Text style={{ fontSize: scaleFont(12), color: colors.textPrimary }} numberOfLines={2}>
                            {c.format ? c.format(o[c.key], o) : (o[c.key] ?? '—')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} colors={colors} scaleFont={scaleFont} />
        </Card>
      )}

      <TrackingDetailModal trackingNumber={openTracking} token={token} onClose={() => setOpenTracking(null)} onOpenTracking={setOpenTracking} />
    </View>
  );

  return <PageScroll title="Search Jobs" beforeContent={pageContent} />;
}
