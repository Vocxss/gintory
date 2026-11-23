import bcrypt from "bcrypt";
import {
  errorResponse,
  isPostgresError,
  successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { updateUserSchema } from "@/lib/validations/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["admin"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = updateUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data pengguna tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const {
    full_name,
    email,
    password,
    role,
    company_name,
    supplier_status,
    rejection_reason,
  } = parsed.data;

  try {
    const existing = await pool.query(
      "SELECT id, role FROM users WHERE id = $1",
      [id],
    );
    if (!existing.rowCount) {
      return errorResponse("Pengguna tidak ditemukan", 404);
    }

    if (email) {
      const duplicate = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND id <> $2",
        [email, id],
      );
      if (duplicate.rowCount) {
        return errorResponse("Email sudah digunakan", 409);
      }
    }

    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;
    const fields: string[] = [];
    const values: unknown[] = [];

    const addField = (field: string, value: unknown) => {
      values.push(value);
      fields.push(`${field} = $${values.length}`);
    };

    if (full_name !== undefined) addField("full_name", full_name);
    if (email !== undefined) addField("email", email);
    if (hashedPassword !== undefined) addField("password", hashedPassword);
    if (role !== undefined) {
      addField("role", role);
      if (role !== "supplier") {
        addField("company_name", null);
        addField("supplier_status", null);
        addField("rejection_reason", null);
      }
    }
    if (
      company_name !== undefined &&
      (role ?? existing.rows[0].role) === "supplier"
    ) {
      addField("company_name", company_name);
    }
    if (supplier_status !== undefined) {
      addField("supplier_status", supplier_status);
      addField(
        "rejection_reason",
        supplier_status === "Rejected"
          ? (rejection_reason?.trim() ?? null)
          : null,
      );
    }

    if (!fields.length) {
      return errorResponse("Tidak ada perubahan", 400);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users
          SET ${fields.join(", ")}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING id, full_name, email, role, company_name, supplier_status,
                  rejection_reason, created_at, updated_at`,
      values,
    );

    return successResponse(result.rows[0], "Pengguna berhasil diperbarui");
  } catch (error) {
    if (isPostgresError(error, "23514")) {
      return errorResponse(
        "Data status atau alasan penolakan tidak valid",
        400,
      );
    }
    console.error(error);
    return errorResponse("Gagal memperbarui pengguna", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const access = await requireRole(["admin"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  if (id === access.user.id) {
    return errorResponse("Admin tidak dapat menghapus akunnya sendiri", 400);
  }

  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [id],
    );

    if (!result.rowCount) {
      return errorResponse("Pengguna tidak ditemukan", 404);
    }

    return successResponse({ id }, "Pengguna berhasil dihapus");
  } catch (error) {
    if (isPostgresError(error, "23503")) {
      return errorResponse(
        "Pengguna tidak dapat dihapus karena masih memiliki data terkait",
        409,
      );
    }
    console.error(error);
    return errorResponse("Gagal menghapus pengguna", 500);
  }
}
