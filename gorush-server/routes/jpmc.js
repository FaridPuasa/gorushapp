// JPMC pharmacy client portal - replaces the manual "JPMC PJSC Forms.xlsx"
// workbook. `jpmc` staff can view + edit the 5 JPMC-owned fields on their own
// orders; `admin` gets the identical list read-only (for support). Reads/writes go
// straight to the shared Postgres `orders` table gorushapp already uses for
// pharmacyjpmc order intake (see lib/postgresOrders.js) - grfmxstatusupdate's
// schema.prisma is the source of truth for the column set (see its comment).
const express = require('express');
const prisma = require('../lib/prismaClient');
const PublicHoliday = require('../models/PublicHoliday');
const { requireRole } = require('../middleware/auth');
const { currentWindow, windowForDate } = require('../lib/jpmcWindow');

function toDateOnlyString(d) {
    if (!d) return null;
    return new Date(d).toISOString().slice(0, 10);
}

const ALL_ORDERS_PAGE_SIZE = 25;

const router = express.Router();

const EDITABLE_FIELDS = [
    'jpmcPharmacyStatus',
    'jpmcPatientInformed',
    'jpmcPharmacyRemarks',
    'jpmcTotalAmount',
    'jpmcFinanceDateReceived',
];

// "Process Date" - which cutover window (the portal's equivalent of the old
// Excel sheet's per-cutover date tab) this order's submission falls into,
// named by the date its window ends on (see lib/jpmcWindow.js). Shown as its
// own column/field so staff can tell at a glance which date's batch an order
// belongs to even when browsing "All time".
function toApiShape(order, holidayDates) {
    return {
        processDate: toDateOnlyString(currentWindow(holidayDates, order.dateTimeSubmission).end),
        id: order.id.toString(),
        doTrackingNumber: order.doTrackingNumber,
        dateTimeSubmission: order.dateTimeSubmission,
        paymentMethod: order.paymentMethod,
        jobMethod: order.jobMethod,
        receiverName: order.receiverName,
        receiverAddress: order.receiverAddress,
        receiverPhoneNumber: order.receiverPhoneNumber,
        additionalPhoneNumber: order.additionalPhoneNumber,
        patientNumber: order.patientNumber,
        appointmentPlace: order.appointmentPlace,
        totalPrice: order.totalPrice != null ? order.totalPrice.toString() : null,
        remarks: order.remarks,
        jpmcPharmacyStatus: order.jpmcPharmacyStatus,
        jpmcPatientInformed: order.jpmcPatientInformed,
        jpmcPharmacyRemarks: order.jpmcPharmacyRemarks,
        jpmcTotalAmount: order.jpmcTotalAmount != null ? order.jpmcTotalAmount.toString() : null,
        jpmcFinanceDateReceived: order.jpmcFinanceDateReceived,
        // Straight passthrough of currentStatus, under the "GO RUSH STATUS" name the
        // portal uses - no remapping to the old Excel sheet's invented status names.
        goRushStatus: order.currentStatus,
        // Same OrderHistory rows grfmxstatusupdate's own Search Jobs status-history
        // timeline reads - oldest first, so the client can render it as a timeline
        // top-to-bottom without re-sorting.
        goRushStatusHistory: (order.history || [])
            .slice()
            .sort((a, b) => new Date(a.dateUpdated || 0) - new Date(b.dateUpdated || 0))
            .map((h) => ({
                status: h.statusHistory,
                dateUpdated: h.dateUpdated,
                updatedBy: h.updatedBy,
                lastAssignedTo: h.lastAssignedTo,
                lastLocation: h.lastLocation,
            })),
    };
}

