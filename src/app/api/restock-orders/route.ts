import {
  errorResponse,
  getPagination,
  successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { notifyUser } from "@/lib/utils/notify";
import { pool } from "@/lib/utils/pool";
import { makeDocumentNumber, runTransaction } from "@/lib/utils/transaction";
import { restockSchema } from "@/lib/validations/restock";

const VALID_RESTOCK_STATUSES = [
  "Pending",
  "Confirmed",
  "Rejected",
  "In Transit",
  "Inspecting",
  "Received",
  "Returned",
];

export async function GET(request: Request) {
  const access = await requireRole(["admin", "manager", "staff", "supplier"]);
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

  if (searchParams.get("available_for_incoming") === "true") {
    if (access.user.role !== "staff") {
      return errorResponse("Filter ini hanya tersedia untuk staff", 403);
    }
    conditions.push(
      "ro.status = 'Inspecting' AND NOT EXISTS (" +
        "SELECT 1 FROM transactions tx " +
        "WHERE tx.restock_order_id = ro.id AND tx.status <> 'Rejected'" +
        ")",
    );
  }

  const status = searchParams.get("status");
  if (status && VALID_RESTOCK_STATUSES.includes(status)) {
    addFilter("ro.status = ?", status);
  }

  const supplierId = searchParams.get("supplier_id");
  if (supplierId && access.user.role !== "supplier") {
    addFilter("ro.supplier_id = ?", supplierId);
  }

  const search = searchParams.get("search")?.trim();
  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(ro.po_number ILIKE $${values.length} OR supplier.company_name ILIKE $${values.length})`,
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
       FROM restock_orders ro
       JOIN users supplier ON supplier.id = ro.supplier_id
       ${where}`,
    values,
  );
  const total = Number(count.rows[0]?.total ?? 0);
  const result = await pool.query(
    `SELECT ro.id, ro.po_number, ro.supplier_id, ro.created_by, ro.order_date,
            ro.expected_delivery_date, ro.notes, ro.status, ro.status_reason,
            ro.delivery_proof_url, ro.refund_requested, ro.refund_reason,
            ro.replacement_po_id, ro.created_at, ro.updated_at,
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

export async function POST(request: Request) {
  const access = await requireRole(["manager"]);
  if ("response" in access) return access.response;

  const parsed = restockSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data restock order tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const {
    supplier_id,
    order_date,
    expected_delivery_date,
    notes,
    replacement_po_id,
    items,
  } = parsed.data;

  const client = await pool.connect();
  try {
    const created = await runTransaction(client, async () => {
      const supplier = await client.query<{ id: string }>(
        "SELECT id FROM users WHERE id = $1 AND role = 'supplier' AND supplier_status = 'Approved'",
        [supplier_id],
      );
      if (supplier.rowCount === 0) {
        throw Object.assign(new Error("SUPPLIER_NOT_APPROVED"), {
          status: 400,
        });
      }

      const uniqueProductIds = [
        ...new Set(items.map((item) => item.product_id)),
      ];
      if (uniqueProductIds.length !== items.length) {
        throw Object.assign(new Error("DUPLICATE_ITEM"), { status: 400 });
      }

      const catalog = await client.query(
        `SELECT id
           FROM products
          WHERE supplier_id = $1
            AND id = ANY($2::uuid[])`,
        [supplier_id, uniqueProductIds],
      );
      if (catalog.rowCount !== uniqueProductIds.length) {
        throw Object.assign(new Error("INVALID_SUPPLIER_PRODUCTS"), {
          status: 400,
        });
      }

      const poNumber = makeDocumentNumber("PO", order_date);
      const restock = await client.query(
        `INSERT INTO restock_orders
          (po_number, supplier_id, created_by, order_date,
           expected_delivery_date, notes, replacement_po_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
         RETURNING *`,
        [
          poNumber,
          supplier_id,
          access.user.id,
          order_date,
          expected_delivery_date,
          notes ?? null,
          replacement_po_id ?? null,
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

      if (replacement_po_id) {
        await client.query(
          `UPDATE restock_orders
              SET replacement_po_id = $1, updated_at = NOW()
            WHERE id = $2 AND status = 'Returned' AND replacement_po_id IS NULL`,
          [restock.rows[0].id, replacement_po_id],
        );
      }

      await notifyUser({
        client,
        userId: supplier_id,
        title: "Purchase Order Baru",
        message: `${restock.rows[0].po_number} telah dibuat dan menunggu konfirmasi Anda.`,
        link: `/supplier/restock-orders/${restock.rows[0].id}`,
      });

      return restock.rows[0];
    });

    return successResponse(created, "Restock order berhasil dibuat", 201);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const messages: Record<string, string> = {
        SUPPLIER_NOT_APPROVED: "Supplier belum berstatus Approved",
        DUPLICATE_ITEM: "Produk dalam PO tidak boleh duplikat",
        INVALID_SUPPLIER_PRODUCTS:
          "Ada produk yang bukan milik supplier yang dipilih",
      };
      return errorResponse(
        messages[error.message] ?? "Data restock order tidak valid",
        400,
      );
    }
    console.error(error);
    return errorResponse("Gagal membuat restock order", 500);
  } finally {
    client.release();
  }
}
