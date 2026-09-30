// One-off fix for the pre-1-Sept-2026 JPMC legacy backlog (backfilled from
// the old "JPMC PJSC Forms.xlsx" workbook by migration-scripts/
// backfill_jpmc_excel_fields.js, in grfmxstatusupdate - now retired). That
// backfill wrote jpmcPharmacyStatus as free text copied straight from the
// spreadsheet ("Cancelled", "cancelled order", ...) instead of the exact
// strings the live JPMC portal's dropdown expects ("Cancelled Order" /
// "Duplicate Order" - see gorush-client/app/jpmc-portal.js STATUS_OPTIONS).
// Two knock-on problems, fixed here in one pass:
//
//   1. Display bug: the portal's Picker can't match the odd-text value to
//      any option, so it silently falls back to showing "New Order" even
//      though the stored status (and its badge, which prints the raw value)
//      is really Cancelled/Duplicate.
//   2. Missed cascade: because the backfill wrote straight to Postgres, it
//      never went through routes/jpmc.js's PATCH handler, so the
//      "Duplicate/Cancelled JPMC status also cancels the GO RUSH order"
//      cascade (currentStatus, history, assignedTo, Detrack) never ran.
//
// Run: node scripts/backfillJpmcCancelStatuses.js
//   (add --dry-run to preview without writing anything)
require('dotenv').config();
const prisma = require('../lib/prismaClient');
const { cancelDetrackJob } = require('../lib/detrack');

const CANONICAL_CANCELLED = 'Cancelled Order';
const CANONICAL_DUPLICATE = 'Duplicate Order';

// The actor recorded on the history entry/lastUpdatedBy this script writes -
// there's no real portal user behind this one-off fix.
const SCRIPT_ACTOR = 'syahmi.ghafar@globex.com.bn';

// Terminal GO RUSH statuses this script must never touch. In particular,
// several of these legacy rows are currentStatus:'Completed' - the order was
// actually delivered; JPMC flagging it Duplicate/Cancelled afterwards (e.g. a
// duplicate prescription, noticed post-delivery) doesn't undo a real
// delivery, so those are left alone rather than blindly cancelled.
const SKIP_CURRENT_STATUSES = new Set(['Cancelled', 'Completed']);

function canonicalStatus(raw) {
    const s = (raw || '').trim();
    if (s === CANONICAL_CANCELLED || s === CANONICAL_DUPLICATE) return s;
    const lower = s.toLowerCase();
    if (lower.startsWith('duplicate')) return CANONICAL_DUPLICATE;
    if (lower.includes('cancel')) return CANONICAL_CANCELLED;
    return null; // not a cancel/duplicate variant - leave untouched
}

async function run() {
    const dryRun = process.argv.includes('--dry-run');

    const candidates = await prisma.order.findMany({
        where: { product: 'pharmacyjpmc', jpmcPharmacyStatus: { not: null } },
        select: { id: true, doTrackingNumber: true, jpmcPharmacyStatus: true, currentStatus: true },
    });

    const toNormalize = [];
    for (const row of candidates) {
        const canonical = canonicalStatus(row.jpmcPharmacyStatus);
        if (canonical && canonical !== row.jpmcPharmacyStatus) toNormalize.push({ ...row, canonical });
    }

    console.log(`Found ${toNormalize.length} order(s) with a non-canonical Duplicate/Cancelled status text to normalize.`);

    let normalized = 0;
    let cascaded = 0;
    let skippedTerminal = 0;
    let detrackWarnings = 0;

    for (const row of toNormalize) {
        console.log(`  ${row.doTrackingNumber}: "${row.jpmcPharmacyStatus}" -> "${row.canonical}" (currentStatus: ${row.currentStatus})`);

        if (dryRun) continue;

        await prisma.order.update({
            where: { id: row.id },
            data: { jpmcPharmacyStatus: row.canonical, jpmcFieldsUpdatedBy: SCRIPT_ACTOR, jpmcFieldsUpdatedAt: new Date() },
        });
        normalized += 1;

        if (SKIP_CURRENT_STATUSES.has(row.currentStatus)) {
            skippedTerminal += 1;
            continue;
        }

        // Mirrors routes/jpmc.js's PATCH cascade exactly - see CANCEL_TRIGGER_STATUSES there.
        const cancelReason = `${row.canonical} - confirmed by JPMC`;
        const updated = await prisma.order.update({
            where: { id: row.id },
            data: {
                currentStatus: 'Cancelled',
                lastUpdateDateTime: new Date(),
                latestReason: cancelReason,
                assignedTo: 'N/A',
                lastUpdatedBy: SCRIPT_ACTOR,
                history: {
                    create: [{ statusHistory: 'Cancelled', dateUpdated: new Date(), updatedBy: SCRIPT_ACTOR, reason: cancelReason }],
                },
            },
        });
        cascaded += 1;

        const detrackResult = await cancelDetrackJob(updated.doTrackingNumber);
        if (!detrackResult.ok) {
            detrackWarnings += 1;
            console.warn(`    Detrack cancel failed for ${updated.doTrackingNumber}: ${detrackResult.error} - cancel it there manually.`);
        }
    }

    console.log(dryRun ? '\n(dry run - no writes made)' : '\nDone.');
    console.log(`Normalized status text: ${dryRun ? toNormalize.length : normalized}`);
    console.log(`Cascaded to currentStatus=Cancelled (+ Detrack cancel attempt): ${dryRun ? toNormalize.filter(r => !SKIP_CURRENT_STATUSES.has(r.currentStatus)).length : cascaded}`);
    console.log(`Skipped cascade (already terminal - Completed/Cancelled): ${dryRun ? toNormalize.filter(r => SKIP_CURRENT_STATUSES.has(r.currentStatus)).length : skippedTerminal}`);
    if (!dryRun && detrackWarnings > 0) console.log(`Detrack cancel warnings (fix manually on Detrack): ${detrackWarnings}`);

    await prisma.$disconnect();
}

run().catch((err) => {
    console.error('backfillJpmcCancelStatuses failed:', err);
    process.exit(1);
});
