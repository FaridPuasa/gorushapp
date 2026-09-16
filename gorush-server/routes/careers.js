const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Vacancy = require('../models/Vacancy');
const { optionalAuth } = require('../middleware/auth');
const { isVacancyCurrentlyOpen } = require('../lib/vacancies');
const prisma = require('../lib/prismaClient');
const { sendJobApplicationAlert, dataUriToAttachment } = require('../lib/mailer');
const { notifyTeamsJobApplication } = require('../lib/teamsNotify');
const { uploadJobApplicationDoc } = require('../lib/jobApplicationDocsStorage');

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
function generateCaptchaCode() {
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
    }
    return code;
}

// Same simple <p>-per-field style as routes/orders.js's buildOrderAlertEmail.
function buildJobApplicationEmailHtml(a) {
    const address = [a.houseunitno, a.jalan, a.kampong, a.simpang].filter(Boolean).join(', ');
    const portalLink = process.env.ADMIN_PORTAL_URL
        ? `<p><a href="${process.env.ADMIN_PORTAL_URL}/jobApplications">View Application & Documents in Admin Portal</a></p>`
        : '';
    return `
        <p>Name: ${a.name || ''}</p>
        <p>Position Applied: ${a.positionApplied || ''}</p>
        <p>Application Type: ${a.applicationType || ''}</p>
        <p>Date of Birth: ${a.dateofbirth || ''}</p>
        <p>IC Number: ${a.icnumber || ''}</p>
        <p>Address: ${address}</p>
        <p>District: ${a.district || ''}</p>
        <p>Postal Code: ${a.postalcode || ''}</p>
        <p>Email: ${a.email || ''}</p>
        <p>Phone: ${a.phonenum || ''}</p>
        <p>Additional Phone: ${a.addphonenum || ''}</p>
        <p>Highest Qualification Achieved: ${a.highestAchievement || ''}</p>
        <p>Part-time Duration: ${a.partTimeDuration || ''}</p>
        <p>Owns a Car: ${a.carOwn || ''}</p>
        <p>Delivered Before: ${a.deliverBefore || ''}</p>
        <p>Delivery Experience: ${a.experienceDelivery || ''}</p>
        <p>Parcels/Day Handled: ${a.parcelNum || ''}</p>
        <p>Can Drive Manual: ${a.driveManual || ''}</p>
        <p>Date Submitted: ${a.dateTimeSubmission || ''}</p>
        <p>IC Front, Resume/CV, and Driving License (if applicable) are attached to this email.</p>
        ${portalLink}
    `;
}

router.get('/captcha', (req, res) => {
    const code = generateCaptchaCode();
    const token = jwt.sign({ code }, process.env.JWT_SECRET, { expiresIn: '10m' });
    res.status(200).json({ code, token });
});

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
            captchaToken, captchaAnswer,
        } = req.body;

        if (!captchaToken || !captchaAnswer) {
            return res.status(400).json({ error: "Please complete the captcha." });
        }
        let decodedCaptcha;
        try {
            decodedCaptcha = jwt.verify(captchaToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ error: "Captcha expired or invalid — please try again." });
        }
        if (decodedCaptcha.code.toUpperCase() !== String(captchaAnswer).trim().toUpperCase()) {
            return res.status(400).json({ error: "Captcha answer did not match." });
        }

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

        const applicationData = {
            userId: req.userId || null,
            vacancyId: vacancy._id.toString(),
            positionApplied: vacancy.title,
            applicationType: vacancy.applicationType,
            name, dateofbirth, icnumber,
            houseunitno, jalan, kampong, simpang, district, postalcode,
            email, phonenum, addphonenum,
            highestAchievement,
            partTimeDuration: rules.needsPartTime ? partTimeDuration : null,
            carOwn: rules.needsCarOwn ? carOwn : null,
            deliverBefore: rules.needsDeliverBefore ? deliverBefore : null,
            experienceDelivery: rules.needsDeliverBefore && deliverBefore === 'Yes' ? experienceDelivery : null,
            parcelNum: rules.needsDeliverBefore && deliverBefore === 'Yes' ? parcelNum : null,
            driveManual: rules.needsDriveManual ? driveManual : null,
            status: 'New',
            dateTimeSubmission: new Date().toISOString(),
            createdAt: new Date(),
        };

        // Postgres is now the sole store for JobApplication (cutover 2026-09-16,
        // no more Mongo write/mirror - see lib/jobApplicationDualWrite.js's
        // removal in the same commit).
        const saved = await prisma.jobApplication.create({ data: applicationData });
        const applicationId = saved.id.toString();

        // Uploaded documents go to the private job-application-documents
        // Storage bucket (2026-09-16), not the icFront/resumeCv/etc base64
        // columns - the row needs its own id as the path prefix, so this is a
        // second write right after create rather than part of the same one.
        const [icFrontPath, resumeCvPath, drivingLicenseFrontPath, drivingLicenseBackPath] = await Promise.all([
            uploadJobApplicationDoc(applicationId, 'ic_front', icFront),
            uploadJobApplicationDoc(applicationId, 'resume_cv', resumeCv),
            rules.needsLicense ? uploadJobApplicationDoc(applicationId, 'driving_license_front', drivingLicenseFront) : null,
            rules.needsLicense ? uploadJobApplicationDoc(applicationId, 'driving_license_back', drivingLicenseBack) : null,
        ]);
        await prisma.jobApplication.update({
            where: { id: saved.id },
            data: { icFrontPath, resumeCvPath, drivingLicenseFrontPath, drivingLicenseBackPath },
        });

        // Fire-and-forget notifications - a failed email/Teams post must never
        // fail the applicant's own submission.
        const alertData = { ...applicationData, applicationId };
        sendJobApplicationAlert({
            subject: `New Job Application - ${name} (${vacancy.title})`,
            html: buildJobApplicationEmailHtml(alertData),
            attachments: [
                dataUriToAttachment('IC_Front', icFront),
                dataUriToAttachment('Resume_CV', resumeCv),
                dataUriToAttachment('Driving_License_Front', drivingLicenseFront),
                dataUriToAttachment('Driving_License_Back', drivingLicenseBack),
            ].filter(Boolean),
        }).catch((err) => console.error('[jobApplication email] unexpected error:', err.message));
        notifyTeamsJobApplication(alertData).catch((err) => console.error('[jobApplication teams] unexpected error:', err.message));

        res.status(201).json({ message: "Application submitted successfully!", applicationId });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server application error." });
    }
});

module.exports = router;
