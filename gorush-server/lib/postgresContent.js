// Postgres-backed reads/writes for Announcement/HeroSlide/Vacancy, replacing
// the Mongo dual-write trio (lib/cmsDualWrite.js, retired 2026-09-17 once
// Mongo/Postgres parity was confirmed - 6/6 announcements, 3/3 slides, 1/1
// vacancy, 0 field mismatches). `_id` is kept as the exposed key (aliased
// from the Postgres bigint id) since gorush-client's admin.js already treats
// it as an opaque string identifier - no client change needed.
const prisma = require('./prismaClient');

function toLegacyAnnouncement(row) {
    return {
        _id: row.id.toString(),
        titleEn: row.titleEn,
        bodyEn: row.bodyEn,
        titleBm: row.titleBm,
        bodyBm: row.bodyBm,
        date: row.date,
        bodyAlign: row.bodyAlign,
        showOnBannerToGuests: row.showOnBannerToGuests,
        showOnBannerToLoggedIn: row.showOnBannerToLoggedIn,
    };
}

function toLegacyHeroSlide(row) {
    return {
        _id: row.id.toString(),
        image: row.image,
        headline: row.headline,
        subtext: row.subtext,
        linkUrl: row.linkUrl,
        order: row.order,
    };
}

function toLegacyVacancy(row) {
    return {
        _id: row.id.toString(),
        title: row.title,
        department: row.department,
        employmentType: row.employmentType,
        description: row.description,
        requirements: row.requirements,
        responsibilities: row.responsibilities,
        applicationType: row.applicationType,
        isOpen: row.isOpen,
        closingDate: row.closingDate,
        order: row.order,
        createdAt: row.createdAt,
    };
}

function isValidId(id) {
    return /^\d+$/.test(String(id));
}

// --- Announcements ---

async function findAllAnnouncements() {
    const rows = await prisma.announcement.findMany({ orderBy: { date: 'desc' } });
    return rows.map(toLegacyAnnouncement);
}

async function createAnnouncement(fields) {
    const row = await prisma.announcement.create({ data: fields });
    return toLegacyAnnouncement(row);
}

async function updateAnnouncementById(id, fields) {
    if (!isValidId(id)) return null;
    try {
        const row = await prisma.announcement.update({ where: { id: BigInt(id) }, data: fields });
        return toLegacyAnnouncement(row);
    } catch (err) {
        if (err.code === 'P2025') return null;
        throw err;
    }
}

async function deleteAnnouncementById(id) {
    if (!isValidId(id)) return null;
    try {
        const row = await prisma.announcement.delete({ where: { id: BigInt(id) } });
        return toLegacyAnnouncement(row);
    } catch (err) {
        if (err.code === 'P2025') return null;
        throw err;
    }
}

// --- Hero slides ---

async function findAllHeroSlides() {
    const rows = await prisma.heroSlide.findMany({ orderBy: { order: 'asc' } });
    return rows.map(toLegacyHeroSlide);
}

async function createHeroSlide(fields) {
    const row = await prisma.heroSlide.create({ data: fields });
    return toLegacyHeroSlide(row);
}

async function updateHeroSlideById(id, fields) {
    if (!isValidId(id)) return null;
    try {
        const row = await prisma.heroSlide.update({ where: { id: BigInt(id) }, data: fields });
        return toLegacyHeroSlide(row);
    } catch (err) {
        if (err.code === 'P2025') return null;
        throw err;
    }
}

async function deleteHeroSlideById(id) {
    if (!isValidId(id)) return null;
    try {
        const row = await prisma.heroSlide.delete({ where: { id: BigInt(id) } });
        return toLegacyHeroSlide(row);
    } catch (err) {
        if (err.code === 'P2025') return null;
        throw err;
    }
}

// --- Vacancies ---

async function findAllVacancies() {
    const rows = await prisma.vacancy.findMany({ orderBy: { order: 'asc' } });
    return rows.map(toLegacyVacancy);
}

async function findOpenVacancies() {
    const rows = await prisma.vacancy.findMany({ where: { isOpen: true }, orderBy: { order: 'asc' } });
    return rows.map(toLegacyVacancy);
}

async function findVacancyById(id) {
    if (!isValidId(id)) return null;
    const row = await prisma.vacancy.findUnique({ where: { id: BigInt(id) } });
    return row ? toLegacyVacancy(row) : null;
}

async function createVacancy(fields) {
    const row = await prisma.vacancy.create({ data: fields });
    return toLegacyVacancy(row);
}

async function updateVacancyById(id, fields) {
    if (!isValidId(id)) return null;
    try {
        const row = await prisma.vacancy.update({ where: { id: BigInt(id) }, data: fields });
        return toLegacyVacancy(row);
    } catch (err) {
        if (err.code === 'P2025') return null;
        throw err;
    }
}

async function deleteVacancyById(id) {
    if (!isValidId(id)) return null;
    try {
        const row = await prisma.vacancy.delete({ where: { id: BigInt(id) } });
        return toLegacyVacancy(row);
    } catch (err) {
        if (err.code === 'P2025') return null;
        throw err;
    }
}

module.exports = {
    findAllAnnouncements, createAnnouncement, updateAnnouncementById, deleteAnnouncementById,
    findAllHeroSlides, createHeroSlide, updateHeroSlideById, deleteHeroSlideById,
    findAllVacancies, findOpenVacancies, findVacancyById, createVacancy, updateVacancyById, deleteVacancyById,
};
