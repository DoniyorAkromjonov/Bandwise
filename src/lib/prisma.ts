import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL must be set before the application can connect to PostgreSQL.");

const adapter = new PrismaPg({ connectionString: databaseUrl });

const cached = globalForPrisma.prisma;
// Next.js can retain a client from before the schema was regenerated.
export const prisma = cached?.exercise ? cached : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
