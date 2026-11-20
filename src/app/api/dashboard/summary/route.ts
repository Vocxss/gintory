import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";

export async function GET() {
  const access = await requireRole([
    "admin",
    "manager",
    "staff",
    "supplier",
  ]);
  if ("response" in access) return access.response;

  try {
    if (
      access.user.role === "admin" ||
      access.user.role === "manager"
    ) {
      const [stock, criticalProducts, pendingTransactions, pendingSuppliers] =
        await Promise.all([
          pool.query(
            `SELECT
               COUNT(*) FILTER (WHERE current_stock > low_stock)::int AS normal_count,
               COUNT(*) FILTER (
                 WHERE current_stock > 0 AND current_stock <= low_stock
               )::int AS low_count,
               COUNT(*) FILTER (
                 WHERE current_stock > 0 AND current_stock <= min_stock
               )::int AS severe_count,
               COUNT(*) FILTER (WHERE current_stock = 0)::int AS out_of_stock_count
             FROM products`,
          ),
          pool.query(
            `SELECT id, sku, name, current_stock, min_stock, low_stock, unit
               FROM products
              WHERE current_stock <= low_stock
              ORDER BY current_stock ASC, name ASC
              LIMIT 10`,
          ),
          pool.query<{ count: number }>(
            "SELECT COUNT(*)::int AS count FROM transactions WHERE status = 'Pending'",
          ),
          access.user.role === "admin"
            ? pool.query<{ count: number }>(
                "SELECT COUNT(*)::int AS count FROM users WHERE role = 'supplier' AND supplier_status = 'Pending'",
              )
            : Promise.resolve({ rows: [{ count: 0 }] }),
        ]);

      return successResponse({
        stock: stock.rows[0],
        critical_products: criticalProducts.rows,
        pending_transactions: pendingTransactions.rows[0]?.count ?? 0,
        pending_suppliers:
          access.user.role === "admin"
            ? (pendingSuppliers.rows[0]?.count ?? 0)
            : undefined,
      });
    }

    if (access.user.role === "staff") {
      const [pendingTransactions, readyToShip, availableOrders] =
        await Promise.all([
          pool.query<{ count: number }>(
            "SELECT COUNT(*)::int AS count FROM transactions WHERE created_by = $1 AND status = 'Pending'",
            [access.user.id],
          ),
          pool.query<{ count: number }>(
            "SELECT COUNT(*)::int AS count FROM transactions WHERE type = 'OUTGOING' AND status = 'Approved'",
          ),
          pool.query<{ count: number }>(
            `SELECT COUNT(*)::int AS count
               FROM restock_orders ro
              WHERE ro.status = 'Received'
                AND NOT EXISTS (
                  SELECT 1 FROM transactions tx
                   WHERE tx.restock_order_id = ro.id
                     AND tx.status <> 'Rejected'
                )`,
          ),
        ]);

      return successResponse({
        pending_transactions: pendingTransactions.rows[0]?.count ?? 0,
        ready_to_ship: readyToShip.rows[0]?.count ?? 0,
        available_incoming_orders: availableOrders.rows[0]?.count ?? 0,
      });
    }

    const [pendingOrders, activeOrders, totalOrders] = await Promise.all([
      pool.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM restock_orders WHERE supplier_id = $1 AND status = 'Pending'",
        [access.user.id],
      ),
      pool.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
           FROM restock_orders
          WHERE supplier_id = $1 AND status IN ('Confirmed', 'In Transit')`,
        [access.user.id],
      ),
      pool.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM restock_orders WHERE supplier_id = $1",
        [access.user.id],
      ),
    ]);

    return successResponse({
      pending_orders: pendingOrders.rows[0]?.count ?? 0,
      active_orders: activeOrders.rows[0]?.count ?? 0,
      total_orders: totalOrders.rows[0]?.count ?? 0,
    });
  } catch (error) {
    console.error(error);
    return errorResponse("Gagal mengambil ringkasan dashboard", 500);
  }
}
