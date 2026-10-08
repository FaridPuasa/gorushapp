// External-partner portal (pdu/mglobal/ewe) - each role name IS the `product`
// value on the shared orders table, so every query here scopes to
// `product: req.userRole` and nothing else needs to carry a product param.
// Modeled directly on routes/jpmc.js (requireRole/toApiShape pattern) and on
// grfmxstatusupdate's dashboard.ejs/index.js (computeWarehouseDashboardData,
// groupSimilarOrders) for the actual warehouse business rules, but view-only -
// no PATCH routes, these partners never edit an order, only look up their own.
//
// Field omissions are enforced here, server-side, not just hidden in the
// client - a partner must never receive assignedTo/lastAssignedTo (driver
// identity) or an OrderHistory entry's updatedBy (who on staff made the
// change), regardless of what the client does with the response.
const express = require('express');
const prisma = require('../lib/prismaClient');
const { requireRole } = require('../middleware/auth');
const { getBruneiNow, formatBruneiISO } = require('../lib/bruneiTime');
const { getPodImageSignedUrl } = require('../lib/podImageStorage');

const router = express.Router();
router.use(requireRole('pdu', 'mglobal', 'ewe'));

const WAREHOUSE_STATUSES = ['At Warehouse', 'Return to Warehouse', 'In Sorting Area'];
const WAREHOUSE_LOCATIONS = ['Warehouse K1', 'Warehouse K2'];
const ACTIVE_STATUSES = ['Out for Delivery', 'Self Collect', 'Drop Off'];
const MAX_SEARCH_RESULTS = 2000;

function toDateOnlyString(d) {
    if (!d) return null;
    return new Date(d).toISOString().slice(0, 10);
}

// Same shift as getBruneiNow(), but for an arbitrary stored DateTime (e.g.
// `jobDate`) instead of "now" - needed because jobDate is a raw Prisma
// DateTime (has a time-of-day, NOT a `@db.Date` date-only column), so taking
// its date-only string with the generic UTC-based toDateOnlyString() above
// would bucket orders placed Brunei 12:00am-7:59am (UTC previous-day
// 4pm-11:59pm) into the wrong day versus getBruneiNow()'s own Brunei-shifted
// "today". Both sides of every date-key comparison below must go through
// this, not toDateOnlyString() directly on a raw DateTime.
function toBruneiDateOnlyString(d) {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return toDateOnlyString(new Date(dt.getTime() + 8 * 60 * 60 * 1000));
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

// "How long has this sat in the warehouse" - same reference grfmxstatusupdate's
// own computeWarehouseDashboardData() uses (index.js: `order.warehouseEntryDateTime
// || order.creationDate`), deliberately NOT lastUpdateDateTime - that field
// gets touched by unrelated edits and drifted this age a day off from the
// original dashboard's own numbers for the same order.
function warehouseAgeDays(order) {
    return ageDaysFrom(order.warehouseEntryDateTime || order.creationDate);
}

// "How long has this sat unscanned" - Incomplete Scan's own convention
// (lastUpdateDateTime over creationDate, since a manifest's Detrack job can
// be created weeks before the physical item is actually uploaded).
function updateAgeDays(order) {
    return ageDaysFrom(order.lastUpdateDateTime || order.creationDate);
}

// Omits assignedTo/lastAssignedTo (driver identity) and, per history entry,
// updatedBy (which staff member made the change) - a partner never needs
// to know who on GO RUSH's side handled their order, only what happened
// to it and when.
function toPartnerOrderShape(order, { includeHistory = false, ageDays = null } = {}) {
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
        // Never grRemark (Go Rush's own internal remark) - partners are
        // scoped to their own product/customer-facing data only.
        currentStatus: order.currentStatus,
        latestLocation: order.latestLocation,
        latestReason: order.latestReason,
        attempt: order.attempt,
        jobMethod: order.jobMethod,
        jobDate: formatBruneiISO(order.jobDate),
        creationDate: formatBruneiISO(order.creationDate),
        mawbNo: order.mawbNo,
        warehouseEntry: order.warehouseEntry,
        cubicMeters: order.cubicMeters != null ? order.cubicMeters.toString() : null,
        parcelWeight: order.parcelWeight != null ? order.parcelWeight.toString() : null,
        items: order.items,
        detrackCompletedTime: formatBruneiISO(order.detrackCompletedTime),
        ageDays: ageDays != null ? ageDays : warehouseAgeDays(order),
    };
    if (includeHistory) {
        // Raw fields, unfiltered/unsorted - the client runs the exact same
        // proven pipeline (lib/trackingHistory.js's buildHistoryTimeline)
        // the customer-facing tracking popup already uses, which handles
        // internal-note filtering, dedup, and ordering correctly. A
        // hand-rolled server-side equivalent previously let internal notes
        // like "Warehouse location updated to Warehouse K1." leak through.
        shaped.history = (order.history || []).map((h) => ({
            id: h.id.toString(),
            statusHistory: h.statusHistory,
            dateUpdated: formatBruneiISO(h.dateUpdated),
            reason: h.reason,
            lastLocation: h.lastLocation,
            // Real GPS coordinate captured by the driver app at the moment of
            // this event - a physical place, not a staff identity, so (unlike
            // lastLocation for Out for Delivery/Self Collect) it's always
            // safe to show. Same convention grfmxstatusupdate's own dashboard
            // uses: a Google Maps link, shown only for Completed/failed steps.
            latitude: h.latitude != null ? h.latitude.toString() : null,
            longitude: h.longitude != null ? h.longitude.toString() : null,
            hasPodPhotos: (h.podImagePaths || []).length > 0,
        }));
    }
    return shaped;
}

