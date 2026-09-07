const express = require('express');
const router = express.Router();
const WargaEmasOrder = require('../models/WargaEmasOrder');
const { optionalAuth } = require('../middleware/auth');
const { sendOrderAlert } = require('../lib/mailer');
const { notifyTeams } = require('../lib/teamsNotify');

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

        const newOrder = new WargaEmasOrder({
            receiverPhoneNumber,
            icPictureFront,
            icPictureBack,
            dateTimeSubmission: new Date().toISOString(),
        });

        const savedOrder = await newOrder.save();

        // Same tolerance as the Postgres order-intake path's own Teams/email
        // side effects (both already swallow their own errors internally) -
        // a failed notification never fails the submission itself.
        const orderData = {
            product: 'wargaemas',
            dateTimeSubmission: newOrder.dateTimeSubmission,
            receiverPhoneNumber,
        };
        await sendOrderAlert(buildWargaEmasAlertEmail(orderData));
        await notifyTeams(orderData, savedOrder._id.toString());

        res.status(201).json({
            message: "Warga Emas request submitted successfully!",
            orderId: savedOrder._id,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;
