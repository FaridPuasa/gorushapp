// Brunei has no DST, fixed UTC+8 — shift the UTC epoch and read UTC fields back
// off the shifted Date to get Brunei wall-clock day/time without any timezone lib.
function getBruneiNow() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

// Canonical JSON/API timestamp format: Brunei wall-clock time with an
// explicit "+08:00" offset and milliseconds, e.g.
// "2025-05-13T08:30:00.000+08:00". No timezone library needed since Brunei
// is a fixed UTC+8 offset with no DST - same epoch-shift technique as
// getBruneiNow() above, just read back with full date+time precision
// instead of only the day. Returns null for a missing/invalid input so
// callers can keep using `field ? format(field) : null`-style guards (or
// just pass the raw value straight through, since this already no-ops).
function formatBruneiISO(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const brunei = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const yyyy = brunei.getUTCFullYear();
  const mm = pad(brunei.getUTCMonth() + 1);
  const dd = pad(brunei.getUTCDate());
  const hh = pad(brunei.getUTCHours());
  const mi = pad(brunei.getUTCMinutes());
  const ss = pad(brunei.getUTCSeconds());
  const ms = pad(brunei.getUTCMilliseconds(), 3);
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.${ms}+08:00`;
}

// Human-readable Brunei time for email/Teams notification text (not JSON
// APIs) - e.g. "13/05/2025, 08:30:00 (Brunei time)". Explicit timeZone
// option (not a naive local format), plus the "(Brunei time)" suffix so the
// reader never has to guess which timezone the string is in. Single shared
// implementation for the 3 near-identical formatters that used to live in
// routes/orders.js, routes/wargaEmasOrders.js and lib/teamsNotify.js.
function formatBruneiDisplay(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleString('en-GB', { timeZone: 'Asia/Brunei' })} (Brunei time)`;
}

module.exports = { getBruneiNow, formatBruneiISO, formatBruneiDisplay };
