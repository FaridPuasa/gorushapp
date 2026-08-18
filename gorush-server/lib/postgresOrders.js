// Postgres-backed order intake + reads, for the 5 product types this app
// creates orders for (pharmacymoh/pharmacyjpmc/pharmacyphc/localdelivery/
// cbsl). Only active when lib/supabaseFlag.js's isPostgresOrderIntakeEnabled()
// is true - see routes/orders.js for the branch points.
const prisma = require('./prismaClient');
const { toNumber } = require('./detrack');
const { parseGorushIso } = require('./dateHelpers');

// Maps the exact object shape routes/orders.js already builds for the Mongo
// path (the argument passed to `new Order({...})`) into a Prisma Order
// create() data object. Reuses that object rather than re-deriving pricing/
// delivery-type-code/sendOrderTo/etc. business logic a second time - those
// stay the DB-agnostic single source of truth in routes/orders.js.
//
// Fields intentionally NOT persisted (see HANDOFF plan for reasoning):
// - address / senderAddressDetail (structured subdocs) - only the
//   pre-concatenated receiverAddress/senderAddress strings are stored,
//   matching how grfmxstatusupdate itself stores addresses.
// - orderOrigin, agreedTerms - gorush-internal-only, no downstream use.
// - history - built separately below as a single OrderHistory row.
function buildPostgresOrderRow(orderData, { trackingNumber, sequence }) {
    return {
        doTrackingNumber: trackingNumber,
        sequence: sequence != null ? String(sequence) : null,
        product: orderData.product ?? null,
        receiverName: orderData.receiverName ?? null,
        receiverAddress: orderData.receiverAddress ?? null,
        receiverPostalCode: orderData.receiverPostalCode ?? null,
        receiverEmail: orderData.receiverEmail ?? null,
        receiverPhoneNumber: orderData.receiverPhoneNumber ?? null,
        additionalPhoneNumber: orderData.additionalPhoneNumber ?? null,
        senderName: orderData.senderName ?? null,
        senderAddress: orderData.senderAddress ?? null,
        senderPostalCode: orderData.senderPostalCode ?? null,
        senderEmail: orderData.senderEmail ?? null,
        senderPhoneNumber: orderData.senderPhoneNumber ?? null,
        deliveryTypeCode: orderData.deliveryTypeCode ?? null,
        jobMethod: orderData.jobMethod ?? null,
        paymentMethod: orderData.paymentMethod ?? null,
        remarks: orderData.remarks ?? null,
        // orderData.totalPrice is already a real number (routes/orders.js no longer
        // stringifies it) - passed through as-is.
        totalPrice: orderData.totalPrice ?? null,
        dateTimeSubmission: parseGorushIso(orderData.dateTimeSubmission),
        // creationDate and lastUpdateDateTime both mirror dateTimeSubmission -
        // same instant, since the order was just created - so gorush-created
        // orders sort/filter correctly alongside legacy orders in
        // grfmxstatusupdate's existing date-range dashboards, and
        // getOrderUpdatedAt() (lib/orderDates.js) has a real timestamp to read
        // instead of null for a brand-new order.
        creationDate: parseGorushIso(orderData.dateTimeSubmission),
        lastUpdateDateTime: parseGorushIso(orderData.dateTimeSubmission),
        // toNumber() (lib/detrack.js) strips non-numeric characters and
        // returns undefined (not NaN) on unparseable input - Decimal columns
        // reject NaN outright, so any malformed weight must degrade to null
        // the same way Mongo's untyped String columns silently accept it.
        parcelWeight: toNumber(orderData.weight) ?? null,
        cargoPrice: toNumber(orderData.cargoPrice) ?? null,
        // orderData.dateOfBirth is already a parsed Date (routes/orders.js parses it
        // once, at the Mongo-write boundary via parseGorushDateOnly()) - passed
        // through as-is, not re-parsed.
        dateOfBirth: orderData.dateOfBirth ?? null,
        icNum: orderData.icNum ?? null,
        passport: orderData.passport ?? null,
        icPassNum: orderData.icPassNum ?? null,
        bruhimsnum: orderData.bruhimsnum ?? null,
        patientNumber: orderData.patientNumber ?? null,
        appointmentDistrict: orderData.appointmentDistrict ?? null,
        appointmentPlace: orderData.appointmentPlace ?? null,
        sendOrderTo: orderData.sendOrderTo ?? null,
        payingPatient: orderData.payingPatient ?? null,
        ldPickupOrDelivery: orderData.ldPickupOrDelivery ?? null,
        itemContains: orderData.itemContains ?? null,
        ldProductType: orderData.ldProductType ?? null,
        // Already a parsed Date (routes/orders.js, via parseGorushDateOnly()) - passed
        // through as-is, same treatment as dateOfBirth above.
        pickupDate: orderData.pickupDate ?? null,
        pickupAddress: orderData.pickupAddress ?? null,
        billTo: orderData.billTo ?? null,
        shipmentMethod: orderData.shipmentMethod ?? null,
        parcelTrackingNum: orderData.parcelTrackingNum ?? null,
        supplierName: orderData.supplierName ?? null,
        items: orderData.items ?? null,
        currentStatus: orderData.currentStatus ?? 'Info Received',
        gorushUserId: orderData.userId ? String(orderData.userId) : null,
        // Detrack's own convention: a freshly created job starts at attempt 1,
        // not 0 - this column was declared in schema.prisma but never actually
        // set anywhere, so every order created via this flow left it null.
        attempt: 1,
    };
}

