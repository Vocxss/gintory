import { z } from "zod";
import {
  dateStringSchema,
  imagePathSchema,
  optionalNullableString,
  optionalNullableUuid,
} from "@/lib/validations/common";

export const restockSchema = z
  .object({
    supplier_id: z.uuid("Supplier tidak valid"),
    order_date: dateStringSchema,
    expected_delivery_date: dateStringSchema,
    notes: optionalNullableString,
    replacement_po_id: optionalNullableUuid,
    items: z
      .array(
        z.object({
          product_id: z.uuid("Produk tidak valid"),
          quantity: z.coerce.number().int().min(1, "Kuantitas minimal 1"),
        }),
      )
      .min(1, "Minimal satu item produk harus dipilih"),
  })
  .refine((value) => value.expected_delivery_date >= value.order_date, {
    message: "Tanggal estimasi tiba tidak boleh sebelum tanggal order",
    path: ["expected_delivery_date"],
  });

export const restockRespondSchema = z
  .object({
    status: z.enum(["Confirmed", "Rejected"]),
    status_reason: optionalNullableString,
  })
  .refine(
    (value) =>
      value.status !== "Rejected" || Boolean(value.status_reason?.trim()),
    {
      message: "Alasan penolakan wajib diisi",
      path: ["status_reason"],
    },
  );

export const restockProofSchema = z.object({
  delivery_proof_url: imagePathSchema,
});

export const restockRefundSchema = z.object({
  refund_reason: z
    .string()
    .trim()
    .min(1, "Alasan klaim refund wajib diisi")
    .max(1000),
});
