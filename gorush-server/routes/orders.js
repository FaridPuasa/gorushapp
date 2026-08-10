const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const User = require('../models/User');
const PublicHoliday = require('../models/PublicHoliday');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { computeTotalPrice } = require('../lib/pricing');
const { isChargeCurrentlyAvailable } = require('../lib/availability');
const { getOrderCreatedAt, getOrderUpdatedAt, getOrderDeliveryDate } = require('../lib/orderDates');

const PRODUCT_CODES = ['pharmacymoh', 'pharmacyjpmc', 'pharmacyphc', 'localdelivery', 'cbsl'];

// Allow-list for the /mine status filter — the 6 values in the Order schema's own enum,
// plus 3 more that real shared-collection orders can carry even though they're outside
// that enum (enum validation only applies to documents Mongoose itself inserts, not ones
// the external legacy system writes directly) — mirrors the client's own STATUS_ORDER in
// gorush-client/lib/trackingHistory.js.
const STATUS_FILTER_VALUES = [
    'Info Received', 'Custom Clearance', 'On Hold', 'At Warehouse',
    'Out For Delivery', 'Return to Warehouse', 'Completed', 'Failed',
];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const PHARMACY_PRODUCTS = ['pharmacymoh', 'pharmacyjpmc', 'pharmacyphc'];
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

// deliveryTypeCode is abbreviated for storage; the original human-readable charge code
// (e.g. "Standard", "Self Collect") is kept separately as jobMethod. Anything not in this
// map (e.g. "Drop off") defaults to STD.
const DELIVERY_TYPE_CODE_MAP = {
    'Standard': 'STD',
    'Express': 'EXP',
    'Immediate': 'IMM',
    'Self Collect': 'STD',
};
function mapDeliveryTypeCode(code) {
    return DELIVERY_TYPE_CODE_MAP[code] || 'STD';
}

