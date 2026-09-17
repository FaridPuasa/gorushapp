// Postgres-backed User (website customer accounts) reads/writes - full
// cutover 2026-09-17, superseding the dual-write phase (lib/userDualWrite.js,
// removed same commit). Mongo is no longer written to or read from anywhere
// for this collection.
//
// Returns/accepts the exact same shape routes/auth.js and routes/profile.js
// already used against Mongoose documents (Agreepolicy/Receivemarketing
// casing, addresses/phonenumbers/additionalphonenumbers/userdetails arrays,
// each entry's Postgres row id aliased to `_id`) so those routes needed
// minimal changes - same "legacy shape" convention as lib/postgresOrders.js's
// toLegacyShape().
const prisma = require('./prismaClient');

function toLegacyAddress(row) {
    return {
        _id: row.id.toString(),
        houseunitno: row.houseunitno, jalan: row.jalan, kampong: row.kampong,
        simpang: row.simpang, district: row.district, postalcode: row.postalcode,
        isDefault: row.isDefault,
    };
}
function toLegacyPhone(row) {
    return { _id: row.id.toString(), phonenum: row.phonenum, isDefault: row.isDefault };
}
function toLegacyAdditionalPhone(row) {
    return { _id: row.id.toString(), addphonenum: row.addphonenum };
}
function toLegacyDetail(row) {
    return {
        _id: row.id.toString(),
        receivername: row.receivername, dateofbirth: row.dateofbirth,
        icnum: row.icnum, passportnum: row.passportnum, bruhimsnum: row.bruhimsnum,
        appointmentdistrict: row.appointmentdistrict, patientphcnum: row.patientphcnum,
        patientjpmcnum: row.patientjpmcnum, appointmentplace: row.appointmentplace,
        payingpatient: row.payingpatient, isDefault: row.isDefault,
    };
}
function toLegacyUser(row) {
    return {
        _id: row.id.toString(),
        email: row.email, password: row.password, role: row.role,
        Agreepolicy: row.agreePolicy, Receivemarketing: row.receiveMarketing, createdAt: row.createdAt,
        addresses: (row.addresses || []).map(toLegacyAddress),
        phonenumbers: (row.phonenumbers || []).map(toLegacyPhone),
        additionalphonenumbers: (row.additionalPhonenumbers || []).map(toLegacyAdditionalPhone),
        userdetails: (row.userdetails || []).map(toLegacyDetail),
    };
}

const USER_INCLUDE = { addresses: true, phonenumbers: true, additionalPhonenumbers: true, userdetails: true };

async function findByEmail(email) {
    const row = await prisma.user.findFirst({ where: { email }, include: USER_INCLUDE });
    return row ? toLegacyUser(row) : null;
}
async function findByEmailExcludingId(email, excludeId) {
    const row = await prisma.user.findFirst({ where: { email, NOT: { id: BigInt(excludeId) } }, include: USER_INCLUDE });
    return row ? toLegacyUser(row) : null;
}
async function findById(id) {
    const row = await prisma.user.findUnique({ where: { id: BigInt(id) }, include: USER_INCLUDE });
    return row ? toLegacyUser(row) : null;
}

async function createUser({
    email, password, Agreepolicy, Receivemarketing,
    houseunitno, jalan, kampong, simpang, district, postalcode,
    phonenum, addphonenum,
    receivername, dateofbirth, icnum, passportnum, bruhimsnum, patientphcnum, patientjpmcnum, appointmentplace,
}) {
    const created = await prisma.user.create({
        data: {
            email, password, role: 'customer',
            agreePolicy: Agreepolicy, receiveMarketing: Receivemarketing || false,
            createdAt: new Date(),
            addresses: { create: [{ houseunitno, jalan, kampong, simpang, district, postalcode, isDefault: true }] },
            phonenumbers: { create: [{ phonenum, isDefault: true }] },
            additionalPhonenumbers: { create: addphonenum ? [{ addphonenum }] : [] },
            userdetails: {
                create: [{
                    receivername, dateofbirth,
                    icnum: icnum || null, passportnum: passportnum || null,
                    bruhimsnum, patientphcnum, patientjpmcnum, appointmentplace,
                    isDefault: true,
                }],
            },
        },
        include: USER_INCLUDE,
    });
    return toLegacyUser(created);
}

async function updateEmail(id, email) {
    const row = await prisma.user.update({ where: { id: BigInt(id) }, data: { email }, include: USER_INCLUDE });
    return toLegacyUser(row);
}
async function updatePassword(id, password) {
    await prisma.user.update({ where: { id: BigInt(id) }, data: { password } });
}

