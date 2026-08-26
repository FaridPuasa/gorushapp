// Shared SMTP transporter for order-notification emails, mirroring
// grfmxstatusupdate's own setup (same Office365 account, same env vars) so
// no new credentials are needed. Only used by the Postgres order-intake
// path (see routes/orders.js) - the old Mongo-based flow's equivalent
// notifications are still handled by Make.com until that flow is retired.
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || 'it.support@globex.com.bn',
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: true,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
});

// Same fixed recipient list for all 3 alert cases (moh/jpmc immediate, phc,
// self-collect) - confirmed 2026-08-26, not per-case.
const ORDER_ALERT_RECIPIENTS = [
    'customer.care@globex.com.bn',
    'customer.care@gorushbn.com',
    'warehouse@globex.com.bn',
    'azura.whalid@globex.com.bn',
    'operation2@globex.com.bn',
    'operation3@globex.com.bn',
    'syahmi.ghafar@globex.com.bn',
];

// Best-effort/fire-and-forget, same tolerance as the Detrack call right
// above it in routes/orders.js - a failed alert email never fails the
// order-creation request itself.
async function sendOrderAlert({ subject, html }) {
    try {
        const info = await transporter.sendMail({
            from: `"Go Rush System" <${process.env.EMAIL_USER || 'it.support@globex.com.bn'}>`,
            to: ORDER_ALERT_RECIPIENTS.join(', '),
            subject,
            html,
        });
        console.log(`✅ Order alert email sent (${subject}): ${info.messageId}`);
        return true;
    } catch (err) {
        console.error(`❌ Order alert email failed (${subject}):`, err.message);
        return false;
    }
}

module.exports = { sendOrderAlert, ORDER_ALERT_RECIPIENTS };
