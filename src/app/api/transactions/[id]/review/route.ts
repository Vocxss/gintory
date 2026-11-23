import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { notifyUser } from "@/lib/utils/notify";
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
        `SELECT id, transaction_number, type, status, restock_order_id, supplier_id, created_by
           FROM transactions
          WHERE id = $1
          FOR UPDATE`,
        [id],
      );
      if (transaction.rowCount === 0) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
      }
      const trx = transaction.rows[0];
      if (trx.status !== "Pending") {
        throw Object.assign(new Error("NOT_PENDING"), { status: 400 });
      }

      if (parsed.data.action === "Rejected") {
        const reason = parsed.data.rejection_reason?.trim() ?? "";
        const rejected = await client.query(
          `UPDATE transactions
              SET status = 'Rejected',
                  rejection_reason = $1,
                  approved_by = $2,
                  updated_at = NOW()
            WHERE id = $3
            RETURNING *`,
          [reason, access.user.id, id],
        );

        await notifyUser({
          client,
          userId: trx.created_by,
          title: "Transaksi Ditolak",
          message: `Transaksi ${trx.transaction_number} ditolak Manager: ${reason}`,
          link: `/staff/transactions/${id}`,
        });

        if (trx.type === "INCOMING" && trx.restock_order_id) {
          await client.query(
            `UPDATE restock_orders
                SET status = 'Returned',
                    status_reason = $1,
                    updated_at = NOW()
              WHERE id = $2`,
            [reason, trx.restock_order_id],
          );
          if (trx.supplier_id) {
            await notifyUser({
              client,
              userId: trx.supplier_id,
              title: "Pesanan Diretur (Returned)",
              message: `Barang dari PO ditolak saat inspeksi: ${reason}. Menunggu tindak lanjut klaim refund.`,
              link: `/supplier/restock-orders/${trx.restock_order_id}`,
            });
          }
        }
        return rejected.rows[0];
      }

      if (trx.type === "INCOMING") {
        const items = await client.query(
          `SELECT ti.product_id, ti.quantity
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

        for (const item of items.rows) {
          if (item.quantity > 0) {
            await client.query(
              `UPDATE products
                  SET current_stock = current_stock + $1,
                      updated_at = NOW()
                WHERE id = $2`,
              [item.quantity, item.product_id],
            );
          }
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

        if (trx.restock_order_id) {
          await client.query(
            `UPDATE restock_orders
                SET status = 'Received', updated_at = NOW()
              WHERE id = $1 AND status = 'Inspecting'`,
            [trx.restock_order_id],
          );
        }

        await notifyUser({
          client,
          userId: trx.created_by,
          title: "Transaksi Masuk Disetujui",
          message: `Laporan ${trx.transaction_number} disetujui dan stok gudang telah bertambah.`,
          link: `/staff/transactions/${id}`,
        });

        if (trx.supplier_id && trx.restock_order_id) {
          await notifyUser({
            client,
            userId: trx.supplier_id,
            title: "Purchase Order Diterima (Received)",
            message:
              "Barang pesanan Anda telah selesai diperiksa, diterima gudang, dan stok diperbarui.",
            link: `/supplier/restock-orders/${trx.restock_order_id}`,
          });
        }
        return approved.rows[0];
      }

      const approvedOutgoing = await client.query(
        `UPDATE transactions
            SET status = 'Approved',
                rejection_reason = NULL,
                approved_by = $1,
                updated_at = NOW()
          WHERE id = $2
          RETURNING *`,
        [access.user.id, id],
      );

      await notifyUser({
        client,
        userId: trx.created_by,
        title: "Barang Keluar Disetujui",
        message: `Pengajuan ${trx.transaction_number} disetujui Manager. Silakan lakukan packing dan klik Kirim Barang.`,
        link: `/staff/transactions/${id}`,
      });

      return approvedOutgoing.rows[0];
    });

    const redirectToRefund =
      parsed.data.action === "Rejected" &&
      reviewed.type === "INCOMING" &&
      Boolean(reviewed.restock_order_id);

    return successResponse(
      {
        ...reviewed,
        ...(redirectToRefund
          ? {
              redirectToRefund: true,
              restock_order_id: reviewed.restock_order_id,
            }
          : {}),
      },
      "Review transaksi berhasil diproses",
    );
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const status = (error as Error & { status: number }).status;
      if (error.message === "NOT_FOUND") {
        return errorResponse("Transaksi tidak ditemukan", status);
      }
      if (error.message === "NOT_PENDING") {
        return errorResponse("Transaksi sudah diproses sebelumnya", status);
      }
      if (error.message === "ITEM_REQUIRED") {
        return errorResponse("Transaksi tidak memiliki item", status);
      }
    }
    console.error(error);
    return errorResponse("Gagal memproses review transaksi", 500);
  } finally {
    client.release();
  }
}