// Every logged-in user's "own identity numbers" set (routes/orders.js's
// GET /mine) - IC/passport/BruHIMS/patient numbers across every saved
// personal-details entry, not just the default one.
async function findIdentityValues(id) {
    const rows = await prisma.userDetail.findMany({ where: { userId: BigInt(id) } });
    const values = new Set();
    for (const d of rows) {
        [d.icnum, d.passportnum, d.bruhimsnum, d.patientphcnum, d.patientjpmcnum]
            .filter(Boolean)
            .forEach((v) => values.add(v));
    }
    return [...values];
}

// Generic CRUD for the 4 child tables - each has a `userId` FK and its own
// auto-increment id; addresses/phonenumbers/userdetails also have an
// `isDefault` boolean with a "must keep at least one, promote a new default
// on delete" invariant (mirroring routes/profile.js's own
// deleteFromRequiredList/setDefaultInList helpers, which this replaces);
// additionalphonenumbers is a flat list with neither concept, matching
// models/User.js's own schema exactly.
//
// Every mutating method returns the FULL updated list for that user (not
// just the changed row) since that's what every profile.js route responds
// with - `{ error: 'notfound' | 'lastitem' }` or `{ list }`.
function makeChildHelpers(model, toLegacy, { hasDefault = true } = {}) {
    async function listFor(userId) {
        const rows = await model.findMany({ where: { userId: BigInt(userId) }, orderBy: { id: 'asc' } });
        return rows.map(toLegacy);
    }
    return {
        listFor,
        async add(userId, data) {
            await model.create({ data: { userId: BigInt(userId), ...data } });
            return listFor(userId);
        },
        async update(userId, childId, data) {
            const existing = await model.findFirst({ where: { id: BigInt(childId), userId: BigInt(userId) } });
            if (!existing) return { error: 'notfound' };
            await model.update({ where: { id: existing.id }, data });
            return { list: await listFor(userId) };
        },
        // Enforces the same "at least one must remain" rule
        // deleteFromRequiredList() used to, promoting a new default if the
        // deleted entry was the default one.
        async deleteWithMinimumGuard(userId, childId) {
            const all = await model.findMany({ where: { userId: BigInt(userId) }, orderBy: { id: 'asc' } });
            const entry = all.find((r) => r.id.toString() === String(childId));
            if (!entry) return { error: 'notfound' };
            if (all.length <= 1) return { error: 'lastitem' };
            await model.delete({ where: { id: entry.id } });
            if (hasDefault && entry.isDefault) {
                const remaining = all.filter((r) => r.id !== entry.id);
                if (remaining.length > 0) await model.update({ where: { id: remaining[0].id }, data: { isDefault: true } });
            }
            return { list: await listFor(userId) };
        },
        // additionalphonenumbers only - no minimum-count guard, matches its
        // Mongoose route's plain `.pull(id)`.
        async deleteSimple(userId, childId) {
            const existing = await model.findFirst({ where: { id: BigInt(childId), userId: BigInt(userId) } });
            if (!existing) return { error: 'notfound' };
            await model.delete({ where: { id: existing.id } });
            return { list: await listFor(userId) };
        },
        async setDefault(userId, childId) {
            const all = await model.findMany({ where: { userId: BigInt(userId) } });
            const target = all.find((r) => r.id.toString() === String(childId));
            if (!target) return { error: 'notfound' };
            // Sequential, not $transaction() - Supabase's pooled connection
            // doesn't reliably support Prisma's interactive transactions
            // (confirmed live during the POD images migration), and this
            // isn't safety-critical enough to need atomicity.
            for (const r of all) {
                const shouldBeDefault = r.id === target.id;
                if (r.isDefault !== shouldBeDefault) {
                    await model.update({ where: { id: r.id }, data: { isDefault: shouldBeDefault } });
                }
            }
            return { list: await listFor(userId) };
        },
    };
}

const addresses = makeChildHelpers(prisma.userAddress, toLegacyAddress);
const phonenumbers = makeChildHelpers(prisma.userPhoneNumber, toLegacyPhone);
const additionalPhonenumbers = makeChildHelpers(prisma.userAdditionalPhoneNumber, toLegacyAdditionalPhone, { hasDefault: false });
const userdetails = makeChildHelpers(prisma.userDetail, toLegacyDetail);

module.exports = {
    findByEmail, findByEmailExcludingId, findById, createUser, updateEmail, updatePassword, findIdentityValues,
    addresses, phonenumbers, additionalPhonenumbers, userdetails,
};