async function insertOrder(row, historyEntry) {
    return prisma.order.create({
        data: {
            ...row,
            history: {
                create: [{
                    statusHistory: historyEntry.statusHistory,
                    dateUpdated: parseGorushIso(historyEntry.dateUpdated),
                }],
            },
        },
        include: { history: true },
    });
}

async function recordDetrackJobId(orderId, detrackJobId) {
    await prisma.order.update({ where: { id: orderId }, data: { detrackJobId } });
}

// Converts a Prisma Order (+ history relation) back into the shape
// lib/orderDates.js and lib/detrack.js's buildJobPayload() already expect -
// letting those files be reused completely unchanged rather than rewritten
// to understand two different order shapes.
//
// Two aliasing quirks worth calling out:
// - `_id` is set to the Postgres bigint id, stringified - routes/orders.js's
//   /mine response building reads `order._id` directly.
// - `weight` is aliased from the `parcelWeight` column - detrack.js's
//   buildJobPayload() reads `order.weight`, but Postgres has no such column
//   (Mongo's generic "weight" field maps to Postgres's parcelWeight).
// Date fields are converted back to ISO strings (not left as Date objects) -
// lib/orderDates.js's parseFlexibleDate() only accepts strings.
function toLegacyShape(pgOrder) {
    return {
        _id: pgOrder.id.toString(),
        product: pgOrder.product,
        doTrackingNumber: pgOrder.doTrackingNumber,
        sequence: pgOrder.sequence,
        receiverName: pgOrder.receiverName,
        receiverAddress: pgOrder.receiverAddress,
        receiverPostalCode: pgOrder.receiverPostalCode,
        receiverEmail: pgOrder.receiverEmail,
        receiverPhoneNumber: pgOrder.receiverPhoneNumber,
        additionalPhoneNumber: pgOrder.additionalPhoneNumber,
        senderName: pgOrder.senderName,
        senderAddress: pgOrder.senderAddress,
        senderPostalCode: pgOrder.senderPostalCode,
        senderEmail: pgOrder.senderEmail,
        senderPhoneNumber: pgOrder.senderPhoneNumber,
        deliveryTypeCode: pgOrder.deliveryTypeCode,
        jobMethod: pgOrder.jobMethod,
        paymentMethod: pgOrder.paymentMethod,
        remarks: pgOrder.remarks,
        totalPrice: pgOrder.totalPrice != null ? pgOrder.totalPrice.toFixed(2) : null,
        dateTimeSubmission: pgOrder.dateTimeSubmission ? pgOrder.dateTimeSubmission.toISOString() : null,
        creationDate: pgOrder.creationDate ? pgOrder.creationDate.toISOString() : null,
        lastUpdateDateTime: pgOrder.lastUpdateDateTime ? pgOrder.lastUpdateDateTime.toISOString() : null,
        weight: pgOrder.parcelWeight != null ? pgOrder.parcelWeight.toString() : null,
        cargoPrice: pgOrder.cargoPrice != null ? pgOrder.cargoPrice.toString() : null,
        // ISO date-only (YYYY-MM-DD) - no current consumer reconstructs the
        // original DD.MM.YYYY wire format, so there's nothing to round-trip
        // back to; this is just readable back out for whatever future
        // route/feature needs it, matching Mongo's own full-fidelity access.
        dateOfBirth: pgOrder.dateOfBirth ? pgOrder.dateOfBirth.toISOString().slice(0, 10) : null,
        icNum: pgOrder.icNum,
        passport: pgOrder.passport,
        icPassNum: pgOrder.icPassNum,
        bruhimsnum: pgOrder.bruhimsnum,
        patientNumber: pgOrder.patientNumber,
        appointmentDistrict: pgOrder.appointmentDistrict,
        appointmentPlace: pgOrder.appointmentPlace,
        sendOrderTo: pgOrder.sendOrderTo,
        payingPatient: pgOrder.payingPatient,
        ldPickupOrDelivery: pgOrder.ldPickupOrDelivery,
        itemContains: pgOrder.itemContains,
        ldProductType: pgOrder.ldProductType,
        pickupDate: pgOrder.pickupDate ? pgOrder.pickupDate.toISOString().slice(0, 10) : null,
        pickupAddress: pgOrder.pickupAddress,
        billTo: pgOrder.billTo,
        shipmentMethod: pgOrder.shipmentMethod,
        parcelTrackingNum: pgOrder.parcelTrackingNum,
        supplierName: pgOrder.supplierName,
        items: pgOrder.items,
        currentStatus: pgOrder.currentStatus,
        detrackJobId: pgOrder.detrackJobId,
        gorushUserId: pgOrder.gorushUserId,
        history: (pgOrder.history || []).map((h) => ({
            statusHistory: h.statusHistory,
            dateUpdated: h.dateUpdated ? h.dateUpdated.toISOString() : null,
            updatedBy: h.updatedBy,
            lastAssignedTo: h.lastAssignedTo,
            reason: h.reason,
            lastLocation: h.lastLocation,
        })),
    };
}

