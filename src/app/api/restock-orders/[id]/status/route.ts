import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { restockStatusSchema } from "@/lib/validations/restock";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = restockStatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse("Status PO tidak valid", 400, parsed.error.flatten().fieldErrors);
  }

  const nextStatus = parsed.data.status;
  const po = await pool.query<{ status: string }>(
    "SELECT status FROM restock_orders WHERE id = $1",
    [id],
  );
  if (po.rowCount === 0) return errorResponse("PO tidak ditemukan", 404);

  const validTransition =
    (po.rows[0].status === "Confirmed" && nextStatus === "In Transit") ||
    (po.rows[0].status === "In Transit" && nextStatus === "Received");
  if (!validTransition) {
    return errorResponse("Transisi status PO tidak valid", 400);
  }

  const result = await pool.query(
    `UPDATE restock_orders
        SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *`,
    [nextStatus, id],
  );
  return successResponse(result.rows[0], "Status pengiriman PO berhasil diperbarui");
}
