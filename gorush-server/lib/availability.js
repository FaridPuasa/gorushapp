const { getBruneiNow } = require('./bruneiTime');

function isImmediateOrSelfCollectAvailable() {
  const d = getBruneiNow();
  const day = d.getUTCDay();
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const allowedDays = [1, 2, 3, 4, 6];
  return allowedDays.includes(day) && minutes >= 8 * 60 && minutes < 14 * 60;
}

function isExpressAvailable() {
  const d = getBruneiNow();
  const day = d.getUTCDay();
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const allowedDays = [0, 1, 2, 3, 4];
  if (!allowedDays.includes(day)) return false;
  if (day === 4) return minutes < 10 * 60 + 30;
  return true;
}

function isChargeCurrentlyAvailable(code) {
  if (code === 'Immediate' || code === 'Self Collect') return isImmediateOrSelfCollectAvailable();
  if (code === 'Express') return isExpressAvailable();
  return true;
}

module.exports = { isChargeCurrentlyAvailable };
