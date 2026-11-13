import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { passwordResetSchema } from "@/lib/validations/auth";

class InvalidResetTokenError extends Error {}

export async function POST(request: Request) {
  const parsed = passwordResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the reset link and password requirements." }, { status: 400 });

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const now = new Date();
  let token;
  try {
    token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });
  } catch (error) {
    console.error("Password reset token lookup failed", error);
    return Response.json({ error: "Password recovery is temporarily unavailable." }, { status: 500 });
  }
  if (!token || token.consumedAt || token.expiresAt <= now) {
    return Response.json({ error: "This password reset link is invalid or has expired. Request a new one." }, { status: 400 });
  }

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, tokenHash, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw new InvalidResetTokenError("Reset token was already consumed.");
      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: token.userId, id: { not: token.id }, consumedAt: null },
        data: { consumedAt: now },
      });
    });
    return Response.json({ message: "Your password has been updated. You can now sign in." });
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      return Response.json({ error: "This password reset link is invalid or has expired. Request a new one." }, { status: 400 });
    }
    console.error("Password reset failed", error);
    return Response.json({ error: "Your password could not be updated. Please try again." }, { status: 500 });
  }
}
