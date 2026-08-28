const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const PublicHoliday = require('../models/PublicHoliday');
const Announcement = require('../models/Announcement');
const HeroSlide = require('../models/HeroSlide');
const Vacancy = require('../models/Vacancy');
const PricingRule = require('../models/PricingRule');
const { compressBase64Image } = require('../lib/imageCompress');

router.use(requireAdmin);

// --- Public holidays ---

router.post('/holidays', async (req, res) => {
    try {
        const { date, label } = req.body;
        if (!date) return res.status(400).json({ error: "A date is required." });
        const holiday = await PublicHoliday.create({ date, label });
        res.status(201).json(holiday);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.delete('/holidays/:id', async (req, res) => {
    try {
        const result = await PublicHoliday.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: "Holiday not found." });
        res.status(200).json({ message: "Holiday removed." });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

// --- Announcements ---

// Unlike the public GET (content.js), which only returns whichever audience
// the requester belongs to - admin needs to see and manage every
// announcement, including ones hidden from one or both audiences.
router.get('/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ date: -1 }).lean();
        res.status(200).json(announcements);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.post('/announcements', async (req, res) => {
    try {
        const { titleEn, bodyEn, titleBm, bodyBm, date, bodyAlign, showToGuests, showToLoggedIn } = req.body;
        if (!titleEn || !bodyEn || !date) {
            return res.status(400).json({ error: "English title, body, and a date are required." });
        }
        const announcement = await Announcement.create({
            titleEn, bodyEn, titleBm, bodyBm, date, bodyAlign,
            showToGuests: showToGuests !== false, showToLoggedIn: showToLoggedIn !== false,
        });
        res.status(201).json(announcement);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.put('/announcements/:id', async (req, res) => {
    try {
        const { titleEn, bodyEn, titleBm, bodyBm, date, bodyAlign, showToGuests, showToLoggedIn } = req.body;
        if (!titleEn || !bodyEn || !date) {
            return res.status(400).json({ error: "English title, body, and a date are required." });
        }
        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id,
            { titleEn, bodyEn, titleBm, bodyBm, date, bodyAlign, showToGuests, showToLoggedIn },
            { new: true }
        );
        if (!announcement) return res.status(404).json({ error: "Announcement not found." });
        res.status(200).json(announcement);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.delete('/announcements/:id', async (req, res) => {
    try {
        const result = await Announcement.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: "Announcement not found." });
        res.status(200).json({ message: "Announcement removed." });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

// --- Hero slides ---

router.post('/slides', async (req, res) => {
    try {
        const { image, headline, subtext, linkUrl, order } = req.body;
        const compressedImage = await compressBase64Image(image);
        const slide = await HeroSlide.create({ image: compressedImage, headline, subtext, linkUrl, order: order || 0 });
        res.status(201).json(slide);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.put('/slides/:id', async (req, res) => {
    try {
        const { image, headline, subtext, linkUrl, order } = req.body;
        const compressedImage = image ? await compressBase64Image(image) : undefined;
        const slide = await HeroSlide.findByIdAndUpdate(
            req.params.id,
            { ...(compressedImage ? { image: compressedImage } : {}), headline, subtext, linkUrl, order },
            { new: true }
        );
        if (!slide) return res.status(404).json({ error: "Slide not found." });
        res.status(200).json(slide);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.delete('/slides/:id', async (req, res) => {
    try {
        const result = await HeroSlide.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: "Slide not found." });
        res.status(200).json({ message: "Slide removed." });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

// --- Vacancies ---
// Unlike holidays/announcements/slides (always fully visible), vacancies can be closed —
// so admin needs its own GET returning every vacancy, not just the public /api/vacancies
// list (open ones only).

router.get('/vacancies', async (req, res) => {
    try {
        const vacancies = await Vacancy.find().sort({ order: 1 }).lean();
        res.status(200).json(vacancies);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.post('/vacancies', async (req, res) => {
    try {
        const { title, department, employmentType, description, requirements, responsibilities, applicationType, isOpen, closingDate, order } = req.body;
        if (!title) return res.status(400).json({ error: "A title is required." });
        const vacancy = await Vacancy.create({
            title, department, employmentType, description, requirements, responsibilities,
            applicationType, isOpen: isOpen !== false, closingDate, order: order || 0,
        });
        res.status(201).json(vacancy);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.put('/vacancies/:id', async (req, res) => {
    try {
        const { title, department, employmentType, description, requirements, responsibilities, applicationType, isOpen, closingDate, order } = req.body;
        if (!title) return res.status(400).json({ error: "A title is required." });
        const vacancy = await Vacancy.findByIdAndUpdate(
            req.params.id,
            { title, department, employmentType, description, requirements, responsibilities, applicationType, isOpen, closingDate, order },
            { new: true }
        );
        if (!vacancy) return res.status(404).json({ error: "Vacancy not found." });
        res.status(200).json(vacancy);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.delete('/vacancies/:id', async (req, res) => {
    try {
        const result = await Vacancy.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: "Vacancy not found." });
        res.status(200).json({ message: "Vacancy removed." });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

// --- Pricing ---
// Price-only editing of existing rows — no add/remove of which product/district/charge-code
// combinations exist, since that also requires touching availability rules and delivery-type
// mapping elsewhere. Rows are seeded once via scripts/seedPricingRules.js.

router.put('/pricing/:id', async (req, res) => {
    try {
        const { price, note } = req.body;
        if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
            return res.status(400).json({ error: "Price must be a non-negative number." });
        }
        const rule = await PricingRule.findByIdAndUpdate(
            req.params.id,
            { price, note },
            { new: true }
        );
        if (!rule) return res.status(404).json({ error: "Pricing rule not found." });
        res.status(200).json(rule);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;
