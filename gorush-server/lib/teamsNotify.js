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

function formatBruneiDateTime(date) {
    return date ? new Date(date).toLocaleString('en-GB', { timeZone: 'Asia/Brunei' }) : '';
}

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
    {
        key: 'localdelivery',
        envVar: 'TEAMS_WEBHOOK_URL_LOCALDELIVERY',
        title: '🚚 Local Delivery Order',
        matches: (orderData) => orderData.product === 'localdelivery',
    },
];

function buildOrderCard(title, orderData, trackingNumber, categoryKey) {
    const productName = PRODUCT_DISPLAY_NAME[orderData.product] || orderData.product;
    const facts = [
        { title: 'Tracking Number', value: trackingNumber || '' },
        { title: 'Date Time Submission', value: formatBruneiDateTime(orderData.dateTimeSubmission) },
        { title: 'Product', value: productName },
        { title: 'Receiver', value: orderData.receiverName || '' },
    ];
    // Self Collect always uses the fixed office address now (not the
    // customer's own), so showing it/its Area is pointless noise - matches
    // the order alert email's own selfCollect template, which already
    // omits both for the same reason.
    if (categoryKey !== 'selfCollect') {
        facts.push({ title: 'Address', value: orderData.receiverAddress || '' });
        // Matches the order alert email's own "Area" field exactly (same
        // source: the customer's chosen district, e.g. "Brunei"/"Tutong" -
        // not the finer kampong-based classification in orderData.area/
        // Detrack's zone).
        facts.push({ title: 'Area', value: orderData.address?.district || '' });
    }
    facts.push({ title: 'Phone', value: orderData.receiverPhoneNumber || '' });
    if (orderData.additionalPhoneNumber) {
        facts.push({ title: 'Additional Phone Number', value: orderData.additionalPhoneNumber });
    }
    facts.push({ title: 'Payment Method', value: orderData.paymentMethod || '' });
    if (orderData.totalPrice != null) {
        facts.push({ title: 'Amount', value: `$${Number(orderData.totalPrice).toFixed(2)}` });
    }
    // MOH uses bruhimsnum, JPMC/PHC use patientNumber - mutually exclusive
    // per product, so a single combined fact covers all 3 pharmacy products.
    const bruhimsOrPatientNumber = orderData.bruhimsnum || orderData.patientNumber;
    if (bruhimsOrPatientNumber) {
        facts.push({ title: 'BruHIMS/Patient No.', value: bruhimsOrPatientNumber });
    }
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
        await axios.post(webhookUrl, buildOrderCard(category.title, orderData, trackingNumber, category.key));
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
