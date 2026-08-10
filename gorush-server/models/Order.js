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

    // Abbreviated to STD/EXP/IMM at insert time — jobMethod below keeps the original
    // human-readable charge code (e.g. "Standard", "Self Collect") the client sent.
    deliveryTypeCode: { type: String },
    jobMethod: { type: String },
    paymentMethod: { type: String, enum: ["Cash", "Bank Transfer BIBD", "Bill Payment Baiduri"] },
    remarks: { type: String },
    totalPrice: { type: String },
    dateTimeSubmission: { type: String },

    // Parcel weight in kg: fixed "1" for pharmacy products and CBSL (neither collects a
    // real weight), ldProductWeight passed through for Local Delivery.
    weight: { type: String },
    // CBSL only: sum of items[].totalItemPrice, formatted with currency (e.g. "RM 49.72").
    cargoPrice: { type: String },

    // "Website" (submitted via the web build) or "Phone" (native app) — reported by the
    // client itself, since only it knows which build it's running as.
    orderOrigin: { type: String },

    // MOH / JPMC / PHC
    dateOfBirth: { type: String },
    icNum: { type: String },
    passport: { type: String },
    icPassNum: { type: String },
    bruhimsnum: { type: String },
    patientNumber: { type: String },
    appointmentDistrict: { type: String },
    appointmentPlace: { type: String },
    // Derived from appointmentDistrict: Brunei/Temburong -> OPD, Tutong -> PMMH, Belait -> SSBH.
    sendOrderTo: { type: String },
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
    // Real per-item list for CBSL; a single synthetic "Medicine" entry for pharmacy
    // products (localdelivery has no items[] at all — it uses itemContains instead).
    items: [{
        description: { type: String },
        weight: { type: String },
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

// GET /api/orders/mine matches on any of these fields via $or — without indexes, that
// forces a full scan of the entire (80,000+ document, shared with the legacy system)
// collection for every lookup, taking tens of seconds. One index per field lets Mongo
// resolve each $or branch with an index scan instead.
OrderSchema.index({ userId: 1 });
OrderSchema.index({ icPassNum: 1 });
OrderSchema.index({ bruhimsnum: 1 });
OrderSchema.index({ patientNumber: 1 });

module.exports = mongoose.model('Order', OrderSchema);
