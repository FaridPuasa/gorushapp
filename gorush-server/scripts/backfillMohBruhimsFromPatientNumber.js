// One-off backfill: historical pharmacymoh orders wrote their BruHIMS number
// into `patientNumber` instead of `bruhimsnum` (patientNumber is JPMC/PHC-only
// - see routes/orders.js's "MOH uses bruhimsnum, JPMC/PHC use patientNumber -
// mutually exclusive per product" comment). Current order creation already
// writes new MOH orders to bruhimsnum correctly; this only fixes legacy rows
// so BruHIMS search/display works for them too.
//
// Run manually once:
//   node scripts/backfillMohBruhimsFromPatientNumber.js
require('dotenv').config();
const prisma = require('../lib/prismaClient');

async function run() {
    const before = await prisma.order.count({
        where: { product: 'pharmacymoh', bruhimsnum: null, patientNumber: { not: null, notIn: [''] } },
    });
    console.log(`${before} pharmacymoh order(s) have bruhimsnum null and a non-empty patientNumber - backfilling...`);

    // Single set-based UPDATE (not a 28k-iteration loop) - same effect, far
    // fewer round trips, and atomic: either all matching rows move together
    // or none do. gr_dms.orders / patient_number are this table/column's
    // actual DB names (see prisma/schema.prisma's @@map/@map on Order).
    const updated = await prisma.$executeRaw`
        UPDATE "gr_dms"."orders"
        SET bruhimsnum = patient_number, patient_number = ''
        WHERE product = 'pharmacymoh'
          AND bruhimsnum IS NULL
          AND patient_number IS NOT NULL
          AND patient_number <> ''
    `;

    console.log(`Done. Backfilled bruhimsnum and cleared patientNumber on ${updated} order(s).`);
    await prisma.$disconnect();
}

run().catch((err) => {
    console.error('backfillMohBruhimsFromPatientNumber failed:', err);
    process.exit(1);
});
