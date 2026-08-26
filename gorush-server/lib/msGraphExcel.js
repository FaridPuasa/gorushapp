// Microsoft Graph API helper for appending order rows to the two SharePoint/
// OneDrive Excel workbooks the old Make.com flow wrote to - "Guest Orders"
// in "JPMC PJSC Forms.xlsx" for JPMC orders, and "Database" in "Limbang
// Manifest.xlsx" for CBSL orders. Mirrors grfmxstatusupdate's own
// data/msGraphExcel.js pattern exactly (same app-only client-credentials
// auth, same "write past usedRange" append strategy) - reuse that same
// Azure AD app registration's credentials here rather than creating a new
// one, since it's the same tenant/organization.
//
// Only used by the Postgres order-intake path (see routes/orders.js) - the
// old Mongo-based flow's equivalent Excel rows are still written by
// Make.com until that flow is retired.
const axios = require('axios');

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
    if (cachedToken && Date.now() < cachedTokenExpiresAt - 60000) {
        return cachedToken;
    }
    const res = await axios.post(
        `https://login.microsoftonline.com/${process.env.MS_GRAPH_TENANT_ID}/oauth2/v2.0/token`,
        new URLSearchParams({
            client_id: process.env.MS_GRAPH_CLIENT_ID,
            client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    cachedToken = res.data.access_token;
    cachedTokenExpiresAt = Date.now() + res.data.expires_in * 1000;
    return cachedToken;
}

// Appends one row to the end of a named sheet in a workbook, returning the
// 1-based row number it landed on (or null on failure). Never throws - same
// best-effort tolerance as Detrack job creation and order alert emails; a
// failed Excel append never fails the order-creation request.
async function appendRow({ fileOwner, itemId, sheetName, row, logLabel }) {
    try {
        const token = await getAccessToken();
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const base = `${GRAPH_BASE}/users/${fileOwner}/drive/items/${itemId}`;

        const used = await axios.get(`${base}/workbook/worksheets('${sheetName}')/usedRange(valuesOnly=true)`, { headers });
        const nextRow = used.data.rowCount + 1;
        const lastColLetter = String.fromCharCode('A'.charCodeAt(0) + row.length - 1);

        await axios.patch(
            `${base}/workbook/worksheets('${sheetName}')/range(address='A${nextRow}:${lastColLetter}${nextRow}')`,
            { values: [row] },
            { headers }
        );
        console.log(`✅ Appended row ${nextRow} to ${sheetName} for ${logLabel}`);
        return nextRow;
    } catch (err) {
        console.error(`❌ Failed to append ${sheetName} row for ${logLabel}:`, err.response?.data || err.message);
        return null;
    }
}

// Sets a clickable hyperlink on a single cell - used for the CBSL manifest's
// invoice screenshot column, since Graph's workbook API has no way to embed
// an actual picture into a cell (that's only possible via the in-Excel
// JavaScript Add-in API, not this server-side REST API). A plain
// {hyperlink: url} on the range PATCH silently no-ops - the Range resource
// doesn't accept it as writable that way (confirmed 2026-08-26: the row
// landed with literal "View Invoice" as unstyled text, not a real link).
// Excel's own =HYPERLINK() formula, written via `formulas` (not `values`),
// is what actually produces a real clickable link with the standard
// blue/underline styling. Never throws.
async function setCellHyperlink({ fileOwner, itemId, sheetName, cellAddress, url, logLabel }) {
    try {
        const token = await getAccessToken();
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const base = `${GRAPH_BASE}/users/${fileOwner}/drive/items/${itemId}`;

        await axios.patch(
            `${base}/workbook/worksheets('${sheetName}')/range(address='${cellAddress}')`,
            { formulas: [[`=HYPERLINK("${url}","View Invoice")`]] },
            { headers }
        );
        return true;
    } catch (err) {
        console.error(`❌ Failed to set invoice hyperlink for ${logLabel}:`, err.response?.data || err.message);
        return false;
    }
}

// Uploads a base64 data-URL image (item.screenshotInvoice) as its own file
// into the "CBSL Invoice Screenshots" folder alongside Limbang Manifest.xlsx
// (same "Go Rush" root folder the workbook itself lives in), returning its
// webUrl. Uses Graph's simple upload endpoint - fine for typical
// screenshot/photo sizes, but capped at 4MB; larger files fail (caught,
// logged, treated as no screenshot) rather than falling back to chunked
// upload, since that's meaningfully more complexity for what should be a
// rare edge case.
async function uploadCbslInvoiceScreenshot(dataUrl, trackingNumber, itemIndex) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return null;
    }
    try {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return null;
        const [, mime, base64Data] = match;
        const ext = mime.split('/')[1] || 'jpg';
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 4 * 1024 * 1024) {
            console.error(`❌ Invoice screenshot for ${trackingNumber} item ${itemIndex} exceeds 4MB simple-upload limit (${buffer.length} bytes) - skipping`);
            return null;
        }

        const token = await getAccessToken();
        const fileName = `${trackingNumber}-item${itemIndex}.${ext}`;
        const uploadUrl = `${GRAPH_BASE}/users/${process.env.MS_GRAPH_EXCEL_FILE_OWNER}/drive/root:/Go Rush/CBSL Invoice Screenshots/${fileName}:/content`;

        const res = await axios.put(uploadUrl, buffer, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': mime },
        });
        return res.data.webUrl || null;
    } catch (err) {
        console.error(`❌ Failed to upload invoice screenshot for ${trackingNumber} item ${itemIndex}:`, err.response?.data || err.message);
        return null;
    }
}

