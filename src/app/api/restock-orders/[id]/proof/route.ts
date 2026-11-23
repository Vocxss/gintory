import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { notifyRole } from "@/lib/utils/notify";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";
import { restockProofSchema } from "@/lib/validations/restock";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["supplier"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = restockProofSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Bukti kedatangan tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

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
      if (po.rows[0].status !== "In Transit") {
        throw Object.assign(new Error("INVALID_TRANSITION"), { status: 400 });
      }

      const result = await client.query(
        `UPDATE restock_orders
            SET delivery_proof_url = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING *`,
        [parsed.data.delivery_proof_url, id],
      );
      await notifyRole({
        client,
        role: "manager",
        title: "Bukti Dokumentasi Kedatangan",
        message: `Supplier mengunggah foto bukti kedatangan untuk ${po.rows[0].po_number}. Siap diinstruksikan pemeriksaan fisik.`,
        link: `/manager/restock-orders/${id}`,
      });
      return result.rows[0];
    });
    return successResponse(updated, "Bukti kedatangan berhasil disimpan");
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const status = (error as Error & { status: number }).status;
      if (error.message === "NOT_FOUND") {
        return errorResponse(
          "PO tidak ditemukan atau bukan milik Anda",
          status,
        );
      }
      return errorResponse("PO harus berstatus In Transit", status);
    }
    console.error(error);
    return errorResponse("Gagal menyimpan bukti kedatangan", 500);
  } finally {
    client.release();
  }
}
