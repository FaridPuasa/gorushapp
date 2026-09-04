// JPMC pharmacy client portal - replaces the manual "JPMC PJSC Forms.xlsx"
// workbook. `jpmc` staff can view + edit the 5 JPMC-owned fields on their own
// orders; `admin` gets the identical list read-only (for support). Reads/writes go
// straight to the shared Postgres `orders` table gorushapp already uses for
// pharmacyjpmc order intake (see lib/postgresOrders.js) - grfmxstatusupdate's
// schema.prisma is the source of truth for the column set (see its comment).
const express = require('express');
const XLSX = require('xlsx');
const prisma = require('../lib/prismaClient');
const PublicHoliday = require('../models/PublicHoliday');
const { requireRole } = require('../middleware/auth');
const { currentWindow, windowForDate } = require('../lib/jpmcWindow');
const { getPaymentProofSignedUrl } = require('../lib/jpmcPaymentStorage');

function toDateOnlyString(d) {
    if (!d) return null;
    return new Date(d).toISOString().slice(0, 10);
}

const ALL_ORDERS_PAGE_SIZE = 25;

const router = express.Router();

// Same landing tabs as gorush-client's TABS constant, one per
// jpmcPharmacyStatus value (plus All with no filter) - kept in one place so
// the tab-count query below can never drift from the actual list-filtering
// logic below it. 'New Order' is the default/unset state, so it also matches
// untouched (null) rows - Prisma's `in` filter doesn't accept null as a
// member, hence the OR.
const TAB_STATUSES = {
    newOrder: ['New Order'],
    entered: ['Entered'],
    pendingPayment: ['Pending Payment'],
    pendingQuery: ['Pending Query'],
    completed: ['Completed'],
    duplicateOrder: ['Duplicate Order'],
    cancelledOrder: ['Cancelled Order'],
};
const TAB_KEYS = [...Object.keys(TAB_STATUSES), 'all'];

function tabWhereClause(tabKey) {
    const statuses = TAB_STATUSES[tabKey];
    if (!statuses) return {}; // 'all'
    const orClauses = statuses.map((s) => ({ jpmcPharmacyStatus: s }));
    if (statuses.includes('New Order')) orClauses.push({ jpmcPharmacyStatus: null });
    return { OR: orClauses };
}

// One count per tab, all scoped to the same base where (product + search +,
// optionally, a date window) - baseWhere itself must NOT already carry a
// tab/status restriction, only product/search/date, or these would double up.
async function countByTab(baseWhere) {
    const entries = await Promise.all(
        TAB_KEYS.map(async (key) => [key, await prisma.order.count({ where: { AND: [baseWhere, tabWhereClause(key)] } })])
    );
    return Object.fromEntries(entries);
}

// Same rules gorush-client's lib/trackingHistory.js uses for the Home page's
// tracking-number search - an OrderHistory row can be a genuine delivery
// event OR an internal audit note logged against the same shared history
// array (a field being edited, a dispatcher reassignment, etc.), and only the
// former belongs on a customer/staff-facing status timeline. Duplicated here
// (not imported) since this is a separate Node app (gorush-server, CommonJS)
// from gorush-client's bundle.
const INTERNAL_NOTE_RE = /\bupdated\b/i;
const ALLOWED_DELIVERY_STATUSES = new Set([
    'info received', 'at warehouse', 'out for delivery',
    'failed delivery', 'failed', 'return to warehouse', 'completed',
    'custom clearance', 'custom clearing',
    'on hold', 'in sorting area', 'self collect', 'cancelled',
    'disposed', 'return',
]);
function isInternalHistoryNote(h) {
    if (h.statusHistory) return !ALLOWED_DELIVERY_STATUSES.has(h.statusHistory.toLowerCase());
    return Boolean(h.reason) && h.reason.toUpperCase() !== 'N/A' && INTERNAL_NOTE_RE.test(h.reason);
}

