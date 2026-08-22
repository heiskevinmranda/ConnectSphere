import { z } from "zod";

export const paymentInitiateSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+255\d{9}$/, "Phone number must be in format +255XXXXXXXXX"),
  plan: z.string().min(1).max(64),
});

export const webhookEventSchema = z.object({
  transId: z.string().min(1).max(128).optional(),
  externalId: z.string().min(1).max(128).optional(),
  reference: z.string().min(1).max(128).optional(),
  status: z.enum(["SUCCESSFUL", "FAILED"]),
});

export type PaymentInitiateInput = z.infer<typeof paymentInitiateSchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
