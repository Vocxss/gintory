import {
  errorResponse,
  isPostgresError,
  successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import { productSchema, productUpdateSchema } from "@/lib/validations/product";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["admin", "manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = productUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data produk tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const current = await pool.query("SELECT * FROM products WHERE id = $1", [
    id,
  ]);
  if (current.rowCount === 0) {
    return errorResponse("Produk tidak ditemukan", 404);
  }

  if (
    parsed.data.sku !== undefined &&
    parsed.data.sku !== current.rows[0].sku
  ) {
    return errorResponse("SKU produk tidak dapat diubah", 400);
  }

  const merged = productSchema.safeParse({
    ...current.rows[0],
    ...parsed.data,
    sku: current.rows[0].sku,
  });
  if (!merged.success) {
    return errorResponse(
      "Data produk tidak valid",
      400,
      merged.error.flatten().fieldErrors,
    );
  }

  const product = merged.data;
  try {
    if (parsed.data.supplier_id !== undefined) {
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
    }

    const result = await pool.query(
      `UPDATE products
          SET name = $1, category_id = $2, supplier_id = $3, description = $4,
              buy_price = $5, sell_price = $6, min_stock = $7, low_stock = $8,
              current_stock = $9, unit = $10, rack_location = $11,
              image_url = $12, updated_at = NOW()
        WHERE id = $13
        RETURNING *`,
      [
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
        id,
      ],
    );
    return successResponse(result.rows[0], "Produk berhasil diperbarui");
  } catch (error) {
    if (isPostgresError(error, "23503")) {
      return errorResponse("Kategori atau supplier tidak ditemukan", 400);
    }
    console.error(error);
    return errorResponse("Gagal memperbarui produk", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await requireRole(["admin", "manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const confirm = searchParams.get("confirm") === "true";
  const product = await pool.query<{ current_stock: number }>(
    "SELECT current_stock FROM products WHERE id = $1",
    [id],
  );
  if (product.rowCount === 0) {
    return errorResponse("Produk tidak ditemukan", 404);
  }
  if (product.rows[0].current_stock > 0 && !confirm) {
    return errorResponse(
      "Produk masih memiliki stok dan membutuhkan konfirmasi",
      400,
      {
        requiresConfirmation: true,
        current_stock: product.rows[0].current_stock,
      },
    );
  }

  try {
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
    return successResponse({ id }, "Produk berhasil dihapus");
  } catch (error) {
    if (isPostgresError(error, "23503")) {
      return errorResponse(
        "Produk tidak dapat dihapus karena memiliki riwayat transaksi atau PO",
        409,
      );
    }
    console.error(error);
    return errorResponse("Gagal menghapus produk", 500);
  }
}
