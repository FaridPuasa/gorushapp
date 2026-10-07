// External-partner portal (pdu/mglobal/ewe) - each role name IS the `product`
// value on the shared orders table, so every query here scopes to
// `product: req.userRole` and nothing else needs to carry a product param.
// Modeled directly on routes/jpmc.js (requireRole/toApiShape/pagination
// pattern) but view-only - no PATCH routes, these partners never edit an
// order, only look up their own.
//
// Field omissions are enforced here, server-side, not just hidden in the
// client - a partner must never receive assignedTo/lastAssignedTo (driver
// identity) or an OrderHistory entry's updatedBy (who on staff made the
// change), regardless of what the client does with the response.
const express = require('express');
const prisma = require('../lib/prismaClient');
const { requireRole } = require('../middleware/auth');
const { getBruneiNow } = require('../lib/bruneiTime');

const router = express.Router();
router.use(requireRole('pdu', 'mglobal', 'ewe'));

// Products that use MAWB-grouping at all (see grfmxstatusupdate's
// MAWB_PRODUCTS) - all 3 partner products qualify, kept here only as a
// documentation anchor since every route below already always groups by
// mawbNo for these roles.
const WAREHOUSE_STATUSES = ['At Warehouse', 'Return to Warehouse', 'In Sorting Area'];
const WAREHOUSE_LOCATIONS = ['Warehouse K1', 'Warehouse K2'];
const ACTIVE_STATUSES = ['Out for Delivery', 'Self Collect', 'Drop Off'];
const MAX_SEARCH_RESULTS = 2000;

function toDateOnlyString(d) {
    if (!d) return null;
    return new Date(d).toISOString().slice(0, 10);
}

// Days between now (Brunei wall-clock) and `date` - never negative, never
// throws on a missing/invalid date (returns null, callers skip those rows
// from age-based filters/sorts rather than crash on them).
function ageDaysFrom(date) {
    if (!date) return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return Math.max(Math.floor((getBruneiNow().getTime() - d.getTime()) / 86400000), 0);
}

// "How long has this sat in the warehouse" - warehouseEntryDateTime is the
// authoritative signal when present, falling back to lastUpdateDateTime then
// creationDate for older rows that predate that column being populated.
function warehouseAgeDays(order) {
    return ageDaysFrom(order.warehouseEntryDateTime || order.lastUpdateDateTime || order.creationDate);
}

// "How long has this sat unscanned" - same convention as grfmxstatusupdate's
// Incomplete Scan tab (lastUpdateDateTime over creationDate, since a
// manifest's Detrack job can be created weeks before the physical item is
// actually uploaded).
function updateAgeDays(order) {
    return ageDaysFrom(order.lastUpdateDateTime || order.creationDate);
}

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

// Omits assignedTo/lastAssignedTo (driver identity) and, per history entry,
// updatedBy (which staff member made the change) - a partner never needs
// to know who on GO RUSH's side handled their order, only what happened
// to it and when.
function toPartnerOrderShape(order, { includeHistory = false } = {}) {
    const shaped = {
        id: order.id.toString(),
        doTrackingNumber: order.doTrackingNumber,
        receiverName: order.receiverName,
        receiverAddress: order.receiverAddress,
        receiverPostalCode: order.receiverPostalCode,
        area: order.area,
        receiverPhoneNumber: order.receiverPhoneNumber,
        remarks: order.remarks,
        customerRemark: order.remarks,
        currentStatus: order.currentStatus,
        latestLocation: order.latestLocation,
        latestReason: order.latestReason,
        attempt: order.attempt,
        jobDate: order.jobDate,
        creationDate: order.creationDate,
        mawbNo: order.mawbNo,
        warehouseEntry: order.warehouseEntry,
        itemContains: order.itemContains,
        cubicMeters: order.cubicMeters != null ? order.cubicMeters.toString() : null,
        parcelWeight: order.parcelWeight != null ? order.parcelWeight.toString() : null,
        items: order.items,
        detrackCompletedTime: order.detrackCompletedTime,
        ageDays: warehouseAgeDays(order),
    };
    if (includeHistory) {
        shaped.history = (order.history || [])
            .filter((h) => !isInternalHistoryNote(h))
            .slice()
            .sort((a, b) => new Date(a.dateUpdated || 0) - new Date(b.dateUpdated || 0))
            .map((h) => ({
                status: h.statusHistory,
                dateUpdated: h.dateUpdated,
                reason: h.reason,
                lastLocation: h.lastLocation,
            }));
    }
    return shaped;
}

