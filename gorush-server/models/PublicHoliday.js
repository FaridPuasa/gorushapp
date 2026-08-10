const mongoose = require('mongoose');

// Feeds lib/availability.js's holiday-aware blocking — a plain date string ('YYYY-MM-DD'),
// consistent with how the rest of this codebase stores dates.
const PublicHolidaySchema = new mongoose.Schema({
    date: { type: String, required: true },
    label: { type: String },
}, { collection: 'publicholidays' });

module.exports = mongoose.model('PublicHoliday', PublicHolidaySchema);
