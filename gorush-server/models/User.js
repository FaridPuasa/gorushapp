const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['customer', 'admin', 'jpmc', 'gorush'],
        default: 'customer',
    },
    addresses: [{
        houseunitno: { type: String, required: true },
        jalan: { type: String, required: true },
        kampong: { type: String, required: true },
        simpang: { type: String },
        district: {
            type: String,
            required: true,
            enum: ["Brunei", "Tutong", "Temburong", "Belait"]
        },
        postalcode: { type: String },
        isDefault: { type: Boolean, default: true }
    }],
    phonenumbers: [{
        phonenum: { type: String, required: true },
        isDefault: { type: Boolean, default: true }
    }],
    additionalphonenumbers: [{
        addphonenum: { type: String }
    }],
    userdetails: [{
        receivername: { type: String, required: true },
        dateofbirth: { type: String, required: true },
        icnum: { type: String },
        passportnum: { type: String },
        bruhimsnum: { type: String },
        appointmentdistrict: { type: String },
        patientphcnum: { type: String },
        patientjpmcnum: { type: String },
        // Not enum-restricted: optional at the profile level (order.js falls back to manual
        // entry when blank), and an enum would reject the blank default.
        payingpatient: { type: String },
        isDefault: { type: Boolean, default: true }
    }],
    Agreepolicy: {
        type: Boolean,
        required: true,
    },
    Receivemarketing: {
        type: Boolean,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
}, { collection: 'grusers' });

module.exports = mongoose.model('User', UserSchema);