// MAWB keys sorted by that group's own max order-age, descending (oldest/
// most-urgent group surfaces first) - same convention as grfmxstatusupdate's
// Warehouse and Incomplete Scan tabs.
function groupByMawb(orders, ageFn) {
    const groups = new Map();
    for (const order of orders) {
        const key = order.mawbNo || 'Unassigned';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(order);
    }
    return [...groups.entries()]
        .map(([mawbNo, groupOrders]) => ({
            mawbNo,
            maxAge: Math.max(0, ...groupOrders.map((o) => ageFn(o) ?? 0)),
            orders: groupOrders,
        }))
        .sort((a, b) => b.maxAge - a.maxAge);
}

async function getHiddenMawbSet(product) {
    const rows = await prisma.hiddenMawbGroup.findMany({ where: { product }, select: { mawbNo: true } });
    return new Set(rows.map((r) => r.mawbNo));
}

// GET /api/partner/tracking/:trackingNumber
router.get('/tracking/:trackingNumber', async (req, res) => {
    try {
        const order = await prisma.order.findFirst({
            where: { product: req.userRole, doTrackingNumber: req.params.trackingNumber },
            include: { history: true },
        });
        if (!order) return res.status(404).json({ error: 'Tracking number not found.' });
        res.json(toPartnerOrderShape(order, { includeHistory: true }));
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to search tracking number.' });
    }
});

// GET /api/partner/warehouse - Current (mawbNo -> area -> orders) and
// No Attempt (mawbNo -> orders) tabs. Both scoped to the same "at warehouse"
// base filter grfmxstatusupdate's own Warehouse section uses.
router.get('/warehouse', async (req, res) => {
    try {
        const baseWhere = {
            product: req.userRole,
            currentStatus: { in: WAREHOUSE_STATUSES },
            latestLocation: { in: WAREHOUSE_LOCATIONS },
        };
        const orders = await prisma.order.findMany({ where: baseWhere, orderBy: { lastUpdateDateTime: 'desc' } });

        const currentGroups = groupByMawb(orders, warehouseAgeDays).map((g) => {
            const byArea = new Map();
            for (const o of g.orders) {
                const key = o.area || 'N/A';
                if (!byArea.has(key)) byArea.set(key, []);
                byArea.get(key).push(toPartnerOrderShape(o));
            }
            return { mawbNo: g.mawbNo, maxAge: g.maxAge, areas: [...byArea.entries()].map(([area, areaOrders]) => ({ area, orders: areaOrders })) };
        });

        // No Attempt: never actually driven out yet - 0 attempts, or exactly 1
        // attempt that wasn't itself a delivery attempt (an "unattempted
        // delivery" reason means a real attempt was made and failed before
        // the driver could even try, which doesn't count as "no attempt").
        const noAttemptOrders = orders.filter((o) => {
            const attempt = o.attempt || 0;
            const age = warehouseAgeDays(o);
            if (attempt > 1 || (age != null && age >= 30)) return false;
            return (o.latestReason || '').toLowerCase() !== 'unattempted delivery';
        });
        const noAttemptGroups = groupByMawb(noAttemptOrders, warehouseAgeDays).map((g) => ({
            mawbNo: g.mawbNo,
            maxAge: g.maxAge,
            orders: g.orders.map((o) => toPartnerOrderShape(o)),
        }));

        res.json({ current: currentGroups, noAttempt: noAttemptGroups });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to load warehouse data.' });
    }
});

// GET /api/partner/active-jobs - date-grouped, flat (no dispatcher/freelancer
// split). One list covers both "current" and "outdated" (jobDate < today) -
// outdated jobs just keep showing under their own past date, same as the
// original Active Jobs tab.
router.get('/active-jobs', async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { product: req.userRole, currentStatus: { in: ACTIVE_STATUSES } },
            orderBy: { jobDate: 'asc' },
        });

        const today = toDateOnlyString(getBruneiNow());
        const groups = new Map();
        let outdatedCount = 0;
        for (const order of orders) {
            const dateKey = toDateOnlyString(order.jobDate) || 'Unscheduled';
            if (dateKey !== 'Unscheduled' && dateKey < today) outdatedCount += 1;
            if (!groups.has(dateKey)) groups.set(dateKey, []);
            groups.get(dateKey).push(toPartnerOrderShape(order));
        }

        res.json({
            outdatedCount,
            dates: [...groups.entries()]
                .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
                .map(([jobDate, dateOrders]) => ({ jobDate, orders: dateOrders })),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to load active jobs.' });
    }
});

