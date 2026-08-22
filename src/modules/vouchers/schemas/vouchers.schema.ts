import { z } from "zod";

export const voucherUploadSchema = z.object({
  vouchers: z
    .array(
      z.union([
        z.string().regex(/^\d{10}$/, "Each voucher code must be exactly 10 digits"),
        z.object({
          code: z
            .string()
            .regex(/^\d{10}$/, "Each voucher code must be exactly 10 digits"),
          price: z
            .number()
            .int("Price must be an integer")
            .positive("Price must be positive"),
        }),
      ])
    )
    .min(1, "At least one voucher is required")
    .max(10000, "Cannot upload more than 10,000 vouchers at once"),
});

export const voucherGenerateSchema = z.object({
  count: z
    .number({ message: "Count must be a number" })
    .int("Count must be a whole number")
    .min(1, "Count must be at least 1")
    .max(5000, "Cannot generate more than 5,000 vouchers at once"),
  price: z
    .number({ message: "Price must be a number" })
    .int("Price must be an integer")
    .positive("Price must be positive"),
});

export const voucherListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["all", "available", "used"]).default("all"),
  price: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(20).optional(),
});

export const voucherExportQuerySchema = z.object({
  status: z.enum(["all", "available", "used"]).default("all"),
  price: z.coerce.number().int().positive().optional(),
});

export type VoucherUploadInput = z.infer<typeof voucherUploadSchema>;
export type VoucherGenerateInput = z.infer<typeof voucherGenerateSchema>;
export type VoucherListQuery = z.infer<typeof voucherListQuerySchema>;
export type VoucherExportQuery = z.infer<typeof voucherExportQuerySchema>;
