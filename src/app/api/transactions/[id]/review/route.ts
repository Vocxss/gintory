import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";
import { transactionReviewSchema } from "@/lib/validations/transaction";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = transactionReviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data review transaksi tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const client = await pool.connect();
  try {
    const reviewed = await runTransaction(client, async () => {
      const transaction = await client.query(
        `SELECT id, type, status
           FROM transactions
          WHERE id = $1
          FOR UPDATE`,
        [id],
      );
      if (transaction.rowCount === 0) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
      }
      if (transaction.rows[0].status !== "Pending") {
        throw Object.assign(new Error("NOT_PENDING"), { status: 400 });
      }

      if (parsed.data.action === "Rejected") {
        const rejected = await client.query(
          `UPDATE transactions
              SET status = 'Rejected',
                  rejection_reason = $1,
                  approved_by = $2,
                  updated_at = NOW()
            WHERE id = $3
            RETURNING *`,
          [parsed.data.rejection_reason, access.user.id, id],
        );
        return rejected.rows[0];
      }

      const items = await client.query(
        `SELECT ti.product_id, ti.quantity, p.current_stock
           FROM transaction_items ti
           JOIN products p ON p.id = ti.product_id
          WHERE ti.transaction_id = $1
          ORDER BY ti.product_id
          FOR UPDATE OF p`,
        [id],
      );
      if (items.rowCount === 0) {
        throw Object.assign(new Error("ITEM_REQUIRED"), { status: 400 });
      }

      const insufficient: Array<{
        product_id: string;
        requested: number;
        available: number;
      }> = [];
      for (const item of items.rows) {
        if (
          transaction.rows[0].type === "OUTGOING" &&
          item.current_stock < item.quantity
        ) {
          insufficient.push({
            product_id: item.product_id,
            requested: item.quantity,
            available: item.current_stock,
          });
        }
      }
      if (insufficient.length > 0) {
        throw Object.assign(new Error("INSUFFICIENT_STOCK"), {
          status: 400,
          details: insufficient,
        });
      }

      for (const item of items.rows) {
        await client.query(
          `UPDATE products
              SET current_stock = current_stock ${
                transaction.rows[0].type === "INCOMING" ? "+" : "-"
              } $1,
                  updated_at = NOW()
            WHERE id = $2`,
          [item.quantity, item.product_id],
        );
      }

      const approved = await client.query(
        `UPDATE transactions
            SET status = 'Approved',
                rejection_reason = NULL,
                approved_by = $1,
                updated_at = NOW()
          WHERE id = $2
          RETURNING *`,
        [access.user.id, id],
      );
      return approved.rows[0];
    });

    return successResponse(reviewed, "Review transaksi berhasil diproses");
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const status = (error as Error & { status: number }).status;
      if (error.message === "NOT_FOUND") {
        return errorResponse("Transaksi tidak ditemukan", status);
      }
      if (error.message === "NOT_PENDING") {
        return errorResponse("Transaksi sudah diproses", status);
      }
      if (error.message === "ITEM_REQUIRED") {
        return errorResponse("Transaksi tidak memiliki item", status);
      }
      if (error.message === "INSUFFICIENT_STOCK") {
        const details =
          "details" in error ? (error.details as unknown) : undefined;
        return errorResponse("Stok tidak mencukupi", status, {
          insufficient_items: details,
        });
      }
    }
    console.error(error);
    return errorResponse("Gagal memproses review transaksi", 500);
  } finally {
    client.release();
  }
}
