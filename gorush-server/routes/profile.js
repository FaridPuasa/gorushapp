const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

function setDefaultInList(list, id) {
    let found = false;
    list.forEach((item) => {
        const isMatch = String(item._id) === String(id);
        if (isMatch) found = true;
        item.isDefault = isMatch;
    });
    return found;
}

// Removes an entry from a list that must always keep at least one item.
// If the removed entry was the default, promotes the first remaining entry.
function deleteFromRequiredList(list, id) {
    const entry = list.id(id);
    if (!entry) return { error: 'notfound' };
    if (list.length <= 1) return { error: 'lastitem' };

    const wasDefault = entry.isDefault;
    list.pull(id);
    if (wasDefault && list.length > 0) {
        list[0].isDefault = true;
    }
    return { ok: true };
}

router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.userId);
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

        const existing = await User.findOne({ email, _id: { $ne: req.userId } });
        if (existing) {
            return res.status(400).json({ error: "Another account is already using this email." });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        user.email = email;
        await user.save();

        res.status(200).json({ message: "Account details updated.", email: user.email });
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
        const { receivername, dateofbirth, icnum, passportnum, bruhimsnum, patientphcnum, patientjpmcnum } = req.body;
        const validationError = validateDetailsFields(req.body);
        if (validationError) return res.status(400).json({ error: validationError });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        user.userdetails.push({
            receivername, dateofbirth,
            icnum: icnum || undefined, passportnum: passportnum || undefined,
            bruhimsnum, patientphcnum, patientjpmcnum,
            isDefault: false,
        });
        await user.save();
        res.status(201).json({ message: "Personal details added.", userdetails: user.userdetails });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/userdetails/:id', async (req, res) => {
    try {
        const { receivername, dateofbirth, icnum, passportnum, bruhimsnum, patientphcnum, patientjpmcnum } = req.body;
        const validationError = validateDetailsFields(req.body);
        if (validationError) return res.status(400).json({ error: validationError });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const details = user.userdetails.id(req.params.id);
        if (!details) return res.status(404).json({ error: "Personal details entry not found." });

        details.receivername = receivername;
        details.dateofbirth = dateofbirth;
        details.icnum = icnum || undefined;
        details.passportnum = passportnum || undefined;
        details.bruhimsnum = bruhimsnum;
        details.patientphcnum = patientphcnum;
        details.patientjpmcnum = patientjpmcnum;

        await user.save();
        res.status(200).json({ message: "Personal details updated.", userdetails: user.userdetails });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.delete('/userdetails/:id', async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = deleteFromRequiredList(user.userdetails, req.params.id);
        if (result.error === 'notfound') return res.status(404).json({ error: "Personal details entry not found." });
        if (result.error === 'lastitem') return res.status(400).json({ error: "You must keep at least one personal details entry." });

        await user.save();
        res.status(200).json({ message: "Personal details entry removed.", userdetails: user.userdetails });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/userdetails/:id/default', async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const found = setDefaultInList(user.userdetails, req.params.id);
        if (!found) return res.status(404).json({ error: "Personal details entry not found." });

        await user.save();
        res.status(200).json({ message: "Default personal details updated.", userdetails: user.userdetails });
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

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Current password is incorrect." });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

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
        if (!houseunitno || !jalan || !kampong || !district || !postalcode) {
            return res.status(400).json({ error: "Missing required address fields." });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        user.addresses.push({ houseunitno, jalan, kampong, simpang, district, postalcode, isDefault: false });
        await user.save();
        res.status(201).json({ message: "Address added.", addresses: user.addresses });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/addresses/:id', async (req, res) => {
    try {
        const { houseunitno, jalan, kampong, simpang, district, postalcode } = req.body;
        if (!houseunitno || !jalan || !kampong || !district || !postalcode) {
            return res.status(400).json({ error: "Missing required address fields." });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const address = user.addresses.id(req.params.id);
        if (!address) return res.status(404).json({ error: "Address not found." });

        Object.assign(address, { houseunitno, jalan, kampong, simpang, district, postalcode });
        await user.save();
        res.status(200).json({ message: "Address updated.", addresses: user.addresses });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.delete('/addresses/:id', async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = deleteFromRequiredList(user.addresses, req.params.id);
        if (result.error === 'notfound') return res.status(404).json({ error: "Address not found." });
        if (result.error === 'lastitem') return res.status(400).json({ error: "You must keep at least one address." });

        await user.save();
        res.status(200).json({ message: "Address removed.", addresses: user.addresses });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/addresses/:id/default', async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const found = setDefaultInList(user.addresses, req.params.id);
        if (!found) return res.status(404).json({ error: "Address not found." });

        await user.save();
        res.status(200).json({ message: "Default address updated.", addresses: user.addresses });
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

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        user.phonenumbers.push({ phonenum, isDefault: false });
        await user.save();
        res.status(201).json({ message: "Phone number added.", phonenumbers: user.phonenumbers });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/phonenumbers/:id', async (req, res) => {
    try {
        const { phonenum } = req.body;
        if (!phonenum) return res.status(400).json({ error: "Phone number is required." });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const entry = user.phonenumbers.id(req.params.id);
        if (!entry) return res.status(404).json({ error: "Phone number not found." });

        entry.phonenum = phonenum;
        await user.save();
        res.status(200).json({ message: "Phone number updated.", phonenumbers: user.phonenumbers });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.delete('/phonenumbers/:id', async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const result = deleteFromRequiredList(user.phonenumbers, req.params.id);
        if (result.error === 'notfound') return res.status(404).json({ error: "Phone number not found." });
        if (result.error === 'lastitem') return res.status(400).json({ error: "You must keep at least one phone number." });

        await user.save();
        res.status(200).json({ message: "Phone number removed.", phonenumbers: user.phonenumbers });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/phonenumbers/:id/default', async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const found = setDefaultInList(user.phonenumbers, req.params.id);
        if (!found) return res.status(404).json({ error: "Phone number not found." });

        await user.save();
        res.status(200).json({ message: "Default phone number updated.", phonenumbers: user.phonenumbers });
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

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        user.additionalphonenumbers.push({ addphonenum });
        await user.save();
        res.status(201).json({ message: "Additional phone number added.", additionalphonenumbers: user.additionalphonenumbers });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.put('/additionalphonenumbers/:id', async (req, res) => {
    try {
        const { addphonenum } = req.body;
        if (!addphonenum) return res.status(400).json({ error: "Phone number is required." });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const entry = user.additionalphonenumbers.id(req.params.id);
        if (!entry) return res.status(404).json({ error: "Additional phone number not found." });

        entry.addphonenum = addphonenum;
        await user.save();
        res.status(200).json({ message: "Additional phone number updated.", additionalphonenumbers: user.additionalphonenumbers });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

router.delete('/additionalphonenumbers/:id', async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "Account not found." });

        const entry = user.additionalphonenumbers.id(req.params.id);
        if (!entry) return res.status(404).json({ error: "Additional phone number not found." });

        user.additionalphonenumbers.pull(req.params.id);
        await user.save();
        res.status(200).json({ message: "Additional phone number removed.", additionalphonenumbers: user.additionalphonenumbers });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server profile error." });
    }
});

module.exports = router;
