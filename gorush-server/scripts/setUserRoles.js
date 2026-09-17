// Promotes existing gorushapp accounts (registered normally as 'customer')
// to a staff role. There's no admin UI for this yet - run manually whenever
// a new email list comes in:
//   node scripts/setUserRoles.js jpmc alice@jpmc.gov.bn bob@jpmc.gov.bn
// Every email listed must already have registered a normal account first -
// this only changes `role` on an existing row, it doesn't create accounts.
//
// Postgres-only (2026-09-17 full cutover) - no more Mongo involved at all.
require('dotenv').config();
const users = require('../lib/postgresUsers');
const prisma = require('../lib/prismaClient');

const VALID_ROLES = ['customer', 'admin', 'jpmc'];

async function run() {
    const [role, ...emails] = process.argv.slice(2);
    if (!role || !VALID_ROLES.includes(role) || emails.length === 0) {
        console.error(`Usage: node scripts/setUserRoles.js <${VALID_ROLES.join('|')}> <email> [email...]`);
        process.exit(1);
    }

    console.log(`Setting role='${role}' for ${emails.length} account(s)...`);

    let updated = 0;
    for (const email of emails) {
        const user = await users.findByEmail(email.trim().toLowerCase());
        if (!user) {
            console.warn(`  no account found for ${email} - skipped (they must register first)`);
            continue;
        }
        await prisma.user.update({ where: { id: BigInt(user._id) }, data: { role } });
        updated += 1;
    }

    console.log(`Done. Updated ${updated}/${emails.length} account(s).`);
    await prisma.$disconnect();
}

run().catch((err) => {
    console.error('setUserRoles failed:', err);
    process.exit(1);
});
