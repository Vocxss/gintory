import { errorResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import {
  buildAdminWorkbook,
  buildManagerWorkbook,
} from "@/lib/utils/xlsxReport";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function buildDateFilter(
  column: string,
  startDate: string | null,
  endDate: string | null,
) {
  const clauses: string[] = [];
  const values: string[] = [];
  if (startDate) {
    values.push(startDate);
    clauses.push(`${column} >= $${values.length}`);
  }
  if (endDate) {
    values.push(endDate);
    clauses.push(`${column} <= $${values.length}`);
  }
  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

export async function GET(request: Request) {
  const access = await requireRole(["admin", "manager"]);
  if ("response" in access) return access.response;

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start_date")?.trim() || null;
  const endDate = searchParams.get("end_date")?.trim() || null;

  if (startDate && !DATE_REGEX.test(startDate)) {
    return errorResponse("Format start_date harus YYYY-MM-DD", 400);
  }
  if (endDate && !DATE_REGEX.test(endDate)) {
    return errorResponse("Format end_date harus YYYY-MM-DD", 400);
  }
  if (startDate && endDate && endDate < startDate) {
    return errorResponse(
      "Tanggal akhir tidak boleh sebelum tanggal mulai",
      400,
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const periodLabel =
    startDate && endDate
      ? `${startDate} s/d ${endDate}`
      : startDate
        ? `Mulai ${startDate}`
        : endDate
          ? `Sampai ${endDate}`
          : "Semua Periode";
  const exportedBy = access.user.name ?? access.user.email ?? access.user.role;
  const trxFilter = buildDateFilter("t.transaction_date", startDate, endDate);

  try {
    if (access.user.role === "admin") {
      const [stockRes, productsRes, categoriesRes, usersRes, transactionsRes] =
        await Promise.all([
          pool.query(`
            SELECT
              COUNT(*)::int AS total_products,
              COALESCE(SUM(current_stock * buy_price), 0)::float8 AS total_inventory_value,
              COUNT(*) FILTER (WHERE current_stock > low_stock)::int AS normal_count,
              COUNT(*) FILTER (WHERE current_stock > min_stock AND current_stock <= low_stock)::int AS low_count,
              COUNT(*) FILTER (WHERE current_stock > 0 AND current_stock <= min_stock)::int AS severe_count,
              COUNT(*) FILTER (WHERE current_stock = 0)::int AS out_of_stock_count
            FROM products
          `),
          pool.query(`
            SELECT p.sku, p.name, c.name AS category_name,
                   COALESCE(u.company_name, u.full_name) AS supplier_company,
                   p.buy_price::float8 AS buy_price,
                   p.sell_price::float8 AS sell_price,
                   p.current_stock,
                   (p.current_stock * p.buy_price)::float8 AS inventory_value,
                   p.min_stock, p.low_stock, p.unit, p.rack_location,
                   CASE
                     WHEN p.current_stock = 0 THEN 'Out of Stock'
                     WHEN p.current_stock <= p.min_stock THEN 'Severe'
                     WHEN p.current_stock <= p.low_stock THEN 'Low'
                     ELSE 'Normal'
                   END AS stock_status
              FROM products p
              JOIN categories c ON c.id = p.category_id
              JOIN users u ON u.id = p.supplier_id
             ORDER BY p.name ASC
          `),
          pool.query(`
            SELECT c.name, c.description, COUNT(p.id)::int AS product_count
              FROM categories c
              LEFT JOIN products p ON p.category_id = c.id
             GROUP BY c.id
             ORDER BY c.name ASC
          `),
          pool.query(`
            SELECT full_name, email, role, company_name, supplier_status,
                   rejection_reason, TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at
              FROM users
             ORDER BY role ASC, full_name ASC
          `),
          pool.query(
            `
            SELECT t.transaction_number, t.type,
                   TO_CHAR(t.transaction_date, 'YYYY-MM-DD') AS transaction_date,
                   ro.po_number,
                   COALESCE(supplier.company_name, t.customer_name, '-') AS party_name,
                   t.status,
                   creator.full_name AS created_by_name,
                   approver.full_name AS approved_by_name,
                   t.notes, t.rejection_reason
              FROM transactions t
              JOIN users creator ON creator.id = t.created_by
              LEFT JOIN users approver ON approver.id = t.approved_by
              LEFT JOIN users supplier ON supplier.id = t.supplier_id
              LEFT JOIN restock_orders ro ON ro.id = t.restock_order_id
              ${trxFilter.where}
             ORDER BY t.transaction_date DESC, t.created_at DESC
          `,
            trxFilter.values,
          ),
        ]);

      const stockRow = stockRes.rows[0];
      const usersRows = usersRes.rows;
      const workbook = buildAdminWorkbook({
        exportedAt: today,
        exportedBy,
        periodLabel,
        summary: {
          totalProducts: stockRow?.total_products ?? 0,
          totalInventoryValue: stockRow?.total_inventory_value ?? 0,
          normalCount: stockRow?.normal_count ?? 0,
          lowCount: stockRow?.low_count ?? 0,
          severeCount: stockRow?.severe_count ?? 0,
          outOfStockCount: stockRow?.out_of_stock_count ?? 0,
          internalUsersCount: usersRows.filter((u) => u.role !== "supplier")
            .length,
          supplierPendingCount: usersRows.filter(
            (u) => u.role === "supplier" && u.supplier_status === "Pending",
          ).length,
          supplierApprovedCount: usersRows.filter(
            (u) => u.role === "supplier" && u.supplier_status === "Approved",
          ).length,
          supplierRejectedCount: usersRows.filter(
            (u) => u.role === "supplier" && u.supplier_status === "Rejected",
          ).length,
          totalTransactions: transactionsRes.rows.length,
        },
        products: productsRes.rows,
        categories: categoriesRes.rows,
        users: usersRows,
        transactions: transactionsRes.rows,
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(Buffer.from(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="laporan-gintory-admin-${today}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const poFilter = buildDateFilter("ro.order_date", startDate, endDate);
    const [
      stockRes,
      pendingTrxRes,
      inspectPoRes,
      returnedPoRes,
      productsRes,
      poRes,
      transactionsRes,
      suppliersRes,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_products,
          COUNT(*) FILTER (WHERE current_stock > low_stock)::int AS normal_count,
          COUNT(*) FILTER (WHERE current_stock > min_stock AND current_stock <= low_stock)::int AS low_count,
          COUNT(*) FILTER (WHERE current_stock > 0 AND current_stock <= min_stock)::int AS severe_count,
          COUNT(*) FILTER (WHERE current_stock = 0)::int AS out_of_stock_count
        FROM products
      `),
      pool.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM transactions WHERE status = 'Pending'",
      ),
      pool.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM restock_orders WHERE status = 'In Transit' AND delivery_proof_url IS NOT NULL",
      ),
      pool.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM restock_orders WHERE status = 'Returned'",
      ),
      pool.query(`
        SELECT p.sku, p.name, c.name AS category_name,
               COALESCE(u.company_name, u.full_name) AS supplier_company,
               p.current_stock, p.min_stock, p.low_stock, p.unit, p.rack_location,
               CASE
                 WHEN p.current_stock = 0 THEN 'Out of Stock'
                 WHEN p.current_stock <= p.min_stock THEN 'Severe'
                 WHEN p.current_stock <= p.low_stock THEN 'Low'
                 ELSE 'Normal'
               END AS stock_status
          FROM products p
          JOIN categories c ON c.id = p.category_id
          JOIN users u ON u.id = p.supplier_id
         ORDER BY p.current_stock ASC, p.name ASC
      `),
      pool.query(
        `
        SELECT ro.po_number,
               COALESCE(supplier.company_name, supplier.full_name) AS supplier_company,
               TO_CHAR(ro.order_date, 'YYYY-MM-DD') AS order_date,
               TO_CHAR(ro.expected_delivery_date, 'YYYY-MM-DD') AS expected_delivery_date,
               ro.status,
               COALESCE(
                 STRING_AGG(CONCAT(p.name, ' (', roi.quantity, ' ', p.unit, ')'), ', ' ORDER BY p.name),
                 '-'
               ) AS items_summary,
               ro.refund_requested, ro.refund_reason, ro.status_reason, ro.notes
          FROM restock_orders ro
          JOIN users supplier ON supplier.id = ro.supplier_id
          LEFT JOIN restock_order_items roi ON roi.restock_order_id = ro.id
          LEFT JOIN products p ON p.id = roi.product_id
          ${poFilter.where}
         GROUP BY ro.id, supplier.company_name, supplier.full_name
         ORDER BY ro.order_date DESC, ro.created_at DESC
      `,
        poFilter.values,
      ),
      pool.query(
        `
        SELECT t.transaction_number, t.type,
               TO_CHAR(t.transaction_date, 'YYYY-MM-DD') AS transaction_date,
               ro.po_number,
               COALESCE(supplier.company_name, t.customer_name, '-') AS party_name,
               t.status,
               creator.full_name AS created_by_name,
               approver.full_name AS approved_by_name,
               t.notes, t.rejection_reason
          FROM transactions t
          JOIN users creator ON creator.id = t.created_by
          LEFT JOIN users approver ON approver.id = t.approved_by
          LEFT JOIN users supplier ON supplier.id = t.supplier_id
          LEFT JOIN restock_orders ro ON ro.id = t.restock_order_id
          ${trxFilter.where}
         ORDER BY t.transaction_date DESC, t.created_at DESC
      `,
        trxFilter.values,
      ),
      pool.query(`
        SELECT full_name, company_name, email
          FROM users
         WHERE role = 'supplier' AND supplier_status = 'Approved'
         ORDER BY company_name ASC, full_name ASC
      `),
    ]);

    const stockRow = stockRes.rows[0];
    const workbook = buildManagerWorkbook({
      exportedAt: today,
      exportedBy,
      periodLabel,
      summary: {
        totalProducts: stockRow?.total_products ?? 0,
        normalCount: stockRow?.normal_count ?? 0,
        lowCount: stockRow?.low_count ?? 0,
        severeCount: stockRow?.severe_count ?? 0,
        outOfStockCount: stockRow?.out_of_stock_count ?? 0,
        pendingTransactions: pendingTrxRes.rows[0]?.count ?? 0,
        pendingInspectOrders: inspectPoRes.rows[0]?.count ?? 0,
        returnedOrders: returnedPoRes.rows[0]?.count ?? 0,
      },
      products: productsRes.rows,
      restockOrders: poRes.rows,
      transactions: transactionsRes.rows,
      approvedSuppliers: suppliersRes.rows,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-gintory-manager-${today}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return errorResponse("Gagal membuat laporan Excel", 500);
  }
}
