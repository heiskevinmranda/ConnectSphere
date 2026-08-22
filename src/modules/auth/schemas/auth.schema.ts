import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").max(254),
  password: z.string().min(1, "Password is required").max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z
    .string()
    .min(10, "New password must be at least 10 characters")
    .max(128)
    .regex(/[A-Z]/, "New password must contain an uppercase letter")
    .regex(/[a-z]/, "New password must contain a lowercase letter")
    .regex(/[0-9]/, "New password must contain a number"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
