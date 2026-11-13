"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordResetSchema, type PasswordResetInput } from "@/lib/validations/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: PasswordResetInput) {
    setMessage("");
    setRequestError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Your password could not be updated.");
      setMessage(data.message);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Your password could not be updated.");
    }
  }

  if (!token) return <div className="space-y-4"><p role="alert" className="text-sm text-destructive">This reset link is incomplete. Request a new one to continue.</p><Link href="/forgot-password" className="inline-flex min-h-11 items-center font-semibold text-secondary-foreground hover:underline">Request a reset link</Link></div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <input type="hidden" {...register("token")} />
      {message && <div role="status" className="rounded-xl border border-primary/20 bg-secondary px-4 py-3 text-sm leading-5"><p>{message}</p><Link href="/login" className="mt-2 inline-block font-semibold underline">Log in</Link></div>}
      {requestError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-5 text-destructive">{requestError}</p>}
      <div className="space-y-2"><Label htmlFor="password" className="text-sm text-foreground">New password</Label><Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby="password-hint" {...register("password")} className="h-12 rounded-xl px-3.5" /><p id="password-hint" className="text-xs leading-5 text-muted-foreground">At least 10 characters, with uppercase and lowercase letters and a number.</p>{errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="confirmPassword" className="text-sm text-foreground">Confirm new password</Label><Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...register("confirmPassword")} className="h-12 rounded-xl px-3.5" />{errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}</div>
      <Button type="submit" disabled={isSubmitting || Boolean(message)} className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary/90">
        {isSubmitting ? <><LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={17} /> Updating…</> : "Update password"}
      </Button>
    </form>
  );
}
