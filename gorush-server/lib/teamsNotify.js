// Microsoft Teams notification for "Immediate" charge-type orders, across
// all 5 product types - a separate, broader trigger than the existing
// order-alert email (lib/mailer.js), which only covers moh/jpmc Immediate,
// any phc order, or any Self Collect order. Posts an Adaptive Card to a
// Teams channel via an Incoming Webhook (or a Workflows webhook configured
// to relay this same "attachments" envelope) - only used by the Postgres
// order-intake path (see routes/orders.js).
const axios = require('axios');

const PRODUCT_DISPLAY_NAME = {
    pharmacymoh: 'Pharmacy MOH',
    pharmacyjpmc: 'Pharmacy JPMC',
    pharmacyphc: 'Pharmacy PHC',
    localdelivery: 'Local Delivery',
    cbsl: 'CBSL',
};

function shouldNotifyTeams(orderData) {
    return orderData.jobMethod === 'Immediate';
}

function buildImmediateOrderCard(orderData, trackingNumber) {
    const productName = PRODUCT_DISPLAY_NAME[orderData.product] || orderData.product;
    const facts = [
        { title: 'Tracking Number', value: trackingNumber || '' },
        { title: 'Product', value: productName },
        { title: 'Receiver', value: orderData.receiverName || '' },
        { title: 'Address', value: orderData.receiverAddress || '' },
        { title: 'Phone', value: orderData.receiverPhoneNumber || '' },
        { title: 'Payment Method', value: orderData.paymentMethod || '' },
    ];
    if (orderData.remarks) {
        facts.push({ title: 'Remarks', value: orderData.remarks });
    }

    return {
        type: 'message',
        attachments: [
            {
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: {
                    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                    type: 'AdaptiveCard',
                    version: '1.4',
                    body: [
                        {
                            type: 'TextBlock',
                            text: `🚨 Immediate Order — ${productName}`,
                            weight: 'Bolder',
                            size: 'Medium',
                            wrap: true,
                        },
                        {
                            type: 'FactSet',
                            facts: facts.map((f) => ({ title: f.title, value: String(f.value) })),
                        },
                    ],
                },
            },
        ],
    };
}

// Best-effort/fire-and-forget, same tolerance as the other order-creation
// side effects - a failed Teams post never fails the order-creation request.
async function notifyTeamsImmediateOrder(orderData, trackingNumber) {
    if (!shouldNotifyTeams(orderData)) return false;
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log(`[teams] TEAMS_WEBHOOK_URL not set - skipping notification for ${trackingNumber}`);
        return false;
    }
    try {
        await axios.post(webhookUrl, buildImmediateOrderCard(orderData, trackingNumber));
        console.log(`✅ Teams notification sent for tracker ${trackingNumber}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to send Teams notification for ${trackingNumber}:`, err.response?.data || err.message);
        return false;
    }
}

module.exports = { notifyTeamsImmediateOrder, shouldNotifyTeams, buildImmediateOrderCard };
