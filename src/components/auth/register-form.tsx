"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import { registerUser } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setFormError("");
    const result = await registerUser(values);
    if (!result.ok) {
      setFormError(result.message);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0] && ["name", "email", "password", "confirmPassword"].includes(field)) {
          setError(field as keyof RegisterInput, { type: "server", message: messages[0] });
        }
      }
      return;
    }

    let login;
    try {
      login = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: "/dashboard",
      });
    } catch {
      setFormError("Your account is ready, but sign-in is temporarily unavailable. Please log in shortly.");
      return;
    }
    if (!login || login.error) {
      setFormError("Your account is ready, but we couldn't sign you in automatically. Please log in.");
      return;
    }
    router.replace(login.url ?? "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <p role="alert" className="rounded-xl border border-[#F2C5CB] bg-[#FFF5F6] px-4 py-3 text-sm leading-5 text-[#A42839]">{formError}</p>}
      <Field label="Name" id="name" error={errors.name?.message}>
        <Input id="name" type="text" autoComplete="name" maxLength={80} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} {...register("name")} className="h-12 rounded-xl px-3.5" />
      </Field>
      <Field label="Email address" id="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} className="h-12 rounded-xl px-3.5" />
      </Field>
      <Field label="Password" id="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-hint password-error" : "password-hint"} {...register("password")} className="h-12 rounded-xl px-3.5" />
        <p id="password-hint" className="mt-1.5 text-xs leading-5 text-[#77768F]">At least 10 characters, with an uppercase letter, lowercase letter, and number.</p>
      </Field>
      <Field label="Confirm password" id="confirmPassword" error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined} {...register("confirmPassword")} className="h-12 rounded-xl px-3.5" />
      </Field>
      <Button type="submit" disabled={isSubmitting} className="mt-2 h-12 w-full rounded-xl bg-[#7047FF] text-sm font-semibold text-white hover:bg-[#5D35EB]">
        {isSubmitting ? <><LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={17} /> Creating your account…</> : "Create account"}
      </Button>
      <p className="pt-1 text-center text-sm text-[#666580]">Already have an account? <Link href="/login" className="font-semibold text-[#5F45CC] underline decoration-transparent transition hover:decoration-current">Log in</Link></p>
    </form>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm text-[#24213D]">{label}</Label>
      {children}
      {error && <p id={`${id}-error`} className="text-sm text-[#A42839]">{error}</p>}
    </div>
  );
}