// "Guest Orders" sheet, 18-column layout - identical to
// grfmxstatusupdate's data/msGraphExcel.js buildGuestOrderRow, confirmed
// against the live Make.com scenario 2026-08-26:
//   No | icnumber | passport | dateofbirth | Column1(additionalPhoneNumber) |
//   customerPhone | dateSubmitted | paymentmethod | deliveryType | name |
//   patientNumber | customerAddress | remarks | jpmcpjsc | Tookan-Tracking |
//   price | Column2(unused) | dateOrdered(unused)
// N/jpmcpjsc: the Make.com scenario maps this to an internal bundle
// reference ("108.data.jpmcpjsc") that doesn't correspond to a plain order
// field name - using appointmentPlace here, matching what
// grfmxstatusupdate's own working copy of this exact sheet already writes
// into this same column. Flag if this turns out to be wrong.
function buildJpmcGuestOrderRow(orderData, trackingNumber) {
    return [
        '-',
        orderData.icNum || null,
        orderData.passport || 'IC Number',
        orderData.dateOfBirth || null,
        orderData.additionalPhoneNumber || null,
        orderData.receiverPhoneNumber || null,
        orderData.dateTimeSubmission || null,
        orderData.paymentMethod || null,
        orderData.jobMethod || null,
        orderData.receiverName || null,
        orderData.patientNumber || null,
        orderData.receiverAddress || null,
        orderData.remarks || null,
        orderData.appointmentPlace || null,
        trackingNumber || null,
        orderData.totalPrice != null ? Number(orderData.totalPrice) : null,
        null,
        null,
    ];
}

async function appendJpmcGuestOrderRow(orderData, trackingNumber) {
    return appendRow({
        fileOwner: process.env.MS_GRAPH_EXCEL_FILE_OWNER,
        itemId: process.env.MS_GRAPH_JPMC_EXCEL_ITEM_ID,
        sheetName: 'Guest Orders',
        row: buildJpmcGuestOrderRow(orderData, trackingNumber),
        logLabel: trackingNumber,
    });
}

// "Database" sheet in Limbang Manifest.xlsx, 13-column layout confirmed
// against the live Make.com scenario 2026-08-26. CBSL orders carry a real
// items[] array (multiple distinct goods per shipment) - Make's scenario
// maps Description/QTY directly from the array, which only makes sense if
// its Excel module runs inside an per-item Iterator, i.e. one manifest row
// PER ITEM, not one row per order. Mirrored that here.
//
// Column J (INVOICE SCREENSHOT) can't hold an actual embedded picture (see
// setCellHyperlink above) - left blank at write time, then filled in with a
// "View Invoice" hyperlink in a follow-up call once the item's screenshot
// has been uploaded as its own file (see appendCbslManifestRows).
function buildCbslManifestRow(orderData, trackingNumber, item) {
    return [
        '-',
        orderData.parcelTrackingNum || null,
        trackingNumber || null,
        orderData.dateTimeSubmission || null,
        orderData.receiverName || null,
        item.description || null,
        item.quantity || null,
        orderData.cargoPrice != null ? Number(orderData.cargoPrice) : null,
        orderData.supplierName || null,
        null, // INVOICE SCREENSHOT - filled in below via setCellHyperlink
        orderData.jobMethod || null,
        orderData.paymentMethod || null,
        orderData.totalPrice != null ? Number(orderData.totalPrice) : null,
    ];
}

async function appendCbslManifestRows(orderData, trackingNumber) {
    const items = Array.isArray(orderData.items) && orderData.items.length > 0
        ? orderData.items
        : [{ description: null, quantity: null }];

    const fileOwner = process.env.MS_GRAPH_EXCEL_FILE_OWNER;
    const itemId = process.env.MS_GRAPH_CBSL_EXCEL_ITEM_ID;

    let allOk = true;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNumber = await appendRow({
            fileOwner,
            itemId,
            sheetName: 'Database',
            row: buildCbslManifestRow(orderData, trackingNumber, item),
            logLabel: trackingNumber,
        });
        if (!rowNumber) {
            allOk = false;
            continue;
        }

        if (item.screenshotInvoice) {
            const screenshotUrl = await uploadCbslInvoiceScreenshot(item.screenshotInvoice, trackingNumber, i + 1);
            if (screenshotUrl) {
                await setCellHyperlink({
                    fileOwner,
                    itemId,
                    sheetName: 'Database',
                    cellAddress: `J${rowNumber}`,
                    url: screenshotUrl,
                    logLabel: trackingNumber,
                });
            } else {
                allOk = false;
            }
        }
    }
    return allOk;
}

module.exports = { appendJpmcGuestOrderRow, appendCbslManifestRows, buildJpmcGuestOrderRow, buildCbslManifestRow };
