import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Set ADMIN_EMAIL to the email address of an existing account.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL must be set before promoting an administrator.");
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });
  try {
    const result = await prisma.user.updateMany({ where: { email }, data: { role: "ADMIN" } });
    if (!result.count) throw new Error("No existing account has that email address. Register it first.");
    console.log("Administrator role granted.");
  } finally {
    await prisma.$disconnect();
  }
}
void main();
