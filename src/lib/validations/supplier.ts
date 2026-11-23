import { z } from "zod";
import { optionalNullableString } from "@/lib/validations/common";

export const supplierStatusSchema = z
  .object({
    supplier_status: z.enum(["Approved", "Rejected"]),
    rejection_reason: optionalNullableString,
  })
  .refine(
    (value) =>
      value.supplier_status !== "Rejected" ||
      Boolean(value.rejection_reason?.trim()),
    {
      message: "Alasan penolakan wajib diisi",
      path: ["rejection_reason"],
    },
  );
