import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const access = await requireRole(["staff"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const result = await pool.query(
    `UPDATE transactions
        SET status = 'Shipped', updated_at = NOW()
      WHERE id = $1
        AND type = 'OUTGOING'
        AND status = 'Approved'
      RETURNING *`,
    [id],
  );
  if (result.rowCount === 0) {
    return errorResponse(
      "Transaksi tidak ditemukan atau belum berstatus Approved",
      400,
    );
  }
  return successResponse(result.rows[0], "Barang berhasil ditandai dikirim");
}