// GET /api/partner/completed-jobs?date=YYYY-MM-DD - grand-total summary (no
// dispatcher breakdown) + the job list for that date.
router.get('/completed-jobs', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "'date' query param is required." });

        const start = new Date(`${date}T00:00:00+08:00`);
        const end = new Date(`${date}T23:59:59.999+08:00`);
        const orders = await prisma.order.findMany({
            where: { product: req.userRole, jobDate: { gte: start, lte: end } },
            orderBy: { lastUpdateDateTime: 'desc' },
        });

        const completed = orders.filter((o) => o.currentStatus === 'Completed');
        res.json({
            date,
            summary: { total: orders.length, completed: completed.length, notCompleted: orders.length - completed.length },
            orders: orders.map((o) => toPartnerOrderShape(o)),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to load completed jobs.' });
    }
});

// GET /api/partner/incomplete-scan - manifested but not yet physically
// scanned into a warehouse (currentStatus = 'Info Received'), grouped by
// MAWB, respecting hidden MAWB groups exactly like the original dashboard -
// hidden groups are absent entirely, never toggleable from here.
router.get('/incomplete-scan', async (req, res) => {
    try {
        const hidden = await getHiddenMawbSet(req.userRole);
        const orders = await prisma.order.findMany({
            where: { product: req.userRole, currentStatus: 'Info Received' },
        });
        const visible = orders.filter((o) => {
            const age = updateAgeDays(o);
            if (age != null && age >= 30) return false;
            return !hidden.has(o.mawbNo || 'Unassigned');
        });
        const groups = groupByMawb(visible, updateAgeDays).map((g) => ({
            mawbNo: g.mawbNo,
            maxAge: g.maxAge,
            orders: g.orders.map((o) => toPartnerOrderShape(o)),
        }));
        res.json({ groups, totalCount: visible.length });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to load incomplete scan data.' });
    }
});

// GET /api/partner/search-jobs?<trimmed filter set> - view-only, returns the
// matching set (capped) for client-side table rendering. Filters mirror the
// trimmed field list (original Search Jobs minus the fields that don't apply
// to a single-product partner view - see the project plan).
router.get('/search-jobs', async (req, res) => {
    try {
        const q = req.query;
        const where = { product: req.userRole };
        const and = [];

        if (q.doTrackingNumber) and.push({ doTrackingNumber: { contains: q.doTrackingNumber, mode: 'insensitive' } });
        if (q.receiverName) and.push({ receiverName: { contains: q.receiverName, mode: 'insensitive' } });
        if (q.receiverAddress) and.push({ receiverAddress: { contains: q.receiverAddress, mode: 'insensitive' } });
        if (q.receiverPostalCode) and.push({ receiverPostalCode: { contains: q.receiverPostalCode, mode: 'insensitive' } });
        if (q.receiverPhoneNumber) and.push({ receiverPhoneNumber: { contains: q.receiverPhoneNumber, mode: 'insensitive' } });
        if (q.mawbNo) and.push({ mawbNo: { contains: q.mawbNo, mode: 'insensitive' } });
        if (q.area) and.push({ area: { in: [].concat(q.area) } });
        if (q.currentStatus) and.push({ currentStatus: { in: [].concat(q.currentStatus) } });
        if (q.latestReason) and.push({ latestReason: { in: [].concat(q.latestReason) } });
        if (q.jobDateFrom || q.jobDateTo) {
            const range = {};
            if (q.jobDateFrom) range.gte = new Date(`${q.jobDateFrom}T00:00:00+08:00`);
            if (q.jobDateTo) range.lte = new Date(`${q.jobDateTo}T23:59:59.999+08:00`);
            and.push({ jobDate: range });
        }
        if (q.creationDateFrom || q.creationDateTo) {
            const range = {};
            if (q.creationDateFrom) range.gte = new Date(`${q.creationDateFrom}T00:00:00+08:00`);
            if (q.creationDateTo) range.lte = new Date(`${q.creationDateTo}T23:59:59.999+08:00`);
            and.push({ creationDate: range });
        }
        if (and.length) where.AND = and;

        const orders = await prisma.order.findMany({
            where,
            orderBy: { creationDate: 'desc' },
            take: MAX_SEARCH_RESULTS,
        });
        res.json({ orders: orders.map((o) => toPartnerOrderShape(o)), truncated: orders.length === MAX_SEARCH_RESULTS });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to search jobs.' });
    }
});

module.exports = router;
