import { errorResponse, isPostgresError, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { restockRespondSchema } from "@/lib/validations/restock";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["supplier"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = restockRespondSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse("Data respons PO tidak valid", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await pool.query(
      `UPDATE restock_orders
          SET status = $1,
              status_reason = $2,
              updated_at = NOW()
        WHERE id = $3
          AND supplier_id = $4
          AND status = 'Pending'
        RETURNING *`,
      [
        parsed.data.status,
        parsed.data.status === "Rejected"
          ? parsed.data.status_reason
          : null,
        id,
        access.user.id,
      ],
    );
    if (result.rowCount === 0) {
      return errorResponse(
        "PO tidak ditemukan, bukan milik Anda, atau status bukan Pending",
        400,
      );
    }
    return successResponse(result.rows[0], "Respons PO berhasil disimpan");
  } catch (error) {
    if (isPostgresError(error, "23514")) {
      return errorResponse("Alasan penolakan wajib diisi", 400);
    }
    console.error(error);
    return errorResponse("Gagal menyimpan respons PO", 500);
  }
}
