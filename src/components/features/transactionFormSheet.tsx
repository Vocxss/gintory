"use client";

import { ImageUploadField } from "@/components/features/imageUploadField";
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
import {
  getTodayDateString,
  PAST_TRANSACTION_DATE_MESSAGE,
} from "@/lib/utils/date";
import { dateStringSchema } from "@/lib/validations/common";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

export type TransactionListItem = {
  id: string;
  transaction_number: string;
  type: "INCOMING" | "OUTGOING";
  status: string;
  transaction_date: string;
  customer_name: string | null;
  supplier_company: string | null;
  notes: string | null;
  proof_image_url: string | null;
  po_number: string | null;
  created_by: string;
  created_by_name: string;
  approved_by_name: string | null;
  restock_order_id: string | null;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    po_quantity?: number | null;
    unit?: string;
  }>;
};

export type InspectingPoOption = {
  id: string;
  po_number: string;
  supplier_company?: string | null;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit: string;
  }>;
};

export type OutgoingProductOption = {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  unit: string;
};

const formSchema = z.object({
  transaction_date: dateStringSchema,
  po_id: z.string(),
  customer_name: z.string().trim(),
  notes: z.string().trim(),
  proof_image_url: z.string().trim(),
});

export type TransactionSubmitPayload = {
  editingId: string | null;
  isIncoming: boolean;
  transaction_date: string;
  restock_order_id?: string;
  customer_name?: string;
  notes?: string;
  proof_image_url?: string;
  items: Array<{ product_id: string; quantity: number }>;
};