// Which clinic/office a pharmacy order's paperwork gets routed to, by appointment district.
const APPOINTMENT_DISTRICT_TO_SEND_ORDER_TO = {
    'Brunei': 'OPD',
    'Temburong': 'OPD',
    'Tutong': 'PMMH',
    'Belait': 'SSBH',
};

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
            agreedTerms, captchaToken, captchaAnswer, orderOrigin,
        } = req.body;

        if (!product || !PRODUCT_CODES.includes(product)) {
            return res.status(400).json({ error: "A valid product is required." });
        }
        if (!receiverName || !address?.district || !address?.houseunitno || !address?.jalan || !address?.kampong) {
            return res.status(400).json({ error: "Full name and address are required." });
        }
        if (!receiverPhoneNumber) {
            return res.status(400).json({ error: "Phone number is required." });
        }
        if (req.userId && !receiverEmail) {
            return res.status(400).json({ error: "Email is required." });
        }

        // CBSL Self Collect has no delivery charge to pick — the customer is billed in
        // person when they collect, not through the order flow.
        const cbslSelfCollect = product === 'cbsl' && shipmentMethod === 'Self Collect';
        if (!cbslSelfCollect && !deliveryTypeCode) {
            return res.status(400).json({ error: "Charges are required." });
        }
        if (!paymentMethod) {
            return res.status(400).json({ error: "Payment method is required." });
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
        if (PHARMACY_PRODUCTS.includes(product)) {
            if (!dateOfBirth || (!icNum && !passport)) {
                return res.status(400).json({ error: "Date of birth and IC/Passport are required." });
            }
        }

        const pricingDistrict = product === 'localdelivery' ? senderAddressDetail?.district : address.district;
        const totalPriceValue = cbslSelfCollect ? 0 : await computeTotalPrice(product, pricingDistrict, deliveryTypeCode, ldProductWeight);
        if (totalPriceValue == null) {
            return res.status(400).json({ error: "Selected charges are not valid for this district." });
        }
        const holidays = await PublicHoliday.find().lean();
        const holidayDates = holidays.map((h) => h.date);
        if (!isChargeCurrentlyAvailable(product, deliveryTypeCode, holidayDates)) {
            return res.status(400).json({ error: "The selected charges are not available right now — please choose a different option." });
        }

        const now = new Date();

        // Pharmacy products and CBSL don't collect a real parcel weight — fixed at 1kg;
        // Local Delivery is the only product where the customer actually supplies one.
        const weightValue = product === 'localdelivery' ? ldProductWeight : '1';

        // Pharmacy products don't collect an items list either — give them one real entry
        // so items[] is always populated the same way CBSL's is.
        const itemsForStorage = PHARMACY_PRODUCTS.includes(product)
            ? [{ description: 'Medicine', weight: '1', quantity: '1' }]
            : items;

        // CBSL only: total value of all items, for insurance/COD purposes — currency-prefixed
        // to match the convention the client already displays this same sum with.
        const cargoPriceValue = product === 'cbsl' && Array.isArray(items)
            ? `RM ${items.reduce((sum, it) => sum + (Number(it.totalItemPrice) || 0), 0).toFixed(2)}`
            : undefined;

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
            deliveryTypeCode: cbslSelfCollect ? 'N/A' : mapDeliveryTypeCode(deliveryTypeCode),
            jobMethod: cbslSelfCollect ? 'Self Collect' : deliveryTypeCode,
            paymentMethod,
            remarks,
            totalPrice: totalPriceValue.toFixed(2),
            dateTimeSubmission: now.toISOString(),
            orderOrigin,
            weight: weightValue,
            cargoPrice: cargoPriceValue,
            dateOfBirth,
            icNum,
            passport,
            icPassNum: icNum || passport,
            bruhimsnum,
            patientNumber,
            appointmentDistrict,
            appointmentPlace,
            sendOrderTo: APPOINTMENT_DISTRICT_TO_SEND_ORDER_TO[appointmentDistrict],
            payingPatient,
            ldPickupOrDelivery,
            itemContains,
            ldProductType,
            ldProductWeight,
            billTo,
            shipmentMethod,
            parcelTrackingNum,
            supplierName,
            items: itemsForStorage,
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

// A logged-in user's own order history, newest first. Matches not just orders placed while
// logged in (userId), but also any order — including guest orders placed before this
// account existed, or by the external legacy system — that used the same IC/passport,
// BruHIMs, or patient number saved on this account. A single $or query returns each
// matching document at most once, so this can't produce duplicate rows for one order.
router.get('/mine', requireAuth, async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

        const user = await User.findById(req.userId).lean();
        const identityValues = new Set();
        for (const d of user?.userdetails || []) {
            [d.icnum, d.passportnum, d.bruhimsnum, d.patientphcnum, d.patientjpmcnum]
                .filter(Boolean)
                .forEach((v) => identityValues.add(v));
        }

        const orConditions = [{ userId: req.userId }];
        if (identityValues.size > 0) {
            const values = [...identityValues];
            orConditions.push({ icPassNum: { $in: values } });
            orConditions.push({ bruhimsnum: { $in: values } });
            orConditions.push({ patientNumber: { $in: values } });
        }
        const identityFilter = { $or: orConditions };

        // Optional filters, AND-combined with the identity match above — a user can only
        // ever search/filter within their own orders, never anyone else's.
        const andConditions = [identityFilter];
        if (req.query.product && PRODUCT_CODES.includes(req.query.product)) {
            andConditions.push({ product: req.query.product });
        }
        if (req.query.status && STATUS_FILTER_VALUES.includes(req.query.status)) {
            andConditions.push({ currentStatus: req.query.status });
        }
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        if (search) {
            andConditions.push({ doTrackingNumber: { $regex: escapeRegex(search), $options: 'i' } });
        }
        const filter = andConditions.length > 1 ? { $and: andConditions } : identityFilter;

        const [orders, totalCount] = await Promise.all([
            Order.find(filter).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Order.countDocuments(filter),
        ]);

        res.status(200).json({
            orders: orders.map((order) => ({
                orderId: order._id,
                product: order.product,
                trackingNumber: (order.doTrackingNumber && order.doTrackingNumber !== 'N/A') ? order.doTrackingNumber : null,
                status: order.currentStatus,
                date: getOrderCreatedAt(order),
                deliveryDate: getOrderDeliveryDate(order),
                jobMethod: order.jobMethod || null,
                paymentMethod: order.paymentMethod || null,
                totalPrice: order.totalPrice,
            })),
            page,
            totalPages: Math.max(Math.ceil(totalCount / limit), 1),
            totalCount,
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
        // CBSL customers often only have the original courier's (e.g. SPX/J&T) tracking
        // number, not our own — so for that product, match on either.
        const order = await Order.findOne({
            $or: [
                { doTrackingNumber: req.params.trackingNumber },
                { product: 'cbsl', parcelTrackingNum: req.params.trackingNumber },
            ],
        }).lean();
        if (!order) {
            return res.status(404).json({ error: "No order found with that tracking number." });
        }
        res.status(200).json({
            trackingNumber: order.doTrackingNumber,
            status: order.currentStatus,
            history: order.history || [],
            createdAt: getOrderCreatedAt(order),
            updatedAt: getOrderUpdatedAt(order),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server tracking error." });
    }
});

module.exports = router;
