import { useState, useEffect } from 'react';
import { api } from './api';

export const PRODUCTS = ['MOH', 'JPMC', 'PHC', 'Local Delivery', 'Cross Border Service Limbang'];

// Lowercase codes the backend/external order-watcher expects in the stored `product` field —
// translate to these only at submit time; everywhere else in the UI uses the labels above.
export const PRODUCT_CODES = {
  MOH: 'pharmacymoh',
  JPMC: 'pharmacyjpmc',
  PHC: 'pharmacyphc',
  'Local Delivery': 'localdelivery',
  'Cross Border Service Limbang': 'cbsl',
};

export const DISTRICTS = ['Brunei', 'Tutong', 'Temburong', 'Belait'];

// Display order for delivery tiers ("job method") — actual availability per product/district
// comes from the admin-editable PricingRule collection (see getChargeOptions below), but this
// fixed order is what every "pick a charge code" UI (admin's own list, My Orders' filter) sorts by.
export const CHARGE_CODE_ORDER = ['Immediate', 'Express', 'Standard', 'Self Collect', 'Drop off'];

// Matches the Order schema's paymentMethod enum (gorush-server/models/Order.js) exactly.
export const PAYMENT_METHODS = [
  { value: 'Cash', labelKey: 'order.paymentCash' },
  { value: 'Bank Transfer BIBD', labelKey: 'order.paymentBibd' },
  { value: 'Bill Payment Baiduri', labelKey: 'order.paymentBaiduri' },
];

// Fetched once per mount — pricing now lives in the PricingRule collection (admin-editable)
// instead of a hardcoded table, so every screen that needs prices pulls from here.
export function usePricingRules() {
  const [rules, setRules] = useState([]);
  useEffect(() => {
    api.get('/api/pricing')
      .then((res) => setRules(res.data))
      .catch(() => {});
  }, []);
  return rules;
}

export function getChargeOptions(rules, product, district) {
  if (!product || !district) return [];
  const productCode = PRODUCT_CODES[product];
  return rules
    .filter((r) => r.product === productCode && r.district === district)
    .map((r) => ({ code: r.chargeCode, price: r.price, note: r.note }));
}

export function formatChargeLabel(charge) {
  const price = `$${charge.price.toFixed(2).replace(/\.00$/, '')}`;
  return charge.note ? `${charge.code} — ${price} — ${charge.note}` : `${charge.code} — ${price}`;
}

export function computeWeightSurcharge(weightKg) {
  const over = Number(weightKg) - 3;
  return over > 0 ? Math.ceil(over) * 1 : 0;
}

export function computeTotalPrice(product, chargePrice, weightKg) {
  if (chargePrice == null) return null;
  const surcharge = product === 'Local Delivery' ? computeWeightSurcharge(weightKg) : 0;
  return chargePrice + surcharge;
}

export function formatPrice(amount) {
  return amount == null ? null : `$${amount.toFixed(2)}`;
}
