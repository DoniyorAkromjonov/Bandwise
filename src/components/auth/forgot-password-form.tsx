"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordResetRequestSchema } from "@/lib/validations/auth";

type FormValues = { email: string };

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    setMessage("");
    setRequestError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Password recovery could not be started.");
      setMessage(data.message);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Password recovery could not be started.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {message && <p role="status" className="rounded-xl border border-primary/20 bg-secondary px-4 py-3 text-sm leading-5">{message}</p>}
      {requestError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-5 text-destructive">{requestError}</p>}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-foreground">Email address</Label>
        <Input id="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} className="h-12 rounded-xl px-3.5" />
        {errors.email && <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary/90">
        {isSubmitting ? <><LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={17} /> Sending…</> : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground"><Link href="/login" className="font-semibold text-secondary-foreground hover:underline">Back to log in</Link></p>
    </form>
  );
}
