// Partner dashboard (pdu/mglobal/ewe) - a cut-down React reimplementation of
// grfmxstatusupdate's dashboard.ejs sections (Search Tracking Number,
// Warehouse, In Progress/Completed, New Orders), scoped server-side to the
// logged-in partner's own product (see gorush-server/routes/partnerPortal.js).
// Visual language (KPI tiles with icons, MAWB/Area/date group headers with
// Copy/Excel buttons, grouped-row tinting, age badge thresholds, clickable
// tracking numbers opening a popup) follows grfmxstatusupdate's own dashboard
// as closely as RN/web primitives allow - not a literal Bootstrap/EJS port,
// but the same structure/behavior, per the project plan. Everything is
// rendered via PageScroll's `beforeContent` (see lib/formPrimitives.js)
// rather than as children - this is a wide data page, not a form, so it must
// not be squeezed into the app's narrow 900px form column (same reasoning
// jpmc-portal.js documents for its own page).
import React, { useState, useCallback, useEffect } from 'react';
import { Text, TextInput, View, ActivityIndicator } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useTheme } from '../context/ThemeContext';
import { AnimatedPressable } from '../lib/animations';
import { copyTrackingNumbers, exportOrdersToExcel } from '../lib/partnerExport';
import { Badge, formatDMY, DateField, useDenseFontScale } from '../lib/partnerUi';
import TrackingDetailModal from '../components/TrackingDetailModal';

const WIDE_MAX_WIDTH = 1500;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Row-level age badge - matches grfmxstatusupdate's per-row convention
// (>=30 dark, >=10 red, >=7 amber, else green).
function rowAgeColors(age, colors) {
  if (age == null) return { bg: colors.subtleBackground, fg: colors.textMuted };
  if (age >= 30) return { bg: colors.textPrimary, fg: colors.card };
  if (age >= 10) return { bg: colors.errorLight, fg: colors.error };
  if (age >= 7) return { bg: colors.warningLight, fg: colors.warning };
  return { bg: colors.successLight, fg: colors.success };
}
// MAWB-group badge - warehouse tabs use a smaller day-scale than individual
// rows (>=3 dark, >=2 red, >=1 amber, else green).
function mawbAgeColors(age, colors) {
  if (age >= 3) return { bg: colors.textPrimary, fg: colors.card };
  if (age >= 2) return { bg: colors.errorLight, fg: colors.error };
  if (age >= 1) return { bg: colors.warningLight, fg: colors.warning };
  return { bg: colors.successLight, fg: colors.success };
}
// Incomplete Scan's MAWB badge uses its own larger day-scale (>=10 red, >=7 amber).
function incompleteScanAgeColors(age, colors) {
  if (age >= 10) return { bg: colors.errorLight, fg: colors.error };
  if (age >= 7) return { bg: colors.warningLight, fg: colors.warning };
  return { bg: colors.successLight, fg: colors.success };
}
// Active/Completed job status - this is what actually answers "is this one
// completed, still in progress, or did it fail", which Age (a warehouse-
// residency concept) doesn't convey at all for a job that's already out for
// delivery or done.
const JOB_IN_PROGRESS_STATUSES = new Set(['out for delivery', 'self collect', 'drop off']);
function jobStatusColors(status, colors) {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return { bg: colors.successLight, fg: colors.success };
  if (JOB_IN_PROGRESS_STATUSES.has(s)) return { bg: colors.primaryLight, fg: colors.primary };
  return { bg: colors.errorLight, fg: colors.error };
}
// Same 5-color pastel palette grfmxstatusupdate's CSS uses for
// group-color-0..4 (same-customer order clusters, see groupSimilarOrders on
// the server) - light/dark variants so grouped rows read as tinted in both themes.
const GROUP_COLORS_LIGHT = ['#eaf4fb', '#f5f0e6', '#eaf7ea', '#f8eef2', '#f2eef8'];
const GROUP_COLORS_DARK = ['#1c2b36', '#2c271c', '#1c2e1f', '#2e1f27', '#271f2e'];
function groupRowColor(groupColorIdx, mode) {
  if (groupColorIdx == null) return null;
  return (mode === 'dark' ? GROUP_COLORS_DARK : GROUP_COLORS_LIGHT)[groupColorIdx % 5];
}

