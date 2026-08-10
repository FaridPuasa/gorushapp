const { getBruneiNow } = require('./bruneiTime');

const CLOSING_HOUR = 17; // 5:00 PM Brunei time

// getBruneiNow() shifts real UTC-now forward 8h so its UTC getters read as Brunei wall-clock
// (see bruneiTime.js) — Date.UTC(y, m, d, ...) for a plain calendar date/time lands in that
// same shifted domain, so comparing their .getTime() values directly is valid and DST-free.
// Mirrors the holidayMidnightMs()/isBlockedTwoDaysBefore() pattern in lib/availability.js.
function closingCutoffMs(closingDate) {
    const [y, m, d] = closingDate.split('-').map(Number);
    return Date.UTC(y, m - 1, d, CLOSING_HOUR, 0, 0);
}

// A vacancy stops being open once Brunei time passes 5:00 PM on its closingDate — independent
// of (and in addition to) the admin's manual isOpen toggle.
function isVacancyCurrentlyOpen(vacancy, now = getBruneiNow()) {
    if (!vacancy.isOpen) return false;
    if (!vacancy.closingDate) return true;
    return now.getTime() < closingCutoffMs(vacancy.closingDate);
}

module.exports = { isVacancyCurrentlyOpen };
