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
}, { collection: 'announcements' });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
