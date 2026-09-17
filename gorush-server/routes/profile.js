const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const users = require('../lib/postgresUsers');
const { requireAuth } = require('../middleware/auth');
const { validateJpmcPatientNumber } = require('../lib/jpmcValidation');

router.use(requireAuth);

router.get('/', async (req, res) => {
    try {
        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        res.status(200).json({
            email: user.email,
            addresses: user.addresses,
            phonenumbers: user.phonenumbers,
            additionalphonenumbers: user.additionalphonenumbers,
            userdetails: user.userdetails,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/basic', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required." });
        }

        const existing = await users.findByEmailExcludingId(email, req.userId);
        if (existing) {
            return res.status(400).json({ error: "Another account is already using this email." });
        }

        const updated = await users.updateEmail(req.userId, email);
        res.status(200).json({ message: "Account details updated.", email: updated.email });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

function validateDetailsFields({ receivername, dateofbirth, icnum, passportnum, bruhimsnum }) {
    if (!receivername || !dateofbirth) {
        return "Receiver name and date of birth are required.";
    }
    if (!icnum && !passportnum) {
        return "Identification Failure: You must supply either an IC Number or a Passport Number.";
    }
    if (bruhimsnum && (!bruhimsnum.startsWith('BN') || bruhimsnum.length !== 10)) {
        return "Invalid format: Bru-HIMs must start with 'BN' followed by 8 numbers.";
    }
    return null;
}

// --- Personal details (userdetails) ---

router.post('/userdetails', async (req, res) => {
    try {
        const { receivername, dateofbirth, icnum, passportnum, bruhimsnum, appointmentdistrict, patientphcnum, patientjpmcnum, appointmentplace, payingpatient } = req.body;
        const validationError = validateDetailsFields(req.body);
        if (validationError) return res.status(400).json({ error: validationError });
        const jpmcFormatError = validateJpmcPatientNumber(appointmentplace, patientjpmcnum);
        if (jpmcFormatError) return res.status(400).json({ error: jpmcFormatError });

        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const userdetails = await users.userdetails.add(req.userId, {
            receivername, dateofbirth,
            icnum: icnum || null, passportnum: passportnum || null,
            bruhimsnum, appointmentdistrict, patientphcnum, patientjpmcnum, appointmentplace, payingpatient,
            isDefault: false,
        });
        res.status(201).json({ message: "Personal details added.", userdetails });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/userdetails/:id', async (req, res) => {
    try {
        const { receivername, dateofbirth, icnum, passportnum, bruhimsnum, appointmentdistrict, patientphcnum, patientjpmcnum, appointmentplace, payingpatient } = req.body;
        const validationError = validateDetailsFields(req.body);
        if (validationError) return res.status(400).json({ error: validationError });
        const jpmcFormatError = validateJpmcPatientNumber(appointmentplace, patientjpmcnum);
        if (jpmcFormatError) return res.status(400).json({ error: jpmcFormatError });

        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.userdetails.update(req.userId, req.params.id, {
            receivername, dateofbirth,
            icnum: icnum || null, passportnum: passportnum || null,
            bruhimsnum, appointmentdistrict, patientphcnum, patientjpmcnum, appointmentplace, payingpatient,
        });
        if (result.error === 'notfound') return res.status(404).json({ error: "Personal details entry not found." });

        res.status(200).json({ message: "Personal details updated.", userdetails: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.delete('/userdetails/:id', async (req, res) => {
    try {
        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.userdetails.deleteWithMinimumGuard(req.userId, req.params.id);
        if (result.error === 'notfound') return res.status(404).json({ error: "Personal details entry not found." });
        if (result.error === 'lastitem') return res.status(400).json({ error: "You must keep at least one personal details entry." });

        res.status(200).json({ message: "Personal details entry removed.", userdetails: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/userdetails/:id/default', async (req, res) => {
    try {
        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.userdetails.setDefault(req.userId, req.params.id);
        if (result.error === 'notfound') return res.status(404).json({ error: "Personal details entry not found." });

        res.status(200).json({ message: "Default personal details updated.", userdetails: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current password and new password are required." });
        }

        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Current password is incorrect." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await users.updatePassword(req.userId, hashedPassword);

        res.status(200).json({ message: "Password updated successfully." });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

// --- Addresses ---

router.post('/addresses', async (req, res) => {
    try {
        const { houseunitno, jalan, kampong, simpang, district, postalcode } = req.body;
        if (!houseunitno || !jalan || !kampong || !district) {
            return res.status(400).json({ error: "Missing required address fields." });
        }

        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const addresses = await users.addresses.add(req.userId, { houseunitno, jalan, kampong, simpang, district, postalcode, isDefault: false });
        res.status(201).json({ message: "Address added.", addresses });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/addresses/:id', async (req, res) => {
    try {
        const { houseunitno, jalan, kampong, simpang, district, postalcode } = req.body;
        if (!houseunitno || !jalan || !kampong || !district) {
            return res.status(400).json({ error: "Missing required address fields." });
        }

        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.addresses.update(req.userId, req.params.id, { houseunitno, jalan, kampong, simpang, district, postalcode });
        if (result.error === 'notfound') return res.status(404).json({ error: "Address not found." });

        res.status(200).json({ message: "Address updated.", addresses: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.delete('/addresses/:id', async (req, res) => {
    try {
        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.addresses.deleteWithMinimumGuard(req.userId, req.params.id);
        if (result.error === 'notfound') return res.status(404).json({ error: "Address not found." });
        if (result.error === 'lastitem') return res.status(400).json({ error: "You must keep at least one address." });

        res.status(200).json({ message: "Address removed.", addresses: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/addresses/:id/default', async (req, res) => {
    try {
        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.addresses.setDefault(req.userId, req.params.id);
        if (result.error === 'notfound') return res.status(404).json({ error: "Address not found." });

        res.status(200).json({ message: "Default address updated.", addresses: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

// --- Phone numbers ---

router.post('/phonenumbers', async (req, res) => {
    try {
        const { phonenum } = req.body;
        if (!phonenum) return res.status(400).json({ error: "Phone number is required." });

        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const phonenumbers = await users.phonenumbers.add(req.userId, { phonenum, isDefault: false });
        res.status(201).json({ message: "Phone number added.", phonenumbers });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/phonenumbers/:id', async (req, res) => {
    try {
        const { phonenum } = req.body;
        if (!phonenum) return res.status(400).json({ error: "Phone number is required." });

        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.phonenumbers.update(req.userId, req.params.id, { phonenum });
        if (result.error === 'notfound') return res.status(404).json({ error: "Phone number not found." });

        res.status(200).json({ message: "Phone number updated.", phonenumbers: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.delete('/phonenumbers/:id', async (req, res) => {
    try {
        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.phonenumbers.deleteWithMinimumGuard(req.userId, req.params.id);
        if (result.error === 'notfound') return res.status(404).json({ error: "Phone number not found." });
        if (result.error === 'lastitem') return res.status(400).json({ error: "You must keep at least one phone number." });

        res.status(200).json({ message: "Phone number removed.", phonenumbers: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/phonenumbers/:id/default', async (req, res) => {
    try {
        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.phonenumbers.setDefault(req.userId, req.params.id);
        if (result.error === 'notfound') return res.status(404).json({ error: "Phone number not found." });

        res.status(200).json({ message: "Default phone number updated.", phonenumbers: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

// --- Additional phone numbers (flat list, no default) ---

router.post('/additionalphonenumbers', async (req, res) => {
    try {
        const { addphonenum } = req.body;
        if (!addphonenum) return res.status(400).json({ error: "Phone number is required." });

        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const additionalphonenumbers = await users.additionalPhonenumbers.add(req.userId, { addphonenum });
        res.status(201).json({ message: "Additional phone number added.", additionalphonenumbers });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/additionalphonenumbers/:id', async (req, res) => {
    try {
        const { addphonenum } = req.body;
        if (!addphonenum) return res.status(400).json({ error: "Phone number is required." });

        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.additionalPhonenumbers.update(req.userId, req.params.id, { addphonenum });
        if (result.error === 'notfound') return res.status(404).json({ error: "Additional phone number not found." });

        res.status(200).json({ message: "Additional phone number updated.", additionalphonenumbers: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.delete('/additionalphonenumbers/:id', async (req, res) => {
    try {
        const user = await users.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = await users.additionalPhonenumbers.deleteSimple(req.userId, req.params.id);
        if (result.error === 'notfound') return res.status(404).json({ error: "Additional phone number not found." });

        res.status(200).json({ message: "Additional phone number removed.", additionalphonenumbers: result.list });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

module.exports = router;
