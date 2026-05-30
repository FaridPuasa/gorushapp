const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

router.post('/register', async (req, res) => {
    try {
        const {
            email, password, username,
            houseunitno, jalan, kampong, simpang, district, postalcode,
            phonenum, addphonenum,
            receivername, dateofbirth, icnum, passportnum, bruhimsnum, patientphcnum, patientjpmcnum,
            Agreepolicy, Receivemarketing
        } = req.body;

        // 1. Basic text fields checks
        if (!email || !password || !username || !houseunitno || !jalan || !kampong || !district || !postalcode || !phonenum || !receivername || !dateofbirth) {
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
            username,
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
        res.status(201).json({
            message: "Go Rush Account successfully created!",
            userId: savedUser._id,
            username: savedUser.username
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server registry error." });
    }
});

module.exports = router;