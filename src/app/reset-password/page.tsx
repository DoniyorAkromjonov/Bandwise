import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

async function ResetPasswordContent({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ""} />;
}

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return (
    <AuthShell title="Choose a new password." description="Use a strong password that you have not used here before.">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Preparing your secure reset form...</p>}>
        <ResetPasswordContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
