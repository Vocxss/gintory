import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UserRole } from "@/lib/types/database";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const UPLOAD_PERMISSIONS: Record<string, UserRole[]> = {
  categories: ["admin", "manager"],
  products: ["admin", "manager"],
  proofs: ["admin", "manager", "staff", "supplier"],
};

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function POST(request: Request) {
  const access = await requireRole(["admin", "manager", "staff", "supplier"]);
  if ("response" in access) return access.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const uploadType = String(formData.get("type") ?? "").trim();
    const prefixRaw = String(formData.get("prefix") ?? "").trim();

    const allowedRoles = UPLOAD_PERMISSIONS[uploadType];
    if (!allowedRoles) {
      return errorResponse(
        "Jenis upload tidak valid (gunakan categories, products, atau proofs)",
        400,
      );
    }

    if (!allowedRoles.includes(access.user.role)) {
      return errorResponse(
        "Anda tidak memiliki izin untuk mengunggah jenis gambar ini",
        403,
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return errorResponse("File gambar wajib dipilih", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("Ukuran file maksimal 5MB", 400);
    }

    const extension = MIME_EXTENSIONS[file.type];
    if (!extension) {
      return errorResponse("Format gambar harus JPG, PNG, WEBP, atau GIF", 400);
    }

    const baseName =
      sanitizeSegment(prefixRaw) ||
      sanitizeSegment(file.name.replace(/\.[^.]+$/, "")) ||
      uploadType;
    const uniqueSuffix = crypto.randomUUID().slice(0, 8);
    const filename = `${baseName}-${uniqueSuffix}.${extension}`;

    const targetDir = path.join(process.cwd(), "public", "uploads", uploadType);
    await mkdir(targetDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(targetDir, filename), buffer);

    const publicUrl = `/uploads/${uploadType}/${filename}`;
    return successResponse(
      { url: publicUrl, filename, type: uploadType },
      "Gambar berhasil diunggah",
      201,
    );
  } catch (error) {
    console.error(error);
    return errorResponse("Gagal mengunggah gambar", 500);
  }
}
