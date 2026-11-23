import {
  errorResponse,
  isPostgresError,
  successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { notifyUser } from "@/lib/utils/notify";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";
import { restockRespondSchema } from "@/lib/validations/restock";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["supplier"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = restockRespondSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data respons PO tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const client = await pool.connect();
  try {
    const updated = await runTransaction(client, async () => {
      const po = await client.query(
        `SELECT id, po_number, created_by
           FROM restock_orders
          WHERE id = $1 AND supplier_id = $2 AND status = 'Pending'
          FOR UPDATE`,
        [id, access.user.id],
      );
      if (po.rowCount === 0) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 400 });
      }
      const reason =
        parsed.data.status === "Rejected"
          ? (parsed.data.status_reason?.trim() ?? null)
          : null;

      const result = await client.query(
        `UPDATE restock_orders
            SET status = $1,
                status_reason = $2,
                updated_at = NOW()
          WHERE id = $3
          RETURNING *`,
        [parsed.data.status, reason, id],
      );
      await notifyUser({
        client,
        userId: po.rows[0].created_by,
        title:
          parsed.data.status === "Confirmed"
            ? "Purchase Order Dikonfirmasi"
            : "Purchase Order Ditolak Supplier",
        message:
          parsed.data.status === "Confirmed"
            ? `PO ${po.rows[0].po_number} telah dikonfirmasi oleh Supplier.`
            : `PO ${po.rows[0].po_number} ditolak Supplier: ${reason}`,
        link: `/manager/restock-orders/${id}`,
      });
      return result.rows[0];
    });
    return successResponse(updated, "Respons PO berhasil disimpan");
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return errorResponse(
        "PO tidak ditemukan, bukan milik Anda, atau status bukan Pending",
        400,
      );
    }
    if (isPostgresError(error, "23514")) {
      return errorResponse("Alasan penolakan wajib diisi", 400);
    }
    console.error(error);
    return errorResponse("Gagal menyimpan respons PO", 500);
  } finally {
    client.release();
  }
}