// Ported from grfmxstatusupdate's index.js groupSimilarOrders() - clusters
// same-customer orders (same name+address, or same name+phone) so the client
// can tint them as one visual group (a `groupColorIdx` 0-4), and sorts
// age-descending with grouped orders pulled above singletons at the same age.
// Operates on already-shaped partner order objects (expects `.ageDays`,
// `.receiverName`, `.receiverAddress`, `.receiverPhoneNumber`).
function groupSimilarOrders(orders) {
    if (!Array.isArray(orders) || orders.length < 2) return orders;
    const normalizeStr = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizePhone = (s) => (s || '').toString().replace(/\D/g, '');

    const n = orders.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };

    const nameAddrMap = new Map();
    const namePhoneMap = new Map();
    orders.forEach((o, i) => {
        const name = normalizeStr(o.receiverName);
        const addr = normalizeStr(o.receiverAddress);
        const phone = normalizePhone(o.receiverPhoneNumber);
        if (name && name !== '-' && addr && addr !== '-') {
            const key = `${name}||${addr}`;
            if (nameAddrMap.has(key)) union(i, nameAddrMap.get(key));
            else nameAddrMap.set(key, i);
        }
        if (name && name !== '-' && phone) {
            const key = `${name}||${phone}`;
            if (namePhoneMap.has(key)) union(i, namePhoneMap.get(key));
            else namePhoneMap.set(key, i);
        }
    });

    const rootIndices = {};
    for (let i = 0; i < n; i++) {
        const r = find(i);
        if (!rootIndices[r]) rootIndices[r] = [];
        rootIndices[r].push(i);
    }

    const PALETTE_SIZE = 5;
    let colorCounter = 0;
    const colorIdxByRoot = {};
    const groupFirstIndex = {};
    Object.keys(rootIndices).forEach((rootKey) => {
        const idxs = rootIndices[rootKey];
        groupFirstIndex[rootKey] = Math.min(...idxs);
        if (idxs.length > 1) {
            colorIdxByRoot[rootKey] = colorCounter % PALETTE_SIZE;
            colorCounter++;
        }
    });

    return orders
        .map((o, i) => ({ o, i, root: find(i) }))
        .sort((a, b) => {
            if ((b.o.ageDays || 0) !== (a.o.ageDays || 0)) return (b.o.ageDays || 0) - (a.o.ageDays || 0);
            const aGrouped = rootIndices[a.root].length > 1;
            const bGrouped = rootIndices[b.root].length > 1;
            if (aGrouped !== bGrouped) return aGrouped ? -1 : 1;
            if (a.root !== b.root) return groupFirstIndex[a.root] - groupFirstIndex[b.root];
            return a.i - b.i;
        })
        .map(({ o, root }) => {
            if (rootIndices[root].length > 1) o.groupColorIdx = colorIdxByRoot[root];
            return o;
        });
}

