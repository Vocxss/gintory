import {
  errorResponse,
  getPagination,
  isPostgresError,
  successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { productSchema } from "@/lib/validations/product";

export async function GET(request: Request) {
  const access = await requireRole(["admin", "manager", "staff"]);
  if ("response" in access) return access.response;

  const { page, limit, offset, searchParams } = getPagination(request);
  const conditions: string[] = [];
  const values: unknown[] = [];
  const search = searchParams.get("search")?.trim();
  const categoryId = searchParams.get("category_id")?.trim();
  const supplierId = searchParams.get("supplier_id")?.trim();
  const stockStatus = searchParams.get("stock_status")?.trim();

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(p.name ILIKE $${values.length} OR p.sku ILIKE $${values.length})`,
    );
  }
  if (categoryId) {
    values.push(categoryId);
    conditions.push(`p.category_id = $${values.length}`);
  }
  if (supplierId) {
    values.push(supplierId);
    conditions.push(`p.supplier_id = $${values.length}`);
  }
  if (
    stockStatus &&
    ["Out of Stock", "Severe", "Low", "Normal"].includes(stockStatus)
  ) {
    values.push(stockStatus);
    conditions.push(`(
      CASE
        WHEN p.current_stock = 0 THEN 'Out of Stock'
        WHEN p.current_stock <= p.min_stock THEN 'Severe'
        WHEN p.current_stock <= p.low_stock THEN 'Low'
        ELSE 'Normal'
      END
    ) = $${values.length}`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM products p ${where}`,
    values,
  );
  const total = Number(countResult.rows[0]?.total ?? 0);
  const result = await pool.query(
    `SELECT p.*, c.name AS category_name,
            COALESCE(u.company_name, u.full_name) AS supplier_company,
       CASE
         WHEN p.current_stock = 0 THEN 'Out of Stock'
         WHEN p.current_stock <= p.min_stock THEN 'Severe'
         WHEN p.current_stock <= p.low_stock THEN 'Low'
         ELSE 'Normal'
       END AS stock_status
       FROM products p
       JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.supplier_id
       ${where}
       ORDER BY p.name ASC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );

  return successResponse(result.rows, "Daftar produk berhasil diambil", 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const access = await requireRole(["admin"]);
  if ("response" in access) return access.response;

  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data produk tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const product = parsed.data;
  try {
    const supplier = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'supplier' AND supplier_status = 'Approved'",
      [product.supplier_id],
    );
    if (supplier.rowCount === 0) {
      return errorResponse(
        "Supplier tidak ditemukan atau belum berstatus Approved",
        400,
      );
    }

    const result = await pool.query(
      `INSERT INTO products
        (sku, name, category_id, supplier_id, description, buy_price, sell_price,
         min_stock, low_stock, current_stock, unit, rack_location, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        product.sku,
        product.name,
        product.category_id,
        product.supplier_id,
        product.description,
        product.buy_price,
        product.sell_price,
        product.min_stock,
        product.low_stock,
        product.current_stock,
        product.unit,
        product.rack_location,
        product.image_url,
      ],
    );
    return successResponse(result.rows[0], "Produk berhasil dibuat", 201);
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return errorResponse("SKU sudah digunakan", 409);
    }
    if (isPostgresError(error, "23503")) {
      return errorResponse("Kategori atau supplier tidak ditemukan", 400);
    }
    console.error(error);
    return errorResponse("Gagal membuat produk", 500);
  }
}
