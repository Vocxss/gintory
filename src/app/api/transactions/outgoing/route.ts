import { pool } from "@/lib/pool";
import { errorResponse, isPostgresError, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { makeDocumentNumber, runTransaction } from "@/lib/utils/database";
import { outgoingTransactionSchema } from "@/lib/validations/transaction";

export async function POST(request: Request) {
  const access = await requireRole(["gintory_staff"]);
  if ("response" in access) return access.response;

  const parsed = outgoingTransactionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse("Data transaksi outgoing tidak valid", 400, parsed.error.flatten().fieldErrors);
  }

  const client = await pool.connect();
  try {
    const result = await runTransaction(client, async () => {
      const insufficient: Array<{ product_id: string; name: string; requested: number; available: number }> = [];

      for (const item of parsed.data.items) {
        const product = await client.query(
          "SELECT id, name, current_stock FROM products WHERE id = $1 FOR UPDATE",
          [item.product_id],
        );
        if (product.rowCount === 0) {
          throw Object.assign(new Error("PRODUCT_NOT_FOUND"), { status: 400 });
        }
        if (product.rows[0].current_stock < item.quantity) {
          insufficient.push({
            product_id: item.product_id,
            name: product.rows[0].name,
            requested: item.quantity,
            available: product.rows[0].current_stock,
          });
        }
      }
      if (insufficient.length > 0) {
        throw Object.assign(new Error("INSUFFICIENT_STOCK"), {
          status: 400,
          details: insufficient,
        });
      }

      const created = await client.query(
        `INSERT INTO transactions
          (transaction_number, type, transaction_date, customer_name,
           notes, status, created_by)
         VALUES ($1, 'OUTGOING', $2, $3, $4, 'Pending', $5)
         RETURNING *`,
        [
          makeDocumentNumber("TRX-OUT", parsed.data.transaction_date),
          parsed.data.transaction_date,
          parsed.data.customer_name,
          parsed.data.notes ?? null,
          access.user.id,
        ],
      );
      await client.query(
        `INSERT INTO transaction_items (transaction_id, product_id, quantity)
         SELECT $1, item.product_id, item.quantity
           FROM jsonb_to_recordset($2::jsonb)
             AS item(product_id uuid, quantity integer)`,
        [created.rows[0].id, JSON.stringify(parsed.data.items)],
      );
      return created.rows[0];
    });
    return successResponse(result, "Transaksi outgoing berhasil dibuat", 201);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const details =
        "details" in error ? (error.details as unknown) : undefined;
      if (error.message === "INSUFFICIENT_STOCK") {
        return errorResponse("Stok produk tidak mencukupi", 400, {
          insufficient_items: details,
        });
      }
      if (error.message === "PRODUCT_NOT_FOUND") {
        return errorResponse("Produk tidak ditemukan", 400);
      }
    }
    if (isPostgresError(error, "23505")) {
      return errorResponse("Nomor transaksi sudah digunakan", 409);
    }
    console.error(error);
    return errorResponse("Gagal membuat transaksi outgoing", 500);
  } finally {
    client.release();
  }
}
