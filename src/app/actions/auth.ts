"use server";

import { hash } from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

export type RegisterResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export async function registerUser(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const email = parsed.data.email.toLowerCase();
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return {
        ok: false,
        message: "An account with this email already exists.",
        fieldErrors: { email: ["This email is already registered. Try logging in."] },
      };
    }

    const passwordHash = await hash(parsed.data.password, 12);
    await prisma.user.create({
      data: { name: parsed.data.name, email, passwordHash },
    });
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "An account with this email already exists.",
        fieldErrors: { email: ["This email is already registered. Try logging in."] },
      };
    }

    return {
      ok: false,
      message: "We couldn't create your account right now. Please try again shortly.",
    };
  }
}
