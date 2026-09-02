// Promotes existing gorushapp accounts (registered normally as 'customer')
// to a staff role. There's no admin UI for this yet - run manually whenever
// a new email list comes in:
//   node scripts/setUserRoles.js jpmc alice@jpmc.gov.bn bob@jpmc.gov.bn
// Every email listed must already have registered a normal account first -
// this only changes `role` on an existing doc, it doesn't create accounts.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const VALID_ROLES = ['customer', 'admin', 'jpmc'];

async function run() {
    const [role, ...emails] = process.argv.slice(2);
    if (!role || !VALID_ROLES.includes(role) || emails.length === 0) {
        console.error(`Usage: node scripts/setUserRoles.js <${VALID_ROLES.join('|')}> <email> [email...]`);
        process.exit(1);
    }

    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error('MONGO_URI is missing from your .env file.');
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log(`Connected. Setting role='${role}' for ${emails.length} account(s)...`);

    let updated = 0;
    for (const email of emails) {
        const result = await User.updateOne({ email: email.trim().toLowerCase() }, { $set: { role } });
        if (result.matchedCount === 0) {
            console.warn(`  no account found for ${email} - skipped (they must register first)`);
        } else {
            updated += 1;
        }
    }

    console.log(`Done. Updated ${updated}/${emails.length} account(s).`);
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error('setUserRoles failed:', err);
    process.exit(1);
});
