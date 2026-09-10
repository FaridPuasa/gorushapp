// Two-tier gate, both off by default, mirroring grfmxstatusupdate's own
// SUPABASE_ENABLED + SUPABASE_DUAL_WRITE_COLLECTIONS pattern - one boolean
// per feature being migrated off Mongo, all sharing the same master switch:
//   SUPABASE_ENABLED               - master switch.
//   SUPABASE_ORDER_INTAKE_ENABLED  - order intake (live since 2026-08-28).
//   SUPABASE_WARGA_EMAS_ENABLED    - Warga Emas form submissions.
//   SUPABASE_CMS_ENABLED           - Announcement/Vacancy/HeroSlide admin CMS.
//
// The order-intake flag had a hard blocker (grfmxstatusupdate's Phase 7 read
// cutover had to complete first, since that app read exclusively from Mongo
// until then) - that phase is now done (2026-08-31), so no such blocker
// applies to flags added after it. Still, ask before flipping any of these
// in production - each is a real behavior change, not a no-op toggle.
function isPostgresOrderIntakeEnabled() {
    return process.env.SUPABASE_ENABLED === 'true'
        && process.env.SUPABASE_ORDER_INTAKE_ENABLED === 'true';
}

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

// PricingRule/PublicHoliday get their OWN flag, deliberately not folded into
// SUPABASE_CMS_ENABLED - grfmxstatusupdate reads these two directly
// (GorushPricingRule/GorushPublicHoliday), so their eventual read-cutover
// needs independent control from the other 3 CMS collections, which have no
// other reader at all.
function isPricingHolidayDualWriteEnabled() {
    return process.env.SUPABASE_ENABLED === 'true'
        && process.env.SUPABASE_PRICING_HOLIDAY_ENABLED === 'true';
}

module.exports = {
    isPostgresOrderIntakeEnabled,
    isPostgresWargaEmasEnabled,
    isCmsDualWriteEnabled,
    isPricingHolidayDualWriteEnabled,
};
