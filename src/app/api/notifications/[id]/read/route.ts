import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_: Request, context: RouteContext) {
  const access = await requireRole(["admin", "manager", "staff", "supplier"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  if (id === "all") {
    await pool.query(
      `UPDATE notifications
          SET is_read = TRUE
        WHERE user_id = $1`,
      [access.user.id],
    );
    return successResponse(null, "Semua notifikasi telah dibaca");
  }

  const result = await pool.query(
    `UPDATE notifications
        SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING id`,
    [id, access.user.id],
  );
  if (result.rowCount === 0) {
    return errorResponse("Notifikasi tidak ditemukan", 404);
  }
  return successResponse(result.rows[0], "Notifikasi telah dibaca");
}
