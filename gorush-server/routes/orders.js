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
const { isPostgresOrderIntakeEnabled } = require('../lib/supabaseFlag');
const postgresOrders = require('../lib/postgresOrders');
const { generateTrackingNumber } = require('../lib/trackingNumber');
const { createDetrackJob } = require('../lib/detrack');
const { parseGorushDateOnly } = require('../lib/dateHelpers');
const { sendOrderAlert } = require('../lib/mailer');
const { appendJpmcGuestOrderRow, appendCbslManifestRows } = require('../lib/msGraphExcel');
const { sendWhatsAppMessage } = require('../lib/whatsapp');
const { getAreaFromAddress } = require('../lib/area');
const { notifyTeams } = require('../lib/teamsNotify');

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

// Which of the 3 old Make.com-driven order alert emails (if any) this order
// needs, mirroring the old flow's trigger conditions: moh/jpmc's "Immediate"
// charge code, any phc order, or "Self Collect" regardless of product.
function getOrderAlertReason(orderData) {
    if ((orderData.product === 'pharmacymoh' || orderData.product === 'pharmacyjpmc') && orderData.jobMethod === 'Immediate') {
        return 'immediate';
    }
    if (orderData.product === 'pharmacyphc') {
        return 'phc';
    }
    if (orderData.jobMethod === 'Self Collect') {
        return 'selfCollect';
    }
    return null;
}

// Matches Make.com's own {Product} field output for the subject line -
// the old flow's Webflow-sourced product label, not gorushapp's internal
// product code.
const ORDER_ALERT_PRODUCT_NAME = {
    pharmacymoh: 'Pharmacy MOH',
    pharmacyjpmc: 'Pharmacy JPMC',
    pharmacyphc: 'Pharmacy PHC',
    localdelivery: 'Local Delivery',
    cbsl: 'CBSL',
};

function formatBruneiDateTime(date) {
    return date ? new Date(date).toLocaleString('en-GB', { timeZone: 'Asia/Brunei' }) : '';
}

