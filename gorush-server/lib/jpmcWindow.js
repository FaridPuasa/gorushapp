// Computes the JPMC pharmacy portal's rolling processing window: normally
// noon-to-noon Brunei time, but a cutover can only land on a working day
// (Mon-Sat, and not a listed public holiday) - so a Saturday-after-noon order
// rolls forward past Sunday to Monday noon, and an order placed before noon
// on the day before a public holiday rolls forward past that holiday to the
// next working day's noon. Same skip rule handles both cases, no special-casing.
//
// No timezone library - follows this repo's existing convention
// (lib/bruneiTime.js) of shifting the UTC epoch by Brunei's fixed +8h offset
// (no DST) and reading/writing UTC fields on the shifted Date as "Brunei wall
// clock". `fromBruneiWallClock` undoes the shift to get back a real UTC
// instant that's directly comparable to Postgres timestamps.
const BRUNEI_OFFSET_MS = 8 * 60 * 60 * 1000;

function toBruneiWallClock(realDate) {
  return new Date(realDate.getTime() + BRUNEI_OFFSET_MS);
}

function fromBruneiWallClock(wallClockDate) {
  return new Date(wallClockDate.getTime() - BRUNEI_OFFSET_MS);
}

function wallClockDateString(wallClockDate) {
  const y = wallClockDate.getUTCFullYear();
  const m = String(wallClockDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wallClockDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isWorkingDay(wallClockDay, holidaySet) {
  return wallClockDay.getUTCDay() !== 0 && !holidaySet.has(wallClockDateString(wallClockDay));
}

function noonOf(wallClockDay) {
  const noon = new Date(wallClockDay);
  noon.setUTCHours(12, 0, 0, 0);
  return noon;
}

function startOfWallClockDay(wallClockDate) {
  const day = new Date(wallClockDate);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

// Nearest working-day noon strictly after `from` (a real UTC Date).
function nextCutover(from, holidaySet) {
  let wallDay = startOfWallClockDay(toBruneiWallClock(from));
  for (;;) {
    const noonReal = fromBruneiWallClock(noonOf(wallDay));
    if (isWorkingDay(wallDay, holidaySet) && noonReal > from) return noonReal;
    wallDay = new Date(wallDay.getTime() + 24 * 60 * 60 * 1000);
  }
}

// Nearest working-day noon at-or-before `from` (a real UTC Date).
function previousCutover(from, holidaySet) {
  let wallDay = startOfWallClockDay(toBruneiWallClock(from));
  for (;;) {
    const noonReal = fromBruneiWallClock(noonOf(wallDay));
    if (isWorkingDay(wallDay, holidaySet) && noonReal <= from) return noonReal;
    wallDay = new Date(wallDay.getTime() - 24 * 60 * 60 * 1000);
  }
}

// The processing window currently open as of `from` (defaults to now).
// `holidayDates` is the plain array of 'YYYY-MM-DD' strings from PublicHoliday.find().
function currentWindow(holidayDates, from = new Date()) {
  const holidaySet = new Set(holidayDates);
  return { start: previousCutover(from, holidaySet), end: nextCutover(from, holidaySet) };
}

// Real UTC instant for noon Brunei time on a plain 'YYYY-MM-DD' date string.
function bruneiNoonOf(dateStr) {
  return fromBruneiWallClock(noonOf(new Date(`${dateStr}T00:00:00.000Z`)));
}

// The window that *starts* on `dateStr` (i.e. the JPMC portal's equivalent of
// the old Excel sheet's per-cutover date tab) - if `dateStr` isn't itself a
// working day (Sunday/holiday), snaps back to the nearest working day whose
// window covers it, same as currentWindow() would for any other instant.
function windowForDate(dateStr, holidayDates) {
  return currentWindow(holidayDates, bruneiNoonOf(dateStr));
}

module.exports = { currentWindow, windowForDate, nextCutover, previousCutover };
