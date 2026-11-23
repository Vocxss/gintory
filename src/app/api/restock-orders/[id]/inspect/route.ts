import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { notifyRole } from "@/lib/utils/notify";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_: Request, context: RouteContext) {
  const access = await requireRole(["manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const client = await pool.connect();
  try {
    const updated = await runTransaction(client, async () => {
      const po = await client.query(
        `SELECT id, po_number, status, delivery_proof_url
           FROM restock_orders
          WHERE id = $1
          FOR UPDATE`,
        [id],
      );
      if (po.rowCount === 0) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
      }
      if (
        po.rows[0].status !== "In Transit" ||
        !po.rows[0].delivery_proof_url
      ) {
        throw Object.assign(new Error("INVALID_TRANSITION"), { status: 400 });
      }

      const result = await client.query(
        `UPDATE restock_orders
            SET status = 'Inspecting', updated_at = NOW()
          WHERE id = $1
          RETURNING *`,
        [id],
      );
      await notifyRole({
        client,
        role: "staff",
        title: "Pesanan Siap Diperiksa",
        message: `${po.rows[0].po_number} berstatus Inspecting. Silakan cek fisik barang dan buat laporan penerimaan.`,
        link: `/staff/restock-orders/${id}`,
      });
      return result.rows[0];
    });
    return successResponse(
      updated,
      "Instruksi pemeriksaan fisik berhasil diproses",
    );
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const status = (error as Error & { status: number }).status;
      if (error.message === "NOT_FOUND") {
        return errorResponse("PO tidak ditemukan", status);
      }
      return errorResponse(
        "PO harus berstatus In Transit dan memiliki bukti foto kedatangan",
        status,
      );
    }
    console.error(error);
    return errorResponse("Gagal memproses pemeriksaan PO", 500);
  } finally {
    client.release();
  }
}
