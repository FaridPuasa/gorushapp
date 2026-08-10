const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

function signToken(user) {
    return jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

router.post('/register', async (req, res) => {
    try {
        const {
            email, password,
            houseunitno, jalan, kampong, simpang, district, postalcode,
            phonenum, addphonenum,
            receivername, dateofbirth, icnum, passportnum, bruhimsnum, patientphcnum, patientjpmcnum,
            Agreepolicy, Receivemarketing
        } = req.body;

        // 1. Basic text fields checks
        if (!email || !password || !houseunitno || !jalan || !kampong || !district || !phonenum || !receivername || !dateofbirth) {
            return res.status(400).json({ error: "Missing required text fields." });
        }

        // 2. Co-dependent Validation: ID rules constraint
        if (!icnum && !passportnum) {
            return res.status(400).json({ error: "Identification Failure: You must supply either an IC Number or a Passport Number." });
        }

        // 2b. Strict Bru-HIMs cloud validation rule (Must start with BN and be exactly 10 characters)
        if (bruhimsnum && (!bruhimsnum.startsWith('BN') || bruhimsnum.length !== 10)) {
            return res.status(400).json({ error: "Invalid format: Bru-HIMs must start with 'BN' followed by 8 numbers." });
        }

        if (!Agreepolicy) {
            return res.status(400).json({ error: "You must agree to the privacy policy and terms of service." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "An account with this email already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            email,
            password: hashedPassword,
            addresses: [{ houseunitno, jalan, kampong, simpang, district, postalcode, isDefault: true }],
            phonenumbers: [{ phonenum, isDefault: true }],
            additionalphonenumbers: addphonenum ? [{ addphonenum }] : [],
            userdetails: [{
                receivername,
                dateofbirth,
                icnum: icnum || undefined,
                passportnum: passportnum || undefined,
                bruhimsnum,
                patientphcnum,
                patientjpmcnum,
                isDefault: true
            }],
            Agreepolicy,
            Receivemarketing: Receivemarketing || false
        });

        const savedUser = await newUser.save();
        const token = signToken(savedUser);
        res.status(201).json({
            message: "Go Rush Account successfully created!",
            token,
            user: {
                userId: savedUser._id,
                email: savedUser.email,
                role: savedUser.role
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server registry error." });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const token = signToken(user);
        res.status(200).json({
            message: "Logged in successfully.",
            token,
            user: {
                userId: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server login error." });
    }
});

router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: "Account not found." });
        }

        const address = user.addresses.find(a => a.isDefault) || user.addresses[0] || null;
        const phone = user.phonenumbers.find(p => p.isDefault) || user.phonenumbers[0] || null;
        const details = user.userdetails.find(d => d.isDefault) || user.userdetails[0] || null;

        res.status(200).json({
            email: user.email,
            role: user.role,
            receivername: details ? details.receivername : '',
            phonenum: phone ? phone.phonenum : '',
            address: address ? {
                houseunitno: address.houseunitno,
                jalan: address.jalan,
                kampong: address.kampong,
                simpang: address.simpang,
                district: address.district,
                postalcode: address.postalcode
            } : null
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

module.exports = router;