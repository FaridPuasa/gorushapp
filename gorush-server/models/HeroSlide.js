const mongoose = require('mongoose');

// image is a base64 data URI string — the same pattern already used for CBSL's
// screenshotInvoice (device picker -> base64 -> plain JSON body -> String field),
// reused here rather than standing up separate file-upload infrastructure.
const HeroSlideSchema = new mongoose.Schema({
    image: { type: String },
    headline: { type: String },
    subtext: { type: String },
    linkUrl: { type: String },
    order: { type: Number, default: 0 },
}, { collection: 'heroslides' });

module.exports = mongoose.model('HeroSlide', HeroSlideSchema);
