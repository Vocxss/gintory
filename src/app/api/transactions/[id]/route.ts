import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";
import { transactionUpdateSchema } from "@/lib/validations/transaction";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["staff"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = transactionUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse("Data transaksi tidak valid", 400, parsed.error.flatten().fieldErrors);
  }

  const client = await pool.connect();
  try {
    const updated = await runTransaction(client, async () => {
      const transaction = await client.query(
        `SELECT id, type, status, created_by
           FROM transactions
          WHERE id = $1
          FOR UPDATE`,
        [id],
      );
      if (transaction.rowCount === 0) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
      }
      const trx = transaction.rows[0];
      if (trx.status !== "Pending" || trx.created_by !== access.user.id) {
        throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
      }

      if (parsed.data.items && trx.type === "OUTGOING") {
        for (const item of parsed.data.items) {
          const product = await client.query(
            "SELECT current_stock FROM products WHERE id = $1 FOR UPDATE",
            [item.product_id],
          );
          if (product.rowCount === 0 || product.rows[0].current_stock < item.quantity) {
            throw Object.assign(new Error("INSUFFICIENT_STOCK"), { status: 400 });
          }
        }
      }

      await client.query(
        `UPDATE transactions
            SET notes = COALESCE($1, notes), updated_at = NOW()
          WHERE id = $2
          RETURNING *`,
        [parsed.data.notes ?? null, id],
      );
      if (parsed.data.items) {
        await client.query("DELETE FROM transaction_items WHERE transaction_id = $1", [id]);
        await client.query(
          `INSERT INTO transaction_items (transaction_id, product_id, quantity)
           SELECT $1, item.product_id, item.quantity
             FROM jsonb_to_recordset($2::jsonb)
               AS item(product_id uuid, quantity integer)`,
          [id, JSON.stringify(parsed.data.items)],
        );
      }
      const result = await client.query(
        "SELECT * FROM transactions WHERE id = $1",
        [id],
      );
      return result.rows[0];
    });
    return successResponse(updated, "Transaksi berhasil diperbarui");
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const status = (error as Error & { status: number }).status;
      if (error.message === "NOT_FOUND") return errorResponse("Transaksi tidak ditemukan", status);
      if (error.message === "FORBIDDEN") return errorResponse("Transaksi tidak dapat diubah", status);
      if (error.message === "INSUFFICIENT_STOCK") return errorResponse("Stok tidak mencukupi", status);
    }
    console.error(error);
    return errorResponse("Gagal memperbarui transaksi", 500);
  } finally {
    client.release();
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireRole(["staff"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const result = await pool.query(
    `DELETE FROM transactions
      WHERE id = $1
        AND created_by = $2
        AND status = 'Pending'
      RETURNING id`,
    [id, access.user.id],
  );
  if (result.rowCount === 0) {
    return errorResponse(
      "Transaksi tidak ditemukan atau tidak dapat dihapus",
      400,
    );
  }
  return successResponse({ id: result.rows[0].id }, "Transaksi berhasil dihapus");
}
