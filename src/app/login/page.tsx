import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { authOptions } from "@/../auth";

export const metadata: Metadata = { title: "Log in" };
export const instant = false;

export default async function LoginPage() {
  await connection();
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return <AuthShell title="Welcome back." description="Log in to continue your IELTS preparation."><LoginForm /></AuthShell>;
}
