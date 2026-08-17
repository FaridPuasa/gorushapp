// Shared Prisma Client singleton for the Postgres/Supabase order-intake path.
// Prisma connects lazily on first query, so requiring this file has no effect
// until something actually calls a Prisma method - safe to import even while
// SUPABASE_ORDER_INTAKE_ENABLED=false.
const { PrismaClient } = require('@prisma/client');

const prisma = global.__prisma || new PrismaClient();

// Reuse the same instance across nodemon dev restarts instead of opening a
// fresh connection pool each time the module cache is cleared.
if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
}

module.exports = prisma;
