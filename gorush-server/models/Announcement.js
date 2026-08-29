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
    // Independent visibility per audience - e.g. an announcement about the
    // benefits of registering is only relevant to guests, not people who
    // already have an account. Both default true (visible to everyone); the
    // public GET treats a missing value as visible too, so announcements
    // created before these fields existed are unaffected.
    showToGuests: { type: Boolean, default: true },
    showToLoggedIn: { type: Boolean, default: true },
    // Independent of the two audience toggles above - controls only whether
    // this announcement is eligible to appear in the site-wide top
    // notification bar. It always still appears on the full /latest-update
    // list regardless of this flag; same missing-means-visible convention as
    // showToGuests/showToLoggedIn.
    showOnBanner: { type: Boolean, default: true },
}, { collection: 'announcements' });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
