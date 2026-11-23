"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  type DashboardData,
  DashboardKpiGrid,
} from "@/components/admin/dashboardKpiGrid";
import {
  type DashboardRestockOrder,
  type DashboardSupplier,
  DashboardTables,
  type DashboardTransaction,
} from "@/components/admin/dashboardTables";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

type DashboardRole = "admin" | "manager" | "staff" | "supplier";

type ApiPayload<T> = {
  success: boolean;
  message: string;
  data: T;
};

type DashboardResult = {
  summary: DashboardData;
  transactions: DashboardTransaction[];
  suppliers: DashboardSupplier[];
  restockOrders: DashboardRestockOrder[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = (await response.json()) as ApiPayload<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message);
  }
  return payload.data;
}

export function RoleDashboard({
  dashboardRole,
}: {
  dashboardRole: DashboardRole;
}) {
  const { data: session } = useSession();
  const sessionRole = session?.user?.role;

  const dashboardQuery = useQuery<DashboardResult>({
    queryKey: ["dashboard", dashboardRole],
    enabled: Boolean(sessionRole),
    queryFn: async () => {
      const summary = await fetchJson<DashboardData>("/api/dashboard/summary");
      const canViewTransactions =
        dashboardRole === "admin" ||
        dashboardRole === "manager" ||
        dashboardRole === "staff";
      const canViewSuppliers = dashboardRole === "admin";
      const canViewRestockOrders =
        dashboardRole === "manager" ||
        dashboardRole === "staff" ||
        dashboardRole === "supplier";

      const [transactions, suppliers, restockOrders] = await Promise.all([
        canViewTransactions
          ? fetchJson<DashboardTransaction[]>(
              "/api/transactions?page=1&limit=5",
            )
          : Promise.resolve([]),
        canViewSuppliers
          ? fetchJson<DashboardSupplier[]>("/api/suppliers?status=Pending")
          : Promise.resolve([]),
        canViewRestockOrders
          ? fetchJson<DashboardRestockOrder[]>(
              dashboardRole === "staff"
                ? "/api/restock-orders?page=1&limit=5&available_for_incoming=true"
                : "/api/restock-orders?page=1&limit=5",
            )
          : Promise.resolve([]),
      ]);

      return { summary, transactions, suppliers, restockOrders };
    },
  });

  if (!sessionRole || dashboardQuery.isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center gap-2 py-16">
        <Spinner />
        <span>Memuat dashboard...</span>
      </div>
    );
  }

  if (sessionRole !== dashboardRole) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Dashboard tidak sesuai akses</EmptyTitle>
          <EmptyDescription>
            Halaman ini hanya tersedia untuk role {dashboardRole}.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Gagal memuat dashboard</EmptyTitle>
          <EmptyDescription>{dashboardQuery.error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!dashboardQuery.data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan operasional gudang sesuai peran Anda
        </p>
      </div>

      <DashboardKpiGrid
        role={dashboardRole}
        summary={dashboardQuery.data.summary}
      />

      <DashboardTables
        role={dashboardRole}
        summary={dashboardQuery.data.summary}
        transactions={dashboardQuery.data.transactions}
        suppliers={dashboardQuery.data.suppliers}
        restockOrders={dashboardQuery.data.restockOrders}
      />
    </div>
  );
}
