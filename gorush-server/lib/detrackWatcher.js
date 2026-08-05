const mongoose = require('mongoose');
const Order = require('../models/Order');
const { createDetrackJob } = require('./detrack');

const STATE_ID = 'orders-detrack';

// The `orders` collection is shared with the pre-existing Webflow-based order system —
// it holds products this app doesn't know about (e.g. "mglobal", "ewe", "gdext"). Only
// react to the 5 product codes this app actually creates orders for.
const OUR_PRODUCT_CODES = Order.schema.path('product').enumValues;

function watcherStateCollection() {
    return mongoose.connection.db.collection('watcherState');
}

async function getState() {
    return watcherStateCollection().findOne({ _id: STATE_ID });
}

async function saveResumeToken(token) {
    await watcherStateCollection().updateOne(
        { _id: STATE_ID },
        { $set: { resumeToken: token } },
        { upsert: true }
    );
}

async function clearResumeToken() {
    await watcherStateCollection().updateOne(
        { _id: STATE_ID },
        { $unset: { resumeToken: '' } },
        { upsert: true }
    );
}

async function processOrder(order) {
    if (order.detrackJobCreated) return;
    if (!OUR_PRODUCT_CODES.includes(order.product)) return;
    const result = await createDetrackJob(order);
    if (result.ok) {
        await Order.updateOne(
            { _id: order._id },
            { $set: { detrackJobCreated: true, detrackJobId: result.id } }
        );
        console.log(`[detrack] job created for ${order.doTrackingNumber} (id=${result.id})`);
    } else {
        console.error(`[detrack] failed to create job for ${order.doTrackingNumber}: ${result.error}`);
    }
}

function openChangeStream(resumeToken) {
    const pipeline = [{
        $match: {
            operationType: { $in: ['insert', 'update', 'replace'] },
            'fullDocument.product': { $in: OUR_PRODUCT_CODES },
            'fullDocument.doTrackingNumber': { $exists: true, $ne: 'N/A' },
            'fullDocument.detrackJobCreated': { $ne: true },
        },
    }];
    const options = { fullDocument: 'updateLookup' };
    if (resumeToken) options.resumeAfter = resumeToken;

    const stream = Order.watch(pipeline, options);
    // Any error surfacing while we opened with a resumeToken means that specific token is
    // suspect — Mongo's resumability error codes vary by failure mode (history lost,
    // token not found, etc.) and aren't worth pattern-matching; the safe move is to not
    // retry the same token again, not to guess which errors are "the resumable kind".
    let resumeTokenSuspect = Boolean(resumeToken);
    let gotAnyEvent = false;

    stream.on('change', async (event) => {
        gotAnyEvent = true;
        resumeTokenSuspect = false;
        try {
            if (event.fullDocument) {
                await processOrder(event.fullDocument);
            }
            await saveResumeToken(event._id);
        } catch (err) {
            console.error('[detrack] error handling change-stream event:', err.message);
        }
    });

    stream.on('error', (err) => {
        console.error('[detrack] change stream error:', err.message);
    });

    stream.on('close', async () => {
        if (resumeTokenSuspect && !gotAnyEvent) {
            console.warn(
                '[detrack] resume token is no longer valid — orders that got a tracking ' +
                'number while this process was down may have been missed. This does NOT ' +
                'auto-replay historical orders (that would risk creating a Detrack job for ' +
                'every old order in the collection); if a catch-up is needed, run one ' +
                'manually scoped to a specific date range.'
            );
            await clearResumeToken();
        }
        console.warn('[detrack] change stream closed, reconnecting in 3s');
        setTimeout(async () => {
            const state = await getState();
            openChangeStream(state?.resumeToken || null);
        }, 3000);
    });

    return stream;
}

async function startDetrackWatcher() {
    const state = await getState();
    if (!state) {
        // First-ever run: nothing to resume, and deliberately no historical sweep — this
        // feature only applies to orders that get a tracking number from here on.
        await watcherStateCollection().insertOne({ _id: STATE_ID, startedAt: new Date() });
    }
    openChangeStream(state?.resumeToken || null);
    console.log(`[detrack] watcher started${state?.resumeToken ? ' (resumed)' : ' (fresh)'}`);
}

module.exports = { startDetrackWatcher };