// One KPI tile (icon + value + label) - the small summary strip every
// section (Warehouse/In Progress-Completed/New Orders) shows above its tabs.
function KpiTile({ icon, value, label, bg, fg, colors, scaleFont }) {
  return (
    <View style={{ minWidth: 130, flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: bg || colors.subtleBackground }}>
      <Text style={{ fontSize: scaleFont(18), marginBottom: 4 }}>{icon}</Text>
      <Text style={{ fontSize: scaleFont(20), fontWeight: '700', color: fg || colors.textPrimary }}>{value}</Text>
      <Text style={{ fontSize: scaleFont(11), fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
function KpiStrip({ children }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>{children}</View>;
}

// Section colors matching grfmxstatusupdate's own card-header classes
// (bg-dark/bg-success/bg-primary) - a fixed categorical palette, not
// theme-adaptive, same reasoning as the Status History stepper's colors.
const SECTION_COLORS = { dark: '#212529', success: '#198754', primary: '#0d6efd' };

// Card with a solid colored header bar (white text) instead of the shared
// Card component's plain icon+text title - matches grfmxstatusupdate's own
// Warehouse (dark)/In Progress-Completed (green)/New Orders (blue) section
// headers, which the generic Card look doesn't replicate.
function ColoredCard({ icon, title, color, children }) {
  const { colors } = useTheme();
  const { scaleFont } = useDenseFontScale();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20, overflow: 'hidden' }}>
      <View style={{ backgroundColor: SECTION_COLORS[color], paddingVertical: 14, paddingHorizontal: 20 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: scaleFont(16) }}>{icon} {title}</Text>
      </View>
      <View style={{ padding: 20 }}>{children}</View>
    </View>
  );
}

// Show/Hide toggle for a section's tab area - matches grfmxstatusupdate's own
// collapse button exactly (outlined blue "▾ Show" when collapsed, solid blue
// "▴ Hide" when expanded). Defaults to collapsed so the page loads compact;
// the KPI strip above it is always visible regardless.
function ShowHideToggle({ expanded, onToggle, colors, scaleFont }) {
  return (
    <AnimatedPressable
      scaleTo={1.0}
      onPress={onToggle}
      style={{
        paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginBottom: 14,
        borderWidth: 1, borderColor: colors.primary,
        backgroundColor: expanded ? colors.primary : 'transparent',
      }}
    >
      <Text style={{ fontWeight: '700', fontSize: scaleFont(13), color: expanded ? '#fff' : colors.primary }}>
        {expanded ? '▴ Hide' : '▾ Show'}
      </Text>
    </AnimatedPressable>
  );
}

// Toolbar button used by every group header (Copy/Excel) - a brief inline
// "Copied!"/"Done" replaces the label for 1.5s instead of a toast system
// this app doesn't have (same spirit as jpmc-portal.js's Save button).
function ToolbarButton({ label, doneLabel, onPress, colors, scaleFont, variant = 'default' }) {
  const [done, setDone] = useState(false);
  const bg = variant === 'success' ? colors.successLight : colors.card;
  const fg = variant === 'success' ? colors.success : colors.textPrimary;
  return (
    <AnimatedPressable
      scaleTo={1.04}
      onPress={async () => {
        await onPress();
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: bg, borderWidth: 1, borderColor: colors.border }}
    >
      <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: fg }}>{done ? (doneLabel || 'Done') : label}</Text>
    </AnimatedPressable>
  );
}

// Group header - Title + order-count badge + Copy + Excel, used at every
// level (MAWB, Area, date) exactly like grfmxstatusupdate's own card headers.
function GroupHeader({ title, extra, count, orders, exportColumns, sectionName, colors, scaleFont }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: scaleFont(14), fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
        {extra}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Badge label={null} value={`${count} order${count === 1 ? '' : 's'}`} bg={colors.primaryLight} fg={colors.primary} scaleFont={scaleFont} />
        <ToolbarButton label="📋 Copy Tracking No." doneLabel="Copied!" colors={colors} scaleFont={scaleFont} onPress={() => copyTrackingNumbers(orders)} />
        <ToolbarButton label="📊 Download Excel" doneLabel="Done" colors={colors} scaleFont={scaleFont} variant="success" onPress={() => exportOrdersToExcel(orders, exportColumns, sectionName)} />
      </View>
    </View>
  );
}

