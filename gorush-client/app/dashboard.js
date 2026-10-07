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
import { Text, TextInput, View, ActivityIndicator, ScrollView } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable } from '../lib/animations';
import { copyTrackingNumbers, exportOrdersToExcel } from '../lib/partnerExport';
import { Badge, formatDMY } from '../lib/partnerUi';
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
        <ToolbarButton label="📋 Copy" doneLabel="Copied!" colors={colors} scaleFont={scaleFont} onPress={() => copyTrackingNumbers(orders)} />
        <ToolbarButton label="📊 Excel" doneLabel="Done" colors={colors} scaleFont={scaleFont} variant="success" onPress={() => exportOrdersToExcel(orders, exportColumns, sectionName)} />
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
  { key: 'ageDays', label: 'Age', width: 90 },
  { key: 'doTrackingNumber', label: 'Tracking Number', width: 130 },
  { key: 'attempt', label: 'Attempt', width: 80 },
  { key: 'latestReason', label: 'Latest Reason', width: 170 },
  { key: 'receiverAddress', label: 'Address', width: 220 },
  { key: 'area', label: 'Area', width: 80 },
  { key: 'receiverName', label: 'Name', width: 140 },
  { key: 'receiverPhoneNumber', label: 'Main Phone', width: 120 },
  { key: 'customerRemark', label: 'Customer Remark', width: 160 },
  { key: 'goRushRemark', label: 'Go Rush Remark', width: 160 },
];
// Incomplete Scan's narrower column set (no Age/Attempt/Reason/Remark columns
// per row - age is shown only on the MAWB group header, same as the original).
const SCAN_EXPORT_COLUMNS = [
  { key: 'doTrackingNumber', label: 'Tracking Number', width: 130 },
  { key: 'receiverAddress', label: 'Address', width: 220 },
  { key: 'area', label: 'Area', width: 80 },
  { key: 'receiverName', label: 'Name', width: 140 },
  { key: 'receiverPhoneNumber', label: 'Main Phone', width: 120 },
];

