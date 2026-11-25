"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import NextImage from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { WorkflowStatusBadge } from "@/components/statusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type TransactionDetailData = {
  id: string;
  transaction_number: string;
  type: "INCOMING" | "OUTGOING";
  status: string;
  transaction_date: string;
  restock_order_id: string | null;
  po_number: string | null;
  notes: string | null;
  rejection_reason: string | null;
  proof_image_url: string | null;
  supplier_company: string | null;
  customer_name: string | null;
  created_by_name: string;
  approved_by_name: string | null;
  items: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit: string;
  }>;
};

type ReviewResult = {
  redirectToRefund?: boolean;
  restock_order_id?: string | null;
};

const rejectSchema = z.object({
  rejection_reason: z.string().trim().min(1, "Alasan penolakan wajib diisi"),
});

async function api<T>(url: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as {
    success: boolean;
    message: string;
    data: T;
  };
  if (!response.ok) throw new Error(payload.message);
  return payload.data;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export function TransactionDetail({
  id,
  accessRole,
}: {
  id: string;
  accessRole: "admin" | "manager" | "staff" | "supplier";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const transaction = useQuery({
    queryKey: ["transaction-detail", id],
    queryFn: () => api<TransactionDetailData>(`/api/transactions/${id}`),
  });

  const rejectForm = useForm<z.infer<typeof rejectSchema>>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { rejection_reason: "" },
  });

  const review = useMutation({
    mutationFn: (body: object) =>
      api<ReviewResult>(`/api/transactions/${id}/review`, "PATCH", body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transaction-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      if (
        accessRole === "manager" &&
        data?.redirectToRefund &&
        data?.restock_order_id
      ) {
        router.push(`/manager/restock-orders/${data.restock_order_id}`);
      }
    },
  });

  const ship = useMutation({
    mutationFn: () => api(`/api/transactions/${id}/ship`, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  if (transaction.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16">
        <Spinner /> Memuat detail transaksi...
      </div>
    );
  }
  if (transaction.isError) {
    return <p className="text-destructive">{transaction.error.message}</p>;
  }
  if (!transaction.data) return null;

  const detail = transaction.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Detail Transaksi</h1>
          <p className="text-sm text-muted-foreground">
            {detail.transaction_number}
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/${accessRole}/transactions`} />}
        >
          Kembali ke Transaksi
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>
            <strong>Tipe:</strong> {detail.type}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <WorkflowStatusBadge status={detail.status} />
          </p>
          <p>
            <strong>Tanggal:</strong> {formatDate(detail.transaction_date)}
          </p>
          <p>
            <strong>Dibuat Oleh:</strong> {detail.created_by_name}
          </p>
          <p>
            <strong>Pihak:</strong>{" "}
            {detail.supplier_company ?? detail.customer_name ?? "-"}
          </p>
          <p>
            <strong>Diproses Oleh:</strong> {detail.approved_by_name ?? "-"}
          </p>
          {detail.po_number && detail.restock_order_id && (
            <p className="md:col-span-2">
              <strong>Nomor PO:</strong>{" "}
              {accessRole === "admin" ? (
                detail.po_number
              ) : (
                <Link
                  href={`/${accessRole}/restock-orders/${detail.restock_order_id}`}
                  className="text-primary underline"
                >
                  {detail.po_number}
                </Link>
              )}
            </p>
          )}
          <p className="md:col-span-2">
            <strong>Catatan:</strong> {detail.notes ?? "-"}
          </p>
          {detail.rejection_reason && (
            <p className="text-destructive md:col-span-2">
              <strong>Alasan Penolakan:</strong> {detail.rejection_reason}
            </p>
          )}
        </CardContent>
      </Card>

      {detail.proof_image_url && (
        <Card>
          <CardHeader>
            <CardTitle>Bukti Foto Barang Tiba</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.proof_image_url.startsWith("/") ? (
              <NextImage
                src={detail.proof_image_url}
                alt="Bukti foto penerimaan"
                width={800}
                height={600}
                unoptimized
                className="max-h-96 w-auto rounded-lg border object-contain"
              />
            ) : (
              <p className="break-all text-sm">{detail.proof_image_url}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daftar Item Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.items.map((item) => (
                <TableRow key={item.product_id}>
                  <TableCell className="font-medium">
                    {item.product_name}
                  </TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>
                    {item.quantity} {item.unit}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {accessRole === "manager" && detail.status === "Pending" && (
        <Card>
          <CardHeader>
            <CardTitle>Keputusan Warehouse Manager</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button
              onClick={() => review.mutate({ action: "Approved" })}
              disabled={review.isPending}
            >
              {detail.type === "INCOMING"
                ? "Setujui & Tambah Stok (Received)"
                : "Setujui untuk Packing (Approved)"}
            </Button>
            <form
              onSubmit={rejectForm.handleSubmit((values) =>
                review.mutate({
                  action: "Rejected",
                  rejection_reason: values.rejection_reason,
                }),
              )}
            >
              <FieldGroup>
                <Controller
                  name="rejection_reason"
                  control={rejectForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="transaction-reject">
                        Alasan penolakan
                      </FieldLabel>
                      <Textarea
                        {...field}
                        id="transaction-reject"
                        placeholder="Wajib diisi jika menolak transaksi"
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
                  disabled={review.isPending}
                >
                  Tolak Transaksi
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}

      {accessRole === "staff" &&
        detail.type === "OUTGOING" &&
        detail.status === "Approved" && (
          <Card>
            <CardHeader>
              <CardTitle>Penyelesaian Packing & Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Klik tombol di bawah setelah barang selesai di-packing dan
                diserahkan ke kurir/pelanggan. Stok akan otomatis berkurang.
              </p>
              <Button disabled={ship.isPending} onClick={() => ship.mutate()}>
                <Truck /> Kirim Barang (Shipped)
              </Button>
            </CardContent>
          </Card>
        )}

      {(review.isError || ship.isError) && (
        <p className="text-sm text-destructive">
          {review.error?.message ?? ship.error?.message}
        </p>
      )}
    </div>
  );
}
