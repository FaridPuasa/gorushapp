// One-time backfill for the User dual-write (2026-09-16) - copies every
// existing Mongo `grusers` document into the Postgres mirror tables. Needed
// because dual-write only fires on NEW saves; ~107 accounts already existed
// before this flag was ever turned on, and would otherwise only get mirrored
// lazily, one at a time, whenever that specific user happens to save again
// (see the lesson in the Announcement/HeroSlide backfill incident - always
// backfill immediately alongside a new dual-write, never assume "it'll fill
// in eventually" is good enough).
//
// Safe to re-run - dualWriteUserSync() upserts by mongoId and fully replaces
// child rows each time, so running this twice just re-syncs the same data.
//
// Usage: node scripts/backfillUsersToPostgres.js
// Requires SUPABASE_ENABLED=true and SUPABASE_USER_ENABLED=true in the
// environment it runs in (same flags the live dual-write hook checks) -
// intentionally does not force them on, so this can't silently backfill
// against a database nobody meant to enable yet.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { dualWriteUserSync } = require('../lib/userDualWrite');
const { isUserDualWriteEnabled } = require('../lib/supabaseFlag');
const prisma = require('../lib/prismaClient');

async function run() {
    if (!isUserDualWriteEnabled()) {
        console.error('SUPABASE_ENABLED/SUPABASE_USER_ENABLED are not both \'true\' in this environment - refusing to run. Set them first (same flags the live dual-write hook checks).');
        process.exit(1);
    }

    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error('MONGO_URI is missing from your .env file.');
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    const users = await User.find({});
    console.log(`Connected. Backfilling ${users.length} user(s) to Postgres...`);

    let ok = 0;
    let failed = 0;
    for (const user of users) {
        try {
            await dualWriteUserSync(user);
            ok += 1;
        } catch (err) {
            failed += 1;
            console.error(`  failed for ${user.email} (${user._id}):`, err.message);
        }
    }

    console.log(`Done. ${ok}/${users.length} synced, ${failed} failed.`);
    await mongoose.disconnect();
    await prisma.$disconnect();
}

run().catch((err) => {
    console.error('backfillUsersToPostgres failed:', err);
    process.exit(1);
});
