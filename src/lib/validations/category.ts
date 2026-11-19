import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1),
  image_url: z.string().trim().min(1),
});

export const categoryUpdateSchema = categorySchema.partial();
