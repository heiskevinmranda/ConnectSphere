import { z } from "zod";

export const voucherUploadSchema = z.object({
  vouchers: z
    .array(
      z.union([
        z.string().regex(/^\d{10}$/, "Voucher code must be 10 digits"),
        z.object({
          code: z.string().regex(/^\d{10}$/, "Voucher code must be 10 digits"),
          price: z.number().refine(
            (val) => [1000, 2000, 5000, 10000, 20000].includes(val),
            "Invalid price tier"
          ),
        }),
      ])
    )
    .min(1, "At least one voucher is required")
    .max(10000, "Cannot upload more than 10,000 vouchers at once"),
});

export const voucherGenerateSchema = z.object({
  count: z
    .number()
    .int()
    .min(1, "Count must be at least 1")
    .max(5000, "Cannot generate more than 5,000 vouchers at once"),
  price: z.number().refine(
    (val) => [1000, 2000, 5000, 10000, 20000].includes(val),
    "Invalid price tier"
  ),
});

export type VoucherUploadInput = z.infer<typeof voucherUploadSchema>;
export type VoucherGenerateInput = z.infer<typeof voucherGenerateSchema>;
