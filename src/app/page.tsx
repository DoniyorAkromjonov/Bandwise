import { LandingPage } from "@/components/landing/landing-page";
import { getServerSession } from "next-auth";
import { connection } from "next/server";
import { authOptions } from "@/../auth";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function HomePage() {
  await connection();
  const session = await getServerSession(authOptions);
  const profileName = session?.user?.id ? session.user.name?.trim() || "Profile" : null;
  const account = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    : null;
  return <LandingPage profileName={profileName} isAdmin={account?.role === "ADMIN"} />;
}
