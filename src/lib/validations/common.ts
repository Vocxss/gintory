import { z } from "zod";

export const imagePathSchema = z
  .string()
  .trim()
  .min(1, "Gambar wajib diunggah")
  .refine(
    (val) =>
      val.startsWith("/") ||
      val.startsWith("http://") ||
      val.startsWith("https://"),
    "Format path atau URL gambar tidak valid",
  );

export const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

export const optionalNullableString = z.preprocess(
  (val) => (val === "" ? null : val),
  z.string().trim().nullable().optional(),
);

export const optionalNullableUuid = z.preprocess(
  (val) => (val === "" ? null : val),
  z.uuid("Format UUID tidak valid").nullable().optional(),
);
