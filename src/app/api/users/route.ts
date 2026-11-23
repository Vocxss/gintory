import bcrypt from "bcrypt";
import {
  errorResponse,
  isPostgresError,
  successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { createUserSchema } from "@/lib/validations/auth";

export async function GET(request: Request) {
  const access = await requireRole(["admin"]);
  if ("response" in access) return access.response;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role")?.trim();
  const scope = searchParams.get("scope")?.trim();

  const conditions: string[] = [];
  const values: string[] = [];

  if (role) {
    if (!["admin", "manager", "staff", "supplier"].includes(role)) {
      return errorResponse("Role pengguna tidak valid", 400);
    }
    values.push(role);
    conditions.push(`role = $${values.length}`);
  } else if (scope === "internal") {
    conditions.push("role IN ('admin', 'manager', 'staff')");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT id, full_name, email, role, company_name, supplier_status,
            rejection_reason, created_at, updated_at
       FROM users
       ${where}
      ORDER BY role ASC, full_name ASC`,
    values,
  );

  return successResponse(result.rows, "Daftar pengguna berhasil diambil");
}

export async function POST(request: Request) {
  const access = await requireRole(["admin"]);
  if ("response" in access) return access.response;

  const parsed = createUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data pengguna tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { full_name, email, password, role, company_name } = parsed.data;

  try {
    const existed = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existed.rowCount) {
      return errorResponse("Email sudah digunakan", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users
        (full_name, email, password, role, company_name, supplier_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, role, company_name, supplier_status,
                 rejection_reason, created_at, updated_at`,
      [
        full_name,
        email,
        hashedPassword,
        role,
        role === "supplier" ? company_name?.trim() || null : null,
        role === "supplier" ? "Pending" : null,
      ],
    );

    return successResponse(
      result.rows[0],
      "Pengguna berhasil ditambahkan",
      201,
    );
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return errorResponse("Email sudah digunakan", 409);
    }
    console.error(error);
    return errorResponse("Gagal menambahkan pengguna", 500);
  }
}
