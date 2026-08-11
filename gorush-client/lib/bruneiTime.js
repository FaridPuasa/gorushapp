// Brunei has no DST, fixed UTC+8 — shift the UTC epoch and read UTC fields back
// off the shifted Date to get Brunei wall-clock day/time without any timezone lib.
export function getBruneiNow() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

export function getBruneiTodayISO() {
  return getBruneiNow().toISOString().split('T')[0];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatBruneiDateTime(d = getBruneiNow()) {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}