// Mirrors the 3 Make.com "Microsoft 365 Email" modules being replaced -
// same subject format and same field list/order, confirmed 2026-08-26.
// "Area" has no direct equivalent in gorushapp's schema (that was a
// legacy Mongo-only district classification) - using the delivery
// address's district as the closest match.
function buildOrderAlertEmail(reason, orderData, trackingNumber) {
    const productName = ORDER_ALERT_PRODUCT_NAME[orderData.product] || orderData.product;
    const dateTimeSubmission = formatBruneiDateTime(orderData.dateTimeSubmission);
    const area = orderData.address?.district || '';
    // MOH uses bruhimsnum, JPMC/PHC use patientNumber - mutually exclusive
    // per product, so a single combined line covers all 3 pharmacy products.
    const bruhimsOrPatientNumber = orderData.bruhimsnum || orderData.patientNumber || '';

    const withAddressAndArea = `
        <p>DO Tracking Number: ${trackingNumber}</p>
        <p>Date Time Submission: ${dateTimeSubmission}</p>
        <p>Product: ${productName}</p>
        <p>Receiver Name: ${orderData.receiverName || ''}</p>
        <p>Receiver Address: ${orderData.receiverAddress || ''}</p>
        <p>Receiver Phone Number: ${orderData.receiverPhoneNumber || ''}</p>
        <p>Additional Phone Number: ${orderData.additionalPhoneNumber || ''}</p>
        <p>Area: ${area}</p>
        <p>BruHIMS/Patient No.: ${bruhimsOrPatientNumber}</p>
        <p>Payment Method: ${orderData.paymentMethod || ''}</p>
        <p>Remarks: ${orderData.remarks || ''}</p>
    `;

    if (reason === 'immediate') {
        return { subject: `Immediate Order from ${productName}`, html: withAddressAndArea };
    }
    if (reason === 'phc') {
        return { subject: `Panaga HC Order from ${productName}`, html: withAddressAndArea };
    }
    // selfCollect - no delivery, so no address/area
    return {
        subject: `Self Collect Order from ${productName}`,
        html: `
            <p>DO Tracking Number: ${trackingNumber}</p>
            <p>Date Time Submission: ${dateTimeSubmission}</p>
            <p>Product: ${productName}</p>
            <p>Receiver Name: ${orderData.receiverName || ''}</p>
            <p>Receiver Phone Number: ${orderData.receiverPhoneNumber || ''}</p>
            <p>Additional Phone Number: ${orderData.additionalPhoneNumber || ''}</p>
            <p>BruHIMS/Patient No.: ${bruhimsOrPatientNumber}</p>
            <p>Payment Method: ${orderData.paymentMethod || ''}</p>
            <p>Remarks: ${orderData.remarks || ''}</p>
        `,
    };
}
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
            pickupDate, pickupAddress,
            shipmentMethod, parcelTrackingNum, supplierName, items,
            agreedTerms, captchaToken, captchaAnswer, orderOrigin,
        } = req.body;

        // Pharmacy products and CBSL don't collect a real parcel weight — fixed at 1kg;
        // Local Delivery is the only product where the customer actually supplies one.
        // Computed early so both validation and pricing below use this single source -
        // ldProductWeight is only ever read here, never stored as its own field (it and
        // weight were always the same value for Local Delivery, so there's no reason to
        // persist both).
        const weightValue = product === 'localdelivery' ? ldProductWeight : '1';

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
            if (!ldPickupOrDelivery || !itemContains || !ldProductType || !weightValue || !billTo) {
                return res.status(400).json({ error: "All Local Delivery fields are required." });
            }
            if (ldPickupOrDelivery === 'Pickup & Delivery' && (!pickupDate || !pickupAddress)) {
                return res.status(400).json({ error: "Pickup date and address are required for Pickup & Delivery." });
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
        const totalPriceValue = cbslSelfCollect ? 0 : await computeTotalPrice(product, pricingDistrict, deliveryTypeCode, weightValue);
        if (totalPriceValue == null) {
            return res.status(400).json({ error: "Selected charges are not valid for this district." });
        }
        const holidays = await PublicHoliday.find().lean();
        const holidayDates = holidays.map((h) => h.date);
        if (!isChargeCurrentlyAvailable(product, deliveryTypeCode, holidayDates)) {
            return res.status(400).json({ error: "The selected charges are not available right now — please choose a different option." });
        }

        const now = new Date();

        // Pharmacy and Local Delivery don't collect a real multi-item list the way CBSL
        // does - both get one synthesized entry so items[] is always populated the same
        // way across all 5 products. Local Delivery's is built from itemContains/weight
        // rather than fixed literals, since those are what the customer actually supplied.
        // ldProductType has no slot in the items[] sub-schema, so it stays a separate
        // top-level field - deliberately single-entry for now, but this shape is what a
        // future multi-item Local Delivery UI (mirroring CBSL's) would already expect.
        let itemsForStorage;
        if (PHARMACY_PRODUCTS.includes(product)) {
            itemsForStorage = [{ description: 'Medicine', weight: '1', quantity: '1' }];
        } else if (product === 'localdelivery') {
            itemsForStorage = [{ description: itemContains, weight: weightValue, quantity: '1' }];
        } else {
            itemsForStorage = items;
        }

        // CBSL only: total value of all items, for insurance/COD purposes — currency-prefixed
        // to match the convention the client already displays this same sum with.
        const cargoPriceValue = product === 'cbsl' && Array.isArray(items)
            ? `RM ${items.reduce((sum, it) => sum + (Number(it.totalItemPrice) || 0), 0).toFixed(2)}`
            : undefined;

        // Shared shape between both DB paths - pulled out so the Postgres path
        // (below) can reuse all this same business logic (pricing, delivery-type-
        // code mapping, sendOrderTo derivation, etc.) instead of re-deriving it.
        const orderData = {
            userId: req.userId || null,
            product,
            receiverName,
            address,
            receiverAddress: `${address.houseunitno}, ${address.jalan}, ${address.kampong}${address.simpang ? `, ${address.simpang}` : ''}, ${address.district}`,
            // Derived from the same string, not stored separately by the client -
            // matches grfmxstatusupdate's own getAreaFromAddress() so this order's
            // area/Detrack zone lines up with how every other order gets classified.
            area: getAreaFromAddress(`${address.houseunitno}, ${address.jalan}, ${address.kampong}${address.simpang ? `, ${address.simpang}` : ''}, ${address.district}`),
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
            // Real number, not a currency-formatted string - cargoPrice below is the one
            // deliberate exception, since it's the only price the client itself already
            // displays with a currency prefix.
            totalPrice: totalPriceValue,
            // Real Date, not an ISO string - stores the same instant either way, just as
            // an actual BSON Date so it sorts/queries correctly.
            dateTimeSubmission: now,
            orderOrigin,
            weight: weightValue,
            cargoPrice: cargoPriceValue,
            // Parsed once, here, at the write boundary - a UTC calendar date built
            // directly from the DD.MM.YYYY components, no timezone conversion. Same
            // parser already used (and reviewed) for the dormant Postgres path, so both
            // paths agree on the exact same value.
            dateOfBirth: parseGorushDateOnly(dateOfBirth),
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
            pickupDate: ldPickupOrDelivery === 'Pickup & Delivery' ? parseGorushDateOnly(pickupDate) : undefined,
            pickupAddress: ldPickupOrDelivery === 'Pickup & Delivery' ? pickupAddress : undefined,
            billTo,
            shipmentMethod,
            parcelTrackingNum,
            supplierName,
            items: itemsForStorage,
            agreedTerms,
            currentStatus: "Info Received",
        };

        if (isPostgresOrderIntakeEnabled()) {
            const { trackingNumber, sequence } = await generateTrackingNumber(product);
            const row = postgresOrders.buildPostgresOrderRow(orderData, { trackingNumber, sequence });
            const pgOrder = await postgresOrders.insertOrder(row, {
                statusHistory: "Info Received",
                dateUpdated: now,
            });
            const legacyShaped = postgresOrders.toLegacyShape(pgOrder);

            // Synchronous Detrack job creation replaces the old async change-
            // stream-watcher trigger - reuses lib/detrack.js completely unchanged.
            const detrackResult = await createDetrackJob(legacyShaped);
            if (detrackResult.ok) {
                await postgresOrders.recordDetrackJobId(pgOrder.id, detrackResult.id);
            } else {
                console.error(`[detrack] failed to create job for ${trackingNumber}: ${detrackResult.error}`);
                // Do not fail the order-creation request over a Detrack failure -
                // same fire-and-forget tolerance the old watcher had.
            }

            // Notification side effects (email/WhatsApp/Excel) run AFTER the
            // response below, not awaited here - a CBSL order with several
            // items needs its own Excel row + screenshot upload + hyperlink
            // call per item, which chained sequentially blew well past
            // Heroku's 30s router timeout (H12) even though every step
            // itself succeeded. None of these affect what the customer sees
            // (their tracking number), so there's no reason to make them
            // wait on it.
            (async () => {
                try {
                    const alertReason = getOrderAlertReason(orderData);
                    if (alertReason) {
                        await sendOrderAlert(buildOrderAlertEmail(alertReason, orderData, trackingNumber));
                    }
                    await sendWhatsAppMessage(orderData.receiverPhoneNumber, orderData.receiverName, trackingNumber, product);
                    await notifyTeams(orderData, trackingNumber);
                    if (product === 'pharmacyjpmc') {
                        await appendJpmcGuestOrderRow(orderData, trackingNumber);
                    } else if (product === 'cbsl') {
                        await appendCbslManifestRows(orderData, trackingNumber);
                    }
                } catch (err) {
                    console.error(`[post-order notifications] failed for ${trackingNumber}:`, err.message);
                }
            })();

            return res.status(201).json({
                message: "Order placed successfully!",
                orderId: legacyShaped._id,
                trackingNumber,
                status: legacyShaped.currentStatus,
                totalPrice: legacyShaped.totalPrice,
            });
        }

        const newOrder = new Order({
            ...orderData,
            history: [{ statusHistory: "Info Received", dateUpdated: now }],
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

        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const product = req.query.product && PRODUCT_CODES.includes(req.query.product) ? req.query.product : null;
        const status = req.query.status && STATUS_FILTER_VALUES.includes(req.query.status) ? req.query.status : null;

        let orders, totalCount;
        if (isPostgresOrderIntakeEnabled()) {
            ({ orders, totalCount } = await postgresOrders.findMine({
                userId: req.userId,
                identityValues: [...identityValues],
                product,
                status,
                search,
                page,
                limit,
            }));
        } else {
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
            if (product) andConditions.push({ product });
            if (status) andConditions.push({ currentStatus: status });
            if (search) {
                andConditions.push({ doTrackingNumber: { $regex: escapeRegex(search), $options: 'i' } });
            }
            const filter = andConditions.length > 1 ? { $and: andConditions } : identityFilter;

            [orders, totalCount] = await Promise.all([
                Order.find(filter).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
                Order.countDocuments(filter),
            ]);
        }

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
        const isMongoId = mongoose.Types.ObjectId.isValid(req.params.id);
        // Postgres bigint id, as a plain digit string - returned by POST / once
        // isPostgresOrderIntakeEnabled() is on (see above). Gated behind the
        // same flag here too - otherwise an all-digit, non-ObjectId id would
        // be accepted by this guard even with the feature off, changing this
        // route's flag-off behavior (400 -> 404) for that input shape.
        const isPgId = isPostgresOrderIntakeEnabled() && /^\d+$/.test(req.params.id);
        if (!isMongoId && !isPgId) {
            return res.status(400).json({ error: "Invalid order id." });
        }

        // The flag alone decides which DB is authoritative right now - not which
        // ID shape was passed - so an in-flight poll started just before a flag
        // flip doesn't 400 on a shape mismatch, it just won't find the order
        // (matching a real "not found" for an id from the other DB).
        const order = isPostgresOrderIntakeEnabled()
            ? (isPgId ? await postgresOrders.findStatusById(req.params.id) : null)
            : (isMongoId ? await Order.findById(req.params.id).lean() : null);
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
        const order = isPostgresOrderIntakeEnabled()
            ? await postgresOrders.findByTrackingNumber(req.params.trackingNumber)
            : await Order.findOne({
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
