import { z } from "zod";

export const paymentInitiateSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+255\d{9}$/, "Phone number must be in format +255XXXXXXXXX"),
  plan: z.enum(["starter", "basic", "standard", "premium", "elite"]),
  amount: z.number().positive("Amount must be positive"),
});

export type PaymentInitiateInput = z.infer<typeof paymentInitiateSchema>;
