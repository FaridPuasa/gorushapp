// Small presentational primitives shared by the partner Dashboard, Search
// Jobs, and TrackingDetailModal - pulled out once these 3 files all needed
// the same Section/DetailField/Badge/date-format helpers, rather than
// tripling the duplication jpmc-portal.js's single-file convention would
// otherwise produce.
import React from 'react';
import { Text, View } from 'react-native';
import { useFontScale } from '../context/FontScaleContext';

// A gentler S/M/L growth curve for this dense, table-heavy page than the
// app-wide one (FontScaleContext's web multipliers are 1.0/1.3/1.6 - tuned
// for spaced-out marketing/form pages, not a page built around packed data
// tables). Still reads and follows the user's real S/M/L choice (same
// context, same stored preference) - just scales text up more gently so M/L
// don't blow out these tables, while S (already 1.0x app-wide) is unchanged.
const DENSE_MULTIPLIERS = { small: 1.0, regular: 1.1, large: 1.2 };
export function useDenseFontScale() {
  const { scale } = useFontScale();
  const scaleFont = (base) => Math.round(base * (DENSE_MULTIPLIERS[scale] ?? 1));
  return { scaleFont };
}

export function formatDMY(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}
// Partners get one combined "Warehouse" rather than the K1 (Kiulap) / K2
// (Jangsak) split - same simplification already applied to the Warehouse
// section's own summary/tabs, applied here too everywhere a location string
// is shown (Shipment Info, Status History).
export function displayLocation(value) {
  if (value === 'Warehouse K1' || value === 'Warehouse K2') return 'Warehouse';
  return value;
}

// grfmxstatusupdate's own GDEX API integration never reports a person's name
// as a tracking location - its locationdescription field (what Go Rush
// actually pushes to GDEX's tracking system, index.js's
// sendGDEXTrackingWebhook call sites + FGA_TRACKED_MILESTONE_MAP) uses fixed,
// generic labels per status instead: "Brunei Customs" for On Hold/Custom
// Clearing, "Go Rush Driver" for Out for Delivery, "Go Rush Kiulap Office"
// for Self Collect, "Go Rush Warehouse" for a Failed Delivery push, and the
// real delivery address (or "Go Rush Kiulap Office" again if the job method
// was self-collect) for Completed. For internally-dispatched (non-GDEX)
// products the SAME statuses instead store the dispatcher/driver's literal
// name in lastLocation - this applies GDEX's own convention across every
// product instead, so partners always see a real place, never a person.
const GDEX_STYLE_LOCATION_BY_STATUS = {
  'on hold': 'Brunei Customs',
  'custom clearing': 'Brunei Customs',
  'custom clearance': 'Brunei Customs',
  'out for delivery': 'Go Rush Driver',
  'self collect': 'Go Rush Kiulap Office',
  'failed delivery': 'Go Rush Warehouse',
};
// `order` (optional) - the order/result object, needed only for the
// Completed case (real address, or self-collect office) since that's the one
// status GDEX's own integration doesn't use a fixed label for.
export function gdexStyleLocation(rawLocation, status, order) {
  const s = (status || '').toLowerCase();
  if (s === 'completed') {
    const isSelfCollect = (order?.jobMethod || '').toLowerCase().includes('self collect');
    return isSelfCollect ? 'Go Rush Kiulap Office' : (order?.receiverAddress || 'Customer Address');
  }
  const override = GDEX_STYLE_LOCATION_BY_STATUS[s];
  if (override) return override;
  return displayLocation(rawLocation);
}

export function Badge({ label, value, bg, fg, scaleFont }) {
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: bg }}>
      <Text style={{ fontSize: scaleFont(12), fontWeight: '700', color: fg }} numberOfLines={1}>{label ? `${label}: ` : ''}{value ?? '—'}</Text>
    </View>
  );
}

export function Section({ icon, title, children, colors, scaleFont }) {
  return (
    <View style={{ backgroundColor: colors.subtleBackground || colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 }}>
      <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>{icon} {title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, rowGap: 14 }}>{children}</View>
    </View>
  );
}

// A fixed-width slot (not flexGrow-to-fill) - grfmxstatusupdate's own
// Shipment Info/Customer Info cards lay fields out in clean, equal-width
// columns that wrap to a new row together; the previous flexGrow approach
// let each field's own content width decide its column width, so differently-
// sized neighbors (e.g. "Attempt": "1" next to "Job Created Date":
// "07.10.2026") never lined up into a grid at all. `minWidth` here is really
// "this field's column width" - still named minWidth for every existing call
// site, but no longer stretches to fill leftover row space.
export function DetailField({ label, value, minWidth = 150, maxWidth, colors, scaleFont }) {
  return (
    <View style={{ width: minWidth, maxWidth: maxWidth || minWidth, flexShrink: 0 }}>
      <Text style={{ fontSize: scaleFont(10), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: scaleFont(14), fontWeight: '600', color: colors.textPrimary }}>{value ?? '—'}</Text>
    </View>
  );
}

// Web-only native date input (a real calendar picker instead of a free-text
// "type YYYY-MM-DD and hope" field) - shared by Search Jobs and the
// dashboard's Completed/Job Status date field.
export function DateField({ value, onChange, formStyles }) {
  return (
    <input
      type="date"
      value={value || ''}
      style={formStyles.webDatePicker}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
