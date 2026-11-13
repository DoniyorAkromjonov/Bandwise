import { z } from "zod";
import { adminAccountEmail, adminLogin } from "@/lib/admin-login";

export const emailSchema = z.string().trim().email("Enter a valid email address.").max(254);
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
    email: emailSchema.refine((email) => email.toLowerCase() !== adminAccountEmail, "Enter your own email address."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  email: z.union([emailSchema, z.literal(adminLogin)], { error: "Enter a valid email address or username." }),
  password: z.string().min(1, "Enter your password.").max(128),
});

export const passwordResetRequestSchema = z.object({ email: emailSchema });
export const passwordResetSchema = z.object({
  token: z.string().min(32).max(128),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
