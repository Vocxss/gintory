import z from "zod";

export const loginSchema = z.object({
  email: z.email().min(10, "Masukkan email dengan benar"),
  password: z.string().min(8, "Masukkan password dengan benar"),
});

export const registerSchema = z.object({
  full_name: z.string().min(2, "Masukkan nama lengkap dengan benar"),
  email: z.email().min(10, "Masukkan email dengan benar"),
  password: z.string().min(8, "Masukkan password dengan benar"),
  company_name: z.string().min(1, "Masukkan nama perusahaan dengan benar"),
});
