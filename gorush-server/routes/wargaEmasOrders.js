const express = require('express');
const router = express.Router();
const WargaEmasOrder = require('../models/WargaEmasOrder');
const { optionalAuth } = require('../middleware/auth');

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
