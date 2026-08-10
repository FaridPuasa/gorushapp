const mongoose = require('mongoose');

// One row per (product, district, chargeCode) — the same shape as the old hardcoded
// CHARGES tables in lib/pricing.js, just normalized to a single price per district
// instead of a shared districts[] group, so an admin edit always targets exactly one number.
const PricingRuleSchema = new mongoose.Schema({
    product: {
        type: String,
        required: true,
        enum: ["pharmacymoh", "pharmacyjpmc", "pharmacyphc", "localdelivery", "cbsl"],
    },
    district: {
        type: String,
        required: true,
        enum: ["Brunei", "Tutong", "Temburong", "Belait"],
    },
    chargeCode: { type: String, required: true }, // e.g. "Immediate", "Express", "Standard", "Self Collect", "Drop off"
    price: { type: Number, required: true },
    note: { type: String },
}, { collection: 'pricingrules' });

PricingRuleSchema.index({ product: 1, district: 1, chargeCode: 1 }, { unique: true });

module.exports = mongoose.model('PricingRule', PricingRuleSchema);
