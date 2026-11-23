import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const access = await requireRole(["admin", "manager", "staff", "supplier"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const result = await pool.query(
    `SELECT ro.*,
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
                  'unit', p.unit,
                  'image_url', p.image_url
                ) ORDER BY p.name
              ) FILTER (WHERE roi.id IS NOT NULL),
              '[]'::json
            ) AS items
       FROM restock_orders ro
       JOIN users supplier ON supplier.id = ro.supplier_id
       JOIN users creator ON creator.id = ro.created_by
       LEFT JOIN restock_order_items roi ON roi.restock_order_id = ro.id
       LEFT JOIN products p ON p.id = roi.product_id
      WHERE ro.id = $1
        AND (
          $2 IN ('admin', 'manager', 'staff')
          OR ro.supplier_id = $3
        )
      GROUP BY ro.id, supplier.full_name, supplier.company_name, creator.full_name`,
    [id, access.user.role, access.user.id],
  );

  if (result.rowCount === 0) {
    return errorResponse(
      "Purchase order tidak ditemukan atau tidak dapat diakses",
      404,
    );
  }

  const relatedTransactions = await pool.query(
    `SELECT t.id, t.transaction_number, t.transaction_date, t.status,
            t.proof_image_url, t.rejection_reason, t.notes,
            creator.full_name AS created_by_name
       FROM transactions t
       JOIN users creator ON creator.id = t.created_by
      WHERE t.restock_order_id = $1
      ORDER BY t.created_at DESC`,
    [id],
  );

  return successResponse(
    {
      ...result.rows[0],
      transactions: relatedTransactions.rows,
    },
    "Detail purchase order berhasil diambil",
  );
}
