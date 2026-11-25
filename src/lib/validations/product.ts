import { z } from "zod";
import { imagePathSchema, uuidSchema } from "@/lib/validations/common";

const stockThresholdsRefine = (value: {
  min_stock?: number;
  low_stock?: number;
}) =>
  value.min_stock === undefined ||
  value.low_stock === undefined ||
  value.low_stock > value.min_stock;

const stockThresholdsMessage = {
  message: "low_stock harus lebih besar dari min_stock",
  path: ["low_stock"],
};

const productFields = {
  sku: z.string().trim().min(1, "SKU wajib diisi").max(50),
  name: z.string().trim().min(1, "Nama produk wajib diisi").max(150),
  category_id: uuidSchema("Kategori tidak valid"),
  supplier_id: uuidSchema("Supplier tidak valid"),
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
  .refine(stockThresholdsRefine, stockThresholdsMessage);

export const adminUpdateProductSchema = z
  .object({
    name: productFields.name.optional(),
    category_id: productFields.category_id.optional(),
    supplier_id: productFields.supplier_id.optional(),
    description: productFields.description.optional(),
    buy_price: productFields.buy_price.optional(),
    sell_price: productFields.sell_price.optional(),
    min_stock: productFields.min_stock.optional(),
    low_stock: productFields.low_stock.optional(),
    unit: productFields.unit.optional(),
    rack_location: productFields.rack_location.optional(),
    image_url: productFields.image_url.optional(),
  })
  .strict()
  .refine(stockThresholdsRefine, stockThresholdsMessage);

export const managerUpdateProductSchema = z
  .object({
    rack_location: productFields.rack_location.optional(),
    min_stock: productFields.min_stock.optional(),
    low_stock: productFields.low_stock.optional(),
    unit: productFields.unit.optional(),
    description: productFields.description.optional(),
    image_url: productFields.image_url.optional(),
  })
  .strict()
  .refine(stockThresholdsRefine, stockThresholdsMessage);
