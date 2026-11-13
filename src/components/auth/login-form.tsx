"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError("");
    let result;
    try {
      result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: "/dashboard",
      });
    } catch {
      setFormError("Sign-in is temporarily unavailable. Please try again shortly.");
      return;
    }
    if (!result || result.error) {
      setFormError("We couldn't sign you in. Check your email or username and password.");
      return;
    }
    router.replace(result.url ?? "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {formError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-5 text-destructive">{formError}</p>}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-foreground">Email or username</Label>
        <Input id="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Email or username" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} className="h-12 rounded-xl px-3.5" />
        {errors.email && <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3"><Label htmlFor="password" className="text-sm text-foreground">Password</Label><Link href="/forgot-password" className="text-xs font-semibold text-secondary-foreground hover:underline">Forgot password?</Link></div>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} className="h-12 rounded-xl px-3.5" />
        {errors.password && <p id="password-error" className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary/90">
        {isSubmitting ? <><LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={17} /> Signing in…</> : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">New to Bandwise? <Link href="/register" className="font-semibold text-secondary-foreground underline decoration-transparent transition hover:decoration-current">Create an account</Link></p>
    </form>
  );
}
