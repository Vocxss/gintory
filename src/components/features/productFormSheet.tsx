"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ImageUploadField } from "@/components/features/imageUploadField";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { imagePathSchema, uuidSchema } from "@/lib/validations/common";

export type ProductItem = {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  category_name: string;
  supplier_id: string;
  supplier_company: string | null;
  description: string;
  buy_price: string | number;
  sell_price: string | number;
  min_stock: number;
  low_stock: number;
  current_stock: number;
  unit: string;
  rack_location: string;
  image_url: string;
  stock_status: string;
};

type OptionItem = { id: string; name: string };

const formSchema = z
  .object({
    sku: z.string().trim().min(1, "SKU wajib diisi").max(50),
    name: z.string().trim().min(1, "Nama produk wajib diisi").max(150),
    category_id: uuidSchema("Pilih kategori"),
    supplier_id: uuidSchema("Pilih supplier"),
    description: z.string().trim().min(1, "Deskripsi wajib diisi"),
    buy_price: z.number().min(0, "Harga beli minimal 0"),
    sell_price: z.number().min(0, "Harga jual minimal 0"),
    min_stock: z.number().int().min(0),
    low_stock: z.number().int().min(1),
    current_stock: z.number().int().min(0),
    unit: z.string().trim().min(1, "Satuan wajib diisi").max(20),
    rack_location: z.string().trim().min(1, "Lokasi rak wajib diisi").max(50),
    image_url: imagePathSchema,
  })
  .refine((value) => value.low_stock > value.min_stock, {
    message: "Batas stok rendah harus lebih besar dari stok minimum",
    path: ["low_stock"],
  });

export type ProductFormValues = z.infer<typeof formSchema>;

const emptyValues: ProductFormValues = {
  sku: "",
  name: "",
  category_id: "",
  supplier_id: "",
  description: "",
  buy_price: 0,
  sell_price: 0,
  min_stock: 0,
  low_stock: 1,
  current_stock: 0,
  unit: "pcs",
  rack_location: "",
  image_url: "",
};

const numberFields = [
  { name: "buy_price", label: "Harga beli", commercial: true },
  { name: "sell_price", label: "Harga jual", commercial: true },
  { name: "min_stock", label: "Stok minimum", commercial: false },
  { name: "low_stock", label: "Batas stok rendah", commercial: false },
  { name: "current_stock", label: "Stok saat ini", commercial: false },
] as const;

export function ProductFormSheet({
  accessRole,
  open,
  editing,
  categories,
  suppliers,
  isPending,
  errorMessage,
  onOpenChange,
  onSubmit,
}: {
  accessRole: "admin" | "manager";
  open: boolean;
  editing: ProductItem | null;
  categories: OptionItem[];
  suppliers: OptionItem[];
  isPending: boolean;
  errorMessage?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductFormValues) => void;
}) {
  const isEditing = Boolean(editing);
  const isManager = accessRole === "manager" && isEditing;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues,
  });

  const productSku = useWatch({ control: form.control, name: "sku" });

  useEffect(() => {
    if (!open) return;
    form.reset(
      editing
        ? {
            sku: editing.sku,
            name: editing.name,
            category_id: editing.category_id,
            supplier_id: editing.supplier_id,
            description: editing.description,
            buy_price: Number(editing.buy_price),
            sell_price: Number(editing.sell_price),
            min_stock: editing.min_stock,
            low_stock: editing.low_stock,
            current_stock: editing.current_stock,
            unit: editing.unit,
            rack_location: editing.rack_location,
            image_url: editing.image_url,
          }
        : emptyValues,
    );
  }, [editing, form, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isManager
              ? "Edit Atribut Logistik Produk"
              : isEditing
                ? "Edit Produk"
                : "Tambah Produk"}
          </SheetTitle>
        </SheetHeader>
        <form className="p-6" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {isManager && (
              <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                Role Manager hanya dapat memperbarui atribut logistik gudang
                (lokasi rak, batas stok minimum/rendah, satuan, deskripsi, dan
                gambar). Data komersial dan stok saat ini terkunci.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="sku"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="product-sku">SKU</FieldLabel>
                    <Input
                      {...field}
                      id="product-sku"
                      placeholder="FNT-MSE-VX7-BLK"
                      disabled={isEditing}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="product-name">Nama produk</FieldLabel>
                    <Input {...field} id="product-name" disabled={isManager} />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="category_id"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="product-category">Kategori</FieldLabel>
                    <select
                      {...field}
                      id="product-category"
                      disabled={isManager}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Pilih kategori</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="supplier_id"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="product-supplier">Supplier</FieldLabel>
                    <select
                      {...field}
                      id="product-supplier"
                      disabled={isManager}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Pilih supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="product-description">
                    Deskripsi
                  </FieldLabel>
                  <Input {...field} id="product-description" />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              {numberFields.map((item) => {
                const isFieldDisabled =
                  (item.name === "current_stock" &&
                    (isEditing || accessRole === "manager")) ||
                  (item.commercial && isManager);
                return (
                  <Controller
                    key={item.name}
                    name={item.name}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor={`product-${item.name}`}>
                          {item.label}
                        </FieldLabel>
                        <Input
                          {...field}
                          id={`product-${item.name}`}
                          type="number"
                          min={0}
                          disabled={isFieldDisabled}
                          value={Number.isNaN(field.value) ? "" : field.value}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ""
                                ? 0
                                : Number(event.target.value),
                            )
                          }
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="unit"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="product-unit">Satuan</FieldLabel>
                    <Input {...field} id="product-unit" placeholder="pcs" />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="rack_location"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="product-rack">Lokasi rak</FieldLabel>
                    <Input {...field} id="product-rack" placeholder="Rak-A1" />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
            <Controller
              name="image_url"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="product-image">Gambar produk</FieldLabel>
                  <ImageUploadField
                    id="product-image"
                    uploadType="products"
                    prefix={productSku}
                    value={field.value}
                    disabled={isPending}
                    onChange={field.onChange}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                Simpan
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
            </div>
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  );
}
