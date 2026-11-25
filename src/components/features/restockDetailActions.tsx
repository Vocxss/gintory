"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw, Truck } from "lucide-react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ImageUploadField } from "@/components/features/imageUploadField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { imagePathSchema } from "@/lib/validations/common";

const rejectSchema = z.object({
  status_reason: z.string().trim().min(1, "Alasan penolakan wajib diisi"),
});

const proofSchema = z.object({
  delivery_proof_url: imagePathSchema,
});

const refundSchema = z.object({
  refund_reason: z.string().trim().min(1, "Alasan klaim refund wajib diisi"),
});

export function RestockDetailActions({
  id,
  role,
  status,
  hasProof,
  refundRequested,
  activeTransactionId,
  isPending,
  onAction,
}: {
  id: string;
  role: "admin" | "manager" | "staff" | "supplier";
  status: string;
  hasProof: boolean;
  refundRequested: boolean;
  activeTransactionId?: string;
  isPending: boolean;
  onAction: (endpoint: string, body?: object) => void;
}) {
  const rejectForm = useForm<z.infer<typeof rejectSchema>>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { status_reason: "" },
  });

  const proofForm = useForm<z.infer<typeof proofSchema>>({
    resolver: zodResolver(proofSchema),
    defaultValues: { delivery_proof_url: "" },
  });

  const refundForm = useForm<z.infer<typeof refundSchema>>({
    resolver: zodResolver(refundSchema),
    defaultValues: { refund_reason: "" },
  });

  if (role === "supplier" && status === "Pending") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Konfirmasi Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Setujui PO ini untuk memulai persiapan pengiriman ke gudang.
            </p>
            <Button
              disabled={isPending}
              onClick={() => onAction("respond", { status: "Confirmed" })}
            >
              Konfirmasi PO (Confirmed)
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tolak Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={rejectForm.handleSubmit((values) =>
                onAction("respond", {
                  status: "Rejected",
                  status_reason: values.status_reason,
                }),
              )}
            >
              <FieldGroup>
                <Controller
                  name="status_reason"
                  control={rejectForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="po-reject-reason">
                        Alasan penolakan
                      </FieldLabel>
                      <Textarea
                        {...field}
                        id="po-reject-reason"
                        placeholder="Wajib diisi jika menolak PO"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isPending}
                >
                  Tolak PO (Rejected)
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role === "supplier" && status === "Confirmed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pengiriman Barang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Unggah bukti foto barang sebelum pengiriman. Setelah bukti foto
            diunggah, status PO akan berubah menjadi In Transit.
          </p>
          <form
            onSubmit={proofForm.handleSubmit((values) =>
              onAction("ship", values),
            )}
          >
            <FieldGroup>
              <Controller
                name="delivery_proof_url"
                control={proofForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="po-ship-proof">
                      Bukti foto barang sebelum pengiriman
                    </FieldLabel>
                    <ImageUploadField
                      id="po-ship-proof"
                      uploadType="proofs"
                      prefix={`po-${id.slice(0, 8)}`}
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
              <Button type="submit" disabled={isPending}>
                <Truck /> Unggah Bukti & Kirim Barang (In Transit)
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (role === "supplier" && status === "In Transit") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Barang Dalam Pengiriman</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {hasProof
              ? "Bukti foto barang sebelum pengiriman sudah diunggah. Menunggu barang tiba dan pemeriksaan fisik oleh pihak gudang."
              : "Pesanan sedang dalam pengiriman menuju gudang dan menunggu pemeriksaan fisik oleh pihak gudang."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (role === "manager" && status === "In Transit") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instruksi Pemeriksaan Fisik</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pesanan sedang dalam pengiriman (In Transit). Saat barang tiba di
            gudang, instruksikan Staff Gudang untuk mengecek fisik barang dan
            mengunggah bukti kedatangan melalui transaksi barang masuk.
          </p>
          <Button disabled={isPending} onClick={() => onAction("inspect")}>
            Instruksikan Cek Fisik (Inspecting)
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (role === "staff" && status === "Inspecting") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pemeriksaan Fisik & Penerimaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeTransactionId ? (
            <>
              <p className="text-sm text-muted-foreground">
                Laporan Incoming Transaction untuk PO ini sudah diajukan dan
                sedang menunggu persetujuan Manager.
              </p>
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={`/staff/transactions/${activeTransactionId}`} />
                }
              >
                Lihat Transaksi Masuk
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Setelah mengecek jumlah dan kondisi fisik barang, buat laporan
                Incoming Transaction beserta bukti foto.
              </p>
              <Button
                nativeButton={false}
                render={
                  <Link href={`/staff/transactions?restock_order_id=${id}`} />
                }
              >
                Buat Incoming Transaction
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (role === "manager" && status === "Returned") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tindak Lanjut Retur & Klaim Refund</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!refundRequested ? (
            <form
              onSubmit={refundForm.handleSubmit((values) =>
                onAction("refund", values),
              )}
            >
              <FieldGroup>
                <Controller
                  name="refund_reason"
                  control={refundForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="po-refund-reason">
                        Alasan klaim refund
                      </FieldLabel>
                      <Textarea
                        {...field}
                        id="po-refund-reason"
                        placeholder="Jelaskan rincian klaim refund untuk barang yang diretur"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Button type="submit" disabled={isPending}>
                  <RotateCcw /> Ajukan Klaim Refund & Buat PO Baru
                </Button>
              </FieldGroup>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Klaim refund sudah diajukan kepada Supplier. Anda dapat membuat
                PO pengganti dari item pesanan ini.
              </p>
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/manager/restock-orders?replacement_from=${id}`}
                  />
                }
              >
                Buat PO Pengganti
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
