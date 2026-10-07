// Supabase Storage client for the private "pod-images" bucket - read-only
// here (gorush-server never uploads POD photos, only the driver app via
// grfmxstatusupdate does). Same pattern as lib/jpmcPaymentStorage.js (lazy
// client, short-lived signed URL since the bucket is private).
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'pod-images';
const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes - long enough to view, not a standing link

// Lazy, not created at module load - see the matching comment in
// lib/jpmcPaymentStorage.js for why (a missing/misconfigured env var would
// otherwise crash the entire server on boot, not just this feature).
let supabase = null;
function getSupabaseClient() {
    if (!supabase) {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are not configured - POD photo view is unavailable.');
        }
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    return supabase;
}

async function getPodImageSignedUrl(path) {
    const { data, error } = await getSupabaseClient().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    return data.signedUrl;
}

module.exports = { getPodImageSignedUrl };
