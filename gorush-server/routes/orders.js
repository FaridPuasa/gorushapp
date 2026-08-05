const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const { optionalAuth } = require('../middleware/auth');
const { computeTotalPrice } = require('../lib/pricing');
const { isChargeCurrentlyAvailable } = require('../lib/availability');
const { getOrderCreatedAt, getOrderUpdatedAt } = require('../lib/orderDates');

const PRODUCT_CODES = ['pharmacymoh', 'pharmacyjpmc', 'pharmacyphc', 'localdelivery', 'cbsl'];
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function generateCaptchaCode() {
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
    }
    return code;
}

router.get('/captcha', (req, res) => {
    const code = generateCaptchaCode();
    const token = jwt.sign({ code }, process.env.JWT_SECRET, { expiresIn: '10m' });
    res.status(200).json({ code, token });
});

router.post('/', optionalAuth, async (req, res) => {
    try {
        const {
            product,
            receiverName, address, receiverEmail, receiverPhoneNumber, additionalPhoneNumber,
            senderName, senderAddressDetail, senderEmail, senderPhoneNumber,
            deliveryTypeCode, paymentMethod, remarks,
            dateOfBirth, icNum, passport, bruhimsnum, patientNumber,
            appointmentDistrict, appointmentPlace, payingPatient,
            ldPickupOrDelivery, itemContains, ldProductType, ldProductWeight, billTo,
            shipmentMethod, parcelTrackingNum, supplierName, items,
            agreedTerms, captchaToken, captchaAnswer,
        } = req.body;

        if (!product || !PRODUCT_CODES.includes(product)) {
            return res.status(400).json({ error: "A valid product is required." });
        }
        if (!receiverName || !address?.district || !address?.houseunitno || !address?.jalan || !address?.kampong || !address?.postalcode) {
            return res.status(400).json({ error: "Full name and address are required." });
        }
        if (!receiverEmail || !receiverPhoneNumber) {
            return res.status(400).json({ error: "Email and phone number are required." });
        }
        if (!deliveryTypeCode || !paymentMethod) {
            return res.status(400).json({ error: "Charges and payment method are required." });
        }
        if (agreedTerms !== true) {
            return res.status(400).json({ error: "You must agree to the Terms & Conditions." });
        }
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

        if (product === 'localdelivery') {
            if (!senderName || !senderAddressDetail?.district) {
                return res.status(400).json({ error: "Sender details are required for Local Delivery." });
            }
            if (!ldPickupOrDelivery || !itemContains || !ldProductType || !ldProductWeight || !billTo) {
                return res.status(400).json({ error: "All Local Delivery fields are required." });
            }
        }
        if (product === 'cbsl') {
            if (!shipmentMethod || !parcelTrackingNum || !supplierName) {
                return res.status(400).json({ error: "All Cross Border Service fields are required." });
            }
            if (!Array.isArray(items) || items.length === 0 || items.some((it) => !it.description || !it.quantity || !it.totalItemPrice || !it.screenshotInvoice)) {
                return res.status(400).json({ error: "Each item must have a description, quantity, total price, and invoice screenshot." });
            }
        }
        if (['pharmacymoh', 'pharmacyjpmc', 'pharmacyphc'].includes(product)) {
            if (!dateOfBirth || (!icNum && !passport)) {
                return res.status(400).json({ error: "Date of birth and IC/Passport are required." });
            }
        }

        const pricingDistrict = product === 'localdelivery' ? senderAddressDetail?.district : address.district;
        const totalPriceValue = computeTotalPrice(product, pricingDistrict, deliveryTypeCode, ldProductWeight);
        if (totalPriceValue == null) {
            return res.status(400).json({ error: "Selected charges are not valid for this district." });
        }
        if (!isChargeCurrentlyAvailable(deliveryTypeCode)) {
            return res.status(400).json({ error: "The selected charges are not available right now — please choose a different option." });
        }

        const now = new Date();

        const newOrder = new Order({
            userId: req.userId || null,
            product,
            receiverName,
            address,
            receiverAddress: `${address.houseunitno}, ${address.jalan}, ${address.kampong}${address.simpang ? `, ${address.simpang}` : ''}, ${address.district}`,
            receiverPostalCode: address.postalcode,
            receiverEmail,
            receiverPhoneNumber,
            additionalPhoneNumber,
            senderName,
            senderAddressDetail,
            senderAddress: senderAddressDetail
                ? `${senderAddressDetail.houseunitno}, ${senderAddressDetail.jalan}, ${senderAddressDetail.kampong}${senderAddressDetail.simpang ? `, ${senderAddressDetail.simpang}` : ''}, ${senderAddressDetail.district}`
                : undefined,
            senderPostalCode: senderAddressDetail?.postalcode,
            senderEmail,
            senderPhoneNumber,
            deliveryTypeCode,
            paymentMethod,
            remarks,
            totalPrice: `$${totalPriceValue.toFixed(2)}`,
            dateTimeSubmission: now.toISOString(),
            dateOfBirth,
            icNum,
            passport,
            icPassNum: icNum || passport,
            bruhimsnum,
            patientNumber,
            appointmentDistrict,
            appointmentPlace,
            payingPatient,
            ldPickupOrDelivery,
            itemContains,
            ldProductType,
            ldProductWeight,
            billTo,
            shipmentMethod,
            parcelTrackingNum,
            supplierName,
            items,
            agreedTerms,
            currentStatus: "Info Received",
            history: [{ statusHistory: "Info Received", dateUpdated: now.toISOString() }],
        });

        // doTrackingNumber is intentionally left unset here — an external service watches
        // this collection's inserts and assigns it asynchronously via its own sequence.
        const savedOrder = await newOrder.save();
        res.status(201).json({
            message: "Order placed successfully!",
            orderId: savedOrder._id,
            status: savedOrder.currentStatus,
            totalPrice: savedOrder.totalPrice,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server order error." });
    }
});

// Polled by the client right after submit, until the external watcher assigns doTrackingNumber.
router.get('/status/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid order id." });
        }
        const order = await Order.findById(req.params.id).lean();
        if (!order) {
            return res.status(404).json({ error: "Order not found." });
        }
        res.status(200).json({
            // "N/A" is the placeholder default until the external watcher assigns a real
            // tracker — surface that to the client as "not yet available" (null), same as
            // before doTrackingNumber had a default at all, so the polling loop in
            // app/order.js (which just checks truthiness) needs no change.
            trackingNumber: (order.doTrackingNumber && order.doTrackingNumber !== 'N/A') ? order.doTrackingNumber : null,
            status: order.currentStatus,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server order error." });
    }
});

router.get('/track/:trackingNumber', async (req, res) => {
    try {
        // "N/A" is the shared placeholder for orders still awaiting a real tracker — many
        // documents match it, so treat a literal lookup for it as "not found" rather than
        // returning an arbitrary one of them.
        if (req.params.trackingNumber.toUpperCase() === 'N/A') {
            return res.status(404).json({ error: "No order found with that tracking number." });
        }
        const order = await Order.findOne({ doTrackingNumber: req.params.trackingNumber }).lean();
        if (!order) {
            return res.status(404).json({ error: "No order found with that tracking number." });
        }
        res.status(200).json({
            trackingNumber: order.doTrackingNumber,
            status: order.currentStatus,
            createdAt: getOrderCreatedAt(order),
            updatedAt: getOrderUpdatedAt(order),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server tracking error." });
    }
});

module.exports = router;