// Collapsible panel wrapping a GroupHeader - the single building block every
// group level (MAWB, Area, date) in this page uses.
function Collapsible({ header, children, defaultOpen = false, colors, scaleFont }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.card, gap: 10 }}>
        <AnimatedPressable scaleTo={1.0} onPress={() => setOpen((v) => !v)}>
          <Text style={{ fontSize: scaleFont(14), color: colors.textMuted }}>{open ? '▴' : '▾'}</Text>
        </AnimatedPressable>
        {header}
      </View>
      {open && <View style={{ padding: 12, paddingTop: 0 }}>{children}</View>}
    </View>
  );
}

// Full column set for the Warehouse/Active/Completed tables - matches
// grfmxstatusupdate's warehouseAreaCards.ejs/warehouseMethodTables.ejs.
const FULL_EXPORT_COLUMNS = [
  { key: 'ageDays', label: 'Age', flex: 1 },
  { key: 'doTrackingNumber', label: 'Tracking Number', flex: 1.3 },
  { key: 'attempt', label: 'Attempt', flex: 0.7 },
  { key: 'latestReason', label: 'Latest Reason', flex: 1.6 },
  { key: 'receiverAddress', label: 'Address', flex: 2 },
  { key: 'area', label: 'Area', flex: 0.7 },
  { key: 'receiverName', label: 'Name', flex: 1.3 },
  { key: 'receiverPhoneNumber', label: 'Main Phone', flex: 1.1 },
  { key: 'customerRemark', label: 'Customer Remark', flex: 1.5 },
];
// Incomplete Scan's narrower column set (no Age/Attempt/Reason/Remark columns
// per row - age is shown only on the MAWB group header, same as the original).
const SCAN_EXPORT_COLUMNS = [
  { key: 'doTrackingNumber', label: 'Tracking Number', flex: 1.3 },
  { key: 'receiverAddress', label: 'Address', flex: 2 },
  { key: 'area', label: 'Area', flex: 0.7 },
  { key: 'receiverName', label: 'Name', flex: 1.3 },
  { key: 'receiverPhoneNumber', label: 'Main Phone', flex: 1.1 },
];
// Active/Completed job tables - a Status column (Completed/In Progress/
// Failed) instead of Age, since these jobs have already left the warehouse
// and "how many days in the warehouse" no longer applies to them; Status is
// what actually distinguishes a completed job from one still in progress or
// one that failed, which the KPI strip above summarizes but the table itself
// wasn't showing per row at all.
const JOBS_EXPORT_COLUMNS = [
  { key: 'currentStatus', label: 'Status', flex: 1.4 },
  { key: 'doTrackingNumber', label: 'Tracking Number', flex: 1.3 },
  { key: 'attempt', label: 'Attempt', flex: 0.7 },
  { key: 'latestReason', label: 'Latest Reason', flex: 1.6 },
  { key: 'receiverAddress', label: 'Address', flex: 2 },
  { key: 'area', label: 'Area', flex: 0.7 },
  { key: 'receiverName', label: 'Name', flex: 1.3 },
  { key: 'receiverPhoneNumber', label: 'Main Phone', flex: 1.1 },
  { key: 'customerRemark', label: 'Customer Remark', flex: 1.5 },
];