// GET /api/jpmc/orders?view=all|date&date=&tab=&search=&pharmacyStatus=&goRushStatus=&page=&limit=
// - view=all (default): every JPMC/PJSC order, newest submission first,
//   paginated - no date filtering, for browsing/searching across every
//   window at once.
// - view=date&date=YYYY-MM-DD: just the processing window ending on that
//   date (the portal's equivalent of the old Excel sheet's per-cutover date
//   tab / this response's own `processDate` field on each order).
// - tab=inProcess: the "In Process" tab's actual rule - anything NOT (JPMC
//   Pharmacy Status Completed AND GO RUSH Status Completed) and GO RUSH
//   Status not Cancelled/Disposed, across every window - overrides
//   pharmacyStatus for this one tab, which needs a compound condition the
//   plain OR-of-values filter below can't express.
// - pharmacyStatus/goRushStatus filter on top of either view (used by the
//   Completed / Duplicate&Cancelled tabs, and the free-standing GO RUSH
//   filter).
router.get('/orders', requireRole('jpmc', 'admin'), async (req, res) => {
    try {
        const where = { product: 'pharmacyjpmc' };
        if (req.query.search) {
            const search = req.query.search;
            where.OR = [
                { receiverName: { contains: search, mode: 'insensitive' } },
                { patientNumber: { contains: search, mode: 'insensitive' } },
                { doTrackingNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (req.query.tab === 'inProcess') {
            where.AND = [
                ...(where.AND || []),
                { NOT: { AND: [{ jpmcPharmacyStatus: 'Completed' }, { currentStatus: 'Completed' }] } },
                { currentStatus: { notIn: ['Cancelled', 'Disposed'] } },
            ];
        } else if (req.query.pharmacyStatus) {
            // Comma-separated - lets the portal's other tabs (Completed/
            // Duplicate&Cancelled) ask for a whole status group in one request,
            // not just a single value. 'New Order' is the default/unset state -
            // matches rows that haven't been touched yet (null) as well as ones
            // explicitly saved as such. Prisma's `in` filter doesn't accept null as
            // a member, hence the OR.
            const statuses = req.query.pharmacyStatus.split(',');
            const orClauses = statuses.map((s) => ({ jpmcPharmacyStatus: s }));
            if (statuses.includes('New Order')) orClauses.push({ jpmcPharmacyStatus: null });
            where.AND = [...(where.AND || []), { OR: orClauses }];
        }
        if (req.query.goRushStatus) {
            where.currentStatus = req.query.goRushStatus;
        }

        const holidayDates = (await PublicHoliday.find().lean()).map((h) => h.date);
        const view = req.query.view || 'all';

        if (view === 'date') {
            if (!req.query.date) {
                return res.status(400).json({ error: "'date' query param is required for view=date." });
            }
            const windowRange = windowForDate(req.query.date, holidayDates);
            where.dateTimeSubmission = { gte: windowRange.start, lte: windowRange.end };
            const orders = await prisma.order.findMany({
                where,
                include: { history: true },
                orderBy: { dateTimeSubmission: 'desc' },
            });
            return res.json({ view, from: windowRange.start, to: windowRange.end, orders: orders.map((o) => toApiShape(o, holidayDates)) });
        }

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit, 10) || ALL_ORDERS_PAGE_SIZE, 100);
        const [orders, totalCount] = await Promise.all([
            prisma.order.findMany({
                where,
                include: { history: true },
                orderBy: { dateTimeSubmission: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.order.count({ where }),
        ]);
        res.json({
            view: 'all',
            page,
            totalPages: Math.max(Math.ceil(totalCount / limit), 1),
            totalCount,
            orders: orders.map((o) => toApiShape(o, holidayDates)),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to load JPMC orders.' });
    }
});

// PATCH /api/jpmc/orders/:id - jpmc and admin can both edit. Only the 5
// JPMC-owned fields are ever written here, regardless of what else is in
// the request body.
router.patch('/orders/:id', requireRole('jpmc', 'admin'), async (req, res) => {
    try {
        const id = BigInt(req.params.id);
        const data = {};
        for (const field of EDITABLE_FIELDS) {
            if (field in req.body) data[field] = req.body[field];
        }
        if (data.jpmcFinanceDateReceived) data.jpmcFinanceDateReceived = new Date(data.jpmcFinanceDateReceived);
        if (data.jpmcTotalAmount != null) data.jpmcTotalAmount = String(data.jpmcTotalAmount);

        data.jpmcFieldsUpdatedBy = req.userEmail;
        data.jpmcFieldsUpdatedAt = new Date();

        const order = await prisma.order.update({ where: { id }, data, include: { history: true } });
        const holidayDates = (await PublicHoliday.find().lean()).map((h) => h.date);
        res.json(toApiShape(order, holidayDates));
    } catch (err) {
        console.error(err.message);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Order not found.' });
        }
        res.status(500).json({ error: 'Failed to update order.' });
    }
});

module.exports = router;
