import { pool } from "@/lib/pool";
import {
    errorResponse,
    isPostgresError,
    successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { productSchema, productUpdateSchema } from "@/lib/validations/product";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["admin", "gintory_manager"]);
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
  if (parsed.data.sku !== undefined) {
    return errorResponse("SKU produk tidak dapat diubah", 400);
  }

  const current = await pool.query("SELECT * FROM products WHERE id = $1", [
    id,
  ]);
  if (current.rowCount === 0)
    return errorResponse("Produk tidak ditemukan", 404);
  const merged = productSchema.safeParse({
    ...current.rows[0],
    ...parsed.data,
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
    const result = await pool.query(
      `UPDATE products
          SET name = $1, category_id = $2, description = $3, buy_price = $4,
              sell_price = $5, min_stock = $6, low_stock = $7, current_stock = $8,
              unit = $9, rack_location = $10, image_url = $11, updated_at = NOW()
        WHERE id = $12
        RETURNING *`,
      [
        product.name,
        product.category_id,
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
    if (isPostgresError(error, "23503"))
      return errorResponse("Kategori tidak ditemukan", 400);
    console.error(error);
    return errorResponse("Gagal memperbarui produk", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await requireRole(["admin", "gintory_manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const confirm = searchParams.get("confirm") === "true";
  const product = await pool.query<{ current_stock: number }>(
    "SELECT current_stock FROM products WHERE id = $1",
    [id],
  );
  if (product.rowCount === 0)
    return errorResponse("Produk tidak ditemukan", 404);
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
