// Dual-write helper for User (website customer accounts, Mongo collection
// `grusers`) - Mongo stays primary/authoritative, this only adds a
// best-effort Postgres mirror, gated by isUserDualWriteEnabled(). A failure
// here must never fail the request that triggered it - same fire-and-forget
// tolerance as every other dual-write in this app.
//
// Wired as a single Mongoose `post('save')` hook in models/User.js rather
// than one call per route, since every write in routes/auth.js and
// routes/profile.js already ends in `user.save()` - one hook covers all of
// it instead of ~19 call sites each needing to remember to call this.
//
// Full resync, not incremental diffing: every call deletes and recreates all
// 4 child-table rows for this user from the current in-memory Mongoose
// document, rather than replaying whichever push/pull/field-edit triggered
// this save. Simpler and safe given the tiny size of these arrays (a
// handful of addresses/phones/details per user, not hundreds) - the
// alternative (mirroring push/pull/set operations 1:1) would need updating
// in lockstep with routes/profile.js forever.
const prisma = require('./prismaClient');
const { isUserDualWriteEnabled } = require('./supabaseFlag');

async function dualWriteUserSync(mongoUser) {
    if (!isUserDualWriteEnabled()) return;
    try {
        const mongoId = mongoUser._id.toString();
        const userData = {
            email: mongoUser.email,
            password: mongoUser.password,
            role: mongoUser.role,
            agreePolicy: mongoUser.Agreepolicy,
            receiveMarketing: mongoUser.Receivemarketing,
            createdAt: mongoUser.createdAt,
        };

        // Not wrapped in prisma.$transaction() - Supabase's pooled connection
        // (Supavisor, transaction mode, used by DATABASE_URL) doesn't reliably
        // support Prisma's interactive transactions (confirmed live: every
        // attempt failed with "Transaction not found"). None of this app's
        // other dual-write helpers use one either - same eventually-consistent,
        // fire-and-forget tolerance applies here: a failure partway through
        // just gets logged and corrected by the next save.
        const user = await prisma.user.upsert({
            where: { mongoId },
            create: { mongoId, ...userData },
            update: userData,
        });

        await prisma.userAddress.deleteMany({ where: { userId: user.id } });
        await prisma.userPhoneNumber.deleteMany({ where: { userId: user.id } });
        await prisma.userAdditionalPhoneNumber.deleteMany({ where: { userId: user.id } });
        await prisma.userDetail.deleteMany({ where: { userId: user.id } });

        if (mongoUser.addresses?.length) {
            await prisma.userAddress.createMany({
                data: mongoUser.addresses.map((a) => ({
                    mongoId: a._id.toString(),
                    userId: user.id,
                    houseunitno: a.houseunitno,
                    jalan: a.jalan,
                    kampong: a.kampong,
                    simpang: a.simpang,
                    district: a.district,
                    postalcode: a.postalcode,
                    isDefault: a.isDefault,
                })),
            });
        }
        if (mongoUser.phonenumbers?.length) {
            await prisma.userPhoneNumber.createMany({
                data: mongoUser.phonenumbers.map((p) => ({
                    mongoId: p._id.toString(),
                    userId: user.id,
                    phonenum: p.phonenum,
                    isDefault: p.isDefault,
                })),
            });
        }
        if (mongoUser.additionalphonenumbers?.length) {
            await prisma.userAdditionalPhoneNumber.createMany({
                data: mongoUser.additionalphonenumbers.map((p) => ({
                    mongoId: p._id.toString(),
                    userId: user.id,
                    addphonenum: p.addphonenum,
                })),
            });
        }
        if (mongoUser.userdetails?.length) {
            await prisma.userDetail.createMany({
                data: mongoUser.userdetails.map((d) => ({
                    mongoId: d._id.toString(),
                    userId: user.id,
                    receivername: d.receivername,
                    dateofbirth: d.dateofbirth,
                    icnum: d.icnum,
                    passportnum: d.passportnum,
                    bruhimsnum: d.bruhimsnum,
                    appointmentdistrict: d.appointmentdistrict,
                    patientphcnum: d.patientphcnum,
                    patientjpmcnum: d.patientjpmcnum,
                    appointmentplace: d.appointmentplace,
                    payingpatient: d.payingpatient,
                    isDefault: d.isDefault,
                })),
            });
        }
    } catch (err) {
        console.error(`[Postgres dual-write] User sync failed for mongoId=${mongoUser._id}:`, err.message);
    }
}

module.exports = { dualWriteUserSync };
