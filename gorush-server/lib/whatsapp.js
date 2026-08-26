// WhatsApp order-confirmation notification via the same Make.com webhook +
// ManyChat flow the old Mongo-based flow uses (grfmxstatusupdate's
// handleOrderChange(), triggered by its own Mongo change-stream watcher on
// new order inserts). Since gorushapp's Postgres order-intake path never
// touches Mongo, that watcher never fires for these orders - this
// replicates the same webhook call directly, same phone-cleaning logic,
// same skip-list (mirrored verbatim 2026-08-26, though none of gorushapp's
// 5 products currently appear on it).
const axios = require('axios');

const MAKE_WHATSAPP_WEBHOOK_URL = process.env.MAKE_WHATSAPP_WEBHOOK_URL || 'https://hook.eu1.make.com/2rzk6t84td2261kh33zhdvfi98yggmhy';
const MAKE_WEBHOOK_API_KEY = process.env.MAKE_WEBHOOK_API_KEY || '2969421:27114c524def4cc4c85530d8b8018f9b';

const SKIP_WHATSAPP_PRODUCTS = [
    'fmx', 'bb', 'fcas', 'icarus', 'ewe', 'ewens',
    'kptdf', 'pdu', 'pure51', 'sklabo', 'mglobal', 'kptdp', 'gdext',
];

function cleanPhoneNumber(rawPhoneNumber) {
    if (!rawPhoneNumber) return 'N/A';
    const cleanedNumber = rawPhoneNumber.trim().replace(/\D/g, '');
    if (/^\d{7}$/.test(cleanedNumber)) return '+673' + cleanedNumber;
    if (/^673\d{7}$/.test(cleanedNumber)) return '+' + cleanedNumber;
    if (/^\+673\d{7}$/.test(rawPhoneNumber)) return rawPhoneNumber;
    return 'N/A';
}

function shouldSendWhatsApp(product, phoneNumber) {
    return !SKIP_WHATSAPP_PRODUCTS.includes(product) && phoneNumber !== 'N/A';
}

// Best-effort/fire-and-forget, same tolerance as Detrack, order alert
// emails, and Excel appends - a failed WhatsApp send never fails the
// order-creation request.
async function sendWhatsAppMessage(rawPhoneNumber, name, trackingNumber, product) {
    const phoneNumber = cleanPhoneNumber(rawPhoneNumber);
    if (!shouldSendWhatsApp(product, phoneNumber)) {
        return false;
    }
    try {
        await axios.post(
            MAKE_WHATSAPP_WEBHOOK_URL,
            { phone: phoneNumber, name, trackingNumber },
            { headers: { 'Content-Type': 'application/json', 'x-make-apikey': MAKE_WEBHOOK_API_KEY } }
        );
        console.log(`✅ WhatsApp sent for tracker ${trackingNumber}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to send WhatsApp for tracker ${trackingNumber}:`, err.response?.data || err.message);
        return false;
    }
}

module.exports = { sendWhatsAppMessage, cleanPhoneNumber, shouldSendWhatsApp };
