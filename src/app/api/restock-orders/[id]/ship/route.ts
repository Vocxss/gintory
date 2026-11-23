import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { notifyRole } from "@/lib/utils/notify";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const access = await requireRole(["supplier"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const client = await pool.connect();
  try {
    const updated = await runTransaction(client, async () => {
      const po = await client.query(
        `SELECT id, po_number, status
           FROM restock_orders
          WHERE id = $1 AND supplier_id = $2
          FOR UPDATE`,
        [id, access.user.id],
      );
      if (po.rowCount === 0) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
      }
      if (po.rows[0].status !== "Confirmed") {
        throw Object.assign(new Error("INVALID_TRANSITION"), { status: 400 });
      }

      const result = await client.query(
        `UPDATE restock_orders
            SET status = 'In Transit', updated_at = NOW()
          WHERE id = $1
          RETURNING *`,
        [id],
      );

      await notifyRole({
        client,
        role: "manager",
        title: "PO Dalam Pengiriman",
        message: `Supplier mulai mengirim pesanan ${po.rows[0].po_number} (In Transit).`,
        link: `/manager/restock-orders/${id}`,
      });
      await notifyRole({
        client,
        role: "staff",
        title: "PO Dalam Pengiriman",
        message: `Pesanan ${po.rows[0].po_number} sedang dalam pengiriman menuju gudang.`,
        link: `/staff/restock-orders/${id}`,
      });

      return result.rows[0];
    });
    return successResponse(updated, "Status PO diperbarui menjadi In Transit");
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const status = (error as Error & { status: number }).status;
      if (error.message === "NOT_FOUND") {
        return errorResponse(
          "PO tidak ditemukan atau bukan milik Anda",
          status,
        );
      }
      return errorResponse(
        "PO harus berstatus Confirmed untuk memulai pengiriman",
        status,
      );
    }
    console.error(error);
    return errorResponse("Gagal memperbarui status pengiriman PO", 500);
  } finally {
    client.release();
  }
}
