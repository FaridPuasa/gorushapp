// Dual-write helper for PricingRule/PublicHoliday - see routes/admin.js's
// pricing/holidays endpoints. Same fire-and-forget, Mongo-stays-primary
// shape as lib/cmsDualWrite.js, but gated by its own flag
// (isPricingHolidayDualWriteEnabled) since this pair - unlike Announcement/
// Vacancy/HeroSlide - is read directly by grfmxstatusupdate too and will
// need its own independently-controlled read-cutover later.
const prisma = require('./prismaClient');
const { isPricingHolidayDualWriteEnabled } = require('./supabaseFlag');

async function dualWriteCreate(prismaModel, mongoDoc, fields) {
    if (!isPricingHolidayDualWriteEnabled()) return;
    try {
        await prismaModel.create({ data: { mongoId: mongoDoc._id.toString(), ...fields } });
    } catch (err) {
        console.error(`[Postgres dual-write] pricing/holiday create mirror failed for mongoId=${mongoDoc._id}:`, err.message);
    }
}

// upsert, not update - handles a Postgres row that doesn't exist yet.
async function dualWriteUpdate(prismaModel, mongoId, fields) {
    if (!isPricingHolidayDualWriteEnabled()) return;
    try {
        await prismaModel.upsert({
            where: { mongoId: mongoId.toString() },
            create: { mongoId: mongoId.toString(), ...fields },
            update: fields,
        });
    } catch (err) {
        console.error(`[Postgres dual-write] pricing/holiday update mirror failed for mongoId=${mongoId}:`, err.message);
    }
}

async function dualWriteDelete(prismaModel, mongoId) {
    if (!isPricingHolidayDualWriteEnabled()) return;
    try {
        await prismaModel.deleteMany({ where: { mongoId: mongoId.toString() } });
    } catch (err) {
        console.error(`[Postgres dual-write] pricing/holiday delete mirror failed for mongoId=${mongoId}:`, err.message);
    }
}

module.exports = { prisma, dualWriteCreate, dualWriteUpdate, dualWriteDelete };
