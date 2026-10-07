// Partner dashboard (pdu/mglobal/ewe) - a cut-down React reimplementation of
// grfmxstatusupdate's dashboard.ejs sections (Search Tracking Number,
// Warehouse, In Progress/Completed, New Orders), scoped server-side to the
// logged-in partner's own product (see gorush-server/routes/partnerPortal.js).
// Built with the same primitives/visual language jpmc-portal.js already
// established for this app's one other staff-like portal page, not a literal
// port of the EJS/Bootstrap markup - see the project plan's "Key
// interpretation" note.
import React, { useState, useCallback, useEffect } from 'react';
import { Text, TextInput, View, ActivityIndicator, ScrollView } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable } from '../lib/animations';

const WIDE_MAX_WIDTH = 1400;

function formatDMY(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}
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

function Badge({ label, value, bg, fg, scaleFont }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: bg }}>
      <Text style={{ fontSize: scaleFont(12), fontWeight: '700', color: fg }}>{label ? `${label}: ` : ''}{value ?? '—'}</Text>
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

function DetailField({ label, value, minWidth = 140, maxWidth = '100%', colors, scaleFont }) {
  return (
    <View style={{ minWidth, maxWidth, flexGrow: 1, flexShrink: 1 }}>
      <Text style={{ fontSize: scaleFont(10), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: scaleFont(14), fontWeight: '600', color: colors.textPrimary, flexShrink: 1 }}>{value ?? '—'}</Text>
    </View>
  );
}

// Collapsible panel - the single building block every group level (MAWB,
// Area, date) in this page uses, so the "tap header to expand" behavior and
// chevron are consistent everywhere.
function Collapsible({ header, children, defaultOpen = false, colors, scaleFont }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <AnimatedPressable
        scaleTo={1.0}
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: colors.card }}
      >
        {header}
        <Text style={{ fontSize: scaleFont(14), color: colors.textMuted }}>{open ? '▴' : '▾'}</Text>
      </AnimatedPressable>
      {open && <View style={{ padding: 12, paddingTop: 0 }}>{children}</View>}
    </View>
  );
}

// Shared order-row table - which columns render is controlled by the caller
// per section, since Current/No Attempt/Incomplete Scan/Active/Completed
// each show a slightly different subset (matches grfmxstatusupdate's own
// warehouseAreaCards.ejs/warehouseMethodTables.ejs convention of varying the
// column set per tab rather than one fixed table everywhere).
function OrdersTable({ orders, showAge, showAttempt, showReason, showArea, colors, scaleFont }) {
  if (!orders || orders.length === 0) {
    return <Text style={{ fontSize: scaleFont(13), color: colors.textMuted, fontStyle: 'italic', padding: 8 }}>No orders.</Text>;
  }
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }}>
      {orders.map((o, i) => {
        const age = rowAgeColors(o.ageDays, colors);
        return (
          <View key={o.id} style={{ padding: 10, backgroundColor: i % 2 === 1 ? colors.subtleBackground : colors.card, borderBottomWidth: i === orders.length - 1 ? 0 : 1, borderBottomColor: colors.border, flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            {showAge && <Badge label="Age" value={o.ageDays != null ? `${o.ageDays}d` : '—'} bg={age.bg} fg={age.fg} scaleFont={scaleFont} />}
            <DetailField label="Tracking No." value={o.doTrackingNumber} minWidth={130} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Name" value={o.receiverName} minWidth={140} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Main Phone" value={o.receiverPhoneNumber} minWidth={110} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Address" value={o.receiverAddress} minWidth={200} maxWidth={320} colors={colors} scaleFont={scaleFont} />
            {showArea && <DetailField label="Area" value={o.area} minWidth={70} colors={colors} scaleFont={scaleFont} />}
            {showAttempt && <DetailField label="Attempt" value={o.attempt ?? 0} minWidth={60} colors={colors} scaleFont={scaleFont} />}
            {showReason && <DetailField label="Latest Reason" value={o.latestReason} minWidth={160} maxWidth={240} colors={colors} scaleFont={scaleFont} />}
            <DetailField label="Remark" value={o.remarks} minWidth={160} maxWidth={240} colors={colors} scaleFont={scaleFont} />
          </View>
        );
      })}
    </View>
  );
}

