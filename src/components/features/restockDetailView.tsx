"use client";

import { PoStatusTracker } from "@/components/features/poStatusTracker";
import { RestockDetailActions } from "@/components/features/restockDetailActions";
import { WorkflowStatusBadge } from "@/components/statusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NextImage from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type RestockDetail = {
  id: string;
  po_number: string;
  order_date: string;
  expected_delivery_date: string;
  status: string;
  status_reason: string | null;
  delivery_proof_url: string | null;
  refund_requested: boolean;
  refund_reason: string | null;
  replacement_po_id: string | null;
  supplier_name: string;
  supplier_company: string | null;
  created_by_name: string;
  notes: string | null;
  items: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit: string;
  }>;
  transactions: Array<{
    id: string;
    transaction_number: string;
    transaction_date: string;
    status: string;
    rejection_reason: string | null;
    created_by_name: string;
  }>;
};

type ActionResult = {
  redirectToNewOrder?: boolean;
};

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

export function RestockDetailView({
  id,
  accessRole,
}: {
  id: string;
  accessRole: "admin" | "manager" | "staff" | "supplier";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const po = useQuery({
    queryKey: ["restock-detail", id],
    queryFn: () => api<RestockDetail>(`/api/restock-orders/${id}`),
  });

  const action = useMutation({
    mutationFn: ({ endpoint, body }: { endpoint: string; body?: object }) =>
      api<ActionResult>(`/api/restock-orders/${id}/${endpoint}`, "PATCH", body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["restock-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["restocks"] });
      queryClient.invalidateQueries({ queryKey: ["inspecting-pos"] });
      if (data?.redirectToNewOrder && accessRole === "manager") {
        router.push(`/manager/restock-orders?replacement_from=${id}`);
      }
    },
  });

  if (po.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16">
        <Spinner /> Memuat detail Purchase Order...
      </div>
    );
  }
  if (po.isError) return <p className="text-destructive">{po.error.message}</p>;
  if (!po.data) return null;

  const detail = po.data;
  const activeTransaction = detail.transactions.find(
    (trx) => trx.status !== "Rejected",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Detail Purchase Order
          </h1>
          <p className="text-sm text-muted-foreground">{detail.po_number}</p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/${accessRole}/restock-orders`} />}
        >
          Kembali ke Daftar PO
        </Button>
      </div>

      <PoStatusTracker
        status={detail.status}
        statusReason={detail.status_reason}
      />

      <Card>
        <CardHeader>
          <CardTitle>Informasi Purchase Order</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>
            <strong>Supplier:</strong>{" "}
            {detail.supplier_company ?? detail.supplier_name}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <WorkflowStatusBadge status={detail.status} />
          </p>
          <p>
            <strong>Tanggal Order:</strong> {formatDate(detail.order_date)}
          </p>
          <p>
            <strong>Estimasi Tiba:</strong>{" "}
            {formatDate(detail.expected_delivery_date)}
          </p>
          <p>
            <strong>Dibuat Oleh:</strong> {detail.created_by_name}
          </p>
          <p>
            <strong>Catatan:</strong> {detail.notes ?? "-"}
          </p>
          {detail.refund_requested && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 md:col-span-2">
              <p className="font-medium">Klaim Refund Diajukan</p>
              <p className="text-xs text-muted-foreground">
                {detail.refund_reason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Item Pesanan</CardTitle>
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

      {detail.delivery_proof_url && (
        <Card>
          <CardHeader>
            <CardTitle>Bukti Foto Barang Sebelum Pengiriman</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.delivery_proof_url.startsWith("/") ? (
              <NextImage
                src={detail.delivery_proof_url}
                alt="Bukti foto barang sebelum pengiriman"
                width={800}
                height={600}
                unoptimized
                className="max-h-96 w-auto rounded-lg border object-contain"
              />
            ) : (
              <p className="break-all text-sm">{detail.delivery_proof_url}</p>
            )}
          </CardContent>
        </Card>
      )}

      {detail.transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Transaksi Masuk Terkait</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Dibuat Oleh</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.transactions.map((trx) => (
                  <TableRow key={trx.id}>
                    <TableCell className="font-medium">
                      {trx.transaction_number}
                    </TableCell>
                    <TableCell>{formatDate(trx.transaction_date)}</TableCell>
                    <TableCell>{trx.created_by_name}</TableCell>
                    <TableCell>
                      <WorkflowStatusBadge status={trx.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <Link
                            href={`/${accessRole}/transactions/${trx.id}`}
                          />
                        }
                      >
                        Lihat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <RestockDetailActions
        id={detail.id}
        role={accessRole}
        status={detail.status}
        hasProof={Boolean(detail.delivery_proof_url)}
        refundRequested={detail.refund_requested}
        activeTransactionId={activeTransaction?.id}
        isPending={action.isPending}
        onAction={(endpoint, body) => action.mutate({ endpoint, body })}
      />

      {action.isError && (
        <p className="text-sm text-destructive">{action.error.message}</p>
      )}
    </div>
  );
}
