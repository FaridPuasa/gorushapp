const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    vacancyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vacancy', required: true },

    // Snapshots of the vacancy at submission time, so editing/closing/deleting the vacancy
    // later doesn't change what an already-submitted application shows.
    positionApplied: { type: String, required: true },
    applicationType: { type: String, required: true },

    name: { type: String, required: true },
    dateofbirth: { type: String, required: true },
    icnumber: { type: String, required: true },
    houseunitno: { type: String, required: true },
    jalan: { type: String, required: true },
    kampong: { type: String, required: true },
    simpang: { type: String },
    district: { type: String, required: true, enum: ["Brunei", "Tutong", "Temburong", "Belait"] },
    postalcode: { type: String },
    // Required only for logged-in applicants (guests may omit an email).
    email: { type: String, trim: true, lowercase: true, required: function () { return !!this.userId; } },
    phonenum: { type: String, required: true },
    addphonenum: { type: String },

    highestAchievement: { type: String, required: true },
    // Freelancer only.
    partTimeDuration: { type: String },
    carOwn: { type: String },
    // Freelancer / Dispatcher.
    deliverBefore: { type: String },
    experienceDelivery: { type: String },
    parcelNum: { type: String },
    // Dispatcher / Helper / OperationSupport.
    driveManual: { type: String },

    // Base64 data URIs — same convention as Order.items[].screenshotInvoice and
    // WargaEmasOrder's icPictureFront/Back.
    icFront: { type: String, required: true },
    resumeCv: { type: String, required: true },
    drivingLicenseFront: { type: String },
    drivingLicenseBack: { type: String },

    status: {
        type: String,
        enum: ['New', 'Reviewed', 'Shortlisted', 'Rejected'],
        default: 'New',
    },
    dateTimeSubmission: { type: String },
    createdAt: { type: Date, default: Date.now },
}, { collection: 'jobapplications' });

module.exports = mongoose.model('JobApplication', JobApplicationSchema);
