// Keyed by the same lowercase product codes stored on the order (see models/Order.js),
// so the route can recompute price directly off req.body.product with no translation table.
const CHARGES = {
  pharmacymoh: [
    { code: 'Immediate', price: 20, districts: ['Brunei'] },
    { code: 'Express', price: 5.5, districts: ['Brunei'] },
    { code: 'Standard', price: 4, districts: ['Brunei', 'Tutong', 'Temburong', 'Belait'] },
    { code: 'Self Collect', price: 4, districts: ['Brunei', 'Tutong', 'Temburong', 'Belait'] },
  ],
  pharmacyjpmc: [
    { code: 'Immediate', price: 20, districts: ['Brunei'] },
    { code: 'Express', price: 5.5, districts: ['Brunei'] },
    { code: 'Standard', price: 8, districts: ['Tutong', 'Belait'] },
    { code: 'Standard', price: 11, districts: ['Temburong'] },
    { code: 'Self Collect', price: 4, districts: ['Brunei', 'Tutong', 'Temburong', 'Belait'] },
  ],
  pharmacyphc: [
    { code: 'Standard', price: 7, districts: ['Brunei'] },
    { code: 'Standard', price: 5, districts: ['Tutong'] },
    { code: 'Standard', price: 3, districts: ['Belait'] },
    { code: 'Standard', price: 10, districts: ['Temburong'] },
  ],
  localdelivery: [
    { code: 'Express', price: 7, districts: ['Brunei'] },
    { code: 'Standard', price: 5, districts: ['Brunei'] },
    { code: 'Standard', price: 8, districts: ['Tutong'] },
    { code: 'Standard', price: 15, districts: ['Belait'] },
    { code: 'Standard', price: 15, districts: ['Temburong'] },
    { code: 'Drop off', price: 4, districts: ['Brunei'] },
    { code: 'Drop off', price: 6, districts: ['Tutong'] },
    { code: 'Drop off', price: 8, districts: ['Belait'] },
  ],
  cbsl: [
    { code: 'Drop off', price: 4, districts: ['Brunei'] },
    { code: 'Drop off', price: 6, districts: ['Tutong'] },
    { code: 'Drop off', price: 8, districts: ['Belait'] },
    { code: 'Drop off', price: 11, districts: ['Temburong'] },
  ],
};

function findCharge(product, district, code) {
  return (CHARGES[product] || []).find((c) => c.code === code && c.districts.includes(district));
}

function computeWeightSurcharge(weightKg) {
  const over = Number(weightKg) - 3;
  return over > 0 ? Math.ceil(over) * 1 : 0;
}

function computeTotalPrice(product, district, chargeCode, weightKg) {
  const charge = findCharge(product, district, chargeCode);
  if (!charge) return null;
  const surcharge = product === 'localdelivery' ? computeWeightSurcharge(weightKg) : 0;
  return charge.price + surcharge;
}

module.exports = { CHARGES, findCharge, computeWeightSurcharge, computeTotalPrice };