// Real table (header row + body rows), not the card-per-row layout - matches
// grfmxstatusupdate's actual warehouse tables rather than jpmc-portal's
// style. Tracking numbers are clickable, opening the same tracking-detail
// popup the Search Tracking Number card uses. Column widths live once on
// each column definition above (FULL_EXPORT_COLUMNS/SCAN_EXPORT_COLUMNS) so
// the header row and body rows can never drift out of alignment with each
// other.
function OrdersTable({ orders, variant = 'full', onOpenTracking, colors, scaleFont }) {
  const { mode } = useTheme();
  const columns = variant === 'scan' ? SCAN_EXPORT_COLUMNS : FULL_EXPORT_COLUMNS;
  if (!orders || orders.length === 0) {
    return <Text style={{ fontSize: scaleFont(13), color: colors.textMuted, fontStyle: 'italic', padding: 8 }}>No orders.</Text>;
  }
  return (
    <ScrollView horizontal>
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden', minWidth: '100%' }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.subtleBackground, paddingVertical: 8 }}>
          {columns.map((c) => (
            <Text key={c.key} style={{ width: c.width, paddingHorizontal: 8, fontSize: scaleFont(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }} numberOfLines={1}>{c.label}</Text>
          ))}
        </View>
        {orders.map((o, i) => {
          const age = rowAgeColors(o.ageDays, colors);
          const groupBg = groupRowColor(o.groupColorIdx, mode);
          return (
            <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, backgroundColor: groupBg || (i % 2 === 1 ? colors.subtleBackground : colors.card), borderTopWidth: 1, borderTopColor: colors.border }}>
              {columns.map((c) => {
                if (c.key === 'ageDays') {
                  return (
                    <View key={c.key} style={{ width: c.width, paddingHorizontal: 8 }}>
                      <Badge label={null} value={o.ageDays != null ? `${o.ageDays} days` : '—'} bg={age.bg} fg={age.fg} scaleFont={scaleFont} />
                    </View>
                  );
                }
                if (c.key === 'doTrackingNumber') {
                  return (
                    <View key={c.key} style={{ width: c.width, paddingHorizontal: 8 }}>
                      <AnimatedPressable scaleTo={1.0} onPress={() => onOpenTracking(o.doTrackingNumber)}>
                        <Text style={{ fontSize: scaleFont(12), color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }} numberOfLines={1}>{o.doTrackingNumber}</Text>
                      </AnimatedPressable>
                    </View>
                  );
                }
                return (
                  <Text key={c.key} style={{ width: c.width, paddingHorizontal: 8, fontSize: scaleFont(12), color: colors.textPrimary }} numberOfLines={3}>
                    {o[c.key] ?? '—'}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
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
    <Card icon="🏭" title="Go Rush Warehouse">
      <KpiStrip>
        <KpiTile icon="📦" value={data?.summary?.current ?? '—'} label="Current" colors={colors} scaleFont={scaleFont} />
        <KpiTile icon="⛔" value={data?.summary?.noAttempt ?? '—'} label="No Attempt" colors={colors} scaleFont={scaleFont} />
      </KpiStrip>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {[{ key: 'current', label: 'Current' }, { key: 'noAttempt', label: 'No Attempt' }].map((t) => (
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
    </Card>
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

  return (
    <Card icon="🚚" title="In Progress / Completed">
      <KpiStrip>
        <KpiTile icon="🗂️" value={active?.summary?.total ?? '—'} label="Total" colors={colors} scaleFont={scaleFont} />
        <KpiTile icon="⚡" value={active?.summary?.active ?? '—'} label="Active" bg={colors.primaryLight} fg={colors.primary} colors={colors} scaleFont={scaleFont} />
        <KpiTile icon="✅" value={active?.summary?.completed ?? '—'} label="Completed" bg={colors.successLight} fg={colors.success} colors={colors} scaleFont={scaleFont} />
        <KpiTile icon="❌" value={active?.summary?.failed ?? '—'} label="Failed" bg={colors.errorLight} fg={colors.error} colors={colors} scaleFont={scaleFont} />
        <KpiTile icon="⚠️" value={active?.summary?.outdated ?? '—'} label="Outdated Jobs" bg={colors.warningLight} fg={colors.warning} colors={colors} scaleFont={scaleFont} />
      </KpiStrip>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {[{ key: 'active', label: 'Active Jobs' }, { key: 'completed', label: 'Completed Jobs' }].map((t) => (
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
                header={<GroupHeader title={d.jobDate === 'Unscheduled' ? 'Unscheduled' : formatDMY(d.jobDate)} count={d.orders.length} orders={d.orders} exportColumns={FULL_EXPORT_COLUMNS} sectionName={d.jobDate} colors={colors} scaleFont={scaleFont} />}
              >
                <OrdersTable orders={d.orders} onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
              </Collapsible>
            ))}
          </>
        )
      ) : (
        <>
          <View style={{ marginBottom: 14 }}>
            <TextInput
              style={[formStyles.input, { width: 180 }]}
              value={completedDate}
              onChangeText={(v) => setCompletedDate(v)}
              onEndEditing={() => loadCompleted(completedDate)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          {completedLoading ? <ActivityIndicator color={colors.primary} /> : completed && (
            <Collapsible
              defaultOpen
              colors={colors}
              scaleFont={scaleFont}
              header={
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Badge label="Total" value={completed.summary.total} bg={colors.subtleBackground} fg={colors.textPrimary} scaleFont={scaleFont} />
                    <Badge label="Completed" value={completed.summary.completed} bg={colors.successLight} fg={colors.success} scaleFont={scaleFont} />
                    <Badge label="Not Completed" value={completed.summary.notCompleted} bg={colors.warningLight} fg={colors.warning} scaleFont={scaleFont} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <ToolbarButton label="📋 Copy" doneLabel="Copied!" colors={colors} scaleFont={scaleFont} onPress={() => copyTrackingNumbers(completed.orders)} />
                    <ToolbarButton label="📊 Excel" doneLabel="Done" variant="success" colors={colors} scaleFont={scaleFont} onPress={() => exportOrdersToExcel(completed.orders, FULL_EXPORT_COLUMNS, `Completed Jobs ${completed.date}`)} />
                  </View>
                </View>
              }
            >
              <OrdersTable orders={completed.orders} onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
            </Collapsible>
          )}
        </>
      )}
    </Card>
  );
}

// ---- New Orders / Incomplete Scan ----
function NewOrdersCard({ token, onOpenTracking, colors, scaleFont }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/api/partner/incomplete-scan', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.error || 'Failed to load.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <Card icon="📥" title="New Orders — Incomplete Scan In Warehouse">
      {loading && <ActivityIndicator color={colors.primary} />}
      {!loading && error && <Text style={{ color: colors.error }}>{error}</Text>}
      {!loading && !error && (
        <>
          <KpiStrip>
            <KpiTile icon="📦" value={data?.totalCount ?? 0} label={(user?.role || '').toUpperCase()} colors={colors} scaleFont={scaleFont} />
          </KpiStrip>
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
    </Card>
  );
}

export default function PartnerDashboard() {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const formStyles = useFormStyles();
  const [openTracking, setOpenTracking] = useState(null);

  if (!token) return null;

  const pageContent = (
    <View style={{ width: '100%', maxWidth: WIDE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24 }}>
      <Text style={[formStyles.title, { fontSize: scaleFont(26) }]}>Dashboard</Text>
      <Text style={[formStyles.subtitle, { fontSize: scaleFont(14) }]}>{user?.role ? user.role.toUpperCase() : ''} orders</Text>

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