function MawbGroupHeader({ mawbNo, maxAge, count, colors, scaleFont }) {
  const badge = mawbAgeColors(maxAge, colors);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: scaleFont(14), fontWeight: '700', color: colors.textPrimary }}>MAWB: {mawbNo}</Text>
      <Badge label={null} value={`${count} order${count === 1 ? '' : 's'}`} bg={colors.subtleBackground} fg={colors.textSecondary} scaleFont={scaleFont} />
      <Badge label="Max Age" value={`${maxAge}d`} bg={badge.bg} fg={badge.fg} scaleFont={scaleFont} />
    </View>
  );
}

// ---- Search Tracking Number ----
function TrackingSearchCard({ token, colors, scaleFont, formStyles }) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!value.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get(`/api/partner/tracking/${encodeURIComponent(value.trim())}`, { headers: { Authorization: `Bearer ${token}` } });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to search.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card icon="🔍" title="Search Tracking Number">
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
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

      {error ? <Text style={formStyles.fieldError}>{error}</Text> : null}

      {result && (
        <View>
          <Text style={{ fontSize: scaleFont(18), fontWeight: '700', color: colors.textPrimary, marginBottom: 10 }}>{result.doTrackingNumber}</Text>
          <Section icon="📦" title="Shipment Info" colors={colors} scaleFont={scaleFont}>
            <DetailField label="Job Status" value={result.currentStatus} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Latest Location" value={result.latestLocation} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Attempt" value={result.attempt ?? 0} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Job Date" value={formatDMY(result.jobDate)} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Job Created Date" value={formatDMY(result.creationDate)} colors={colors} scaleFont={scaleFont} />
            <DetailField label="MAWB No." value={result.mawbNo} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Latest Reason" value={result.latestReason} colors={colors} scaleFont={scaleFont} />
          </Section>
          <Section icon="👤" title="Customer Info" colors={colors} scaleFont={scaleFont}>
            <DetailField label="Name" value={result.receiverName} minWidth={180} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Main Phone No." value={result.receiverPhoneNumber} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Address" value={result.receiverAddress} minWidth={260} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Postal Code" value={result.receiverPostalCode} colors={colors} scaleFont={scaleFont} />
            <DetailField label="Area" value={result.area} colors={colors} scaleFont={scaleFont} />
          </Section>
          <Section icon="💬" title="Remarks" colors={colors} scaleFont={scaleFont}>
            <DetailField label="Customer Remark" value={result.remarks} minWidth={260} colors={colors} scaleFont={scaleFont} />
          </Section>

          {result.history?.length > 0 && (
            <Section icon="🕒" title="Status History" colors={colors} scaleFont={scaleFont}>
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ width: '100%' }}>
                <View style={{ flexDirection: 'row' }}>
                  {result.history.map((h, i) => {
                    const isCurrent = i === result.history.length - 1;
                    return (
                      <View key={i} style={{ width: 170, paddingRight: 12 }}>
                        <Text style={{ fontSize: scaleFont(13), fontWeight: '700', color: isCurrent ? colors.primary : colors.textPrimary }}>{h.status || '—'}</Text>
                        <Text style={{ fontSize: scaleFont(12), color: colors.textMuted, marginTop: 2 }}>{formatDMYTime(h.dateUpdated)}</Text>
                        {h.reason ? <Text style={{ fontSize: scaleFont(11), color: colors.textSecondary, marginTop: 2 }}>{h.reason}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </Section>
          )}
        </View>
      )}
    </Card>
  );
}

// ---- Warehouse ----
function WarehouseCard({ token, colors, scaleFont }) {
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
    <Card icon="🏭" title="Warehouse">
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
        const count = tab === 'current' ? g.areas.reduce((sum, a) => sum + a.orders.length, 0) : g.orders.length;
        return (
          <Collapsible key={g.mawbNo} colors={colors} scaleFont={scaleFont} header={<MawbGroupHeader mawbNo={g.mawbNo} maxAge={g.maxAge} count={count} colors={colors} scaleFont={scaleFont} />}>
            {tab === 'current' ? (
              g.areas.map((a) => (
                <Collapsible key={a.area} colors={colors} scaleFont={scaleFont} header={<Text style={{ fontWeight: '700', fontSize: scaleFont(13), color: colors.textPrimary }}>Area: {a.area} ({a.orders.length})</Text>}>
                  <OrdersTable orders={a.orders} showAge showAttempt showReason colors={colors} scaleFont={scaleFont} />
                </Collapsible>
              ))
            ) : (
              <OrdersTable orders={g.orders} showAge showAttempt showReason colors={colors} scaleFont={scaleFont} />
            )}
          </Collapsible>
        );
      })}
    </Card>
  );
}

