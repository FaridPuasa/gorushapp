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
        enum: ['customer', 'admin', 'jpmc'],
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
        // 'JPMC' | 'PJSC' | 'GJPMC' - not enum-restricted: optional at the profile
        // level (same reasoning as payingpatient below), an enum would reject blank.
        appointmentplace: { type: String },
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

// Postgres dual-write mirror (2026-09-16) - fires after every save from
// routes/auth.js's register and every write in routes/profile.js (they all
// end in `user.save()`), so this single hook covers all of them instead of
// a call at each of the ~19 sites. Fire-and-forget - see lib/userDualWrite.js
// for why a failure here must never surface to the request that triggered it.
UserSchema.post('save', function (doc) {
    require('../lib/userDualWrite').dualWriteUserSync(doc)
        .catch((err) => console.error('[user dual-write] post-save hook error:', err.message));
});

module.exports = mongoose.model('User', UserSchema);