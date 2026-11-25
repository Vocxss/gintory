"use client";

import {
  CategoryFormSheet,
  type CategoryFormValues,
  type CategoryItem,
} from "@/components/features/categoryFormSheet";
import { TablePagination } from "@/components/features/tablePagination";
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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const PAGE_SIZE = 20;

type Meta = { page: number; limit: number; total: number; totalPages: number };
type Payload<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: Meta;
};

async function api<T>(url: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as Payload<T>;
  if (!response.ok) throw new Error(payload.message);
  return payload.data;
}

async function apiPaginated<T>(
  url: string,
): Promise<{ data: T[]; meta: Meta }> {
  const response = await fetch(url);
  const payload = (await response.json()) as Payload<T[]>;
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

export function CategoryManagement() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [page, setPage] = useState(1);

  const categories = useQuery({
    queryKey: ["categories", page],
    queryFn: () =>
      apiPaginated<CategoryItem>(
        `/api/categories?page=${page}&limit=${PAGE_SIZE}`,
      ),
  });

  const save = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      editing
        ? api(`/api/categories/${editing.id}`, "PATCH", values)
        : api("/api/categories", "POST", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/categories/${id}`, "DELETE"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const rows = categories.data?.data ?? [];
  const meta = categories.data?.meta;

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Kategori Produk</h1>
          <p className="text-sm text-muted-foreground">
            Kelola kategori katalog Gintory secara dinamis
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> Tambah Kategori
        </Button>
      </div>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Daftar Kategori</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full overflow-hidden">
          {categories.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Jumlah Produk</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length ? (
                    rows.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell>{category.description}</TableCell>
                        <TableCell>{category.product_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="icon-xs"
                              variant="outline"
                              onClick={() => {
                                setEditing(category);
                                setOpen(true);
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="destructive"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Hapus kategori ${category.name}?`,
                                  )
                                ) {
                                  remove.mutate(category.id);
                                }
                              }}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        Belum ada kategori
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

      <CategoryFormSheet
        open={open}
        editing={editing}
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
