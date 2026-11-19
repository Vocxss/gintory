import { z } from "zod";

const productFields = {
  sku: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(150),
  category_id: z.uuid(),
  description: z.string().trim().min(1),
  buy_price: z.number().finite().min(0),
  sell_price: z.number().finite().min(0),
  min_stock: z.number().int().min(0),
  low_stock: z.number().int().min(0),
  current_stock: z.number().int().min(0),
  unit: z.string().trim().min(1).max(20),
  rack_location: z.string().trim().min(1).max(50),
  image_url: z.string().trim().min(1),
};

export const productSchema = z
  .object(productFields)
  .refine((value) => value.low_stock > value.min_stock, {
    message: "low_stock harus lebih besar dari min_stock",
    path: ["low_stock"],
  });

export const productUpdateSchema = z
  .object(productFields)
  .partial()
  .extend({ sku: z.string().trim().min(1).max(50).optional() });
