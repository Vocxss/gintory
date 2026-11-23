"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import type { DashboardData } from "@/components/admin/dashboardKpiGrid";
import {
  StockStatusBadge,
  WorkflowStatusBadge,
} from "@/components/statusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DashboardTransaction = {
  id: string;
  transaction_number: string;
  type: "INCOMING" | "OUTGOING";
  status: string;
  transaction_date: string;
  supplier_company: string | null;
  customer_name: string | null;
};

export type DashboardSupplier = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string;
  supplier_status: string;
};

export type DashboardRestockOrder = {
  id: string;
  po_number: string;
  status: string;
  order_date: string;
  supplier_company: string | null;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export function DashboardTables({
  role,
  summary,
  transactions,
  suppliers,
  restockOrders,
}: {
  role: "admin" | "manager" | "staff" | "supplier";
  summary: DashboardData;
  transactions: DashboardTransaction[];
  suppliers: DashboardSupplier[];
  restockOrders: DashboardRestockOrder[];
}) {
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      {(role === "admin" || role === "manager") && (
        <Card className="min-w-0 max-w-full overflow-hidden">
          <CardHeader>
            <CardTitle>Produk Stok Kritis & Rendah</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 max-w-full overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Min / Low</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.critical_products?.length ? (
                  summary.critical_products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>
                        {product.current_stock} {product.unit}
                      </TableCell>
                      <TableCell>
                        {product.min_stock} / {product.low_stock}
                      </TableCell>
                      <TableCell>
                        <StockStatusBadge status={product.stock_status} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      Tidak ada produk kritis
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {role === "admin" && (
        <Card className="min-w-0 max-w-full overflow-hidden">
          <CardHeader>
            <CardTitle>Supplier Menunggu Verifikasi</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 max-w-full overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length ? (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        {supplier.full_name}
                      </TableCell>
                      <TableCell>{supplier.company_name ?? "-"}</TableCell>
                      <TableCell>{supplier.email}</TableCell>
                      <TableCell>
                        <WorkflowStatusBadge
                          status={supplier.supplier_status}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      Tidak ada supplier menunggu verifikasi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(role === "manager" || role === "staff" || role === "supplier") && (
        <Card className="min-w-0 max-w-full overflow-hidden">
          <CardHeader>
            <CardTitle>
              {role === "staff"
                ? "PO Siap Diperiksa (Inspecting)"
                : "Purchase Order Terbaru"}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 max-w-full overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. PO</TableHead>
                  {role !== "supplier" && <TableHead>Supplier</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restockOrders.length ? (
                  restockOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.po_number}
                      </TableCell>
                      {role !== "supplier" && (
                        <TableCell>{order.supplier_company ?? "-"}</TableCell>
                      )}
                      <TableCell>
                        <WorkflowStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>{formatDate(order.order_date)}</TableCell>
                      <TableCell>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          nativeButton={false}
                          aria-label={`Detail PO ${order.po_number}`}
                          render={
                            <Link
                              href={`/${role}/restock-orders/${order.id}`}
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
                      colSpan={role === "supplier" ? 4 : 5}
                      className="text-center text-muted-foreground"
                    >
                      Belum ada purchase order
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(role === "admin" || role === "manager" || role === "staff") && (
        <Card className="min-w-0 max-w-full overflow-hidden">
          <CardHeader>
            <CardTitle>Aktivitas Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 max-w-full overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Pihak</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length ? (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {transaction.transaction_number}
                      </TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>
                        {transaction.supplier_company ??
                          transaction.customer_name ??
                          "-"}
                      </TableCell>
                      <TableCell>
                        <WorkflowStatusBadge status={transaction.status} />
                      </TableCell>
                      <TableCell>
                        {formatDate(transaction.transaction_date)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      Belum ada transaksi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