// ---- In Progress / Completed ----
function ActiveCompletedCard({ token, colors, scaleFont, formStyles }) {
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
            {active?.outdatedCount > 0 && (
              <View style={{ marginBottom: 12 }}><Badge label="Outdated Jobs" value={active.outdatedCount} bg={colors.errorLight} fg={colors.error} scaleFont={scaleFont} /></View>
            )}
            {(active?.dates || []).length === 0 && <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>No active jobs.</Text>}
            {(active?.dates || []).map((d) => (
              <Collapsible key={d.jobDate} colors={colors} scaleFont={scaleFont} header={<Text style={{ fontWeight: '700', fontSize: scaleFont(13), color: colors.textPrimary }}>{d.jobDate === 'Unscheduled' ? 'Unscheduled' : formatDMY(d.jobDate)} ({d.orders.length})</Text>}>
                <OrdersTable orders={d.orders} colors={colors} scaleFont={scaleFont} />
              </Collapsible>
            ))}
          </>
        )
      ) : (
        <>
          <View style={{ marginBottom: 14 }}>
            {/* Simple web-friendly date input, consistent with jpmc-portal.js's DateField pattern. */}
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
              defaultOpen={false}
              colors={colors}
              scaleFont={scaleFont}
              header={
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Badge label="Total" value={completed.summary.total} bg={colors.subtleBackground} fg={colors.textPrimary} scaleFont={scaleFont} />
                  <Badge label="Completed" value={completed.summary.completed} bg={colors.successLight} fg={colors.success} scaleFont={scaleFont} />
                  <Badge label="Not Completed" value={completed.summary.notCompleted} bg={colors.warningLight} fg={colors.warning} scaleFont={scaleFont} />
                </View>
              }
            >
              <OrdersTable orders={completed.orders} colors={colors} scaleFont={scaleFont} />
            </Collapsible>
          )}
        </>
      )}
    </Card>
  );
}

// ---- New Orders / Incomplete Scan ----
function NewOrdersCard({ token, colors, scaleFont }) {
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
          <View style={{ marginBottom: 12 }}>
            <Badge label="Total" value={data?.totalCount ?? 0} bg={colors.subtleBackground} fg={colors.textPrimary} scaleFont={scaleFont} />
          </View>
          {(data?.groups || []).length === 0 && <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>Nothing incomplete right now.</Text>}
          {(data?.groups || []).map((g) => {
            const badge = incompleteScanAgeColors(g.maxAge, colors);
            return (
              <Collapsible
                key={g.mawbNo}
                colors={colors}
                scaleFont={scaleFont}
                header={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: scaleFont(14), fontWeight: '700', color: colors.textPrimary }}>MAWB: {g.mawbNo}</Text>
                    <Badge label={null} value={`${g.orders.length} order${g.orders.length === 1 ? '' : 's'}`} bg={colors.subtleBackground} fg={colors.textSecondary} scaleFont={scaleFont} />
                    <Badge label="Max Age" value={`${g.maxAge}d`} bg={badge.bg} fg={badge.fg} scaleFont={scaleFont} />
                  </View>
                }
              >
                <OrdersTable orders={g.orders} colors={colors} scaleFont={scaleFont} />
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

  const pageContent = (
    <View style={{ width: '100%', maxWidth: WIDE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24 }}>
      <Text style={[formStyles.title, { fontSize: scaleFont(26) }]}>Dashboard</Text>
      <Text style={[formStyles.subtitle, { fontSize: scaleFont(14) }]}>{user?.role ? user.role.toUpperCase() : ''} orders</Text>
    </View>
  );

  if (!token) return null;

  return (
    <PageScroll title="Dashboard" beforeContent={pageContent}>
      <TrackingSearchCard token={token} colors={colors} scaleFont={scaleFont} formStyles={formStyles} />
      <WarehouseCard token={token} colors={colors} scaleFont={scaleFont} />
      <ActiveCompletedCard token={token} colors={colors} scaleFont={scaleFont} formStyles={formStyles} />
      <NewOrdersCard token={token} colors={colors} scaleFont={scaleFont} />
    </PageScroll>
  );
}
