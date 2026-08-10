const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Vacancy = require('../models/Vacancy');
const JobApplication = require('../models/JobApplication');
const { optionalAuth } = require('../middleware/auth');
const { isVacancyCurrentlyOpen } = require('../lib/vacancies');

// Which extra questions/uploads each applicationType requires — mirrors
// getApplicationTypeConfig() in the client's lib/careersOptions.js, so a request that
// bypasses the client form still gets the same validation.
const APPLICATION_TYPE_RULES = {
    Freelancer: { needsPartTime: true, needsCarOwn: true, needsDeliverBefore: true, needsDriveManual: false, needsLicense: true },
    Dispatcher: { needsPartTime: false, needsCarOwn: false, needsDeliverBefore: true, needsDriveManual: true, needsLicense: true },
    Helper: { needsPartTime: false, needsCarOwn: false, needsDeliverBefore: false, needsDriveManual: true, needsLicense: true },
    OperationSupport: { needsPartTime: false, needsCarOwn: false, needsDeliverBefore: false, needsDriveManual: true, needsLicense: true },
    General: { needsPartTime: false, needsCarOwn: false, needsDeliverBefore: false, needsDriveManual: false, needsLicense: false },
};

router.post('/apply', optionalAuth, async (req, res) => {
    try {
        const {
            vacancyId,
            name, dateofbirth, icnumber,
            houseunitno, jalan, kampong, simpang, district, postalcode,
            email, phonenum, addphonenum,
            highestAchievement, partTimeDuration, carOwn, deliverBefore, experienceDelivery, parcelNum, driveManual,
            icFront, resumeCv, drivingLicenseFront, drivingLicenseBack,
        } = req.body;

        if (!vacancyId || !mongoose.Types.ObjectId.isValid(vacancyId)) {
            return res.status(400).json({ error: "A valid vacancy is required." });
        }
        const vacancy = await Vacancy.findById(vacancyId);
        if (!vacancy || !isVacancyCurrentlyOpen(vacancy)) {
            return res.status(404).json({ error: "This position is no longer open." });
        }

        if (!name || !dateofbirth || !icnumber || !houseunitno || !jalan || !kampong || !district || !phonenum) {
            return res.status(400).json({ error: "Missing required personal details." });
        }
        if (req.userId && !email) {
            return res.status(400).json({ error: "Email is required." });
        }
        if (!highestAchievement) {
            return res.status(400).json({ error: "Highest qualification achieved is required." });
        }
        if (!icFront || !resumeCv) {
            return res.status(400).json({ error: "IC front and resume/CV uploads are required." });
        }

        const rules = APPLICATION_TYPE_RULES[vacancy.applicationType] || APPLICATION_TYPE_RULES.General;
        if (rules.needsPartTime && !partTimeDuration) {
            return res.status(400).json({ error: "Please indicate your expected part-time duration." });
        }
        if (rules.needsCarOwn && !carOwn) {
            return res.status(400).json({ error: "Please indicate the type of transportation you own." });
        }
        if (rules.needsDeliverBefore && !deliverBefore) {
            return res.status(400).json({ error: "Please indicate if you've done delivery work before." });
        }
        if (rules.needsDeliverBefore && deliverBefore === 'Yes' && (!experienceDelivery || !parcelNum)) {
            return res.status(400).json({ error: "Please provide your delivery work experience details." });
        }
        if (rules.needsDriveManual && !driveManual) {
            return res.status(400).json({ error: "Please indicate if you know how to drive manual." });
        }
        if (rules.needsLicense && (!drivingLicenseFront || !drivingLicenseBack)) {
            return res.status(400).json({ error: "Both sides of your driving license are required for this position." });
        }

        const application = new JobApplication({
            userId: req.userId || null,
            vacancyId: vacancy._id,
            positionApplied: vacancy.title,
            applicationType: vacancy.applicationType,
            name, dateofbirth, icnumber,
            houseunitno, jalan, kampong, simpang, district, postalcode,
            email, phonenum, addphonenum,
            highestAchievement,
            partTimeDuration: rules.needsPartTime ? partTimeDuration : undefined,
            carOwn: rules.needsCarOwn ? carOwn : undefined,
            deliverBefore: rules.needsDeliverBefore ? deliverBefore : undefined,
            experienceDelivery: rules.needsDeliverBefore && deliverBefore === 'Yes' ? experienceDelivery : undefined,
            parcelNum: rules.needsDeliverBefore && deliverBefore === 'Yes' ? parcelNum : undefined,
            driveManual: rules.needsDriveManual ? driveManual : undefined,
            icFront, resumeCv,
            drivingLicenseFront: rules.needsLicense ? drivingLicenseFront : undefined,
            drivingLicenseBack: rules.needsLicense ? drivingLicenseBack : undefined,
            dateTimeSubmission: new Date().toISOString(),
        });

        const saved = await application.save();
        res.status(201).json({ message: "Application submitted successfully!", applicationId: saved._id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server application error." });
    }
});

module.exports = router;
