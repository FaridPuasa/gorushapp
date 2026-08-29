const mongoose = require('mongoose');

// Bilingual so admin-created announcements read the same as the app's own static content —
// bm fields are optional; the client falls back to the en fields when a bm one is blank,
// matching how t()'s own locale fallback already works.
const AnnouncementSchema = new mongoose.Schema({
    titleEn: { type: String, required: true },
    bodyEn: { type: String, required: true },
    titleBm: { type: String },
    bodyBm: { type: String },
    date: { type: String, required: true },
    // Body text carries **bold** / _italic_ markers, parsed client-side on display —
    // avoids storing/rendering real HTML for a couple of inline styles.
    bodyAlign: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
    // Every announcement always appears on the full /latest-update list for
    // everyone - no per-audience hiding there. These two control only
    // whether it's eligible to appear in the site-wide top notification
    // bar, independently per audience (e.g. shown to guests but not to
    // logged-in users). Both default true; missing means visible too, so
    // announcements created before these fields existed are unaffected.
    showOnBannerToGuests: { type: Boolean, default: true },
    showOnBannerToLoggedIn: { type: Boolean, default: true },
}, { collection: 'announcements' });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
