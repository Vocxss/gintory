import { pool } from "@/lib/pool";
import {
    errorResponse,
    getPagination,
    successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { makeDocumentNumber } from "@/lib/utils/database";
import { restockSchema } from "@/lib/validations/restock";

export async function GET(request: Request) {
  const access = await requireRole([
    "admin",
    "gintory_manager",
    "gintory_staff",
    "supplier",
  ]);
  if ("response" in access) return access.response;

  const { page, limit, offset, searchParams } = getPagination(request);
  const conditions: string[] = [];
  const values: unknown[] = [];
  const addFilter = (condition: string, value: unknown) => {
    values.push(value);
    conditions.push(condition.replace("?", `$${values.length}`));
  };

  if (access.user.role === "supplier") {
    addFilter("ro.supplier_id = ?", access.user.id);
  }

  export async function POST(request: Request) {
    const access = await requireRole(["gintory_manager"]);
    if ("response" in access) return access.response;

    const parsed = restockSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        "Data restock order tidak valid",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const { supplier_id, order_date, expected_delivery_date, notes, items } =
      parsed.data;

    try {
      const supplier = await pool.query<{ id: string }>(
        "SELECT id FROM users WHERE id = $1 AND role = 'supplier' AND supplier_status = 'Approved'",
        [supplier_id],
      );
      if (supplier.rowCount === 0) {
        return errorResponse("Supplier belum berstatus Approved", 400);
      }

      const poNumber = makeDocumentNumber("PO", order_date);
      const client = await pool.connect();
      await client.query("BEGIN");
      try {
        const restock = await client.query(
          `INSERT INTO restock_orders
            (po_number, supplier_id, created_by, order_date,
             expected_delivery_date, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
           RETURNING *`,
          [
            poNumber,
            supplier_id,
            access.user.id,
            order_date,
            expected_delivery_date,
            notes ?? null,
          ],
        );

        await client.query(
          `INSERT INTO restock_order_items
            (restock_order_id, product_id, quantity)
           SELECT $1, item.product_id, item.quantity
             FROM jsonb_to_recordset($2::jsonb)
               AS item(product_id uuid, quantity integer)`,
          [restock.rows[0].id, JSON.stringify(items)],
        );
        await client.query("COMMIT");
        return successResponse(restock.rows[0], "Restock order berhasil dibuat", 201);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(error);
      return errorResponse("Gagal membuat restock order", 500);
    }
  }
  if (searchParams.get("available_for_incoming") === "true") {
    if (access.user.role !== "gintory_staff") {
      return errorResponse("Filter ini hanya tersedia untuk staff", 403);
    }
    conditions.push(
      "ro.status = 'Received' AND NOT EXISTS (" +
        "SELECT 1 FROM transactions tx " +
        "WHERE tx.restock_order_id = ro.id AND tx.status <> 'Rejected'" +
        ")",
    );
  }
  const status = searchParams.get("status");
  if (
    status &&
    ["Pending", "Confirmed", "Rejected", "In Transit", "Received"].includes(
      status,
    )
  ) {
    addFilter("ro.status = ?", status);
  }
  const supplierId = searchParams.get("supplier_id");
  if (supplierId && access.user.role !== "supplier") {
    addFilter("ro.supplier_id = ?", supplierId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM restock_orders ro ${where}`,
    values,
  );
  const total = Number(count.rows[0]?.total ?? 0);
  const result = await pool.query(
    `SELECT ro.id, ro.po_number, ro.supplier_id, ro.created_by, ro.order_date,
            ro.expected_delivery_date, ro.notes, ro.status, ro.status_reason,
            ro.created_at, ro.updated_at,
            supplier.full_name AS supplier_name,
            supplier.company_name AS supplier_company,
            creator.full_name AS created_by_name,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', roi.id,
                  'product_id', roi.product_id,
                  'product_name', p.name,
                  'sku', p.sku,
                  'quantity', roi.quantity,
                  'unit', p.unit
                ) ORDER BY p.name
              ) FILTER (WHERE roi.id IS NOT NULL),
              '[]'::json
            ) AS items
       FROM restock_orders ro
       JOIN users supplier ON supplier.id = ro.supplier_id
       JOIN users creator ON creator.id = ro.created_by
       LEFT JOIN restock_order_items roi ON roi.restock_order_id = ro.id
       LEFT JOIN products p ON p.id = roi.product_id
       ${where}
      GROUP BY ro.id, supplier.full_name, supplier.company_name, creator.full_name
      ORDER BY ro.order_date DESC, ro.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );

  return successResponse(result.rows, "Daftar PO berhasil diambil", 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