// MAWB keys sorted by that group's own max order-age, descending (oldest/
// most-urgent group surfaces first) - same convention as grfmxstatusupdate's
// Warehouse and Incomplete Scan tabs. `orders` must already be the
// partner-shaped objects (so `.ageDays` is present).
function groupByMawb(shapedOrders) {
    const groups = new Map();
    for (const order of shapedOrders) {
        const key = order.mawbNo;
        if (!key) continue; // no-MAWB orders are never shown grouped (see incomplete-scan route)
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(order);
    }
    return [...groups.entries()]
        .map(([mawbNo, groupOrders]) => ({
            mawbNo,
            maxAge: Math.max(0, ...groupOrders.map((o) => o.ageDays ?? 0)),
            orders: groupSimilarOrders(groupOrders),
        }))
        .sort((a, b) => b.maxAge - a.maxAge);
}

async function getHiddenMawbSet(product) {
    const rows = await prisma.hiddenMawbGroup.findMany({ where: { product }, select: { mawbNo: true } });
    return new Set(rows.map((r) => r.mawbNo));
}

// Ported from grfmxstatusupdate's data/orders.js findRelatedCustomerOrders() -
// other still-open parcels for the same customer (same name+address, or same
// name+phone), scoped to this partner's own product only (the admin version
// searches every product; a partner must never learn that the same customer
// also has an order with a different partner). Only populated when the
// viewed order itself is still in RELATED_ORDERS_STATUSES - once a job has
// gone Out for Delivery or further, this panel isn't relevant to it.
const RELATED_ORDERS_NOT_AT_WAREHOUSE = ['Info Received'];
const RELATED_ORDERS_AT_WAREHOUSE = ['At Warehouse', 'In Sorting Area', 'Return to Warehouse'];
const RELATED_ORDERS_STATUSES = [...RELATED_ORDERS_NOT_AT_WAREHOUSE, ...RELATED_ORDERS_AT_WAREHOUSE];

async function findRelatedOrders(order) {
    if (!RELATED_ORDERS_STATUSES.includes(order.currentStatus)) return null;

    const normalizeStr = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizePhone = (s) => (s || '').toString().replace(/\D/g, '');
    const targetName = normalizeStr(order.receiverName);
    const targetAddr = normalizeStr(order.receiverAddress);
    const targetPhone = normalizePhone(order.receiverPhoneNumber);
    if (!targetName || (!targetAddr && !targetPhone)) return { notAtWarehouse: [], atWarehouse: [] };

    const candidates = await prisma.order.findMany({
        where: { product: order.product, currentStatus: { in: RELATED_ORDERS_STATUSES } },
        select: { doTrackingNumber: true, currentStatus: true, receiverName: true, receiverAddress: true, receiverPhoneNumber: true },
    });
    const related = candidates.filter((o) => {
        if (o.doTrackingNumber === order.doTrackingNumber) return false;
        if (normalizeStr(o.receiverName) !== targetName) return false;
        const addrMatch = targetAddr && normalizeStr(o.receiverAddress) === targetAddr;
        const phoneMatch = targetPhone && normalizePhone(o.receiverPhoneNumber) === targetPhone;
        return addrMatch || phoneMatch;
    });

    const all = [{ doTrackingNumber: order.doTrackingNumber, currentStatus: order.currentStatus }, ...related];
    return {
        notAtWarehouse: all.filter((o) => RELATED_ORDERS_NOT_AT_WAREHOUSE.includes(o.currentStatus)),
        atWarehouse: all.filter((o) => RELATED_ORDERS_AT_WAREHOUSE.includes(o.currentStatus)),
    };
}

// GET /api/partner/tracking/:trackingNumber
router.get('/tracking/:trackingNumber', async (req, res) => {
    try {
        const order = await prisma.order.findFirst({
            where: { product: req.userRole, doTrackingNumber: req.params.trackingNumber },
            include: { history: true },
        });
        if (!order) return res.status(404).json({ error: 'Tracking number not found.' });
        const relatedOrders = await findRelatedOrders(order);
        res.json({ ...toPartnerOrderShape(order, { includeHistory: true }), relatedOrders });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to search tracking number.' });
    }
});