async function findMine({ userId, identityValues, product, status, search, page, limit }) {
    const orConditions = [{ gorushUserId: String(userId) }];
    if (identityValues && identityValues.length > 0) {
        orConditions.push({ icPassNum: { in: identityValues } });
        orConditions.push({ bruhimsnum: { in: identityValues } });
        orConditions.push({ patientNumber: { in: identityValues } });
    }
    const where = { AND: [{ OR: orConditions }] };
    if (product) where.AND.push({ product });
    if (status) where.AND.push({ currentStatus: status });
    if (search) where.AND.push({ doTrackingNumber: { contains: search, mode: 'insensitive' } });

    const [pgOrders, totalCount] = await Promise.all([
        prisma.order.findMany({
            where,
            include: { history: true },
            orderBy: { id: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.order.count({ where }),
    ]);
    return { orders: pgOrders.map(toLegacyShape), totalCount };
}

async function findStatusById(id) {
    const pgOrder = await prisma.order.findUnique({ where: { id: BigInt(id) }, include: { history: true } });
    return pgOrder ? toLegacyShape(pgOrder) : null;
}

async function findByTrackingNumber(trackingNumber) {
    const pgOrder = await prisma.order.findFirst({
        where: {
            OR: [
                { doTrackingNumber: trackingNumber },
                { product: 'cbsl', parcelTrackingNum: trackingNumber },
            ],
        },
        include: { history: true },
    });
    return pgOrder ? toLegacyShape(pgOrder) : null;
}

module.exports = {
    buildPostgresOrderRow,
    insertOrder,
    recordDetrackJobId,
    toLegacyShape,
    findMine,
    findStatusById,
    findByTrackingNumber,
};
