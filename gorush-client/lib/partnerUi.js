// Small presentational primitives shared by the partner Dashboard, Search
// Jobs, and TrackingDetailModal - pulled out once these 3 files all needed
// the same Section/DetailField/Badge/date-format helpers, rather than
// tripling the duplication jpmc-portal.js's single-file convention would
// otherwise produce.
import React from 'react';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './animations';

export function formatDMY(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}
export function formatTime12(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}${ampm}`;
}
export function formatDMYTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDMY(value)} ${formatTime12(value)}`;
}

const HISTORY_ICONS = {
  'info received': 'ℹ️', 'at warehouse': '🏢', 'in sorting area': '🗂️',
  'out for delivery': '🚚', 'self collect': '🙋', 'completed': '✅',
  'cancelled': '✖️', 'return to warehouse': '↩️', 'on hold': '⏸️',
  'custom clearing': '🛃', 'custom clearance': '🛃',
};
export function historyIcon(status) {
  return HISTORY_ICONS[(status || '').toLowerCase()] || '📍';
}

export function Badge({ label, value, bg, fg, scaleFont }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: bg }}>
      <Text style={{ fontSize: scaleFont(12), fontWeight: '700', color: fg }}>{label ? `${label}: ` : ''}{value ?? '—'}</Text>
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

// A tracking number rendered as a clickable link - every table in the
// partner portal uses this instead of plain text, matching
// grfmxstatusupdate's own always-clickable tracking numbers (clicking opens
// TrackingDetailModal for that order instead of navigating anywhere).
export function TrackingLink({ trackingNumber, onPress, colors, scaleFont, style }) {
  if (!trackingNumber || !onPress) return <Text style={[{ fontSize: scaleFont(12), color: colors.textPrimary }, style]}>{trackingNumber ?? '—'}</Text>;
  return (
    <AnimatedPressable scaleTo={1.0} onPress={() => onPress(trackingNumber)}>
      <Text style={[{ fontSize: scaleFont(12), color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }, style]}>{trackingNumber}</Text>
    </AnimatedPressable>
  );
}
