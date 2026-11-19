import { pool } from "@/lib/pool";
import { getPagination, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";

export async function GET(request: Request) {
  const access = await requireRole([
    "admin",
    "gintory_manager",
    "gintory_staff",
  ]);
  if ("response" in access) return access.response;

  const { page, limit, offset, searchParams } = getPagination(request);
  const conditions: string[] = [];
  const values: unknown[] = [];
  const addFilter = (condition: string, value: unknown) => {
    values.push(value);
    conditions.push(condition.replace("?", `$${values.length}`));
  };

  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const supplierId = searchParams.get("supplier_id");
  const customerName = searchParams.get("customer_name")?.trim();

  if (type && ["INCOMING", "OUTGOING"].includes(type))
    addFilter("t.type = ?", type);
  if (
    status &&
    ["Pending", "Approved", "Rejected", "Shipped"].includes(status)
  ) {
    addFilter("t.status = ?", status);
  }
  if (startDate) addFilter("t.transaction_date >= ?", startDate);
  if (endDate) addFilter("t.transaction_date <= ?", endDate);
  if (supplierId) addFilter("t.supplier_id = ?", supplierId);
  if (customerName) addFilter("t.customer_name ILIKE ?", `%${customerName}%`);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM transactions t ${where}`,
    values,
  );
  const total = Number(count.rows[0]?.total ?? 0);
  const result = await pool.query(
    `SELECT t.id, t.transaction_number, t.type, t.transaction_date,
            t.restock_order_id, t.supplier_id, t.customer_name, t.notes,
            t.status, t.rejection_reason, t.created_at, t.updated_at,
            creator.full_name AS created_by_name,
            approver.full_name AS approved_by_name,
            supplier.company_name AS supplier_company,
            ro.po_number,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', ti.id,
                  'product_id', ti.product_id,
                  'product_name', p.name,
                  'sku', p.sku,
                  'quantity', ti.quantity,
                  'unit', p.unit
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
       ${where}
      GROUP BY t.id, creator.full_name, approver.full_name,
               supplier.company_name, ro.po_number
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );

  return successResponse(
    result.rows,
    "Daftar transaksi berhasil diambil",
    200,
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  );
}