const EDITABLE_FIELDS = [
    'jpmcPharmacyStatus',
    'jpmcFridgeItem',
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
        jpmcFridgeItem: order.jpmcFridgeItem,
        jpmcPatientInformed: order.jpmcPatientInformed,
        jpmcPharmacyRemarks: order.jpmcPharmacyRemarks,
        jpmcTotalAmount: order.jpmcTotalAmount != null ? order.jpmcTotalAmount.toString() : null,
        jpmcFinanceDateReceived: order.jpmcFinanceDateReceived,
        // Never the raw storage path - the client fetches a short-lived signed
        // URL on demand via GET .../payment-proof when it actually needs to
        // display/download the image.
        hasPaymentProof: !!order.jpmcPaymentProofPath,
        // Straight passthrough of currentStatus, under the "GO RUSH STATUS" name the
        // portal uses - no remapping to the old Excel sheet's invented status names.
        goRushStatus: order.currentStatus,
        // Same OrderHistory rows grfmxstatusupdate's own Search Jobs status-history
        // timeline reads - oldest first, so the client can render it as a timeline
        // top-to-bottom without re-sorting.
        goRushStatusHistory: (order.history || [])
            .filter((h) => !isInternalHistoryNote(h))
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

// Shared by GET /orders and GET /orders/export - both need the exact same
// product/search/status/date filtering, so the export can never silently
// diverge from what the table itself is showing.
async function buildFilteredWhere(req) {
    // Kept separate from `where` below (which goes on to accumulate the
    // active tab's own filter) - baseWhere is product+search only, the
    // common scope every tab's count is measured against.
    const baseWhere = { product: 'pharmacyjpmc' };
    if (req.query.search) {
        const search = req.query.search;
        baseWhere.OR = [
            { receiverName: { contains: search, mode: 'insensitive' } },
            { patientNumber: { contains: search, mode: 'insensitive' } },
            { doTrackingNumber: { contains: search, mode: 'insensitive' } },
            { receiverPhoneNumber: { contains: search, mode: 'insensitive' } },
            { additionalPhoneNumber: { contains: search, mode: 'insensitive' } },
        ];
    }
    const where = { ...baseWhere };

    if (req.query.pharmacyStatus) {
        // Comma-separated - lets a tab ask for a whole status group (e.g.
        // Duplicate/Cancelled) in one request, not just a single value.
        // 'New Order' is the default/unset state - matches rows that haven't
        // been touched yet (null) as well as ones explicitly saved as such.
        // Prisma's `in` filter doesn't accept null as a member, hence the OR.
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

    let windowRange = null;
    if (view === 'date') {
        if (!req.query.date) {
            const err = new Error("'date' query param is required for view=date.");
            err.status = 400;
            throw err;
        }
        // windowForDate (lib/jpmcWindow.js) is the same Brunei-noon-to-noon,
        // Sunday/holiday-aware boundary used everywhere else in this portal.
        windowRange = windowForDate(req.query.date, holidayDates);
        where.dateTimeSubmission = { gte: windowRange.start, lte: windowRange.end };
    }

    return { baseWhere, where, holidayDates, view, windowRange };
}

// GET /api/jpmc/orders?view=all|date&date=&search=&pharmacyStatus=&goRushStatus=&page=&limit=
// - view=all (default): every JPMC/PJSC order, newest submission first,
//   paginated - no date filtering, for browsing/searching across every
//   window at once.
// - view=date&date=YYYY-MM-DD: just the processing window ending on that
//   date (the portal's equivalent of the old Excel sheet's per-cutover date
//   tab / this response's own `processDate` field on each order).
// - pharmacyStatus/goRushStatus filter on top of either view (comma-separated
//   values - used by every tab; see TAB_STATUSES above for the exact groups,
//   and the free-standing GO RUSH filter).
router.get('/orders', requireRole('jpmc', 'admin'), async (req, res) => {
    try {
        const { baseWhere, where, holidayDates, view, windowRange } = await buildFilteredWhere(req);

        if (view === 'date') {
            const dateWhere = { AND: [baseWhere, { dateTimeSubmission: where.dateTimeSubmission }] };
            const [orders, allTimeCounts, dateCounts] = await Promise.all([
                prisma.order.findMany({
                    where,
                    include: { history: true },
                    orderBy: { dateTimeSubmission: 'desc' },
                }),
                countByTab(baseWhere),
                countByTab(dateWhere),
            ]);
            return res.json({
                view,
                from: windowRange.start,
                to: windowRange.end,
                orders: orders.map((o) => toApiShape(o, holidayDates)),
                counts: { allTime: allTimeCounts, date: dateCounts },
            });
        }

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit, 10) || ALL_ORDERS_PAGE_SIZE, 100);
        const [orders, totalCount, allTimeCounts] = await Promise.all([
            prisma.order.findMany({
                where,
                include: { history: true },
                orderBy: { dateTimeSubmission: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.order.count({ where }),
            countByTab(baseWhere),
        ]);
        res.json({
            view: 'all',
            page,
            totalPages: Math.max(Math.ceil(totalCount / limit), 1),
            totalCount,
            orders: orders.map((o) => toApiShape(o, holidayDates)),
            counts: { allTime: allTimeCounts, date: null },
        });
    } catch (err) {
        console.error(err.message);
        res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to load JPMC orders.' });
    }
});

// GET /api/jpmc/orders/export?<same filters as GET /orders> - every order
// matching the current tab/time-range/search (ignoring pagination entirely -
// this is "export everything filtered", not just the current page) as an
// .xlsx download. Columns go beyond what's in the table row itself (address,
// phone numbers, remarks, GO RUSH status history, etc. - the same fields the
// "View More" card shows) since the point of exporting is to hand someone
// the full record, not just what fits on screen.
router.get('/orders/export', requireRole('jpmc', 'admin'), async (req, res) => {
    try {
        const { where, holidayDates } = await buildFilteredWhere(req);
        const orders = await prisma.order.findMany({
            where,
            include: { history: true },
            orderBy: { dateTimeSubmission: 'desc' },
        });
        const shaped = orders.map((o) => toApiShape(o, holidayDates));

        const rows = shaped.map((o) => ({
            'Process Date': o.processDate || '',
            'Tracking Number': o.doTrackingNumber || '',
            'Date/Time Submitted': o.dateTimeSubmission ? new Date(o.dateTimeSubmission) : '',
            'Delivery Type': o.jobMethod || '',
            'Payment Method': o.paymentMethod || '',
            'Name': o.receiverName || '',
            'Patient No.': o.patientNumber || '',
            'Location': o.appointmentPlace || '',
            'Address': o.receiverAddress || '',
            'Main Phone': o.receiverPhoneNumber || '',
            'Additional Phone': o.additionalPhoneNumber || '',
            'Price': o.totalPrice || '',
            'Customer Remarks': o.remarks || '',
            'JPMC Status': o.jpmcPharmacyStatus || 'New Order',
            'Fridge Item': o.jpmcFridgeItem || 'No',
            'Patient Informed': o.jpmcPatientInformed || '',
            'Remarks From Pharmacy': o.jpmcPharmacyRemarks || '',
            'Paying Patient Total ($)': o.jpmcTotalAmount || '',
            'Payment Proof Uploaded': o.hasPaymentProof ? 'Yes' : 'No',
            'Finance Date Received': o.jpmcFinanceDateReceived ? new Date(o.jpmcFinanceDateReceived) : '',
            'GO RUSH Status': o.goRushStatus || '',
            'GO RUSH Status History': o.goRushStatusHistory
                .map((h) => `${h.status || '—'} (${h.dateUpdated ? new Date(h.dateUpdated).toLocaleString('en-GB') : '—'})`)
                .join(' | '),
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'JPMC Orders');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const filename = `jpmc-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (err) {
        console.error(err.message);
        res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to export JPMC orders.' });
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

        // jpmcCompletedAt ("Date/Time Ready" on grfmxstatusupdate's JPMC
        // Collection page, which ages orders off it) is server-derived, not
        // client-editable - stamp it the moment jpmcPharmacyStatus actually
        // transitions TO Completed, and clear it if later edited away from
        // Completed. The edit form always resends the current status even
        // when unchanged, so this has to compare against the stored value -
        // otherwise saving an unrelated field while already Completed would
        // reset the timestamp on every save.
        if ('jpmcPharmacyStatus' in data) {
            const existing = await prisma.order.findUnique({ where: { id }, select: { jpmcPharmacyStatus: true } });
            if (!existing) return res.status(404).json({ error: 'Order not found.' });
            const wasCompleted = existing.jpmcPharmacyStatus === 'Completed';
            const nowCompleted = data.jpmcPharmacyStatus === 'Completed';
            if (nowCompleted && !wasCompleted) data.jpmcCompletedAt = new Date();
            else if (!nowCompleted && wasCompleted) data.jpmcCompletedAt = null;
        }

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

// GET /api/jpmc/orders/:id/payment-proof - jpmc and admin. Returns a
// short-lived signed URL to view/download the uploaded proof-of-payment
// picture, or 404 if none has been uploaded yet.
router.get('/orders/:id/payment-proof', requireRole('jpmc', 'admin'), async (req, res) => {
    try {
        const id = BigInt(req.params.id);
        const order = await prisma.order.findUnique({ where: { id }, select: { jpmcPaymentProofPath: true } });
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        if (!order.jpmcPaymentProofPath) return res.status(404).json({ error: 'No payment proof uploaded yet.' });

        const url = await getPaymentProofSignedUrl(order.jpmcPaymentProofPath);
        res.json({ url });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to load payment proof.' });
    }
});

// No POST /payment-proof here - uploading/reuploading/removing the payment
// proof is only done from grfmxstatusupdate's JPMC Paying Patient page, not
// this app. This portal is view/download-only for the payment proof
// (see the GET route above).

module.exports = router;
