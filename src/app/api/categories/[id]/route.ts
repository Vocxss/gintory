import {
    errorResponse,
    isPostgresError,
    successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { categoryUpdateSchema } from "@/lib/validations/category";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["admin", "manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = categoryUpdateSchema.safeParse(await request.json());
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return errorResponse(
      "Data kategori tidak valid",
      400,
      parsed.success ? undefined : parsed.error.flatten().fieldErrors,
    );
  }

  const fields = Object.entries(parsed.data);
  const values = fields.map(([, value]) => value);
  const assignments = fields.map(
    ([field], index) => `${field} = $${index + 1}`,
  );
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE categories
          SET ${assignments.join(", ")}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING id, name, description, image_url, created_at, updated_at`,
      values,
    );
    if (result.rowCount === 0)
      return errorResponse("Kategori tidak ditemukan", 404);
    return successResponse(result.rows[0], "Kategori berhasil diperbarui");
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return errorResponse("Nama kategori sudah digunakan", 409);
    }
    console.error(error);
    return errorResponse("Gagal memperbarui kategori", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireRole(["admin", "manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  try {
    const result = await pool.query(
      "DELETE FROM categories WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rowCount === 0)
      return errorResponse("Kategori tidak ditemukan", 404);
    return successResponse({ id }, "Kategori berhasil dihapus");
  } catch (error) {
    if (isPostgresError(error, "23503")) {
      return errorResponse(
        "Kategori tidak dapat dihapus karena masih digunakan oleh produk",
        409,
      );
    }
    console.error(error);
    return errorResponse("Gagal menghapus kategori", 500);
  }
}
