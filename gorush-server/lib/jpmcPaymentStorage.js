// Supabase Storage client for the private "jpmc-payment-proofs" bucket -
// holds the proof-of-payment picture for an order's "Paying Patient Total"
// amount (jpmcTotalAmount). Same Supabase project as the Postgres DB, but a
// separate API (Storage, not the Postgres wire protocol) - needs its own
// URL/key, not DATABASE_URL. Private bucket, so viewing always goes through
// a short-lived signed URL rather than a public one.
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'jpmc-payment-proofs';
const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes - long enough to view/download, not a standing link

// Lazy, not created at module load - this file is required eagerly by
// routes/jpmc.js, so a missing/misconfigured SUPABASE_URL or
// SUPABASE_SERVICE_ROLE_KEY (createClient throws synchronously on either)
// would otherwise crash the entire server on boot, not just this feature -
// confirmed the hard way: it took down "/" and every other route too.
let supabase = null;
function getSupabaseClient() {
    if (!supabase) {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are not configured - payment proof upload/view is unavailable.');
        }
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    return supabase;
}

// Path convention: <orderId>/<timestamp>.<ext> - timestamped so a reupload
// doesn't collide with (or require deleting) the previous file; only the
// latest path is ever referenced from the Order row, so old files are simply
// orphaned (acceptable for a low-volume proof-of-payment picture, same
// tradeoff this app already made for POD images before those were deferred).
function extFromMimeType(mimeType) {
    const map = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/heic': 'heic',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
    };
    return map[mimeType] || 'bin';
}

// Matches this app's existing upload convention (see e.g.
// components/careers/DocumentUploads.js) - a `data:<mime>;base64,<data>` URI
// from expo-image-picker/expo-document-picker's base64 option, sent as a
// plain JSON field rather than multipart form data.
function parseDataUri(dataUri) {
    const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUri || '');
    if (!match) throw new Error('Expected a data:<mime>;base64,... URI.');
    return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function uploadPaymentProof(orderId, dataUri) {
    const { mimeType, buffer } = parseDataUri(dataUri);
    const path = `${orderId}/${Date.now()}.${extFromMimeType(mimeType)}`;
    const { error } = await getSupabaseClient().storage.from(BUCKET).upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
    });
    if (error) throw error;
    return path;
}

async function getPaymentProofSignedUrl(path) {
    const { data, error } = await getSupabaseClient().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    return data.signedUrl;
}

module.exports = { uploadPaymentProof, getPaymentProofSignedUrl };
