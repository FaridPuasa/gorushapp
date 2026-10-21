const { getBruneiNow } = require('./bruneiTime');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isMohImmediateAvailable(d) {
  const day = d.getUTCDay();
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const allowedDays = [1, 2, 3, 4, 6]; // Mon, Tue, Wed, Thu, Sat
  return allowedDays.includes(day) && minutes >= 8 * 60 && minutes < 14 * 60;
}

function isJpmcImmediateAvailable(d) {
  const day = d.getUTCDay();
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const allowedDays = [1, 2, 3, 4, 5, 6]; // Mon-Sat
  return allowedDays.includes(day) && minutes >= 8 * 60 && minutes < 11 * 60;
}

// Shared by both MOH and JPMC's Express and Self Collect charges.
function isExpressOrSelfCollectAvailable(d) {
  const day = d.getUTCDay();
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const allowedDays = [0, 1, 2, 3, 4]; // Sun-Thu
  if (!allowedDays.includes(day)) return false;
  if (day === 4) return minutes < 10 * 60 + 30; // Thursday cutoff 10:30am
  return true;
}

function isLocalDeliveryExpressAvailable(d) {
  const day = d.getUTCDay();
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const allowedDays = [1, 2, 3, 4, 5, 6]; // Mon-Sat
  if (!allowedDays.includes(day)) return false;
  if (day === 6) return minutes < 11 * 60; // Saturday cutoff 11:00am
  return true;
}

// getBruneiNow() shifts real UTC-now forward 8h so its UTC getters read as Brunei wall-clock
// (see bruneiTime.js) — Date.UTC(y, m, d, ...) for a plain calendar date lands in that same
// shifted domain, so comparing their .getTime() values directly is valid and DST-free.
function holidayMidnightMs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function isBlockedSameDay(nowMs, holidayMs) {
  return Math.floor(nowMs / ONE_DAY_MS) === Math.floor(holidayMs / ONE_DAY_MS);
}

// Blocked from 2 days before the holiday at 10:30am through the end of the day before it —
// e.g. a Thursday holiday blocks from Tuesday 10:30am through end of Wednesday, generalized
// to whichever weekday the holiday falls on.
function isBlockedTwoDaysBefore(nowMs, holidayMs) {
  const blockStart = holidayMs - 2 * ONE_DAY_MS + (10 * 60 + 30) * 60 * 1000;
  const blockEnd = holidayMs - 1 * ONE_DAY_MS + ONE_DAY_MS - 1;
  return nowMs >= blockStart && nowMs <= blockEnd;
}

// Per-product, per-charge-code rules. Anything not listed here (e.g. Standard, Drop off,
// PHC's Standard) has no day/time or holiday restriction.
const RULES = {
  pharmacymoh: {
    Immediate: { available: isMohImmediateAvailable, holidayBlock: isBlockedSameDay },
    Express: { available: isExpressOrSelfCollectAvailable, holidayBlock: isBlockedTwoDaysBefore },
    'Self Collect': { available: isExpressOrSelfCollectAvailable, holidayBlock: isBlockedTwoDaysBefore },
  },
  pharmacyjpmc: {
    Immediate: { available: isJpmcImmediateAvailable, holidayBlock: isBlockedSameDay },
    Express: { available: isExpressOrSelfCollectAvailable, holidayBlock: isBlockedTwoDaysBefore },
    'Self Collect': { available: isExpressOrSelfCollectAvailable, holidayBlock: isBlockedTwoDaysBefore },
  },
  localdelivery: {
    Express: { available: isLocalDeliveryExpressAvailable, holidayBlock: isBlockedSameDay },
  },
};

function isChargeCurrentlyAvailable(product, code, holidayDates = []) {
  const rule = RULES[product]?.[code];
  if (!rule) return true;

  const now = getBruneiNow();
  if (!rule.available(now)) return false;
  if (holidayDates.length === 0) return true;

  const nowMs = now.getTime();
  return !holidayDates.some((dateStr) => rule.holidayBlock(nowMs, holidayMidnightMs(dateStr)));
}

module.exports = { isChargeCurrentlyAvailable };
