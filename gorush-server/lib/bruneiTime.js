// Brunei has no DST, fixed UTC+8 — shift the UTC epoch and read UTC fields back
// off the shifted Date to get Brunei wall-clock day/time without any timezone lib.
function getBruneiNow() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

module.exports = { getBruneiNow };
