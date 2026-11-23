import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { notifyRole } from "@/lib/utils/notify";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const access = await requireRole(["staff"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const client = await pool.connect();
  try {
    const shipped = await runTransaction(client, async () => {
      const transaction = await client.query(
        `SELECT id, transaction_number, status
           FROM transactions
          WHERE id = $1
            AND type = 'OUTGOING'
            AND status = 'Approved'
          FOR UPDATE`,
        [id],
      );
      if (transaction.rowCount === 0) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 400 });
      }

      const items = await client.query(
        `SELECT ti.product_id, ti.quantity, p.name, p.current_stock
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
        name: string;
        requested: number;
        available: number;
      }> = [];

      for (const item of items.rows) {
        if (item.current_stock < item.quantity) {
          insufficient.push({
            product_id: item.product_id,
            name: item.name,
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
              SET current_stock = current_stock - $1,
                  updated_at = NOW()
            WHERE id = $2`,
          [item.quantity, item.product_id],
        );
      }

      const result = await client.query(
        `UPDATE transactions
            SET status = 'Shipped', updated_at = NOW()
          WHERE id = $1
          RETURNING *`,
        [id],
      );

      await notifyRole({
        client,
        role: "manager",
        title: "Pengiriman Barang Keluar Selesai",
        message: `${transaction.rows[0].transaction_number} telah dikirim (Shipped) dan stok gudang telah dikurangi.`,
        link: `/manager/transactions/${id}`,
      });

      return result.rows[0];
    });
    return successResponse(
      shipped,
      "Barang berhasil dikirim dan stok produk telah diperbarui",
    );
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      if (error.message === "INSUFFICIENT_STOCK") {
        const details =
          "details" in error ? (error.details as unknown) : undefined;
        return errorResponse(
          "Stok produk tidak mencukupi untuk pengiriman",
          400,
          { insufficient_items: details },
        );
      }
      if (error.message === "ITEM_REQUIRED") {
        return errorResponse("Transaksi tidak memiliki item", 400);
      }
      return errorResponse(
        "Transaksi outgoing tidak ditemukan atau belum berstatus Approved",
        400,
      );
    }
    console.error(error);
    return errorResponse("Gagal menyelesaikan pengiriman barang keluar", 500);
  } finally {
    client.release();
  }
}
