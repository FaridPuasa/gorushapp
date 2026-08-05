const { getBruneiNow } = require('./bruneiTime');

const DETRACK_JOBS_URL = 'https://app.detrack.com/api/v2/dn/jobs';

function todayBruneiDateString() {
    const d = getBruneiNow();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Cross Border Service Limbang carries a real items array; the other 4 products don't,
// so fall back to a single synthetic line so Detrack always gets at least one item.
function buildItems(order) {
    if (Array.isArray(order.items) && order.items.length > 0) {
        return order.items.map((item) => ({
            description: item.description || order.product,
            quantity: Number(item.quantity) || 1,
        }));
    }
    return [{ description: order.itemContains || order.product, quantity: 1 }];
}

function buildJobPayload(order) {
    return {
        do_number: order.doTrackingNumber,
        date: todayBruneiDateString(),
        address: order.receiverAddress,
        deliver_to_collect_from: order.receiverName,
        phone_number: order.receiverPhoneNumber,
        instructions: order.remarks || undefined,
        items: buildItems(order),
    };
}

// Reads uncontrolled downstream state (an external system's Mongo document) and talks to
// a third-party API — never throw here; the watcher decides what to do with a failure.
async function createDetrackJob(order) {
    const payload = buildJobPayload(order);
    const apiKey = process.env.DETRACK_API_KEY;

    if (!apiKey) {
        console.log(`[detrack] DRY RUN — would create job for ${order.doTrackingNumber}:`, JSON.stringify(payload));
        return { ok: true, id: 'dry-run' };
    }

    try {
        const response = await fetch(DETRACK_JOBS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
            },
            body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
            return { ok: false, error: `Detrack responded ${response.status}: ${JSON.stringify(body)}` };
        }
        // Response envelope unconfirmed against the live account — fall back through the
        // shapes Detrack's API is known to use (top-level or nested under `data`).
        const id = body?.id || body?.data?.id || body?.data?.[0]?.id || null;
        return { ok: true, id };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

module.exports = { createDetrackJob, buildJobPayload };