// GET /api/partner/history/:historyId/pod-photos - signed URLs for one
// status-history entry's POD photos (driver-app Complete/Fail capture).
// Scoped to this partner's own product via the parent order, same as every
// other route here - a history id alone doesn't imply ownership.
router.get('/history/:historyId/pod-photos', async (req, res) => {
    try {
        const id = BigInt(req.params.historyId);
        const entry = await prisma.orderHistory.findUnique({
            where: { id },
            select: { podImagePaths: true, order: { select: { product: true } } },
        });
        if (!entry || entry.order.product !== req.userRole) return res.status(404).json({ error: 'Not found.' });

        const paths = entry.podImagePaths || [];
        const urls = await Promise.all(paths.map((p) => getPodImageSignedUrl(p)));
        res.json({ urls });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to load POD photos.' });
    }
});

// GET /api/partner/warehouse - Current (mawbNo -> area -> orders) and
// No Attempt (mawbNo -> orders) tabs. Both drawn from the same "at warehouse,
// not archived, under 30 days" base set grfmxstatusupdate's own Warehouse
// section uses (activeOrders = archive !== 'Yes'; groupByCurrentLocation's own
// age >= 30 skip).
router.get('/warehouse', async (req, res) => {
    try {
        const rawOrders = await prisma.order.findMany({
            where: {
                product: req.userRole,
                currentStatus: { in: WAREHOUSE_STATUSES },
                latestLocation: { in: WAREHOUSE_LOCATIONS },
                // Prisma's `{ not: 'Yes' }` on a nullable column excludes NULL
                // rows too (standard SQL three-valued logic) - and almost every
                // non-archived order has `archive: null`, not an explicit value,
                // so that alone was wiping out the entire Current/No Attempt
                // result set. Confirmed live: 49 real "not archived" PDU orders
                // all had archive === null, zero had any other non-'Yes' value.
                OR: [{ archive: null }, { archive: { not: 'Yes' } }],
            },
        });
        const orders = rawOrders
            .map((o) => toPartnerOrderShape(o, { ageDays: warehouseAgeDays(o) }))
            .filter((o) => o.ageDays == null || o.ageDays < 30);

        const currentGroups = groupByMawb(orders).map((g) => {
            const byArea = new Map();
            for (const o of g.orders) {
                const key = o.area || 'N/A';
                if (!byArea.has(key)) byArea.set(key, []);
                byArea.get(key).push(o);
            }
            return { mawbNo: g.mawbNo, maxAge: g.maxAge, areas: [...byArea.entries()].map(([area, areaOrders]) => ({ area, orders: areaOrders })) };
        });

        // No Attempt: never actually driven out yet - 0 attempts, or exactly 1
        // attempt that wasn't itself a delivery attempt (an "unattempted
        // delivery" reason means a real attempt was made and failed before
        // the driver could even try, which doesn't count as "no attempt").
        const noAttemptOrders = orders.filter((o) => {
            if ((o.attempt || 0) > 1) return false;
            return (o.latestReason || '').toLowerCase() !== 'unattempted delivery';
        });
        const noAttemptGroups = groupByMawb(noAttemptOrders);

        res.json({
            current: currentGroups,
            noAttempt: noAttemptGroups,
            summary: { current: orders.length, noAttempt: noAttemptOrders.length },
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to load warehouse data.' });
    }
});

// GET /api/partner/active-jobs - date-grouped, flat (no dispatcher/freelancer
// split). One list covers both "current" and "outdated" (jobDate < today) -
// outdated jobs just keep showing under their own past date, same as the
// original Active Jobs tab. Also returns the KPI strip the top of the
// In Progress/Completed section shows (Total/Active/Completed/Failed, all
// scoped to today's jobDate - "Failed" here is this role's best-effort
// equivalent of grfmxstatusupdate's own dispatcher-summary "Failed" count:
// a job due today that came back to the warehouse instead of completing).
router.get('/active-jobs', async (req, res) => {
    try {
        const activeOrdersRaw = await prisma.order.findMany({
            where: { product: req.userRole, currentStatus: { in: ACTIVE_STATUSES } },
            orderBy: { jobDate: 'asc' },
        });
        // Bucketed off `activeOrdersRaw`'s own raw (unshaped) jobDate, NOT the
        // shaped `activeOrders` below - toPartnerOrderShape() now formats
        // jobDate into a Brunei "+08:00" display string, and re-running
        // toBruneiDateOnlyString() on an already-Brunei-shifted string would
        // double-shift it by another +8h. Index-paired with activeOrders
        // (same source array, same .map() order) so the raw date drives the
        // bucket while the shaped object is what's actually returned.
        const activeOrders = activeOrdersRaw.map((o) => toPartnerOrderShape(o));

        const today = toDateOnlyString(getBruneiNow());
        const groups = new Map();
        let outdatedCount = 0;
        activeOrdersRaw.forEach((rawOrder, i) => {
            const dateKey = toBruneiDateOnlyString(rawOrder.jobDate) || 'Unscheduled';
            if (dateKey !== 'Unscheduled' && dateKey < today) outdatedCount += 1;
            if (!groups.has(dateKey)) groups.set(dateKey, []);
            groups.get(dateKey).push(activeOrders[i]);
        });
        for (const [key, dateOrders] of groups) groups.set(key, groupSimilarOrders(dateOrders));

        const todayStart = new Date(`${today}T00:00:00+08:00`);
        const todayEnd = new Date(`${today}T23:59:59.999+08:00`);
        const [todayTotal, todayCompleted, todayFailed] = await Promise.all([
            prisma.order.count({ where: { product: req.userRole, jobDate: { gte: todayStart, lte: todayEnd } } }),
            prisma.order.count({ where: { product: req.userRole, jobDate: { gte: todayStart, lte: todayEnd }, currentStatus: 'Completed' } }),
            prisma.order.count({ where: { product: req.userRole, jobDate: { gte: todayStart, lte: todayEnd }, currentStatus: 'Return to Warehouse' } }),
        ]);
        const todayActive = activeOrdersRaw.filter((o) => toBruneiDateOnlyString(o.jobDate) === today).length;

        res.json({
            summary: { total: todayTotal, active: todayActive, completed: todayCompleted, failed: todayFailed, outdated: outdatedCount },
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
// dispatcher breakdown) + the day's jobs split into Completed / Out for
// Delivery / Failed groups (grfmxstatusupdate's own Completed Jobs tab splits
// by dispatcher; this is the partner-equivalent 3-way split by outcome
// instead, since a single-product partner has no dispatcher concept to group
// by).
router.get('/completed-jobs', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "'date' query param is required." });

        const start = new Date(`${date}T00:00:00+08:00`);
        const end = new Date(`${date}T23:59:59.999+08:00`);
        const rawOrders = await prisma.order.findMany({
            where: { product: req.userRole, jobDate: { gte: start, lte: end } },
            orderBy: { lastUpdateDateTime: 'desc' },
        });
        const orders = groupSimilarOrders(rawOrders.map((o) => toPartnerOrderShape(o)));

        const completed = orders.filter((o) => o.currentStatus === 'Completed');
        const outForDelivery = orders.filter((o) => ACTIVE_STATUSES.includes(o.currentStatus));
        const failed = orders.filter((o) => o.currentStatus !== 'Completed' && !ACTIVE_STATUSES.includes(o.currentStatus));

        res.json({
            date,
            summary: { total: orders.length, completed: completed.length, notCompleted: orders.length - completed.length },
            groups: { completed, outForDelivery, failed },
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to load completed jobs.' });
    }
});

// GET /api/partner/incomplete-scan - manifested but not yet physically
// scanned into a warehouse (currentStatus = 'Info Received'), grouped by
// MAWB, respecting hidden MAWB groups exactly like the original dashboard -
// hidden groups are absent entirely, never toggleable from here. Orders with
// no MAWB number yet are left out entirely (nothing to group them under, and
// nothing a partner can act on until one exists).
router.get('/incomplete-scan', async (req, res) => {
    try {
        const hidden = await getHiddenMawbSet(req.userRole);
        const rawOrders = await prisma.order.findMany({
            where: { product: req.userRole, currentStatus: 'Info Received' },
        });
        const visible = rawOrders
            .map((o) => toPartnerOrderShape(o, { ageDays: updateAgeDays(o) }))
            .filter((o) => {
                if (!o.mawbNo) return false;
                if (o.ageDays != null && o.ageDays >= 30) return false;
                return !hidden.has(o.mawbNo);
            });
        const groups = groupByMawb(visible);
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
