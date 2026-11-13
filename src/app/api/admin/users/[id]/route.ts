import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { denied, requireAdmin } from "@/lib/admin";
import { adminUserSelect } from "@/lib/admin-users";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validations/auth";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema.transform((email) => email.toLowerCase()),
  role: z.enum(["USER", "ADMIN"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);

  const { id } = await params;
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  if (id === admin.id && parsed.data.role !== "ADMIN") {
    return Response.json({ error: "You cannot remove your own administrator role." }, { status: 409 });
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({ where: { id: admin.id }, select: { role: true } });
      if (actor?.role !== "ADMIN") return null;
      const previous = await tx.user.findUniqueOrThrow({ where: { id }, select: { email: true } });
      if (previous.email !== parsed.data.email) {
        await tx.passwordResetToken.deleteMany({ where: { userId: id } });
      }
      return tx.user.update({ where: { id }, data: parsed.data, select: adminUserSelect });
    }, { isolationLevel: "Serializable" });
    if (!user) return denied(403);
    return Response.json({ user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return Response.json({ error: "This email is already in use." }, { status: 409 });
      if (error.code === "P2025") return Response.json({ error: "User not found." }, { status: 404 });
      if (error.code === "P2034") return Response.json({ error: "The account changed during this edit. Try again." }, { status: 409 });
    }
    throw error;
  }
}
