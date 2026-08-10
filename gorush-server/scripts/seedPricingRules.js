// One-time seed of PricingRule documents from the pricing that used to be hardcoded in
// lib/pricing.js (client and server copies). Run manually against each environment once:
//   node scripts/seedPricingRules.js
// Upserts by (product, district, chargeCode), so it's safe to re-run — existing rows are
// left with whatever price an admin has since set; only missing rows get inserted.
require('dotenv').config();
const mongoose = require('mongoose');
const PricingRule = require('../models/PricingRule');

const ROWS = [
    // pharmacymoh
    { product: 'pharmacymoh', district: 'Brunei', chargeCode: 'Immediate', price: 20, note: 'Same day after medicine collected from Pharmacy' },
    { product: 'pharmacymoh', district: 'Brunei', chargeCode: 'Express', price: 5.5, note: 'Next working day after medicine collected from Pharmacy' },
    { product: 'pharmacymoh', district: 'Brunei', chargeCode: 'Standard', price: 4, note: '2-3 working days' },
    { product: 'pharmacymoh', district: 'Tutong', chargeCode: 'Standard', price: 4, note: '2-3 working days' },
    { product: 'pharmacymoh', district: 'Temburong', chargeCode: 'Standard', price: 4, note: '2-3 working days' },
    { product: 'pharmacymoh', district: 'Belait', chargeCode: 'Standard', price: 4, note: '2-3 working days' },
    { product: 'pharmacymoh', district: 'Brunei', chargeCode: 'Self Collect', price: 4, note: 'Next working day' },
    { product: 'pharmacymoh', district: 'Tutong', chargeCode: 'Self Collect', price: 4, note: 'Next working day' },
    { product: 'pharmacymoh', district: 'Temburong', chargeCode: 'Self Collect', price: 4, note: 'Next working day' },
    { product: 'pharmacymoh', district: 'Belait', chargeCode: 'Self Collect', price: 4, note: 'Next working day' },

    // pharmacyjpmc
    { product: 'pharmacyjpmc', district: 'Brunei', chargeCode: 'Immediate', price: 20, note: 'Same day after medicine collected from Pharmacy' },
    { product: 'pharmacyjpmc', district: 'Brunei', chargeCode: 'Express', price: 5.5, note: 'Next working day after medicine collected from Pharmacy' },
    { product: 'pharmacyjpmc', district: 'Brunei', chargeCode: 'Standard', price: 4, note: '2-3 working days' },
    { product: 'pharmacyjpmc', district: 'Tutong', chargeCode: 'Standard', price: 8, note: '2-3 working days' },
    { product: 'pharmacyjpmc', district: 'Belait', chargeCode: 'Standard', price: 8, note: '2-3 working days' },
    { product: 'pharmacyjpmc', district: 'Temburong', chargeCode: 'Standard', price: 11, note: '2-3 working days' },
    { product: 'pharmacyjpmc', district: 'Brunei', chargeCode: 'Self Collect', price: 4, note: 'Next working day' },
    { product: 'pharmacyjpmc', district: 'Tutong', chargeCode: 'Self Collect', price: 4, note: 'Next working day' },
    { product: 'pharmacyjpmc', district: 'Temburong', chargeCode: 'Self Collect', price: 4, note: 'Next working day' },
    { product: 'pharmacyjpmc', district: 'Belait', chargeCode: 'Self Collect', price: 4, note: 'Next working day' },

    // pharmacyphc
    { product: 'pharmacyphc', district: 'Brunei', chargeCode: 'Standard', price: 7, note: 'Same day' },
    { product: 'pharmacyphc', district: 'Tutong', chargeCode: 'Standard', price: 5, note: 'Same day' },
    { product: 'pharmacyphc', district: 'Belait', chargeCode: 'Standard', price: 3, note: 'Same day' },
    { product: 'pharmacyphc', district: 'Temburong', chargeCode: 'Standard', price: 10, note: 'Same day' },

    // localdelivery
    { product: 'localdelivery', district: 'Brunei', chargeCode: 'Express', price: 5.5, note: 'Same day delivery' },
    { product: 'localdelivery', district: 'Brunei', chargeCode: 'Standard', price: 5, note: '2-3 working days' },
    { product: 'localdelivery', district: 'Tutong', chargeCode: 'Standard', price: 8, note: '2-3 working days' },
    { product: 'localdelivery', district: 'Belait', chargeCode: 'Standard', price: 15, note: '2-3 working days' },
    { product: 'localdelivery', district: 'Temburong', chargeCode: 'Standard', price: 15, note: '2-3 working days' },
    { product: 'localdelivery', district: 'Brunei', chargeCode: 'Drop off', price: 4, note: null },
    { product: 'localdelivery', district: 'Tutong', chargeCode: 'Drop off', price: 6, note: null },
    { product: 'localdelivery', district: 'Belait', chargeCode: 'Drop off', price: 8, note: null },

    // cbsl
    { product: 'cbsl', district: 'Brunei', chargeCode: 'Drop off', price: 4, note: null },
    { product: 'cbsl', district: 'Tutong', chargeCode: 'Drop off', price: 6, note: null },
    { product: 'cbsl', district: 'Belait', chargeCode: 'Drop off', price: 8, note: null },
    { product: 'cbsl', district: 'Temburong', chargeCode: 'Drop off', price: 11, note: null },
];

async function run() {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error('MONGO_URI is missing from your .env file.');
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log(`Connected. Seeding ${ROWS.length} pricing rules...`);

    let inserted = 0;
    let updated = 0;
    for (const row of ROWS) {
        const result = await PricingRule.updateOne(
            { product: row.product, district: row.district, chargeCode: row.chargeCode },
            { $setOnInsert: row },
            { upsert: true }
        );
        if (result.upsertedCount > 0) inserted += 1;
        else updated += 1;
    }

    console.log(`Done. Inserted ${inserted}, already present ${updated}.`);
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
