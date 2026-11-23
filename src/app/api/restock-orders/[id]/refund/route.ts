import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { notifyUser } from "@/lib/utils/notify";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";
import { restockRefundSchema } from "@/lib/validations/restock";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = restockRefundSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Alasan refund tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const client = await pool.connect();
  try {
    const updated = await runTransaction(client, async () => {
      const po = await client.query(
        `SELECT id, po_number, supplier_id
           FROM restock_orders
          WHERE id = $1 AND status = 'Returned'
          FOR UPDATE`,
        [id],
      );
      if (po.rowCount === 0) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 400 });
      }

      const result = await client.query(
        `UPDATE restock_orders
            SET refund_requested = TRUE,
                refund_reason = $1,
                updated_at = NOW()
          WHERE id = $2
          RETURNING *`,
        [parsed.data.refund_reason, id],
      );
      await notifyUser({
        client,
        userId: po.rows[0].supplier_id,
        title: "Klaim Refund Purchase Order",
        message: `Manager mengajukan klaim refund untuk ${po.rows[0].po_number}: ${parsed.data.refund_reason}`,
        link: `/supplier/restock-orders/${id}`,
      });
      return result.rows[0];
    });

    const items = await client.query(
      `SELECT roi.product_id, roi.quantity
         FROM restock_order_items roi
        WHERE roi.restock_order_id = $1
        ORDER BY roi.product_id`,
      [id],
    );
    return successResponse(
      {
        ...updated,
        redirectToNewOrder: true,
        templateItems: items.rows,
      },
      "Klaim refund PO berhasil diajukan",
    );
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return errorResponse(
        "PO tidak ditemukan atau belum berstatus Returned",
        400,
      );
    }
    console.error(error);
    return errorResponse("Gagal mengajukan klaim refund PO", 500);
  } finally {
    client.release();
  }
}
