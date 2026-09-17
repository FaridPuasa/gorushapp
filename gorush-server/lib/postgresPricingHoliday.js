// Postgres-backed reads/writes for PricingRule/PublicHoliday, replacing the
// Mongo dual-write pair (lib/pricingHolidayDualWrite.js, retired 2026-09-17
// once Mongo/Postgres parity was confirmed - 36/36 pricing rules, 4/4
// holidays, 0 field mismatches). `_id` is kept as the exposed key (aliased
// from the Postgres bigint id) since gorush-client's admin.js already treats
// it as an opaque string identifier, not a real ObjectId - no client change
// needed.
const prisma = require('./prismaClient');

function toLegacyHoliday(row) {
    return { _id: row.id.toString(), date: row.date, label: row.label };
}

function toLegacyPricingRule(row) {
    return {
        _id: row.id.toString(),
        product: row.product,
        district: row.district,
        chargeCode: row.chargeCode,
        price: row.price,
        note: row.note,
    };
}

async function findAllHolidays() {
    const rows = await prisma.publicHoliday.findMany({ orderBy: { date: 'asc' } });
    return rows.map(toLegacyHoliday);
}

async function createHoliday({ date, label }) {
    const row = await prisma.publicHoliday.create({ data: { date, label } });
    return toLegacyHoliday(row);
}

async function deleteHolidayById(id) {
    if (!/^\d+$/.test(String(id))) return null;
    try {
        const row = await prisma.publicHoliday.delete({ where: { id: BigInt(id) } });
        return toLegacyHoliday(row);
    } catch (err) {
        if (err.code === 'P2025') return null; // not found, matches Mongoose's findByIdAndDelete
        throw err;
    }
}

async function findAllPricingRules() {
    const rows = await prisma.pricingRule.findMany();
    return rows.map(toLegacyPricingRule);
}

async function findPricingRule(product, district, chargeCode) {
    const row = await prisma.pricingRule.findFirst({ where: { product, district, chargeCode } });
    return row ? toLegacyPricingRule(row) : null;
}

async function updatePricingRuleById(id, { price, note }) {
    if (!/^\d+$/.test(String(id))) return null;
    try {
        const row = await prisma.pricingRule.update({ where: { id: BigInt(id) }, data: { price, note } });
        return toLegacyPricingRule(row);
    } catch (err) {
        if (err.code === 'P2025') return null; // not found, matches Mongoose's findByIdAndUpdate
        throw err;
    }
}

module.exports = {
    findAllHolidays,
    createHoliday,
    deleteHolidayById,
    findAllPricingRules,
    findPricingRule,
    updatePricingRuleById,
};
