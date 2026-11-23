"use client";

import {
  AlertTriangle,
  Boxes,
  Clock3,
  PackageCheck,
  PackageSearch,
  PackageX,
  RotateCcw,
  ShoppingCart,
  Truck,
  UserCheck,
  Wallet,
} from "lucide-react";
import { KPICard } from "@/components/kpiCard";

export type DashboardData = {
  total_products?: number;
  total_inventory_value?: number;
  stock?: {
    normal_count: number;
    low_count: number;
    severe_count: number;
    out_of_stock_count: number;
  };
  critical_products?: Array<{
    id: string;
    sku: string;
    name: string;
    current_stock: number;
    min_stock: number;
    low_stock: number;
    unit: string;
    stock_status: string;
  }>;
  pending_transactions?: number;
  pending_suppliers?: number;
  pending_inspect_orders?: number;
  returned_orders?: number;
  inspecting_orders?: number;
  pending_orders?: number;
  active_orders?: number;
  received_orders?: number;
  total_orders?: number;
  ready_to_ship?: number;
  available_incoming_orders?: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export function DashboardKpiGrid({
  role,
  summary,
}: {
  role: "admin" | "manager" | "staff" | "supplier";
  summary: DashboardData;
}) {
  if (role === "admin") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPICard
          title="Total Nilai Inventori"
          value={formatCurrency(summary.total_inventory_value ?? 0)}
          icon={<Wallet className="size-5" />}
        />
        <KPICard
          title="Total Produk"
          value={String(summary.total_products ?? 0)}
          icon={<Boxes className="size-5" />}
        />
        <KPICard
          title="Supplier Menunggu"
          value={String(summary.pending_suppliers ?? 0)}
          icon={<UserCheck className="size-5" />}
        />
        <KPICard
          title="Transaksi Menunggu"
          value={String(summary.pending_transactions ?? 0)}
          icon={<Clock3 className="size-5" />}
        />
        <KPICard
          title="Stok Normal"
          value={String(summary.stock?.normal_count ?? 0)}
          icon={<PackageCheck className="size-5" />}
        />
        <KPICard
          title="Stok Rendah (Low)"
          value={String(summary.stock?.low_count ?? 0)}
          icon={<AlertTriangle className="size-5" />}
        />
        <KPICard
          title="Stok Kritis (Severe)"
          value={String(summary.stock?.severe_count ?? 0)}
          icon={<PackageX className="size-5" />}
        />
        <KPICard
          title="Stok Habis"
          value={String(summary.stock?.out_of_stock_count ?? 0)}
          icon={<PackageX className="size-5" />}
        />
      </div>
    );
  }

  if (role === "manager") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPICard
          title="Transaksi Menunggu"
          value={String(summary.pending_transactions ?? 0)}
          icon={<Clock3 className="size-5" />}
        />
        <KPICard
          title="PO Menunggu Inspeksi"
          value={String(summary.pending_inspect_orders ?? 0)}
          icon={<PackageSearch className="size-5" />}
        />
        <KPICard
          title="PO Diretur (Returned)"
          value={String(summary.returned_orders ?? 0)}
          icon={<RotateCcw className="size-5" />}
        />
        <KPICard
          title="Total Produk"
          value={String(summary.total_products ?? 0)}
          icon={<Boxes className="size-5" />}
        />
        <KPICard
          title="Stok Normal"
          value={String(summary.stock?.normal_count ?? 0)}
          icon={<PackageCheck className="size-5" />}
        />
        <KPICard
          title="Stok Rendah (Low)"
          value={String(summary.stock?.low_count ?? 0)}
          icon={<AlertTriangle className="size-5" />}
        />
        <KPICard
          title="Stok Kritis (Severe)"
          value={String(summary.stock?.severe_count ?? 0)}
          icon={<PackageX className="size-5" />}
        />
        <KPICard
          title="Stok Habis"
          value={String(summary.stock?.out_of_stock_count ?? 0)}
          icon={<PackageX className="size-5" />}
        />
      </div>
    );
  }

  if (role === "staff") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard
          title="PO Siap Diperiksa"
          value={String(summary.inspecting_orders ?? 0)}
          icon={<PackageSearch className="size-5" />}
        />
        <KPICard
          title="Transaksi Pending Saya"
          value={String(summary.pending_transactions ?? 0)}
          icon={<Clock3 className="size-5" />}
        />
        <KPICard
          title="Siap Packing & Kirim"
          value={String(summary.ready_to_ship ?? 0)}
          icon={<Truck className="size-5" />}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <KPICard
        title="PO Menunggu Konfirmasi"
        value={String(summary.pending_orders ?? 0)}
        icon={<Clock3 className="size-5" />}
      />
      <KPICard
        title="PO Aktif"
        value={String(summary.active_orders ?? 0)}
        icon={<Truck className="size-5" />}
      />
      <KPICard
        title="PO Diterima (Received)"
        value={String(summary.received_orders ?? 0)}
        icon={<ShoppingCart className="size-5" />}
      />
      <KPICard
        title="PO Diretur (Returned)"
        value={String(summary.returned_orders ?? 0)}
        icon={<RotateCcw className="size-5" />}
      />
    </div>
  );
}
