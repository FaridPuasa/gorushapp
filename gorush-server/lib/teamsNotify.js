// Microsoft Teams notifications for 3 order categories, each posted to its
// own channel via a separate Incoming Webhook - broader/independent from
// the existing order-alert email (lib/mailer.js), which only covers
// moh/jpmc Immediate, any phc order, or any Self Collect order, in ONE
// combined email. These 3 checks are NOT mutually exclusive - e.g. a phc
// order placed with "Immediate" charge posts to both the phc channel and
// the immediate channel, since those are different teams who each want
// visibility into their own order type. Only used by the Postgres
// order-intake path (see routes/orders.js).
const axios = require('axios');

const PRODUCT_DISPLAY_NAME = {
    pharmacymoh: 'Pharmacy MOH',
    pharmacyjpmc: 'Pharmacy JPMC',
    pharmacyphc: 'Pharmacy PHC',
    localdelivery: 'Local Delivery',
    cbsl: 'CBSL',
};

const CATEGORIES = [
    {
        key: 'immediate',
        envVar: 'TEAMS_WEBHOOK_URL_IMMEDIATE',
        title: '🚨 Immediate Order',
        matches: (orderData) => orderData.jobMethod === 'Immediate',
    },
    {
        key: 'selfCollect',
        envVar: 'TEAMS_WEBHOOK_URL_SELFCOLLECT',
        title: '📦 Self Collect Order',
        matches: (orderData) => orderData.jobMethod === 'Self Collect',
    },
    {
        key: 'phc',
        envVar: 'TEAMS_WEBHOOK_URL_PHC',
        title: '🏥 PHC Order',
        matches: (orderData) => orderData.product === 'pharmacyphc',
    },
];

function buildOrderCard(title, orderData, trackingNumber) {
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
                            text: `${title} — ${productName}`,
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

async function postToChannel(category, orderData, trackingNumber) {
    const webhookUrl = process.env[category.envVar];
    if (!webhookUrl) {
        console.log(`[teams] ${category.envVar} not set - skipping ${category.key} notification for ${trackingNumber}`);
        return false;
    }
    try {
        await axios.post(webhookUrl, buildOrderCard(category.title, orderData, trackingNumber));
        console.log(`✅ Teams ${category.key} notification sent for tracker ${trackingNumber}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to send Teams ${category.key} notification for ${trackingNumber}:`, err.response?.data || err.message);
        return false;
    }
}

// Best-effort/fire-and-forget, same tolerance as the other order-creation
// side effects - a failed Teams post never fails the order-creation
// request. Checks all 3 categories independently, posting to each channel
// whose condition matches.
async function notifyTeams(orderData, trackingNumber) {
    const results = await Promise.all(
        CATEGORIES.filter((category) => category.matches(orderData))
            .map((category) => postToChannel(category, orderData, trackingNumber))
    );
    return results.some(Boolean);
}

module.exports = { notifyTeams, buildOrderCard };
