// Two-tier gate, both off by default, mirroring grfmxstatusupdate's own
// SUPABASE_ENABLED + SUPABASE_DUAL_WRITE_COLLECTIONS pattern - one boolean
// per feature being migrated off Mongo, all sharing the same master switch:
//   SUPABASE_ENABLED               - master switch.
//   SUPABASE_WARGA_EMAS_ENABLED    - Warga Emas form submissions.
//   SUPABASE_CMS_ENABLED           - Announcement/Vacancy/HeroSlide admin CMS.
//
// Order was dual-write here (flag SUPABASE_ORDER_INTAKE_ENABLED, live since
// 2026-08-28) before being fully cut over to Postgres-only 2026-09-17 (see
// routes/orders.js) - no flag needed anymore, there's no Mongo path left to
// gate. Ask before flipping any of the remaining flags in production - each
// is a real behavior change, not a no-op toggle.

function isPostgresWargaEmasEnabled() {
    return process.env.SUPABASE_ENABLED === 'true'
        && process.env.SUPABASE_WARGA_EMAS_ENABLED === 'true';
}

// Announcement/Vacancy/HeroSlide are grouped under one shared flag rather
// than one each - all 3 are simple admin-managed CMS content, deployed
// together, with no other app reading them (unlike Warga Emas/PricingRule/
// PublicHoliday, which grfmxstatusupdate mirrors and so need independent
// per-collection control).
function isCmsDualWriteEnabled() {
    return process.env.SUPABASE_ENABLED === 'true'
        && process.env.SUPABASE_CMS_ENABLED === 'true';
}

// PricingRule/PublicHoliday were dual-write here (flag
// SUPABASE_PRICING_HOLIDAY_ENABLED, kept separate from SUPABASE_CMS_ENABLED
// since grfmxstatusupdate reads these two directly) before being fully cut
// over to Postgres-only 2026-09-17 (see lib/postgresPricingHoliday.js) - no
// flag needed anymore, there's no Mongo path left to gate.

// User was dual-write here (2026-09-16, flag SUPABASE_USER_ENABLED) before
// being fully cut over to Postgres-only the next day (2026-09-17, see
// lib/postgresUsers.js) - no flag needed anymore, there's no Mongo path left
// to gate.

module.exports = {
    isPostgresWargaEmasEnabled,
    isCmsDualWriteEnabled,
};
