"use client";

import {
  RestockCreateSheet,
  type CreatePoPayload,
} from "@/components/features/restockCreateSheet";
import { TablePagination } from "@/components/features/tablePagination";
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
import { ChevronDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const PAGE_SIZE = 20;

type Role = "manager" | "supplier" | "staff";
type Meta = { page: number; limit: number; total: number; totalPages: number };

type Restock = {
  id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  order_date: string;
  expected_delivery_date: string;
  supplier_company: string | null;
  refund_requested: boolean;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit: string;
  }>;
};

type Supplier = { id: string; full_name: string; company_name: string | null };

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

async function apiPaginated<T>(
  url: string,
): Promise<{ data: T[]; meta: Meta }> {
  const response = await fetch(url);
  const payload = (await response.json()) as {
    success: boolean;
    message: string;
    data: T[];
    meta?: Meta;
  };
  if (!response.ok) throw new Error(payload.message);
  const data = payload.data ?? [];
  return {
    data,
    meta: payload.meta ?? {
      page: 1,
      limit: PAGE_SIZE,
      total: data.length,
      totalPages: Math.max(1, Math.ceil(data.length / PAGE_SIZE)),
    },
  };
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export function RestockManagement({ accessRole }: { accessRole: Role }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [replacementPoId, setReplacementPoId] = useState<string | null>(null);
  const [initialSupplierId, setInitialSupplierId] = useState<
    string | undefined
  >();
  const [initialItems, setInitialItems] = useState<
    Record<string, number> | undefined
  >();

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (statusFilter) queryParams.set("status", statusFilter);

  const restocks = useQuery({
    queryKey: ["restocks", accessRole, page, statusFilter],
    queryFn: () =>
      apiPaginated<Restock>(`/api/restock-orders?${queryParams.toString()}`),
  });

  const suppliers = useQuery({
    queryKey: ["suppliers-approved"],
    enabled: accessRole === "manager",
    queryFn: () => api<Supplier[]>("/api/suppliers?status=Approved"),
  });

  const rows = restocks.data?.data ?? [];
  const meta = restocks.data?.meta;

  useEffect(() => {
    const replacementFrom = searchParams.get("replacement_from");
    if (accessRole === "manager" && replacementFrom) {
      api<Restock>(`/api/restock-orders/${replacementFrom}`)
        .then((sourcePo) => {
          setReplacementPoId(sourcePo.id);
          setInitialSupplierId(sourcePo.supplier_id);
          setInitialItems(
            Object.fromEntries(
              sourcePo.items.map((item) => [item.product_id, item.quantity]),
            ),
          );
          setOpen(true);
        })
        .catch(() => {});
    }
  }, [accessRole, searchParams]);

  const createPo = useMutation({
    mutationFn: (payload: CreatePoPayload) =>
      api("/api/restock-orders", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restocks"] });
      setOpen(false);
      setReplacementPoId(null);
      setInitialSupplierId(undefined);
      setInitialItems(undefined);
      if (searchParams.get("replacement_from")) {
        router.replace("/manager/restock-orders");
      }
    },
  });

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Purchase Order</h1>
          <p className="text-sm text-muted-foreground">
            Pantau dan kelola alur pengadaan barang gudang
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-max">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm appearance-none pr-8"
            >
              <option value="">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Rejected">Rejected</option>
              <option value="In Transit">In Transit</option>
              <option value="Inspecting">Inspecting</option>
              <option value="Received">Received</option>
              <option value="Returned">Returned</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-800 ">
              <HugeiconsIcon icon={ChevronDownIcon} />
            </div>
          </div>
          {accessRole === "manager" && (
            <Button
              onClick={() => {
                setReplacementPoId(null);
                setInitialSupplierId(undefined);
                setInitialItems(undefined);
                setOpen(true);
              }}
            >
              <Plus /> Buat PO
            </Button>
          )}
        </div>
      </div>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Daftar Purchase Order</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full overflow-hidden">
          {restocks.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. PO</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Order</TableHead>
                    <TableHead>Estimasi Tiba</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length ? (
                    rows.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">
                          {po.po_number}
                        </TableCell>
                        <TableCell>{po.supplier_company ?? "-"}</TableCell>
                        <TableCell>
                          <WorkflowStatusBadge status={po.status} />
                        </TableCell>
                        <TableCell>{formatDate(po.order_date)}</TableCell>
                        <TableCell>
                          {formatDate(po.expected_delivery_date)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon-xs"
                            variant="outline"
                            nativeButton={false}
                            aria-label={`Detail PO ${po.po_number}`}
                            render={
                              <Link
                                href={`/${accessRole}/restock-orders/${po.id}`}
                              />
                            }
                          >
                            <Eye />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Belum ada purchase order
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {meta && (
                <TablePagination
                  page={meta.page}
                  totalPages={meta.totalPages}
                  total={meta.total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {accessRole === "manager" && (
        <RestockCreateSheet
          open={open}
          suppliers={suppliers.data ?? []}
          replacementPoId={replacementPoId}
          initialSupplierId={initialSupplierId}
          initialItems={initialItems}
          isPending={createPo.isPending}
          errorMessage={createPo.isError ? createPo.error.message : undefined}
          onOpenChange={setOpen}
          onSubmit={(payload) => createPo.mutate(payload)}
        />
      )}
    </div>
  );
}
