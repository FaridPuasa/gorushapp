// Tracking number generation for orders written directly to Postgres.
// Mirrors grfmxstatusupdate's own generateTracker() (index.js) exactly, so
// tracking numbers this app generates are indistinguishable in format from
// ones it generates itself, and pulls from the SAME production Postgres
// sequences it already uses (prisma/manual-followups.sql in that repo) -
// kept numerically in lockstep with its Mongo counter via its own dual-write
// (data/orderCounter.js), so numbering stays gap-free and globally unique
// across both apps.
const prisma = require('./prismaClient');

const SEQUENCE_BY_PRODUCT = {
    pharmacymoh: { sequence: 'order_seq_pharmacy', prefix: 'MH', suffix: 'GR2' },
    pharmacyjpmc: { sequence: 'order_seq_pharmacy', prefix: 'JP', suffix: 'GR2' },
    pharmacyphc: { sequence: 'order_seq_pharmacy', prefix: 'PN', suffix: 'GR2' },
    localdelivery: { sequence: 'order_seq_localdelivery', prefix: 'LD', suffix: 'GR3' },
    cbsl: { sequence: 'order_seq_cbsl', prefix: 'CB', suffix: 'GR5' },
};

function formatTracker(sequence, suffix, prefix) {
    return `${suffix}${sequence.toString().padStart(8, '0')}${prefix}`;
}

async function generateTrackingNumber(product) {
    const config = SEQUENCE_BY_PRODUCT[product];
    if (!config) throw new Error(`No tracking sequence configured for product "${product}"`);

    // nextval() is atomic at the Postgres level - safe under concurrent
    // inserts, no application-level locking needed. config.sequence is
    // always one of the 3 whitelisted literals above, never raw user input -
    // safe to interpolate, same argument grfmxstatusupdate's own
    // data/orderCounter.js already makes for this exact pattern.
    const rows = await prisma.$queryRawUnsafe(`SELECT nextval('gr_dms.${config.sequence}') AS value`);
    const sequence = rows[0].value.toString();
    return { trackingNumber: formatTracker(sequence, config.suffix, config.prefix), sequence };
}

module.exports = { generateTrackingNumber };
