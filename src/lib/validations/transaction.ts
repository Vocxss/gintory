import { z } from "zod";
import {
  getTodayDateString,
  PAST_TRANSACTION_DATE_MESSAGE,
} from "@/lib/utils/date";
import {
  dateStringSchema,
  imagePathSchema,
  optionalNullableString,
  optionalNullableUuid,
  uuidSchema,
} from "@/lib/validations/common";

const newTransactionDateSchema = dateStringSchema.refine(
  (value) => value >= getTodayDateString(),
  PAST_TRANSACTION_DATE_MESSAGE,
);

const incomingItemSchema = z.object({
  product_id: uuidSchema("Produk tidak valid"),
  quantity: z.coerce.number().int().min(0, "Kuantitas tidak boleh negatif"),
});

const outgoingItemSchema = z.object({
  product_id: uuidSchema("Produk tidak valid"),
  quantity: z.coerce.number().int().min(1, "Kuantitas minimal 1"),
});

export const incomingTransactionSchema = z.object({
  transaction_date: newTransactionDateSchema,
  restock_order_id: optionalNullableUuid,
  supplier_id: optionalNullableUuid,
  notes: optionalNullableString,
  proof_image_url: imagePathSchema,
  items: z.array(incomingItemSchema).min(1).optional(),
});

export const outgoingTransactionSchema = z.object({
  transaction_date: newTransactionDateSchema,
  customer_name: z.string().trim().min(1, "Nama tujuan wajib diisi").max(150),
  notes: optionalNullableString,
  items: z
    .array(outgoingItemSchema)
    .min(1, "Minimal satu item produk harus dipilih"),
});

export const transactionUpdateSchema = z.object({
  transaction_date: dateStringSchema.optional(),
  customer_name: z.string().trim().min(1).max(150).optional(),
  notes: optionalNullableString,
  proof_image_url: z.preprocess(
    (val) => (val === "" ? undefined : val),
    imagePathSchema.optional(),
  ),
  items: z.array(incomingItemSchema).min(1).optional(),
});

export const transactionReviewSchema = z
  .object({
    action: z.enum(["Approved", "Rejected"]),
    rejection_reason: optionalNullableString,
  })
  .refine(
    (value) =>
      value.action !== "Rejected" || Boolean(value.rejection_reason?.trim()),
    {
      message: "Alasan penolakan wajib diisi",
      path: ["rejection_reason"],
    },
  );
