import z from "zod";

export const loginSchema = z.object({
  email: z.email().min(10, "Masukkan email dengan benar"),
  password: z.string().min(8, "Masukkan password dengan benar"),
});

