import { z } from "zod";

export const restockSchema = z.object({
  supplier_id: z.uuid(),
  order_date: z.iso.date(),
  expected_delivery_date: z.iso.date(),
  notes: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        product_id: z.uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
}).refine(
  (value) => value.expected_delivery_date >= value.order_date,
  {
    message: "Tanggal pengiriman tidak boleh sebelum tanggal order",
    path: ["expected_delivery_date"],
  },
);

export const restockRespondSchema = z
  .object({
    status: z.enum(["Confirmed", "Rejected"]),
    status_reason: z.string().trim().optional(),
  })
  .refine(
    (value) => value.status !== "Rejected" || Boolean(value.status_reason),
    {
      message: "Alasan penolakan wajib diisi",
      path: ["status_reason"],
    },
  );

export const restockStatusSchema = z.object({
  status: z.enum(["In Transit", "Received"]),
});
