import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const access = await requireRole(["admin", "manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const supplier = await pool.query(
    `SELECT id FROM users
      WHERE id = $1 AND role = 'supplier' AND supplier_status = 'Approved'`,
    [id],
  );
  if (supplier.rowCount === 0) {
    return errorResponse("Supplier tidak ditemukan atau belum Approved", 404);
  }

  const result = await pool.query(
    `SELECT id, sku, name, unit, image_url, current_stock
       FROM products
      WHERE supplier_id = $1
      ORDER BY name ASC`,
    [id],
  );
  return successResponse(
    result.rows,
    "Daftar produk supplier berhasil diambil",
  );
}
