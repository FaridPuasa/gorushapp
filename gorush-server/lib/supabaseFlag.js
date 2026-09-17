// Two-tier gate, both off by default, mirroring grfmxstatusupdate's own
// SUPABASE_ENABLED + SUPABASE_DUAL_WRITE_COLLECTIONS pattern - one boolean
// per feature being migrated off Mongo, all sharing the same master switch:
//   SUPABASE_ENABLED               - master switch.
//   SUPABASE_WARGA_EMAS_ENABLED    - Warga Emas form submissions.
//
// Everything else that used to live here has been fully cut over to
// Postgres-only, in order: Order (2026-09-17, routes/orders.js),
// PricingRule/PublicHoliday (2026-09-17, lib/postgresPricingHoliday.js),
// Announcement/Vacancy/HeroSlide (2026-09-17, lib/postgresContent.js), User
// (2026-09-17, lib/postgresUsers.js), JobApplication (2026-09-16). No flag
// needed for any of these anymore - there's no Mongo path left to gate.
// WargaEmasOrder is the only one still genuinely dual-write, blocked on
// grfmxstatusupdate's own waorders.js read-cutover (see that repo's
// migration memory). Ask before flipping this flag in production - it's a
// real behavior change, not a no-op toggle.
function isPostgresWargaEmasEnabled() {
    return process.env.SUPABASE_ENABLED === 'true'
        && process.env.SUPABASE_WARGA_EMAS_ENABLED === 'true';
}

module.exports = {
    isPostgresWargaEmasEnabled,
};