// Real table (header row + body rows), not the card-per-row layout - matches
// grfmxstatusupdate's actual warehouse tables rather than jpmc-portal's
// style. Tracking numbers are clickable, opening the same tracking-detail
// popup the Search Tracking Number card uses. Columns use flex weights (not
// fixed pixel widths inside a horizontal ScrollView) so the table always
// fills the full card width like a real HTML table, rather than stopping
// partway across and leaving blank card background to the right of it -
// these variants (9/9/5 columns) comfortably fit without needing to scroll.
function OrdersTable({ orders, variant = 'full', onOpenTracking, colors, scaleFont }) {
  const { mode } = useTheme();
  const columns = variant === 'scan' ? SCAN_EXPORT_COLUMNS : variant === 'jobs' ? JOBS_EXPORT_COLUMNS : FULL_EXPORT_COLUMNS;
  if (!orders || orders.length === 0) {
    return <Text style={{ fontSize: scaleFont(13), color: colors.textMuted, fontStyle: 'italic', padding: 8 }}>No orders.</Text>;
  }
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden', width: '100%' }}>
      <View style={{ flexDirection: 'row', backgroundColor: colors.subtleBackground, paddingVertical: 8 }}>
        {columns.map((c) => (
          <Text key={c.key} style={{ flex: c.flex, paddingHorizontal: 8, fontSize: scaleFont(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }} numberOfLines={1}>{c.label}</Text>
        ))}
      </View>
      {orders.map((o, i) => {
        const age = rowAgeColors(o.ageDays, colors);
        const status = jobStatusColors(o.currentStatus, colors);
        const groupBg = groupRowColor(o.groupColorIdx, mode);
        return (
          <View key={o.id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, backgroundColor: groupBg || (i % 2 === 1 ? colors.subtleBackground : colors.card), borderTopWidth: 1, borderTopColor: colors.border }}>
            {columns.map((c) => {
              if (c.key === 'ageDays') {
                return (
                  <View key={c.key} style={{ flex: c.flex, paddingHorizontal: 8 }}>
                    <Badge label={null} value={o.ageDays != null ? `${o.ageDays} days` : '—'} bg={age.bg} fg={age.fg} scaleFont={scaleFont} />
                  </View>
                );
              }
              if (c.key === 'currentStatus') {
                return (
                  <View key={c.key} style={{ flex: c.flex, paddingHorizontal: 8 }}>
                    <Badge label={null} value={o.currentStatus || '—'} bg={status.bg} fg={status.fg} scaleFont={scaleFont} />
                  </View>
                );
              }
              if (c.key === 'doTrackingNumber') {
                return (
                  <View key={c.key} style={{ flex: c.flex, paddingHorizontal: 8 }}>
                    <AnimatedPressable scaleTo={1.0} onPress={() => onOpenTracking(o.doTrackingNumber)}>
                      <Text style={{ fontSize: scaleFont(12), color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }} numberOfLines={1}>{o.doTrackingNumber}</Text>
                    </AnimatedPressable>
                  </View>
                );
                }
                return (
                  <Text key={c.key} style={{ flex: c.flex, paddingHorizontal: 8, fontSize: scaleFont(12), color: colors.textPrimary }} numberOfLines={3}>
                    {o[c.key] ?? '—'}
                  </Text>
                );
              })}
            </View>
          );
        })}
    </View>
  );
}

function MawbGroupHeader({ mawbNo, maxAge, count, orders, exportColumns, colors, scaleFont }) {
  const badge = mawbAgeColors(maxAge, colors);
  return (
    <GroupHeader
      title={`MAWB: ${mawbNo}`}
      extra={<Badge label="Max Age" value={`${maxAge}d`} bg={badge.bg} fg={badge.fg} scaleFont={scaleFont} />}
      count={count}
      orders={orders}
      exportColumns={exportColumns}
      sectionName={`MAWB ${mawbNo}`}
      colors={colors}
      scaleFont={scaleFont}
    />
  );
}

// ---- Search Tracking Number ----
// Just the search box - a match opens TrackingDetailModal (shared with every
// clickable tracking number elsewhere on this page) instead of rendering
// inline, matching grfmxstatusupdate's own popup-style tracking search.
function TrackingSearchCard({ token, onOpenTracking, colors, scaleFont, formStyles }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!value.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.get(`/api/partner/tracking/${encodeURIComponent(value.trim())}`, { headers: { Authorization: `Bearer ${token}` } });
      onOpenTracking(value.trim());
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to search.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card icon="🔍" title="Search Tracking Number">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          style={[formStyles.input, { flex: 1 }]}
          value={value}
          onChangeText={setValue}
          onSubmitEditing={search}
          placeholder="Enter tracking number"
          placeholderTextColor={colors.textMuted}
        />
        <AnimatedPressable scaleTo={1.03} style={[formStyles.button, { paddingHorizontal: 20 }, loading && formStyles.buttonDisabled]} onPress={search} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>Search</Text>}
        </AnimatedPressable>
      </View>
      {error ? <Text style={[formStyles.fieldError, { marginTop: 8 }]}>{error}</Text> : null}
    </Card>
  );
}

