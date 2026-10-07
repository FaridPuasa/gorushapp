// One-off creation of the 3 external-partner portal accounts (pdu/mglobal/ewe).
// Unlike jpmc's accounts, these were never self-registered through
// POST /api/auth/register first (that flow requires full address/personal-
// detail fields these partners have no use for), so this inserts the
// `website_users` row directly instead of going through setUserRoles.js
// (which only promotes an EXISTING registered row).
//
// Run manually once:
//   node scripts/createPartnerAccounts.js
//
// Safe to re-run - skips any email that already has an account.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prismaClient');

const ACCOUNTS = [
    { email: 'huangyanchao@sypost.com', password: 'pdu1234!', role: 'pdu' },
    { email: 'kelvin.corpuz@morninglobal.com', password: 'mglobal1234!', role: 'mglobal' },
    { email: 'tech@baaship.com', password: 'ewe1234!', role: 'ewe' },
];

async function run() {
    for (const { email, password, role } of ACCOUNTS) {
        const existing = await prisma.user.findFirst({ where: { email } });
        if (existing) {
            console.log(`  ${email} already exists (role=${existing.role}) - skipped.`);
            continue;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                agreePolicy: true,
                receiveMarketing: false,
                createdAt: new Date(),
            },
        });
        console.log(`  Created ${email} with role='${role}'.`);
    }

    await prisma.$disconnect();
}

run().catch((err) => {
    console.error('createPartnerAccounts failed:', err);
    process.exit(1);
});
