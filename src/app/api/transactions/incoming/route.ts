import { errorResponse, isPostgresError, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { makeDocumentNumber, runTransaction } from "@/lib/utils/transaction";
import { incomingTransactionSchema } from "@/lib/validations/transaction";

export async function POST(request: Request) {
  const access = await requireRole(["staff"]);
  if ("response" in access) return access.response;

  const parsed = incomingTransactionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse("Data transaksi incoming tidak valid", 400, parsed.error.flatten().fieldErrors);
  }

  const client = await pool.connect();
  try {
    const result = await runTransaction(client, async () => {
      let supplierId = parsed.data.supplier_id;
      let items = parsed.data.items;

      if (parsed.data.restock_order_id) {
        const po = await client.query(
          `SELECT ro.id, ro.supplier_id
             FROM restock_orders ro
            WHERE ro.id = $1 AND ro.status = 'Received'
            FOR UPDATE`,
          [parsed.data.restock_order_id],
        );
        if (po.rowCount === 0) {
          throw Object.assign(new Error("PO_NOT_RECEIVED"), { status: 400 });
        }

        supplierId = po.rows[0].supplier_id;
        const active = await client.query(
          `SELECT id FROM transactions
            WHERE restock_order_id = $1 AND status <> 'Rejected'
            LIMIT 1`,
          [parsed.data.restock_order_id],
        );
        if ((active.rowCount ?? 0) > 0) {
          throw Object.assign(new Error("PO_ALREADY_USED"), { status: 400 });
        }

        if (!items) {
          const poItems = await client.query(
            "SELECT product_id, quantity FROM restock_order_items WHERE restock_order_id = $1",
            [parsed.data.restock_order_id],
          );
          items = poItems.rows;
        }
      }

      if (!supplierId) {
        throw Object.assign(new Error("SUPPLIER_REQUIRED"), { status: 400 });
      }
      const supplier = await client.query(
        "SELECT id FROM users WHERE id = $1 AND role = 'supplier' AND supplier_status = 'Approved'",
        [supplierId],
      );
      if (supplier.rowCount === 0) {
        throw Object.assign(new Error("SUPPLIER_NOT_APPROVED"), { status: 400 });
      }
      if (!items || items.length === 0) {
        throw Object.assign(new Error("ITEM_REQUIRED"), { status: 400 });
      }

      const transactionNumber = makeDocumentNumber(
        "TRX-IN",
        parsed.data.transaction_date,
      );
      const created = await client.query(
        `INSERT INTO transactions
          (transaction_number, type, transaction_date, restock_order_id,
           supplier_id, notes, status, created_by)
         VALUES ($1, 'INCOMING', $2, $3, $4, $5, 'Pending', $6)
         RETURNING *`,
        [
          transactionNumber,
          parsed.data.transaction_date,
          parsed.data.restock_order_id ?? null,
          supplierId,
          parsed.data.notes ?? null,
          access.user.id,
        ],
      );

      await client.query(
        `INSERT INTO transaction_items (transaction_id, product_id, quantity)
         SELECT $1, item.product_id, item.quantity
           FROM jsonb_to_recordset($2::jsonb)
             AS item(product_id uuid, quantity integer)`,
        [created.rows[0].id, JSON.stringify(items)],
      );
      return created.rows[0];
    });
    return successResponse(result, "Transaksi incoming berhasil dibuat", 201);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const messages: Record<string, string> = {
        PO_NOT_RECEIVED: "PO harus berstatus Received",
        PO_ALREADY_USED: "PO sudah memiliki transaksi incoming aktif",
        SUPPLIER_REQUIRED: "Supplier wajib diisi",
        SUPPLIER_NOT_APPROVED: "Supplier belum berstatus Approved",
        ITEM_REQUIRED: "Item transaksi minimal satu",
      };
      return errorResponse(messages[error.message] ?? "Data transaksi tidak valid", 400);
    }
    if (isPostgresError(error, "23505")) {
      return errorResponse("Nomor transaksi atau PO sudah digunakan", 409);
    }
    console.error(error);
    return errorResponse("Gagal membuat transaksi incoming", 500);
  } finally {
    client.release();
  }
}
