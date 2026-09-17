const express = require('express');
const router = express.Router();
const { isVacancyCurrentlyOpen } = require('../lib/vacancies');
const { findAllHolidays, findAllPricingRules } = require('../lib/postgresPricingHoliday');
const { findAllAnnouncements, findAllHeroSlides, findOpenVacancies } = require('../lib/postgresContent');

// Public, unauthenticated reads — the storefront (and its own order-availability checks)
// need these regardless of who's browsing. Admin-only writes live in routes/admin.js.

router.get('/holidays', async (req, res) => {
    try {
        const holidays = await findAllHolidays();
        res.status(200).json(holidays);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.get('/announcements', async (req, res) => {
    try {
        // Always visible to everyone here - only the top notification bar
        // (AnnouncementContext.js, client-side) filters by audience, via
        // showOnBannerToGuests/showOnBannerToLoggedIn on each announcement.
        const announcements = await findAllAnnouncements();
        res.status(200).json(announcements);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.get('/slides', async (req, res) => {
    try {
        const slides = await findAllHeroSlides();
        // Admin-managed content that rarely changes, but still several MB of
        // base64 image data - without this, every single page load re-fetches
        // the full payload from scratch. 5 minutes balances not going stale
        // for too long against actually saving repeat requests within a
        // browsing session.
        res.set('Cache-Control', 'public, max-age=300');
        res.status(200).json(slides);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.get('/vacancies', async (req, res) => {
    try {
        // isOpen is a static DB flag; closingDate is a time-based cutoff (5pm Brunei time on
        // that date) that can't be expressed as a query filter — checked in JS instead.
        const vacancies = await findOpenVacancies();
        res.status(200).json(vacancies.filter((v) => isVacancyCurrentlyOpen(v)));
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.get('/pricing', async (req, res) => {
    try {
        const rules = await findAllPricingRules();
        res.status(200).json(rules);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;
