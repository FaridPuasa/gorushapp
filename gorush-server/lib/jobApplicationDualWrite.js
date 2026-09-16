// Dual-write helper for JobApplication - see routes/careers.js's /apply
// endpoint, the collection's only write site (create-only, no update/delete
// route exists anywhere for it yet). Same fire-and-forget, Mongo-stays-
// primary shape as lib/pricingHolidayDualWrite.js, gated by its own flag
// (isJobApplicationDualWriteEnabled) since grfmxstatusupdate reads this
// collection directly too and will need its own independent read-cutover.
const prisma = require('./prismaClient');
const { isJobApplicationDualWriteEnabled } = require('./supabaseFlag');

async function dualWriteCreate(mongoDoc) {
    if (!isJobApplicationDualWriteEnabled()) return;
    try {
        await prisma.jobApplication.create({
            data: {
                mongoId: mongoDoc._id.toString(),
                userId: mongoDoc.userId ? mongoDoc.userId.toString() : null,
                vacancyId: mongoDoc.vacancyId ? mongoDoc.vacancyId.toString() : null,
                positionApplied: mongoDoc.positionApplied,
                applicationType: mongoDoc.applicationType,
                name: mongoDoc.name,
                dateofbirth: mongoDoc.dateofbirth,
                icnumber: mongoDoc.icnumber,
                houseunitno: mongoDoc.houseunitno,
                jalan: mongoDoc.jalan,
                kampong: mongoDoc.kampong,
                simpang: mongoDoc.simpang,
                district: mongoDoc.district,
                postalcode: mongoDoc.postalcode,
                email: mongoDoc.email,
                phonenum: mongoDoc.phonenum,
                addphonenum: mongoDoc.addphonenum,
                highestAchievement: mongoDoc.highestAchievement,
                partTimeDuration: mongoDoc.partTimeDuration,
                carOwn: mongoDoc.carOwn,
                deliverBefore: mongoDoc.deliverBefore,
                experienceDelivery: mongoDoc.experienceDelivery,
                parcelNum: mongoDoc.parcelNum,
                driveManual: mongoDoc.driveManual,
                icFront: mongoDoc.icFront,
                resumeCv: mongoDoc.resumeCv,
                drivingLicenseFront: mongoDoc.drivingLicenseFront,
                drivingLicenseBack: mongoDoc.drivingLicenseBack,
                status: mongoDoc.status,
                dateTimeSubmission: mongoDoc.dateTimeSubmission,
                createdAt: mongoDoc.createdAt,
            },
        });
    } catch (err) {
        console.error(`[Postgres dual-write] jobApplication create mirror failed for mongoId=${mongoDoc._id}:`, err.message);
    }
}

module.exports = { dualWriteCreate };
