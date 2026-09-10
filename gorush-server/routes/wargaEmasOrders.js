const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const WargaEmasOrder = require('../models/WargaEmasOrder');
const { optionalAuth } = require('../middleware/auth');
const { sendOrderAlert } = require('../lib/mailer');
const { notifyTeams } = require('../lib/teamsNotify');
const { isPostgresWargaEmasEnabled } = require('../lib/supabaseFlag');
const prisma = require('../lib/prismaClient');

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
        let mongoId;

        if (isPostgresWargaEmasEnabled()) {
            // Postgres-primary, matching the same flip already applied to
            // grfmxstatusupdate's other 10 collections (users, reports,
            // inventoryStock, etc.): Postgres write happens first and its
            // failure fails the request - it's the real record now, not a
            // mirror. Mongo is kept only as a best-effort rollback safety
            // net during the transition (its failure is logged, never
            // fatal) - a real MongoDB-shaped ObjectId is still generated
            // locally (no DB round-trip needed to make one) so both sides
            // share the same identifier, which grfmxstatusupdate's own read
            // path (data/waorders.js's `_id: row.mongoId`) already expects.
            mongoId = new mongoose.Types.ObjectId().toString();
            await prisma.waOrder.create({
                data: { mongoId, icPictureFront, icPictureBack, dateTimeSubmission, receiverPhoneNumber },
            });

            try {
                await new WargaEmasOrder({
                    _id: mongoId,
                    receiverPhoneNumber,
                    icPictureFront,
                    icPictureBack,
                    dateTimeSubmission: dateTimeSubmission.toISOString(),
                }).save();
            } catch (mongoErr) {
                console.error('[Mongo] Warga Emas mirror write failed (Postgres already has the real record, this is just the rollback-safety mirror):', mongoErr.message);
            }
        } else {
            // Flag off - original pure-Mongo path, unchanged, so this can be
            // rolled back to instantly by flipping SUPABASE_WARGA_EMAS_ENABLED.
            const newOrder = new WargaEmasOrder({
                receiverPhoneNumber,
                icPictureFront,
                icPictureBack,
                dateTimeSubmission: dateTimeSubmission.toISOString(),
            });
            const savedOrder = await newOrder.save();
            mongoId = savedOrder._id.toString();
        }

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
