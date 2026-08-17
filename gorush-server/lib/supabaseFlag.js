// Two-tier gate, both off by default, mirroring grfmxstatusupdate's own
// SUPABASE_ENABLED + SUPABASE_DUAL_WRITE_COLLECTIONS pattern. This app only
// ever has one thing to gate (order intake), so a single boolean plays the
// role grfmxstatusupdate's per-collection list plays there:
//   SUPABASE_ENABLED               - master switch.
//   SUPABASE_ORDER_INTAKE_ENABLED  - this specific feature.
//
// HARD BLOCKER: do not set both true in any deployed environment until
// grfmxstatusupdate's own Phase 7 (read cutover) is complete - see
// HANDOFF_SUPABASE_ORDER_INTAKE.md. Ask before flipping this in production.
function isPostgresOrderIntakeEnabled() {
    return process.env.SUPABASE_ENABLED === 'true'
        && process.env.SUPABASE_ORDER_INTAKE_ENABLED === 'true';
}

module.exports = { isPostgresOrderIntakeEnabled };
