import { z } from "zod";
import { imagePathSchema } from "@/lib/validations/common";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(100),
  description: z.string().trim().min(1, "Deskripsi wajib diisi"),
  image_url: imagePathSchema,
});

export const categoryUpdateSchema = categorySchema.partial();