// ---- Warehouse ----
function WarehouseCard({ token, onOpenTracking, colors, scaleFont }) {
  const [tab, setTab] = useState('current');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/api/partner/warehouse', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.error || 'Failed to load warehouse data.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const groups = tab === 'current' ? (data?.current || []) : (data?.noAttempt || []);

  return (
    <ColoredCard icon="🏭" title="Go Rush Warehouse" color="dark">
      <KpiStrip>
        <KpiTile icon="📦" value={data?.summary?.current ?? '—'} label="Current" colors={colors} scaleFont={scaleFont} />
        <KpiTile icon="⛔" value={data?.summary?.noAttempt ?? '—'} label="No Attempt Yet" colors={colors} scaleFont={scaleFont} />
      </KpiStrip>

      <ShowHideToggle expanded={expanded} onToggle={() => setExpanded((v) => !v)} colors={colors} scaleFont={scaleFont} />

      {expanded && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[{ key: 'current', label: 'Current' }, { key: 'noAttempt', label: 'No Attempt Yet' }].map((t) => (
              <AnimatedPressable
                key={t.key}
                scaleTo={1.03}
                onPress={() => setTab(t.key)}
                style={[{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border }, tab === t.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              >
                <Text style={{ fontWeight: '700', fontSize: scaleFont(13), color: tab === t.key ? '#fff' : colors.textPrimary }}>{t.label}</Text>
              </AnimatedPressable>
            ))}
          </View>

          {loading && <ActivityIndicator color={colors.primary} />}
          {!loading && error && <Text style={{ color: colors.error }}>{error}</Text>}
          {!loading && !error && groups.length === 0 && <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>No orders in this tab.</Text>}

          {!loading && !error && groups.map((g) => {
            const allOrders = tab === 'current' ? g.areas.flatMap((a) => a.orders) : g.orders;
            return (
              <Collapsible
                key={g.mawbNo}
                colors={colors}
                scaleFont={scaleFont}
                header={<MawbGroupHeader mawbNo={g.mawbNo} maxAge={g.maxAge} count={allOrders.length} orders={allOrders} exportColumns={FULL_EXPORT_COLUMNS} colors={colors} scaleFont={scaleFont} />}
              >
                {tab === 'current' ? (
                  g.areas.map((a) => (
                    <Collapsible
                      key={a.area}
                      colors={colors}
                      scaleFont={scaleFont}
                      header={<GroupHeader title={`Area: ${a.area}`} count={a.orders.length} orders={a.orders} exportColumns={FULL_EXPORT_COLUMNS} sectionName={`${g.mawbNo} ${a.area}`} colors={colors} scaleFont={scaleFont} />}
                    >
                      <OrdersTable orders={a.orders} onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
                    </Collapsible>
                  ))
                ) : (
                  <OrdersTable orders={g.orders} onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
                )}
              </Collapsible>
            );
          })}
        </>
      )}
    </ColoredCard>
  );
}

