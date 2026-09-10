// Shared dual-write helper for the admin CMS collections (Announcement,
// Vacancy, HeroSlide) - see routes/admin.js for the 9 call sites (create/
// update/delete x3). Mongo stays primary/unconditional for all 3 (unchanged
// in routes/admin.js); this only adds a best-effort Postgres mirror write
// after each Mongo operation already succeeded, gated by
// isCmsDualWriteEnabled(). A failure here never fails the admin request -
// same fire-and-forget tolerance as every other dual-write in this app.
const prisma = require('./prismaClient');
const { isCmsDualWriteEnabled } = require('./supabaseFlag');

async function dualWriteCmsCreate(prismaModel, mongoDoc, fields) {
    if (!isCmsDualWriteEnabled()) return;
    try {
        await prismaModel.create({ data: { mongoId: mongoDoc._id.toString(), ...fields } });
    } catch (err) {
        console.error(`[Postgres dual-write] CMS create mirror failed for mongoId=${mongoDoc._id}:`, err.message);
    }
}

// upsert, not update - handles a Postgres row that doesn't exist yet (e.g.
// this flag was off when the doc was created, or an earlier create-mirror
// attempt failed) by creating it instead of silently no-oping.
async function dualWriteCmsUpdate(prismaModel, mongoId, fields) {
    if (!isCmsDualWriteEnabled()) return;
    try {
        await prismaModel.upsert({
            where: { mongoId: mongoId.toString() },
            create: { mongoId: mongoId.toString(), ...fields },
            update: fields,
        });
    } catch (err) {
        console.error(`[Postgres dual-write] CMS update mirror failed for mongoId=${mongoId}:`, err.message);
    }
}

async function dualWriteCmsDelete(prismaModel, mongoId) {
    if (!isCmsDualWriteEnabled()) return;
    try {
        await prismaModel.deleteMany({ where: { mongoId: mongoId.toString() } });
    } catch (err) {
        console.error(`[Postgres dual-write] CMS delete mirror failed for mongoId=${mongoId}:`, err.message);
    }
}

module.exports = { prisma, dualWriteCmsCreate, dualWriteCmsUpdate, dualWriteCmsDelete };
