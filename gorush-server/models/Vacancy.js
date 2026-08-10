const mongoose = require('mongoose');

const VacancySchema = new mongoose.Schema({
    title: { type: String, required: true },
    department: { type: String },
    employmentType: { type: String, default: 'Full-time' },
    description: { type: String },
    // Shown only in the detail popup on the careers page (below the description) — hidden
    // from the collapsed list card.
    requirements: { type: String },
    responsibilities: { type: String },
    // Determines which extra application questions and uploads a vacancy's applicants are
    // shown (see APPLICATION_TYPE_RULES in routes/careers.js and lib/careersOptions.js on
    // the client) — mirrors the per-position branching in the old gorushbn.com/careers form.
    applicationType: {
        type: String,
        enum: ['Freelancer', 'Dispatcher', 'Helper', 'OperationSupport', 'General'],
        default: 'General',
    },
    isOpen: { type: Boolean, default: true },
    // 'YYYY-MM-DD', same convention as PublicHoliday.date. Optional — when set, the vacancy
    // automatically stops appearing in the public list once Brunei time passes 5:00 PM on
    // this date (see lib/vacancies.js), independent of the isOpen toggle.
    closingDate: { type: String },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
}, { collection: 'vacancies' });

module.exports = mongoose.model('Vacancy', VacancySchema);
