"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/inputGroup";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { UserRole } from "@/lib/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Eye, EyeClosed, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

export type ManagedUser = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  company_name: string | null;
  supplier_status: "Pending" | "Approved" | "Rejected" | null;
  rejection_reason: string | null;
  created_at: string;
};

const userFormSchema = z
  .object({
    full_name: z.string().trim().min(2, "Nama lengkap minimal 2 karakter"),
    email: z.email("Email tidak valid").trim(),
    role: z.enum(["admin", "manager", "staff"]),
    password: z.string(),
  })
  .refine(
    (value) => value.password.length === 0 || value.password.length >= 8,
    {
      message: "Password minimal 8 karakter",
      path: ["password"],
    },
  );

export type InternalUserFormValues = z.infer<typeof userFormSchema>;

export function UserFormSheet({
  open,
  editing,
  isPending,
  errorMessage,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  editing: ManagedUser | null;
  isPending: boolean;
  errorMessage?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InternalUserFormValues) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<InternalUserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      role: "staff",
      password: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        full_name: editing.full_name,
        email: editing.email,
        role:
          editing.role === "supplier"
            ? "staff"
            : (editing.role as "admin" | "manager" | "staff"),
        password: "",
      });
    } else {
      form.reset({
        full_name: "",
        email: "",
        role: "staff",
        password: "",
      });
    }
  }, [editing, form, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {editing ? "Edit Akun Internal" : "Tambah Akun Internal"}
          </SheetTitle>
        </SheetHeader>
        <form
          className="p-6"
          onSubmit={form.handleSubmit((values) => {
            if (!editing && values.password.length < 8) {
              form.setError("password", {
                message: "Password minimal 8 karakter",
              });
              return;
            }
            onSubmit(values);
          })}
        >
          <FieldGroup>
            <Controller
              name="full_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="user-full-name">Nama lengkap</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <UserRound />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="user-full-name"
                      placeholder="Nama lengkap"
                    />
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="user-email">Email</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <Mail />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="user-email"
                      type="email"
                      placeholder="nama@gintory.local"
                    />
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            {!editing && (
              <Controller
                name="role"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="user-role">Role</FieldLabel>
                    <div className="relative w-full">
                      <select
                        {...field}
                        id="user-role"
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm appearance-none"
                      >
                        <option value="manager">Warehouse Manager</option>
                        <option value="staff">Staff Gudang</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-800">
                        <HugeiconsIcon icon={ChevronDownIcon} />
                      </div>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="user-password">Password</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <LockKeyhole />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="user-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        editing
                          ? "Kosongkan jika tidak diubah"
                          : "Minimal 8 karakter"
                      }
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? <Eye /> : <EyeClosed />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
            </div>
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  );
}