// ---- In Progress / Completed ----
function ActiveCompletedCard({ token, onOpenTracking, colors, scaleFont, formStyles }) {
  const [tab, setTab] = useState('active');
  const [active, setActive] = useState(null);
  const [activeLoading, setActiveLoading] = useState(true);
  const [completedDate, setCompletedDate] = useState(todayISO());
  const [completed, setCompleted] = useState(null);
  const [completedLoading, setCompletedLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setActiveLoading(true);
    api.get('/api/partner/active-jobs', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!cancelled) setActive(res.data); })
      .finally(() => { if (!cancelled) setActiveLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const loadCompleted = useCallback((date) => {
    setCompletedLoading(true);
    api.get('/api/partner/completed-jobs', { headers: { Authorization: `Bearer ${token}` }, params: { date } })
      .then((res) => setCompleted(res.data))
      .finally(() => setCompletedLoading(false));
  }, [token]);

  useEffect(() => { if (tab === 'completed') loadCompleted(completedDate); }, [tab]);

  const [expanded, setExpanded] = useState(false);

  return (
    <ColoredCard icon="🚚" title="Out For Delivery / Completed / Failed" color="success">
      <KpiStrip>
        <KpiTile icon="🗂️" value={active?.summary?.total ?? '—'} label="Total" colors={colors} scaleFont={scaleFont} />
        <KpiTile icon="⚡" value={active?.summary?.active ?? '—'} label="Active" bg={colors.primaryLight} fg={colors.primary} colors={colors} scaleFont={scaleFont} />
        <KpiTile icon="✅" value={active?.summary?.completed ?? '—'} label="Completed" bg={colors.successLight} fg={colors.success} colors={colors} scaleFont={scaleFont} />
        <KpiTile icon="❌" value={active?.summary?.failed ?? '—'} label="Failed" bg={colors.errorLight} fg={colors.error} colors={colors} scaleFont={scaleFont} />
        <KpiTile icon="⚠️" value={active?.summary?.outdated ?? '—'} label="Outdated Jobs" bg={colors.warningLight} fg={colors.warning} colors={colors} scaleFont={scaleFont} />
      </KpiStrip>

      <ShowHideToggle expanded={expanded} onToggle={() => setExpanded((v) => !v)} colors={colors} scaleFont={scaleFont} />

      {expanded && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[{ key: 'active', label: 'Active Jobs' }, { key: 'completed', label: 'Job Status' }].map((t) => (
              <AnimatedPressable
                key={t.key}
                scaleTo={1.03}
                onPress={() => setTab(t.key)}
                style={[{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border }, tab === t.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              >
                <Text style={{ fontWeight: '700', fontSize: scaleFont(13), color: tab === t.key ? '#fff' : colors.textPrimary }}>{t.label}</Text>
              </AnimatedPressable>
            ))}
          </View>

          {tab === 'active' ? (
            activeLoading ? <ActivityIndicator color={colors.primary} /> : (
              <>
                {(active?.dates || []).length === 0 && <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>No active jobs.</Text>}
                {(active?.dates || []).map((d) => (
                  <Collapsible
                    key={d.jobDate}
                    colors={colors}
                    scaleFont={scaleFont}
                    header={<GroupHeader title={d.jobDate === 'Unscheduled' ? 'Unscheduled' : formatDMY(d.jobDate)} count={d.orders.length} orders={d.orders} exportColumns={JOBS_EXPORT_COLUMNS} sectionName={d.jobDate} colors={colors} scaleFont={scaleFont} />}
                  >
                    <OrdersTable orders={d.orders} variant="jobs" onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
                  </Collapsible>
                ))}
              </>
            )
          ) : (
            <>
              <View style={{ marginBottom: 14, width: 180 }}>
                <DateField value={completedDate} onChange={(v) => { setCompletedDate(v); loadCompleted(v); }} formStyles={formStyles} />
              </View>
              {completedLoading ? <ActivityIndicator color={colors.primary} /> : completed && (
                <>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                    <Badge label="Total" value={completed.summary.total} bg={colors.subtleBackground} fg={colors.textPrimary} scaleFont={scaleFont} />
                    <Badge label="Completed" value={completed.summary.completed} bg={colors.successLight} fg={colors.success} scaleFont={scaleFont} />
                    <Badge label="Not Completed" value={completed.summary.notCompleted} bg={colors.warningLight} fg={colors.warning} scaleFont={scaleFont} />
                  </View>

                  {/* Split by outcome (Completed/Out for Delivery/Failed)
                      instead of one flat mixed list - grfmxstatusupdate's own
                      Completed Jobs tab splits by dispatcher; a single-
                      product partner has no dispatcher concept, so outcome is
                      the equivalent split. All three open by default once
                      this section itself is expanded via Show. */}
                  <Collapsible
                    defaultOpen
                    colors={colors}
                    scaleFont={scaleFont}
                    header={<GroupHeader title="Completed" count={completed.groups.completed.length} orders={completed.groups.completed} exportColumns={JOBS_EXPORT_COLUMNS} sectionName={`Completed ${completed.date}`} colors={colors} scaleFont={scaleFont} />}
                  >
                    <OrdersTable orders={completed.groups.completed} variant="jobs" onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
                  </Collapsible>
                  <Collapsible
                    defaultOpen
                    colors={colors}
                    scaleFont={scaleFont}
                    header={<GroupHeader title="Out for Delivery" count={completed.groups.outForDelivery.length} orders={completed.groups.outForDelivery} exportColumns={JOBS_EXPORT_COLUMNS} sectionName={`Out for Delivery ${completed.date}`} colors={colors} scaleFont={scaleFont} />}
                  >
                    <OrdersTable orders={completed.groups.outForDelivery} variant="jobs" onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
                  </Collapsible>
                  <Collapsible
                    defaultOpen
                    colors={colors}
                    scaleFont={scaleFont}
                    header={<GroupHeader title="Failed" count={completed.groups.failed.length} orders={completed.groups.failed} exportColumns={JOBS_EXPORT_COLUMNS} sectionName={`Failed ${completed.date}`} colors={colors} scaleFont={scaleFont} />}
                  >
                    <OrdersTable orders={completed.groups.failed} variant="jobs" onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
                  </Collapsible>
                </>
              )}
            </>
          )}
        </>
      )}
    </ColoredCard>
  );
}

// ---- New Orders / Incomplete Scan ----
function NewOrdersCard({ token, onOpenTracking, colors, scaleFont }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/partner/incomplete-scan', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.error || 'Failed to load.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <ColoredCard icon="📥" title="New Orders — Not Yet Scanned In Warehouse" color="primary">
      {loading && <ActivityIndicator color={colors.primary} />}
      {!loading && error && <Text style={{ color: colors.error }}>{error}</Text>}
      {!loading && !error && (
        <>
          <KpiStrip>
            <KpiTile icon="📦" value={data?.totalCount ?? 0} label={(user?.role || '').toUpperCase()} colors={colors} scaleFont={scaleFont} />
          </KpiStrip>

          <ShowHideToggle expanded={expanded} onToggle={() => setExpanded((v) => !v)} colors={colors} scaleFont={scaleFont} />

          {expanded && (
            <>
              {(data?.groups || []).length === 0 && <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>Nothing incomplete right now.</Text>}
              {(data?.groups || []).map((g) => {
                const badge = incompleteScanAgeColors(g.maxAge, colors);
                return (
                  <Collapsible
                    key={g.mawbNo}
                    colors={colors}
                    scaleFont={scaleFont}
                    header={
                      <GroupHeader
                        title={`MAWB: ${g.mawbNo}`}
                        extra={<Badge label="Max Age" value={`${g.maxAge}d`} bg={badge.bg} fg={badge.fg} scaleFont={scaleFont} />}
                        count={g.orders.length}
                        orders={g.orders}
                        exportColumns={SCAN_EXPORT_COLUMNS}
                        sectionName={`MAWB ${g.mawbNo}`}
                        colors={colors}
                        scaleFont={scaleFont}
                      />
                    }
                  >
                    <OrdersTable orders={g.orders} variant="scan" onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
                  </Collapsible>
                );
              })}
            </>
          )}
        </>
      )}
    </ColoredCard>
  );
}

export default function PartnerDashboard() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { scaleFont } = useDenseFontScale();
  const formStyles = useFormStyles();
  const [openTracking, setOpenTracking] = useState(null);

  if (!token) return null;

  const pageContent = (
    <View style={{ width: '100%', maxWidth: WIDE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24 }}>
      <Text style={[formStyles.title, { fontSize: scaleFont(26), marginBottom: 28 }]}>Dashboard</Text>

      <TrackingSearchCard token={token} onOpenTracking={setOpenTracking} colors={colors} scaleFont={scaleFont} formStyles={formStyles} />
      <WarehouseCard token={token} onOpenTracking={setOpenTracking} colors={colors} scaleFont={scaleFont} />
      <ActiveCompletedCard token={token} onOpenTracking={setOpenTracking} colors={colors} scaleFont={scaleFont} formStyles={formStyles} />
      <NewOrdersCard token={token} onOpenTracking={setOpenTracking} colors={colors} scaleFont={scaleFont} />
    </View>
  );

  return (
    <>
      <PageScroll title="Dashboard" beforeContent={pageContent} />
      <TrackingDetailModal trackingNumber={openTracking} token={token} onClose={() => setOpenTracking(null)} onOpenTracking={setOpenTracking} />
    </>
  );
}
