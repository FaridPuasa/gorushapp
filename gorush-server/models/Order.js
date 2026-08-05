const mongoose = require('mongoose');

const AddressSchema = {
    houseunitno: { type: String },
    jalan: { type: String },
    kampong: { type: String },
    simpang: { type: String },
    district: { type: String, enum: ["Brunei", "Tutong", "Temburong", "Belait"] },
    postalcode: { type: String },
};

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Lowercase codes matching the external order-watcher/tracker-generation service,
    // which watches this collection's inserts and assigns doTrackingNumber asynchronously.
    product: {
        type: String,
        required: true,
        enum: ["pharmacymoh", "pharmacyjpmc", "pharmacyphc", "localdelivery", "cbsl"],
    },

    // Defaults to "N/A" at insert time (matching the external system's convention for
    // not-yet-available string fields) — the external watcher overwrites it shortly after
    // via its own ordercounter-based sequence. Real values are enforced unique via the
    // partial index below; "N/A" itself is excluded so many pending orders can share it.
    doTrackingNumber: { type: String, default: 'N/A' },
    sequence: { type: Number },

    // Customer / receiver (the party being served — the only party for MOH/JPMC/PHC/Cross Border,
    // and the parcel recipient for Local Delivery).
    receiverName: { type: String, required: true },
    address: AddressSchema,
    receiverAddress: { type: String },
    receiverPostalCode: { type: String },
    receiverEmail: { type: String, trim: true, lowercase: true },
    receiverPhoneNumber: { type: String },
    additionalPhoneNumber: { type: String },

    // Local Delivery only: the sender (account holder placing the order).
    senderName: { type: String },
    senderAddressDetail: AddressSchema,
    senderAddress: { type: String },
    senderPostalCode: { type: String },
    senderEmail: { type: String, trim: true, lowercase: true },
    senderPhoneNumber: { type: String },

    deliveryTypeCode: { type: String },
    paymentMethod: { type: String, enum: ["Cash", "Bank Transfer BIBD", "Bill Payment Baiduri"] },
    remarks: { type: String },
    totalPrice: { type: String },
    dateTimeSubmission: { type: String },

    // MOH / JPMC / PHC
    dateOfBirth: { type: String },
    icNum: { type: String },
    passport: { type: String },
    icPassNum: { type: String },
    bruhimsnum: { type: String },
    patientNumber: { type: String },
    appointmentDistrict: { type: String },
    appointmentPlace: { type: String },
    // Not enum-restricted: only relevant to MOH/JPMC/PHC, but the client always sends the
    // field (empty string for other products) — enum validation would reject that empty value.
    payingPatient: { type: String },

    // Local Delivery
    ldPickupOrDelivery: { type: String },
    itemContains: { type: String },
    ldProductType: { type: String },
    ldProductWeight: { type: String },
    // Not enum-restricted: only relevant to Local Delivery, same empty-string reasoning as above.
    billTo: { type: String },

    // Cross Border Service Limbang
    shipmentMethod: { type: String },
    parcelTrackingNum: { type: String },
    supplierName: { type: String },
    items: [{
        description: { type: String },
        quantity: { type: String },
        totalItemPrice: { type: String },
        screenshotInvoice: { type: String },
    }],

    agreedTerms: { type: Boolean, required: true },

    // Bookkeeping for the Detrack job-creation watcher (lib/detrackWatcher.js) — set once
    // a real doTrackingNumber has been assigned and a Detrack job successfully created for
    // it, so a resumed/duplicate change-stream event can't create a duplicate job.
    detrackJobCreated: { type: Boolean, default: false },
    detrackJobId: { type: String },

    currentStatus: {
        type: String,
        required: true,
        enum: ["Info Received", "At Warehouse", "In Sorting Area", "Out For Delivery", "Completed", "Failed"],
        default: "Info Received",
    },
    history: [{
        statusHistory: { type: String },
        dateUpdated: { type: String },
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { collection: 'orders' });

// Real tracking numbers must be unique; the shared "N/A" placeholder is exempt so every
// pending order can default to it without tripping a duplicate-key error.
OrderSchema.index(
    { doTrackingNumber: 1 },
    { unique: true, partialFilterExpression: { doTrackingNumber: { $ne: 'N/A' } } }
);

module.exports = mongoose.model('Order', OrderSchema);
