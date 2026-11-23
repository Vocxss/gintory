import { optionalNullableString } from "@/lib/validations/common";
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .email("Masukkan email dengan benar")
    .regex(/^[a-zA-Z0-9.]+@gintory\.id$/, {
      message: "Hanya terdiri huruf, angka dan domain @gintory.id",
    })
    .trim(),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Masukkan nama lengkap dengan benar"),
  email: z.email("Masukkan email dengan benar").trim(),
  password: z.string().min(8, "Password minimal 8 karakter"),
  company_name: z
    .string()
    .trim()
    .min(1, "Masukkan nama perusahaan dengan benar"),
});

export const createUserSchema = z
  .object({
    full_name: z.string().trim().min(2, "Nama lengkap minimal 2 karakter"),
    email: z
      .email("Email tidak valid")
      .regex(/^[a-zA-Z0-9.]+@gintory\.id$/, {
        message: "Hanya terdiri huruf, angka dan domain @gintory.id",
      })
      .trim(),
    password: z.string().min(8, "Password minimal 8 karakter"),
    role: z.enum(["admin", "manager", "staff", "supplier"]),
    company_name: optionalNullableString,
  })
  .refine(
    (value) => value.role !== "supplier" || Boolean(value.company_name?.trim()),
    {
      message: "Nama perusahaan wajib diisi untuk akun supplier",
      path: ["company_name"],
    },
  );

export const updateUserSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Nama lengkap minimal 2 karakter")
      .optional(),
    email: z
      .email("Email tidak valid")
      .regex(/^[a-zA-Z0-9.]+@gintory\.id$/, {
        message: "Hanya terdiri huruf, angka dan domain @gintory.id",
      })
      .trim()
      .optional(),
    password: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.string().min(8, "Password minimal 8 karakter").optional(),
    ),
    role: z.enum(["admin", "manager", "staff", "supplier"]).optional(),
    company_name: optionalNullableString,
    supplier_status: z.enum(["Pending", "Approved", "Rejected"]).optional(),
    rejection_reason: optionalNullableString,
  })
  .refine(
    (value) =>
      value.supplier_status !== "Rejected" ||
      Boolean(value.rejection_reason?.trim()),
    {
      message: "Alasan penolakan wajib diisi",
      path: ["rejection_reason"],
    },
  );
