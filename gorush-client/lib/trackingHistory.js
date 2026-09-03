// Shared tracking-history pipeline and formatting, extracted so both the Home page's
// TrackingLookup and My Orders' per-row "Track Order" popup can turn a
// GET /api/orders/track/:trackingNumber response into the same timeline/legend without
// duplicating this logic.

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatHistoryDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${hours}:${mm} ${ampm}`;
}

// The server returns history[] verbatim from Mongo — our own orders label each entry via
// statusHistory. The shared collection's legacy shape has no status field at all, only a
// reason (and per Detrack's own field docs, "reason" is specifically for job failures) —
// so a real (non-"N/A") reason on one of those entries usually means it's a failed attempt.
export function historyReason(entry) {
  return entry.reason && entry.reason.toUpperCase() !== 'N/A' ? entry.reason : null;
}

// ...except some reason-only entries are actually internal audit notes about the job's own
// metadata changing — its dispatch date being corrected, its AWB number or warehouse location
// being updated — not a real failed-delivery reason at all, e.g. real data has shown up as
// "AWB number updated to 807-22561884.", "Warehouse location updated to Warehouse K1.", and
// "Dispatched job with date 2026-08-05 (before today) - updated date to 2026-08-06 (Job Owner:
// Unknown)". None of that is customer-facing, so it's filtered out of the timeline entirely
// rather than shown as a bogus "Failed" step.
const INTERNAL_NOTE_RE = /\bupdated\b/i;

export function isInternalNote(entry) {
  return !entry.statusHistory && historyReason(entry) && INTERNAL_NOTE_RE.test(entry.reason);
}

// The allowlist of genuine, customer-facing delivery statuses a history entry's
// statusHistory field can carry. Anything else is an internal audit note logged by the
// admin backend (grfmxstatusupdate) against the same shared history array — e.g.
// "Weight Updated", "Payment Method Updated", "Area Updated", "Address Updated",
// "Phone Number Updated", "Customer Name Updated", "Job Date Updated", "Postal Code
// Updated", "Job Method Updated", "Warehouse Location Updated", "Go Rush Remark
// Updated", "Remark Updated", and dispatcher assignment/change entries. Those aren't
// delivery events at all, so unlike isInternalNote() above (which only catches
// reason-only entries with no statusHistory), this must gate on statusHistory itself —
// canonicalStatus() returns entry.statusHistory verbatim whenever it's set, so without
// this allowlist any audit label logged there leaks straight into the customer-facing
// timeline and "Current Status" as if it were a real delivery step. Matched
// case-insensitively, same as getStatusStyle() and the dedupe/collapse logic below.
const ALLOWED_DELIVERY_STATUSES = new Set([
  'info received', 'at warehouse', 'out for delivery',
  'failed delivery', 'failed', 'return to warehouse', 'completed',
  // Both spellings: real data has shown up as "Custom Clearing" (see getStatusStyle below),
  // but "Custom Clearance" is also used (STATUS_ORDER, translations, EARLIEST_ONLY_STATUSES).
  'custom clearance', 'custom clearing',
  'on hold', 'in sorting area', 'self collect', 'cancelled',
  'disposed', 'return',
]);

export function isDisallowedStatusHistory(entry) {
  return Boolean(entry.statusHistory) && !ALLOWED_DELIVERY_STATUSES.has(entry.statusHistory.toLowerCase());
}

export function canonicalStatus(entry, fallback) {
  if (entry.statusHistory) return entry.statusHistory;
  if (historyReason(entry)) return 'Failed';
  return fallback;
}

// A status repeated back-to-back with nothing different logged in between isn't a separate
// event (e.g. our own insert and the external watcher's enrichment both writing "Info
// Received", or a re-sync re-logging "Out For Delivery" the same day) — collapse each such run
// to a single entry. Which occurrence survives depends on the status: for most, the *first*
// time it was reached is what matters; "Out For Delivery" is the opposite — a later re-log is a
// real refresh of "still out for delivery", so the latest one should win. A status that recurs
// only after a genuinely different status came between the two occurrences is a real separate
// event either way, and both stay.
// Lowercased — real data's exact casing isn't guaranteed (the legacy system writes "Out for
// Delivery", not "Out For Delivery"), so both the "is this the same status as last time" check
// and this list need to compare case-insensitively, same as getStatusStyle() below.
const LATEST_WINS_STATUSES = ['out for delivery'];

export function dedupeHistory(entries, fallbackLabel) {
  const sorted = [...entries].sort((a, b) => new Date(a.dateUpdated) - new Date(b.dateUpdated));
  const seenExact = new Set();
  const deduped = [];

  for (const entry of sorted) {
    const label = canonicalStatus(entry, fallbackLabel);
    const normalized = label.toLowerCase();
    const exactKey = `${normalized}|${entry.dateUpdated}`;
    if (seenExact.has(exactKey)) continue;
    seenExact.add(exactKey);

    const last = deduped[deduped.length - 1];
    if (last && canonicalStatus(last, fallbackLabel).toLowerCase() === normalized) {
      if (LATEST_WINS_STATUSES.includes(normalized)) {
        deduped[deduped.length - 1] = entry;
      }
      continue;
    }

    deduped.push(entry);
  }

  return deduped;
}

// Unlike the consecutive-run collapsing above (which only merges a status with itself when
// it repeats back-to-back), these three statuses should collapse to their earliest
// occurrence globally — even if a genuinely different status came in between — since a
// later re-log of "Custom Clearance"/"At Warehouse"/"In Sorting Area" is legacy-system noise,
// not a real step backward followed by another step forward.
const EARLIEST_ONLY_STATUSES = ['custom clearance', 'at warehouse', 'in sorting area'];

export function keepEarliestOccurrenceOnly(entries, fallbackLabel) {
  const seen = new Set();
  return entries.filter((entry) => {
    const normalized = canonicalStatus(entry, fallbackLabel).toLowerCase();
    if (!EARLIEST_ONLY_STATUSES.includes(normalized)) return true;
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

// "Completed" is terminal — anything logged after it (a stray legacy re-sync, an out-of-order
// write) isn't a real next step and would just confuse the timeline, so it's dropped.
export function truncateAfterCompleted(entries, fallbackLabel) {
  const idx = entries.findIndex((entry) => canonicalStatus(entry, fallbackLabel).toLowerCase() === 'completed');
  return idx === -1 ? entries : entries.slice(0, idx + 1);
}

// Based on the Order schema's currentStatus enum (gorush-server/models/Order.js), minus
// "In Sorting Area" — that value exists in the schema but real orders' history never actually
// logs it, so it would only ever show up as an always-empty legend row — plus three real
// Detrack/legacy statuses that show up on real shared-collection orders but aren't in our own
// schema: "Custom Clearance" and "On Hold" (both pre-warehouse holdups, so they sit before
// "At Warehouse") and "Return to Warehouse".
export const STATUS_ORDER = ['Info Received', 'Custom Clearance', 'On Hold', 'At Warehouse', 'Out For Delivery', 'Return to Warehouse', 'Completed', 'Failed'];

// Matched case-insensitively (and "return" by substring, since the exact real-world casing
// of "Return to Warehouse" isn't guaranteed) rather than exact string equality, so a status
// coming from the legacy system in a slightly different form still gets colored correctly.
const STATUS_STYLE_RULES = [
  // "failed" and "return" matched by substring, not exact equality — real data has shown up
  // as "Failed Delivery" rather than a bare "Failed", and the legacy system's exact wording
  // for a return-to-warehouse event isn't guaranteed either.
  { test: (s) => s.includes('failed'), color: (c) => c.error, icon: '❌' },
  { test: (s) => s.includes('return'), color: () => '#f1c40f', icon: '↩️' },
  { test: (s) => s === 'completed', color: () => '#27ae60', icon: '✅' },
  { test: (s) => s === 'out for delivery', color: (c) => c.primary, icon: '🚚' },
  { test: (s) => s === 'at warehouse', color: (c) => c.tertiary, icon: '🏬' },
  // Same purple for both — a hue not used by any other status (tertiary/orange is already
  // "At Warehouse", so reusing it here would blur together with that on the timeline).
  { test: (s) => s === 'on hold', color: () => '#8e44ad', icon: '⏸️' },
  // Substring, not exact equality — real data has shown up as "Custom Clearing" rather than
  // "Custom Clearance".
  { test: (s) => s.includes('custom clear'), color: () => '#8e44ad', icon: '🛂' },
  { test: (s) => s === 'info received', color: (c) => c.textMuted, icon: '📝' },
];
export function getStatusStyle(status, colors) {
  const rule = STATUS_STYLE_RULES.find((r) => r.test((status || '').toLowerCase()));
  return { color: rule ? rule.color(colors) : colors.primary, icon: rule ? rule.icon : '📍' };
}
export function displayStatusLabel(status, t) {
  return (status || '').toLowerCase().includes('failed') ? t('home.tracking.failedDeliveryLabel') : status;
}

// The full pipeline from a raw /api/orders/track/:trackingNumber response's history[] down
// to what's actually rendered: drop internal notes, collapse back-to-back repeats, collapse
// the three "earliest occurrence only" statuses, cut anything logged after Completed, then
// derive the current status from whatever's left (falling back to the order's own top-level
// status if there's no usable history at all).
export function buildHistoryTimeline(rawHistory, fallbackLabel, topLevelStatus) {
  const filtered = (rawHistory || []).filter((entry) => !isInternalNote(entry) && !isDisallowedStatusHistory(entry));
  const historyEntries = truncateAfterCompleted(
    keepEarliestOccurrenceOnly(dedupeHistory(filtered, fallbackLabel), fallbackLabel),
    fallbackLabel
  );
  const latestHistoryEntry = historyEntries[historyEntries.length - 1];
  const currentStatusValue = latestHistoryEntry
    ? canonicalStatus(latestHistoryEntry, fallbackLabel)
    : topLevelStatus;
  return { historyEntries, currentStatusValue };
}
