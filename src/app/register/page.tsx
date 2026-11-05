import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { authOptions } from "@/../auth";

export const metadata: Metadata = { title: "Create your account" };
export const instant = false;

export default async function RegisterPage() {
  await connection();
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return <AuthShell title="Start your journey." description="Create an account to make your IELTS preparation personal."><RegisterForm /></AuthShell>;
}
