import { z } from "zod";

export const supplierStatusSchema = z.object({
  supplier_status: z.enum(["Approved", "Rejected"]),
});
