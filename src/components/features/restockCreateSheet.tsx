"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ProductQuantityPicker } from "@/components/features/productQuantityPicker";
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
import { dateStringSchema, uuidSchema } from "@/lib/validations/common";

type Supplier = { id: string; full_name: string; company_name: string | null };
type SupplierProduct = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  current_stock: number;
};

const poFormSchema = z
  .object({
    supplier_id: uuidSchema("Pilih supplier"),
    order_date: dateStringSchema,
    expected_delivery_date: dateStringSchema,
    notes: z.string().trim(),
  })
  .refine((value) => value.expected_delivery_date >= value.order_date, {
    message: "Estimasi tiba tidak boleh sebelum tanggal order",
    path: ["expected_delivery_date"],
  });

type PoFormValues = z.infer<typeof poFormSchema>;

export type CreatePoPayload = PoFormValues & {
  replacement_po_id?: string | null;
  items: Array<{ product_id: string; quantity: number }>;
};

async function fetchList<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = (await response.json()) as {
    success: boolean;
    message: string;
    data: T;
  };
  if (!response.ok) throw new Error(payload.message);
  return payload.data;
}

export function RestockCreateSheet({
  open,
  suppliers,
  replacementPoId,
  initialSupplierId,
  initialItems,
  isPending,
  errorMessage,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  suppliers: Supplier[];
  replacementPoId?: string | null;
  initialSupplierId?: string;
  initialItems?: Record<string, number>;
  isPending: boolean;
  errorMessage?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreatePoPayload) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState<Record<string, number>>({});
  const [itemError, setItemError] = useState("");

  const form = useForm<PoFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      supplier_id: "",
      order_date: today,
      expected_delivery_date: today,
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      supplier_id: initialSupplierId ?? "",
      order_date: today,
      expected_delivery_date: today,
      notes: replacementPoId ? "PO Pengganti untuk pesanan yang diretur" : "",
    });
    setItems(initialItems ?? {});
    setItemError("");
  }, [open, initialSupplierId, initialItems, replacementPoId, form, today]);

  const selectedSupplierId = useWatch({
    control: form.control,
    name: "supplier_id",
  });

  const supplierProducts = useQuery({
    queryKey: ["products-by-supplier", selectedSupplierId],
    enabled: Boolean(selectedSupplierId),
    queryFn: () =>
      fetchList<SupplierProduct[]>(
        `/api/products?supplier_id=${selectedSupplierId}&page=1&limit=100`,
      ),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {replacementPoId
              ? "Buat Purchase Order Pengganti"
              : "Buat Purchase Order"}
          </SheetTitle>
        </SheetHeader>
        <form
          className="p-6"
          onSubmit={form.handleSubmit((values) => {
            const validProductIds = new Set(
              supplierProducts.data?.map((product) => product.id) ?? [],
            );
            const selectedItems = Object.entries(items)
              .filter(
                ([productId, quantity]) =>
                  quantity > 0 && validProductIds.has(productId),
              )
              .map(([product_id, quantity]) => ({ product_id, quantity }));

            if (selectedItems.length === 0) {
              setItemError("Pilih minimal satu produk dengan jumlah > 0");
              return;
            }
            setItemError("");
            onSubmit({
              ...values,
              replacement_po_id: replacementPoId ?? null,
              items: selectedItems,
            });
          })}
        >
          <FieldGroup>
            <Controller
              name="supplier_id"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="po-supplier">Supplier</FieldLabel>
                  <select
                    {...field}
                    id="po-supplier"
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    onChange={(event) => {
                      field.onChange(event);
                      setItems({});
                    }}
                  >
                    <option value="">Pilih supplier approved</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.company_name ?? supplier.full_name}
                      </option>
                    ))}
                  </select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="order_date"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="po-order-date">
                      Tanggal Order
                    </FieldLabel>
                    <Input {...field} id="po-order-date" type="date" />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="expected_delivery_date"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="po-expected-date">
                      Estimasi Tiba
                    </FieldLabel>
                    <Input {...field} id="po-expected-date" type="date" />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
            <Controller
              name="notes"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="po-notes">Catatan</FieldLabel>
                  <Input
                    {...field}
                    id="po-notes"
                    placeholder="Catatan pengadaan (opsional)"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <ProductQuantityPicker
              title="Produk Milik Supplier"
              emptyText={
                selectedSupplierId
                  ? "Supplier ini belum memiliki produk terdaftar."
                  : "Pilih supplier terlebih dahulu untuk menampilkan produk."
              }
              products={
                supplierProducts.data?.map((product) => ({
                  id: product.id,
                  name: product.name,
                  subtitle: `${product.sku} · Stok: ${product.current_stock} ${product.unit}`,
                })) ?? []
              }
              values={items}
              onChange={setItems}
            />
            {itemError && (
              <p className="text-sm text-destructive">{itemError}</p>
            )}
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Buat Purchase Order"}
            </Button>
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  );
}
