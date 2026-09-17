const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { optionalAuth } = require('../middleware/auth');
const { sendOrderAlert } = require('../lib/mailer');
const { notifyTeams } = require('../lib/teamsNotify');
const prisma = require('../lib/prismaClient');

// Generates a Mongo-ObjectId-shaped hex string (24 hex chars) with zero I/O -
// no real Mongo document is created anymore (fully cut over 2026-09-17), but
// grfmxstatusupdate's own read path (data/waorders.js's `_id: row.mongoId`)
// still expects this id shape, so the column/format stays even though the
// origin no longer has anything to do with a real ObjectId.
function generateMongoIdShape() {
    return crypto.randomBytes(12).toString('hex');
}

function formatBruneiDateTime(date) {
    return date ? new Date(date).toLocaleString('en-GB', { timeZone: 'Asia/Brunei' }) : '';
}

function buildWargaEmasAlertEmail(orderData) {
    return {
        subject: 'Warga Emas Request',
        html: `
            <p>Date Time Submission: ${formatBruneiDateTime(orderData.dateTimeSubmission)}</p>
            <p>Phone: ${orderData.receiverPhoneNumber || ''}</p>
            <p>IC Photos: Submitted - view in admin dashboard</p>
        `,
    };
}

router.post('/', optionalAuth, async (req, res) => {
    try {
        if (req.userId) {
            return res.status(403).json({ error: "Warga Emas requests are for guest submissions only." });
        }

        const { receiverPhoneNumber, icPictureFront, icPictureBack } = req.body;

        if (!receiverPhoneNumber) {
            return res.status(400).json({ error: "Phone number is required." });
        }
        if (!icPictureFront || !icPictureBack) {
            return res.status(400).json({ error: "Both front and back IC pictures are required." });
        }

        const dateTimeSubmission = new Date();
        const mongoId = generateMongoIdShape();
        await prisma.waOrder.create({
            data: { mongoId, icPictureFront, icPictureBack, dateTimeSubmission, receiverPhoneNumber },
        });

        // Same tolerance as the Postgres order-intake path's own Teams/email
        // side effects (both already swallow their own errors internally) -
        // a failed notification never fails the submission itself.
        const orderData = {
            product: 'wargaemas',
            dateTimeSubmission: dateTimeSubmission.toISOString(),
            receiverPhoneNumber,
        };
        await sendOrderAlert(buildWargaEmasAlertEmail(orderData));
        await notifyTeams(orderData, mongoId);

        res.status(201).json({
            message: "Warga Emas request submitted successfully!",
            orderId: mongoId,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;
