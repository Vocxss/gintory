"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  type InternalUserFormValues,
  type ManagedUser,
  UserFormSheet,
} from "@/components/admin/userFormSheet";
import { TablePagination } from "@/components/features/tablePagination";
import { RoleBadge, WorkflowStatusBadge } from "@/components/statusBadge";
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

type ApiPayload = {
  success: boolean;
  message: string;
  data: ManagedUser | ManagedUser[];
};

async function requestJson<T>(
  url: string,
  method = "GET",
  body?: object,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as ApiPayload;
  if (!response.ok) throw new Error(payload.message);
  return payload.data as T;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export function UserManagement() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users", roleFilter],
    queryFn: () =>
      requestJson<ManagedUser[]>(
        roleFilter === "all" ? "/api/users" : `/api/users?role=${roleFilter}`,
      ),
  });

  const saveMutation = useMutation({
    mutationFn: (values: InternalUserFormValues) => {
      if (editing) {
        const body: Record<string, unknown> = {
          full_name: values.full_name,
          email: values.email,
        };
        if (values.password) body.password = values.password;
        return requestJson(`/api/users/${editing.id}`, "PATCH", body);
      }
      return requestJson("/api/users", "POST", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => requestJson(`/api/users/${id}`, "DELETE"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const filteredUsers =
    usersQuery.data?.filter((user) =>
      `${user.full_name} ${user.email} ${user.company_name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) ?? [];

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Kelola Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun internal gudang dan pantau seluruh akun terdaftar
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> Tambah Akun Internal
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, email, atau perusahaan..."
          />
        </div>
      </div>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full overflow-hidden">
          {usersQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Perusahaan / Status</TableHead>
                    <TableHead>Terdaftar</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedUsers.length ? (
                    pagedUsers.map((user) => {
                      const isSelf = session?.user?.id === user.id;
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.full_name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <RoleBadge role={user.role} />
                          </TableCell>
                          <TableCell>
                            {user.role === "supplier" ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs">
                                  {user.company_name ?? "-"}
                                </span>
                                {user.supplier_status && (
                                  <WorkflowStatusBadge
                                    status={user.supplier_status}
                                  />
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Internal Gudang
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {user.role !== "supplier" && (
                                <Button
                                  size="icon-xs"
                                  variant="outline"
                                  aria-label={`Edit ${user.full_name}`}
                                  onClick={() => {
                                    setEditing(user);
                                    setOpen(true);
                                  }}
                                >
                                  <Pencil />
                                </Button>
                              )}
                              <Button
                                size="icon-xs"
                                variant="destructive"
                                disabled={isSelf || deleteMutation.isPending}
                                title={
                                  isSelf
                                    ? "Tidak dapat menghapus akun sendiri"
                                    : `Hapus ${user.full_name}`
                                }
                                aria-label={`Hapus ${user.full_name}`}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Hapus akun ${user.full_name}?`,
                                    )
                                  ) {
                                    deleteMutation.mutate(user.id);
                                  }
                                }}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Tidak ada pengguna
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                total={filteredUsers.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {deleteMutation.isError && (
        <p className="text-sm text-destructive">
          {deleteMutation.error.message}
        </p>
      )}

      <UserFormSheet
        open={open}
        editing={editing}
        isPending={saveMutation.isPending}
        errorMessage={
          saveMutation.isError ? saveMutation.error.message : undefined
        }
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setEditing(null);
        }}
        onSubmit={(values) => saveMutation.mutate(values)}
      />
    </div>
  );
}
