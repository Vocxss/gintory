import {
  errorResponse,
  isPostgresError,
  successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { notifyRole } from "@/lib/utils/notify";
import { pool } from "@/lib/utils/pool";
import { makeDocumentNumber, runTransaction } from "@/lib/utils/transaction";
import { incomingTransactionSchema } from "@/lib/validations/transaction";

export async function POST(request: Request) {
  const access = await requireRole(["staff"]);
  if ("response" in access) return access.response;

  const parsed = incomingTransactionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data transaksi incoming tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const client = await pool.connect();
  try {
    const result = await runTransaction(client, async () => {
      let supplierId = parsed.data.supplier_id ?? undefined;
      let items = parsed.data.items;

      if (parsed.data.restock_order_id) {
        const po = await client.query(
          `SELECT ro.id, ro.supplier_id
             FROM restock_orders ro
            WHERE ro.id = $1 AND ro.status = 'Inspecting'
            FOR UPDATE`,
          [parsed.data.restock_order_id],
        );
        if (po.rowCount === 0) {
          throw Object.assign(new Error("PO_NOT_INSPECTING"), { status: 400 });
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

        const poItems = await client.query<{
          product_id: string;
          quantity: number;
        }>(
          "SELECT product_id, quantity FROM restock_order_items WHERE restock_order_id = $1",
          [parsed.data.restock_order_id],
        );
        const poQtyMap = new Map(
          poItems.rows.map((row) => [row.product_id, Number(row.quantity)]),
        );

        if (!items || items.length === 0) {
          items = poItems.rows;
        } else {
          const seen = new Set<string>();
          for (const item of items) {
            if (seen.has(item.product_id)) {
              throw Object.assign(new Error("DUPLICATE_ITEM"), { status: 400 });
            }
            seen.add(item.product_id);
            const poQty = poQtyMap.get(item.product_id);
            if (poQty === undefined) {
              throw Object.assign(new Error("ITEM_NOT_IN_PO"), { status: 400 });
            }
            if (item.quantity > poQty) {
              throw Object.assign(new Error("QTY_EXCEEDS_PO"), { status: 400 });
            }
          }
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
        throw Object.assign(new Error("SUPPLIER_NOT_APPROVED"), {
          status: 400,
        });
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
           supplier_id, notes, proof_image_url, status, created_by)
         VALUES ($1, 'INCOMING', $2, $3, $4, $5, $6, 'Pending', $7)
         RETURNING *`,
        [
          transactionNumber,
          parsed.data.transaction_date,
          parsed.data.restock_order_id ?? null,
          supplierId,
          parsed.data.notes ?? null,
          parsed.data.proof_image_url,
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

      await notifyRole({
        client,
        role: "manager",
        title: "Laporan Barang Masuk Baru",
        message: `Staff Gudang mengajukan laporan ${created.rows[0].transaction_number} untuk disetujui.`,
        link: `/manager/transactions/${created.rows[0].id}`,
      });

      return created.rows[0];
    });
    return successResponse(result, "Transaksi incoming berhasil dibuat", 201);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const messages: Record<string, string> = {
        PO_NOT_INSPECTING: "PO tidak ditemukan atau belum berstatus Inspecting",
        PO_ALREADY_USED: "PO sudah memiliki transaksi incoming aktif",
        DUPLICATE_ITEM: "Item produk dalam transaksi tidak boleh duplikat",
        ITEM_NOT_IN_PO: "Ada produk yang tidak terdaftar pada PO terpilih",
        QTY_EXCEEDS_PO:
          "Jumlah barang tidak boleh melebihi jumlah yang dipesan pada PO",
        SUPPLIER_REQUIRED: "Supplier atau nomor PO wajib diisi",
        SUPPLIER_NOT_APPROVED: "Supplier belum berstatus Approved",
        ITEM_REQUIRED: "Item transaksi minimal satu",
      };
      return errorResponse(
        messages[error.message] ?? "Data transaksi tidak valid",
        400,
      );
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
