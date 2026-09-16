// Supabase Storage client for the private "job-application-documents" bucket -
// replaces icFront/resumeCv/drivingLicenseFront/drivingLicenseBack base64
// TEXT columns as the real destination for careers form uploads. Same lazy-
// client pattern as lib/jpmcPaymentStorage.js/lib/podImageStorage.js in the
// sibling grfmxstatusupdate repo (same Supabase project, same gr_dms schema -
// this bucket is shared with that repo's own copy of this helper, which is
// how the /jobApplications admin page's View/Download buttons read files
// this route writes; keep both copies in sync if either changes).
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'job-application-documents';

// Lazy, not created at module load - a missing/misconfigured env var would
// otherwise crash the entire server on boot, not just this feature (see the
// matching comment in lib/jpmcPaymentStorage.js).
let supabase = null;
function getSupabaseClient() {
    if (!supabase) {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are not configured - job application document upload is unavailable.');
        }
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    return supabase;
}

const MIME_EXTENSIONS = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

// data:<mime>;base64,<data> URI - same shape the careers client form already
// submits (icFront/resumeCv/etc), no different from the pre-Storage columns.
function parseDataUri(dataUri) {
    const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUri || '');
    if (!match) throw new Error('Expected a data:<mime>;base64,... URI.');
    return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

// Path convention: <applicationId>/<fieldName>-<timestamp>.<ext> - timestamped
// so this stays consistent with the other Storage helpers in this migration,
// even though a job application is create-only today (no reupload path exists).
async function uploadJobApplicationDoc(applicationId, fieldName, dataUri) {
    if (!dataUri) return null;
    const { mimeType, buffer } = parseDataUri(dataUri);
    const ext = MIME_EXTENSIONS[mimeType] || 'bin';
    const path = `${applicationId}/${fieldName}-${Date.now()}.${ext}`;
    const { error } = await getSupabaseClient().storage.from(BUCKET).upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
    });
    if (error) throw error;
    return path;
}

module.exports = { uploadJobApplicationDoc, BUCKET };
