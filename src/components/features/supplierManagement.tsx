"use client";

import { TablePagination } from "@/components/features/tablePagination";
import { WorkflowStatusBadge } from "@/components/statusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const PAGE_SIZE = 20;

type Supplier = {
  id: string;
  full_name: string;
  email: string;
  company_name: string | null;
  supplier_status: "Pending" | "Approved" | "Rejected";
  rejection_reason: string | null;
};

type Payload = { success: boolean; message: string; data: Supplier[] };

const rejectSupplierSchema = z.object({
  rejection_reason: z.string().trim().min(1, "Alasan penolakan wajib diisi"),
});

async function api<T>(url: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as Payload;
  if (!response.ok) throw new Error(payload.message);
  return payload.data as T;
}

export function SupplierManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<Supplier | null>(null);
  const rejectForm = useForm<z.infer<typeof rejectSupplierSchema>>({
    resolver: zodResolver(rejectSupplierSchema),
    defaultValues: { rejection_reason: "" },
  });

  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api<Supplier[]>("/api/suppliers"),
  });

  const verify = useMutation({
    mutationFn: ({
      id,
      status,
      rejection_reason,
    }: {
      id: string;
      status: "Approved" | "Rejected";
      rejection_reason?: string;
    }) =>
      api(`/api/suppliers/${id}/verify`, "PATCH", {
        supplier_status: status,
        rejection_reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setRejectTarget(null);
      rejectForm.reset();
    },
  });

  const allSuppliers = suppliers.data ?? [];
  const totalPages = Math.max(1, Math.ceil(allSuppliers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedSuppliers = allSuppliers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Verifikasi Supplier</h1>
        <p className="text-sm text-muted-foreground">
          Setujui atau tolak pendaftaran akun supplier baru
        </p>
      </div>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Daftar Supplier</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full overflow-hidden">
          {suppliers.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Perusahaan</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alasan Penolakan</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedSuppliers.length ? (
                    pagedSuppliers.map((supplier) => (
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
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                          {supplier.rejection_reason ?? "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {supplier.supplier_status !== "Approved" &&
                              supplier.supplier_status !== "Rejected" && (
                                <Button
                                  size="sm"
                                  disabled={verify.isPending}
                                  onClick={() =>
                                    verify.mutate({
                                      id: supplier.id,
                                      status: "Approved",
                                    })
                                  }
                                >
                                  Setujui
                                </Button>
                              )}
                            {supplier.supplier_status === "Pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={verify.isPending}
                                onClick={() => {
                                  rejectForm.reset({ rejection_reason: "" });
                                  setRejectTarget(supplier);
                                }}
                              >
                                Tolak
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Belum ada supplier terdaftar
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                total={allSuppliers.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {verify.isError && (
        <p className="text-sm text-destructive">{verify.error.message}</p>
      )}

      <Sheet
        open={Boolean(rejectTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setRejectTarget(null);
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Tolak Pendaftaran Supplier</SheetTitle>
          </SheetHeader>
          {rejectTarget && (
            <form
              className="p-6"
              onSubmit={rejectForm.handleSubmit((values) =>
                verify.mutate({
                  id: rejectTarget.id,
                  status: "Rejected",
                  rejection_reason: values.rejection_reason,
                }),
              )}
            >
              <FieldGroup>
                <p className="text-sm text-muted-foreground">
                  Menolak akun{" "}
                  <strong>
                    {rejectTarget.company_name ?? rejectTarget.full_name}
                  </strong>
                  . Alasan penolakan wajib diisi.
                </p>
                <Controller
                  name="rejection_reason"
                  control={rejectForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="supplier-reject-reason">
                        Alasan penolakan
                      </FieldLabel>
                      <Textarea
                        {...field}
                        id="supplier-reject-reason"
                        placeholder="Contoh: nama perusahaan tidak dapat diverifikasi"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={verify.isPending}
                  >
                    Konfirmasi Tolak
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRejectTarget(null)}
                  >
                    Batal
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
