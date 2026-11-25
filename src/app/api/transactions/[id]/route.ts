import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";
import { transactionUpdateSchema } from "@/lib/validations/transaction";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const access = await requireRole(["admin", "manager", "staff", "supplier"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const result = await pool.query(
    `SELECT t.*,
            creator.full_name AS created_by_name,
            approver.full_name AS approved_by_name,
            supplier.company_name AS supplier_company,
            ro.po_number,
            COALESCE(
              json_agg(
                json_build_object(
                  'product_id', ti.product_id,
                  'product_name', p.name,
                  'sku', p.sku,
                  'quantity', ti.quantity,
                  'unit', p.unit,
                  'image_url', p.image_url,
                  'current_stock', p.current_stock
                ) ORDER BY p.name
              ) FILTER (WHERE ti.id IS NOT NULL),
              '[]'::json
            ) AS items
       FROM transactions t
       JOIN users creator ON creator.id = t.created_by
       LEFT JOIN users approver ON approver.id = t.approved_by
       LEFT JOIN users supplier ON supplier.id = t.supplier_id
       LEFT JOIN restock_orders ro ON ro.id = t.restock_order_id
       LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
       LEFT JOIN products p ON p.id = ti.product_id
      WHERE t.id = $1
        AND (
          $2 IN ('admin', 'manager', 'staff')
          OR ($2 = 'supplier' AND t.type = 'INCOMING' AND t.supplier_id = $3)
        )
      GROUP BY t.id, creator.full_name, approver.full_name,
               supplier.company_name, ro.po_number`,
    [id, access.user.role, access.user.id],
  );
  if (result.rowCount === 0) {
    return errorResponse(
      "Transaksi tidak ditemukan atau tidak dapat diakses",
      404,
    );
  }
  return successResponse(result.rows[0], "Detail transaksi berhasil diambil");
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["staff"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = transactionUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data transaksi tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const client = await pool.connect();
  try {
    const updated = await runTransaction(client, async () => {
      const transaction = await client.query(
        `SELECT id, type, status, created_by, restock_order_id
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

      if (
        parsed.data.items &&
        trx.type === "INCOMING" &&
        trx.restock_order_id
      ) {
        const poItems = await client.query<{
          product_id: string;
          quantity: number;
        }>(
          "SELECT product_id, quantity FROM restock_order_items WHERE restock_order_id = $1",
          [trx.restock_order_id],
        );
        const poQtyMap = new Map(
          poItems.rows.map((row) => [row.product_id, Number(row.quantity)]),
        );
        const seen = new Set<string>();
        for (const item of parsed.data.items) {
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

      if (parsed.data.items && trx.type === "OUTGOING") {
        for (const item of parsed.data.items) {
          if (item.quantity <= 0) {
            throw Object.assign(new Error("INVALID_QTY"), { status: 400 });
          }
          const product = await client.query(
            "SELECT current_stock FROM products WHERE id = $1 FOR UPDATE",
            [item.product_id],
          );
          if (
            product.rowCount === 0 ||
            product.rows[0].current_stock < item.quantity
          ) {
            throw Object.assign(new Error("INSUFFICIENT_STOCK"), {
              status: 400,
            });
          }
        }
      }

      const fields: string[] = [];
      const values: unknown[] = [];
      const addField = (field: string, value: unknown) => {
        values.push(value);
        fields.push(`${field} = $${values.length}`);
      };

      if (parsed.data.transaction_date !== undefined) {
        addField("transaction_date", parsed.data.transaction_date);
      }
      if (parsed.data.notes !== undefined) {
        addField("notes", parsed.data.notes);
      }
      if (parsed.data.customer_name !== undefined && trx.type === "OUTGOING") {
        addField("customer_name", parsed.data.customer_name);
      }
      if (
        parsed.data.proof_image_url !== undefined &&
        trx.type === "INCOMING"
      ) {
        addField("proof_image_url", parsed.data.proof_image_url);
      }

      if (fields.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE transactions
              SET ${fields.join(", ")}, updated_at = NOW()
            WHERE id = $${values.length}`,
          values,
        );
      }

      if (parsed.data.items) {
        await client.query(
          "DELETE FROM transaction_items WHERE transaction_id = $1",
          [id],
        );
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
      if (error.message === "NOT_FOUND") {
        return errorResponse("Transaksi tidak ditemukan", status);
      }
      if (error.message === "FORBIDDEN") {
        return errorResponse("Transaksi tidak dapat diubah", status);
      }
      if (error.message === "INSUFFICIENT_STOCK") {
        return errorResponse("Stok tidak mencukupi", status);
      }
      if (error.message === "INVALID_QTY") {
        return errorResponse("Kuantitas barang keluar minimal 1", status);
      }
      if (error.message === "DUPLICATE_ITEM") {
        return errorResponse(
          "Item produk dalam transaksi tidak boleh duplikat",
          status,
        );
      }
      if (error.message === "ITEM_NOT_IN_PO") {
        return errorResponse(
          "Ada produk yang tidak terdaftar pada PO terkait",
          status,
        );
      }
      if (error.message === "QTY_EXCEEDS_PO") {
        return errorResponse(
          "Jumlah barang tidak boleh melebihi jumlah yang dipesan pada PO",
          status,
        );
      }
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
  return successResponse(
    { id: result.rows[0].id },
    "Transaksi berhasil dihapus",
  );
}
