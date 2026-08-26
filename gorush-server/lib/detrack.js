const { getBruneiNow } = require('./bruneiTime');

const DETRACK_JOBS_URL = 'https://app.detrack.com/api/v2/dn/jobs';

const GROUP_NAME_MAP = {
    localdelivery: 'LD',
    cbsl: 'CBSL',
    pharmacymoh: 'MOH',
    pharmacyjpmc: 'JPMC',
    pharmacyphc: 'PHC',
};

function todayBruneiDateString() {
    const d = getBruneiNow();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Detrack's numeric fields want plain numbers, not currency-formatted strings — strips any
// stray symbols (order.totalPrice is stored as e.g. "4.00") and rounds to 2 decimal places.
function toNumber(value) {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isNaN(n) ? undefined : Number(n.toFixed(2));
}

// items[] is now populated in Mongo for every product (a real list for CBSL, a fixed
// "Medicine" entry for pharmacy products) — only Local Delivery still has none, since it
// uses a single free-text "item contains" field instead.
function buildItems(order) {
    if (Array.isArray(order.items) && order.items.length > 0) {
        return order.items.map((item) => ({
            description: item.description || order.product,
            quantity: Number(item.quantity) || 1,
        }));
    }
    return [{ description: order.itemContains || order.product, quantity: 1 }];
}

// CBSL is the one product with two distinct tracking numbers pre-scan: the
// original courier's number (parcelTrackingNum) and our own generated one
// (doTrackingNumber). Confirmed against grfmxstatusupdate's
// processCBSLFirstScan() - at creation, do_number is the ORIGINAL number
// and tracking_number is OUR number; the two swap at warehouse scan-in
// (do_number becomes ours, tracking_number becomes the original) so staff
// scanning the physical parcel's original barcode can still look the job
// up by do_number before that swap happens. Every other product only has
// our own tracking number, so it's used for both fields.
function buildDoNumber(order) {
    return order.product === 'cbsl' ? order.parcelTrackingNum : order.doTrackingNumber;
}

function buildJobPayload(order) {
    const totalPriceNumber = toNumber(order.totalPrice);
    return {
        do_number: buildDoNumber(order),
        tracking_number: order.doTrackingNumber,
        date: todayBruneiDateString(),
        group_name: GROUP_NAME_MAP[order.product],
        job_type: order.jobMethod,
        address: order.receiverAddress,
        zone: order.area || undefined,
        postal_code: order.receiverPostalCode,
        deliver_to_collect_from: order.receiverName,
        phone_number: order.receiverPhoneNumber,
        other_phone_numbers: order.additionalPhoneNumber || undefined,
        instructions: order.remarks || undefined,
        remarks: order.remarks || undefined,
        payment_mode: order.paymentMethod,
        // Not cash -> already paid another way, so there's nothing for the driver to collect.
        payment_amount: order.paymentMethod === 'Cash' ? totalPriceNumber : 0,
        total_price: totalPriceNumber,
        insurance_price: toNumber(order.cargoPrice),
        weight: toNumber(order.weight),
        items: buildItems(order),
    };
}

// Reads uncontrolled downstream state (an external system's Mongo document) and talks to
// a third-party API — never throw here; the watcher decides what to do with a failure.
async function createDetrackJob(order) {
    // buildJobPayload() must live inside this try too - it reads uncontrolled
    // downstream data (e.g. order.items could contain a malformed entry) and
    // a throw here must degrade to a normal { ok: false } result like any
    // other failure, not bypass this function's own "never throw" contract.
    try {
        const payload = buildJobPayload(order);
        const apiKey = process.env.DETRACK_API_KEY;

        if (!apiKey) {
            console.log(`[detrack] DRY RUN — would create job for ${order.doTrackingNumber}:`, JSON.stringify(payload));
            return { ok: true, id: 'dry-run' };
        }

        // Confirmed against the live account: the job fields must be wrapped in a
        // top-level "data" key, or Detrack rejects the request with 422 "Data is missing".
        const response = await fetch(DETRACK_JOBS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
            },
            body: JSON.stringify({ data: payload }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
            return { ok: false, error: `Detrack responded ${response.status}: ${JSON.stringify(body)}` };
        }
        // Confirmed response shape: { data: { id, detrack_number, ... } }.
        const id = body?.data?.id || null;
        return { ok: true, id };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

module.exports = { createDetrackJob, buildJobPayload, toNumber };