export function TransactionFormSheet({
  open,
  editing,
  initialPoId,
  inspectingPos,
  isLoadingPos,
  posError,
  products,
  isPending,
  errorMessage,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  editing: TransactionListItem | null;
  initialPoId?: string;
  inspectingPos: InspectingPoOption[];
  isLoadingPos?: boolean;
  posError?: string;
  products: OutgoingProductOption[];
  isPending: boolean;
  errorMessage?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: TransactionSubmitPayload) => void;
}) {
  const today = getTodayDateString();
  const [isIncoming, setIsIncoming] = useState(true);
  const [items, setItems] = useState<Record<string, number>>({});
  const [itemError, setItemError] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transaction_date: today,
      po_id: "",
      customer_name: "",
      notes: "",
      proof_image_url: "",
    },
  });

  const selectedPoId = useWatch({ control: form.control, name: "po_id" });
  const selectedPo = inspectingPos.find((po) => po.id === selectedPoId);

  useEffect(() => {
    if (!open) return;
    setItemError("");
    if (editing) {
      setIsIncoming(editing.type === "INCOMING");
      form.reset({
        transaction_date: editing.transaction_date.slice(0, 10),
        po_id: editing.restock_order_id ?? "",
        customer_name: editing.customer_name ?? "",
        notes: editing.notes ?? "",
        proof_image_url: editing.proof_image_url ?? "",
      });
      setItems(
        Object.fromEntries(
          editing.items.map((item) => [item.product_id, item.quantity]),
        ),
      );
      return;
    }

    setIsIncoming(true);
    form.reset({
      transaction_date: today,
      po_id: initialPoId ?? "",
      customer_name: "",
      notes: "",
      proof_image_url: "",
    });
    setItems({});
  }, [open, editing, initialPoId, form, today]);

  useEffect(() => {
    if (!open || editing || !isIncoming || !selectedPo) return;
    setItems((prev) =>
      Object.keys(prev).length > 0
        ? prev
        : Object.fromEntries(
            selectedPo.items.map((item) => [item.product_id, item.quantity]),
          ),
    );
  }, [open, editing, isIncoming, selectedPo]);

  const handlePoChange = (poId: string) => {
    form.setValue("po_id", poId, { shouldValidate: true });
    form.clearErrors("po_id");
    const po = inspectingPos.find((item) => item.id === poId);
    setItems(
      po
        ? Object.fromEntries(
            po.items.map((item) => [item.product_id, item.quantity]),
          )
        : {},
    );
  };

  const displayProducts = isIncoming
    ? editing
      ? editing.items.map((item) => ({
          id: item.product_id,
          name: item.product_name,
          subtitle:
            item.po_quantity != null
              ? `Maks. PO: ${item.po_quantity}${item.unit ? ` ${item.unit}` : ""}`
              : "Item PO",
          max: item.po_quantity ?? undefined,
        }))
      : (selectedPo?.items.map((item) => ({
          id: item.product_id,
          name: item.product_name,
          subtitle: `Maks. PO: ${item.quantity} ${item.unit}`,
          max: item.quantity,
        })) ?? [])
    : products.map((product) => ({
        id: product.id,
        name: product.name,
        subtitle: `Stok: ${product.current_stock} ${product.unit}`,
        max: product.current_stock,
      }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {editing ? "Edit Transaksi Pending" : "Buat Transaksi Baru"}
          </SheetTitle>
        </SheetHeader>
        <form
          className="space-y-4 p-6"
          onSubmit={form.handleSubmit((values) => {
            if (!editing && values.transaction_date < today) {
              form.setError("transaction_date", {
                message: PAST_TRANSACTION_DATE_MESSAGE,
              });
              return;
            }
            if (!isIncoming && !values.customer_name.trim()) {
              form.setError("customer_name", {
                message: "Nama customer/tujuan wajib diisi",
              });
              return;
            }
            if (isIncoming && !editing && !values.po_id) {
              form.setError("po_id", {
                message: "Pilih PO berstatus Inspecting",
              });
              return;
            }
            if (isIncoming && !values.proof_image_url.trim()) {
              form.setError("proof_image_url", {
                message: "Bukti foto barang tiba wajib diisi",
              });
              return;
            }

            const selectedItems = isIncoming
              ? displayProducts.map((product) => ({
                  product_id: product.id,
                  quantity: Math.max(0, Number(items[product.id] ?? 0)),
                }))
              : Object.entries(items)
                  .filter(([, quantity]) => quantity > 0)
                  .map(([product_id, quantity]) => ({ product_id, quantity }));

            if (selectedItems.length === 0) {
              setItemError("Minimal satu item produk wajib dipilih");
              return;
            }

            const exceededItem = displayProducts.find((product) => {
              if (product.max === undefined) return false;
              const qty = Number(items[product.id] ?? 0);
              return qty > product.max;
            });

            if (exceededItem) {
              setItemError(
                isIncoming
                  ? `Jumlah "${exceededItem.name}" tidak boleh melebihi jumlah pada PO (${exceededItem.max})`
                  : `Jumlah "${exceededItem.name}" tidak boleh melebihi stok tersedia (${exceededItem.max})`,
              );
              return;
            }

            setItemError("");
            onSubmit({
              editingId: editing?.id ?? null,
              isIncoming,
              transaction_date: values.transaction_date,
              restock_order_id: isIncoming ? values.po_id : undefined,
              customer_name: !isIncoming ? values.customer_name : undefined,
              notes: values.notes,
              proof_image_url: isIncoming ? values.proof_image_url : undefined,
              items: selectedItems,
            });
          })}
        >
          {!editing && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={isIncoming ? "default" : "outline"}
                onClick={() => {
                  setIsIncoming(true);
                  setItems({});
                }}
              >
                Barang Masuk
              </Button>
              <Button
                type="button"
                variant={!isIncoming ? "default" : "outline"}
                onClick={() => {
                  setIsIncoming(false);
                  setItems({});
                }}
              >
                Barang Keluar
              </Button>
            </div>
          )}

          <FieldGroup>
            <Controller
              name="transaction_date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="trx-date">Tanggal transaksi</FieldLabel>
                  <Input
                    {...field}
                    id="trx-date"
                    type="date"
                    min={editing ? undefined : today}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {isIncoming ? (
              <>
                {!editing && (
                  <Controller
                    name="po_id"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="trx-po">
                          Purchase Order (Inspecting)
                        </FieldLabel>

                        <div className="relative w-full">
                          <select
                            {...field}
                            id="trx-po"
                            disabled={isLoadingPos || isPending}
                            onChange={(event) => {
                              field.onChange(event.target.value);
                              handlePoChange(event.target.value);
                            }}
                            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm appearance-none"
                          >
                            <option value="">
                              {isLoadingPos
                                ? "Memuat daftar PO Inspecting..."
                                : "Pilih PO Inspecting"}
                            </option>
                            {inspectingPos.map((po) => (
                              <option key={po.id} value={po.id}>
                                {po.supplier_company
                                  ? `${po.po_number} — ${po.supplier_company}`
                                  : po.po_number}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-800">
                            <HugeiconsIcon icon={ChevronDownIcon} />
                          </div>
                        </div>

                        {posError && (
                          <p className="text-xs text-destructive">{posError}</p>
                        )}
                        {!isLoadingPos &&
                          !posError &&
                          inspectingPos.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              Belum ada PO berstatus Inspecting yang tersedia.
                              PO hanya muncul setelah Manager menginstruksikan
                              cek fisik dan belum memiliki transaksi masuk
                              aktif.
                            </p>
                          )}
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                )}
                <Controller
                  name="proof_image_url"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="trx-proof">
                        Bukti foto barang tiba
                      </FieldLabel>
                      <ImageUploadField
                        id="trx-proof"
                        uploadType="proofs"
                        prefix={selectedPo?.po_number ?? "incoming"}
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
              </>
            ) : (
              <Controller
                name="customer_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="trx-customer">
                      Customer / Tujuan
                    </FieldLabel>
                    <Input
                      {...field}
                      id="trx-customer"
                      placeholder="Nama toko atau customer"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}

            <Controller
              name="notes"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="trx-notes">Catatan</FieldLabel>
                  <Input
                    {...field}
                    id="trx-notes"
                    placeholder="Catatan hasil pemeriksaan atau pengiriman"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <ProductQuantityPicker
              title="Daftar Item"
              emptyText={
                isIncoming
                  ? "Pilih PO Inspecting untuk menampilkan item."
                  : "Belum ada produk tersedia."
              }
              products={displayProducts}
              values={items}
              onChange={(next) => {
                setItemError("");
                setItems(next);
              }}
            />

            {itemError && (
              <p className="text-sm text-destructive">{itemError}</p>
            )}
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan Transaksi"}
            </Button>
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  );
}
