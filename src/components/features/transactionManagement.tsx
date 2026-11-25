"use client";

import { TablePagination } from "@/components/features/tablePagination";
import {
  TransactionFormSheet,
  type InspectingPoOption,
  type OutgoingProductOption,
  type TransactionListItem,
  type TransactionSubmitPayload,
} from "@/components/features/transactionFormSheet";
import { TransactionRejectSheet } from "@/components/features/transactionRejectSheet";
import { TransactionTable } from "@/components/features/transactionTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ChevronDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const PAGE_SIZE = 20;
const EMPTY_INSPECTING_POS: InspectingPoOption[] = [];
const EMPTY_OUTGOING_PRODUCTS: OutgoingProductOption[] = [];

type Role = "admin" | "manager" | "staff" | "supplier";
type Meta = { page: number; limit: number; total: number; totalPages: number };

type ReviewResponse = {
  redirectToRefund?: boolean;
  restock_order_id?: string | null;
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

export function TransactionManagement({ accessRole }: { accessRole: Role }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionListItem | null>(null);
  const [initialPoId, setInitialPoId] = useState<string | undefined>();
  const [rejectTarget, setRejectTarget] = useState<TransactionListItem | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (typeFilter) queryParams.set("type", typeFilter);
  if (statusFilter) queryParams.set("status", statusFilter);
  if (search.trim()) queryParams.set("search", search.trim());
  if (startDate) queryParams.set("start_date", startDate);
  if (endDate) queryParams.set("end_date", endDate);

  const transactions = useQuery({
    queryKey: [
      "transactions",
      accessRole,
      page,
      typeFilter,
      statusFilter,
      search,
      startDate,
      endDate,
    ],
    queryFn: () =>
      apiPaginated<TransactionListItem>(
        `/api/transactions?${queryParams.toString()}`,
      ),
  });

  const products = useQuery({
    queryKey: ["products-for-outgoing"],
    enabled: accessRole === "staff",
    queryFn: () =>
      api<OutgoingProductOption[]>("/api/products?page=1&limit=100"),
  });

  const inspectingPos = useQuery({
    queryKey: ["inspecting-pos"],
    enabled: accessRole === "staff",
    queryFn: () =>
      api<InspectingPoOption[]>(
        "/api/restock-orders?page=1&limit=100&available_for_incoming=true",
      ),
  });

  useEffect(() => {
    if (open && !editing && accessRole === "staff") {
      inspectingPos.refetch();
    }
  }, [open, editing, accessRole, inspectingPos.refetch]);

  useEffect(() => {
    const restockId = searchParams.get("restock_order_id");
    if (accessRole === "staff" && restockId) {
      setEditing(null);
      setInitialPoId(restockId);
      setOpen(true);
    }
  }, [accessRole, searchParams]);

  const action = useMutation({
    mutationFn: ({
      method,
      url,
      body,
    }: {
      method: string;
      url: string;
      body?: object;
    }) => api<ReviewResponse>(url, method, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inspecting-pos"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setRejectTarget(null);
      if (
        accessRole === "manager" &&
        data?.redirectToRefund &&
        data?.restock_order_id
      ) {
        router.push(`/manager/restock-orders/${data.restock_order_id}`);
      }
    },
  });

  const submit = useMutation({
    mutationFn: (payload: TransactionSubmitPayload) => {
      if (payload.editingId) {
        return api(`/api/transactions/${payload.editingId}`, "PATCH", {
          transaction_date: payload.transaction_date,
          customer_name: payload.customer_name,
          notes: payload.notes,
          proof_image_url: payload.proof_image_url,
          items: payload.items,
        });
      }
      if (payload.isIncoming) {
        return api("/api/transactions/incoming", "POST", {
          transaction_date: payload.transaction_date,
          restock_order_id: payload.restock_order_id,
          notes: payload.notes,
          proof_image_url: payload.proof_image_url,
          items: payload.items,
        });
      }
      return api("/api/transactions/outgoing", "POST", {
        transaction_date: payload.transaction_date,
        customer_name: payload.customer_name,
        notes: payload.notes,
        items: payload.items,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inspecting-pos"] });
      setOpen(false);
      setEditing(null);
      setInitialPoId(undefined);
    },
  });

  const rows = transactions.data?.data ?? [];
  const meta = transactions.data?.meta;

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Daftar Transaksi</h1>
          <p className="text-sm text-muted-foreground">
            Kelola dan pantau mutasi barang masuk dan barang keluar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {accessRole === "staff" && (
            <Button
              onClick={() => {
                setEditing(null);
                setInitialPoId(undefined);
                setOpen(true);
              }}
            >
              <Plus /> Buat Transaksi
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Cari nomor / PO / pihak..."
        />
        {accessRole !== "supplier" && (
          <div className="relative w-full">
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-card px-3 text-sm appearance-none w-full"
            >
              <option value="">Semua Tipe</option>
              <option value="INCOMING">INCOMING</option>
              <option value="OUTGOING">OUTGOING</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-800">
              <HugeiconsIcon icon={ChevronDownIcon} />
            </div>
          </div>
        )}
        <div className="relative w-full">
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm appearance-none w-full"
          >
            <option value="">Semua Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Shipped">Shipped</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-800">
            <HugeiconsIcon icon={ChevronDownIcon} />
          </div>
        </div>
        <Input
          type="date"
          value={startDate}
          onChange={(event) => {
            setStartDate(event.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          value={endDate}
          onChange={(event) => {
            setEndDate(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full overflow-hidden">
          {transactions.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              <TransactionTable
                accessRole={accessRole}
                currentUserId={session?.user?.id}
                transactions={rows}
                isPending={action.isPending}
                onApprove={(id) =>
                  action.mutate({
                    method: "PATCH",
                    url: `/api/transactions/${id}/review`,
                    body: { action: "Approved" },
                  })
                }
                onReject={(trx) => setRejectTarget(trx)}
                onShip={(id) =>
                  action.mutate({
                    method: "PATCH",
                    url: `/api/transactions/${id}/ship`,
                  })
                }
                onEdit={(trx) => {
                  setEditing(trx);
                  setOpen(true);
                }}
                onDelete={(trx) => {
                  if (
                    window.confirm(`Hapus transaksi ${trx.transaction_number}?`)
                  ) {
                    action.mutate({
                      method: "DELETE",
                      url: `/api/transactions/${trx.id}`,
                    });
                  }
                }}
              />
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

      {action.isError && (
        <p className="text-sm text-destructive">{action.error.message}</p>
      )}

      {accessRole === "staff" && (
        <TransactionFormSheet
          open={open}
          editing={editing}
          initialPoId={initialPoId}
          inspectingPos={inspectingPos.data ?? EMPTY_INSPECTING_POS}
          isLoadingPos={inspectingPos.isLoading || inspectingPos.isFetching}
          posError={
            inspectingPos.isError ? inspectingPos.error.message : undefined
          }
          products={products.data ?? EMPTY_OUTGOING_PRODUCTS}
          isPending={submit.isPending}
          errorMessage={submit.isError ? submit.error.message : undefined}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setEditing(null);
              setInitialPoId(undefined);
            }
          }}
          onSubmit={(payload) => submit.mutate(payload)}
        />
      )}

      <TransactionRejectSheet
        target={rejectTarget}
        isPending={action.isPending}
        onClose={() => setRejectTarget(null)}
        onConfirm={(id, rejection_reason) =>
          action.mutate({
            method: "PATCH",
            url: `/api/transactions/${id}/review`,
            body: { action: "Rejected", rejection_reason },
          })
        }
      />
    </div>
  );
}
