"use client";

import { ChevronDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  ProductFormSheet,
  type ProductFormValues,
  type ProductItem,
} from "@/components/features/productFormSheet";
import { TablePagination } from "@/components/features/tablePagination";
import { StockStatusBadge } from "@/components/statusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

type Category = { id: string; name: string };
type Supplier = { id: string; full_name: string; company_name: string | null };
type Meta = { page: number; limit: number; total: number; totalPages: number };
type PaginatedResult<T> = { data: T[]; meta: Meta };

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

async function apiPaginated<T>(url: string): Promise<PaginatedResult<T>> {
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

export function ProductManagement({
  accessRole,
}: {
  accessRole: "admin" | "manager";
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState("");

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (search.trim()) queryParams.set("search", search.trim());
  if (categoryId) queryParams.set("category_id", categoryId);
  if (stockStatus) queryParams.set("stock_status", stockStatus);

  const products = useQuery({
    queryKey: ["products", accessRole, page, search, categoryId, stockStatus],
    queryFn: () =>
      apiPaginated<ProductItem>(`/api/products?${queryParams.toString()}`),
  });

  const categories = useQuery({
    queryKey: ["categories-options"],
    queryFn: () => api<Category[]>("/api/categories?page=1&limit=100"),
  });

  const suppliers = useQuery({
    queryKey: ["suppliers-approved"],
    queryFn: () => api<Supplier[]>("/api/suppliers?status=Approved"),
  });

  const save = useMutation({
    mutationFn: (values: ProductFormValues) => {
      if (editing) {
        if (accessRole === "manager") {
          return api(`/api/products/${editing.id}`, "PATCH", {
            rack_location: values.rack_location,
            min_stock: values.min_stock,
            low_stock: values.low_stock,
            unit: values.unit,
            description: values.description,
            image_url: values.image_url,
          });
        }
        const {
          sku: _sku,
          current_stock: _currentStock,
          ...adminUpdatePayload
        } = values;
        return api(`/api/products/${editing.id}`, "PATCH", adminUpdatePayload);
      }
      return api("/api/products", "POST", {
        ...values,
        current_stock: accessRole === "manager" ? 0 : values.current_stock,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: (product: ProductItem) =>
      api(
        `/api/products/${product.id}${product.current_stock > 0 ? "?confirm=true" : ""}`,
        "DELETE",
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const productRows = products.data?.data ?? [];
  const meta = products.data?.meta;

  const supplierOptions = [
    ...(suppliers.data?.map((s) => ({
      id: s.id,
      name: s.company_name ?? s.full_name,
    })) ?? []),
  ];
  if (
    editing &&
    !supplierOptions.some((option) => option.id === editing.supplier_id)
  ) {
    supplierOptions.push({
      id: editing.supplier_id,
      name: editing.supplier_company ?? "Supplier Terdaftar",
    });
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Produk</h1>
          <p className="text-sm text-muted-foreground">
            Master katalog produk Gintory
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> Tambah Produk
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Cari nama atau SKU..."
        />
        <div className="relative w-full">
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm appearance-none w-full"
          >
            <option value="">Semua Kategori</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-800">
            <HugeiconsIcon icon={ChevronDownIcon} />
          </div>
        </div>
        <div className="relative w-full">
          <select
            value={stockStatus}
            onChange={(event) => {
              setStockStatus(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm appearance-none w-full"
          >
            <option value="">Semua Status Stok</option>
            <option value="Normal">Normal</option>
            <option value="Low">Low</option>
            <option value="Severe">Severe</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-800">
            <HugeiconsIcon icon={ChevronDownIcon} />
          </div>
        </div>
      </div>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Daftar Produk</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full overflow-hidden">
          {products.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productRows.length ? (
                    productRows.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.category_name}</TableCell>
                        <TableCell>{product.supplier_company ?? "-"}</TableCell>
                        <TableCell>
                          {product.current_stock} {product.unit}
                        </TableCell>
                        <TableCell>
                          <StockStatusBadge status={product.stock_status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="icon-xs"
                              variant="outline"
                              onClick={() => {
                                setEditing(product);
                                setOpen(true);
                              }}
                            >
                              <Pencil />
                            </Button>
                            {accessRole === "admin" && (
                              <Button
                                disabled={product.current_stock > 0}
                                size="icon-xs"
                                variant="destructive"
                                onClick={() => {
                                  const warning =
                                    product.current_stock > 0
                                      ? `Produk ${product.name} masih memiliki stok ${product.current_stock} ${product.unit}. Tetap hapus?`
                                      : `Hapus produk ${product.name}?`;
                                  if (window.confirm(warning)) {
                                    remove.mutate(product);
                                  }
                                }}
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        Tidak ada produk
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

      {remove.isError && (
        <p className="text-sm text-destructive">{remove.error.message}</p>
      )}

      <ProductFormSheet
        accessRole={accessRole}
        open={open}
        editing={editing}
        categories={categories.data ?? []}
        suppliers={supplierOptions}
        isPending={save.isPending}
        errorMessage={save.isError ? save.error.message : undefined}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setEditing(null);
        }}
        onSubmit={(values) => save.mutate(values)}
      />
    </div>
  );
}
