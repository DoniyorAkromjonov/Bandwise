import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from "@/lib/password-reset-email";
import { passwordResetRequestSchema } from "@/lib/validations/auth";

const genericResponse = {
  message: "If an account exists and email delivery is available, a password reset link will arrive shortly.",
};

export async function POST(request: Request) {
  const parsed = passwordResetRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!isPasswordResetEmailConfigured()) {
    console.error("Password recovery is unavailable because SMTP settings or NEXTAUTH_URL are missing.");
    return Response.json({ error: "Password recovery is not available yet. Please contact support." }, { status: 503 });
  }

  const now = new Date();
  const email = parsed.data.email.toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) return Response.json(genericResponse, { status: 202 });

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    });
    const recentRequests = await prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) } },
    });
    if (recentRequests >= 3) return Response.json(genericResponse, { status: 202 });

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + 30 * 60 * 1000) },
      });
    });

    const appUrl = process.env.NEXTAUTH_URL;
    if (!appUrl) throw new Error("NEXTAUTH_URL is not configured.");
    const resetUrl = new URL("/reset-password", appUrl);
    resetUrl.searchParams.set("token", token);
    try {
      await sendPasswordResetEmail(user.email, resetUrl.toString());
    } catch (error) {
      await prisma.passwordResetToken.update({ where: { tokenHash }, data: { consumedAt: new Date() } });
      console.error("Password reset email delivery failed", error);
    }
    return Response.json(genericResponse, { status: 202 });
  } catch (error) {
    console.error("Password reset request failed", error);
    return Response.json({ error: "Password recovery could not be started. Please try again later." }, { status: 500 });
  }
}
