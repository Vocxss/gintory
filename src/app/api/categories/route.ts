import {
  errorResponse,
  getPagination,
  isPostgresError,
  successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { categorySchema } from "@/lib/validations/category";

export async function GET(request: Request) {
  const access = await requireRole(["admin", "manager", "staff"]);
  if ("response" in access) return access.response;

  const { page, limit, offset } = getPagination(request);
  const countResult = await pool.query<{ total: string }>(
    "SELECT COUNT(*)::text AS total FROM categories",
  );
  const result = await pool.query(
    `SELECT c.id, c.name, c.description, c.image_url, c.created_at, c.updated_at,
            COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
      LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  const total = Number(countResult.rows[0]?.total ?? 0);

  return successResponse(result.rows, "Daftar kategori berhasil diambil", 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const access = await requireRole(["admin", "manager"]);
  if ("response" in access) return access.response;

  const parsed = categorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data kategori tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const result = await pool.query(
      `INSERT INTO categories (name, description, image_url)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, image_url, created_at, updated_at`,
      [parsed.data.name, parsed.data.description, parsed.data.image_url],
    );
    return successResponse(result.rows[0], "Kategori berhasil dibuat", 201);
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return errorResponse("Nama kategori sudah digunakan", 409);
    }
    console.error(error);
    return errorResponse("Gagal membuat kategori", 500);
  }
}
