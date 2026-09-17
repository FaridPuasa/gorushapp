const { findPricingRule } = require('./postgresPricingHoliday');

function findCharge(product, district, code) {
  return findPricingRule(product, district, code);
}

function computeWeightSurcharge(weightKg) {
  const over = Number(weightKg) - 3;
  return over > 0 ? Math.ceil(over) * 1 : 0;
}

async function computeTotalPrice(product, district, chargeCode, weightKg) {
  const charge = await findCharge(product, district, chargeCode);
  if (!charge) return null;
  const surcharge = product === 'localdelivery' ? computeWeightSurcharge(weightKg) : 0;
  return charge.price + surcharge;
}

module.exports = { findCharge, computeWeightSurcharge, computeTotalPrice };
