import { z } from "zod";

const itemSchema = z.object({
  product_id: z.uuid(),
  quantity: z.number().int().positive(),
});

export const incomingTransactionSchema = z.object({
  transaction_date: z.iso.date(),
  restock_order_id: z.uuid().nullable().optional(),
  supplier_id: z.uuid().optional(),
  notes: z.string().trim().optional(),
  items: z.array(itemSchema).optional(),
});

export const outgoingTransactionSchema = z.object({
  transaction_date: z.iso.date(),
  customer_name: z.string().trim().min(1).max(150),
  notes: z.string().trim().optional(),
  items: z.array(itemSchema).min(1),
});

export const transactionUpdateSchema = z.object({
  notes: z.string().trim().optional(),
  items: z.array(itemSchema).min(1).optional(),
});

export const transactionReviewSchema = z
  .object({
    action: z.enum(["Approved", "Rejected"]),
    rejection_reason: z.string().trim().optional(),
  })
  .refine(
    (value) =>
      value.action !== "Rejected" || Boolean(value.rejection_reason),
    {
      message: "Alasan penolakan wajib diisi",
      path: ["rejection_reason"],
    },
  );
