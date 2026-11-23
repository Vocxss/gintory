import { z } from "zod";
import { imagePathSchema } from "@/lib/validations/common";

const productFields = {
  sku: z.string().trim().min(1, "SKU wajib diisi").max(50),
  name: z.string().trim().min(1, "Nama produk wajib diisi").max(150),
  category_id: z.uuid("Kategori tidak valid"),
  supplier_id: z.uuid("Supplier tidak valid"),
  description: z.string().trim().min(1, "Deskripsi wajib diisi"),
  buy_price: z.coerce.number().finite().min(0, "Harga beli minimal 0"),
  sell_price: z.coerce.number().finite().min(0, "Harga jual minimal 0"),
  min_stock: z.coerce.number().int().min(0, "Stok minimum minimal 0"),
  low_stock: z.coerce.number().int().min(1, "Batas stok rendah minimal 1"),
  current_stock: z.coerce.number().int().min(0, "Stok saat ini minimal 0"),
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(20),
  rack_location: z.string().trim().min(1, "Lokasi rak wajib diisi").max(50),
  image_url: imagePathSchema,
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
