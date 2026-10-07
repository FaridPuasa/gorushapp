// Small presentational primitives shared by the partner Dashboard, Search
// Jobs, and TrackingDetailModal - pulled out once these 3 files all needed
// the same Section/DetailField/Badge/date-format helpers, rather than
// tripling the duplication jpmc-portal.js's single-file convention would
// otherwise produce.
import React from 'react';
import { Text, View } from 'react-native';

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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 12 }}>{children}</View>
    </View>
  );
}

export function DetailField({ label, value, minWidth = 140, maxWidth = '100%', colors, scaleFont }) {
  return (
    <View style={{ minWidth, maxWidth, flexGrow: 1, flexShrink: 1 }}>
      <Text style={{ fontSize: scaleFont(10), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: scaleFont(14), fontWeight: '600', color: colors.textPrimary, flexShrink: 1 }}>{value ?? '—'}</Text>
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
