import {
  errorResponse,
  isPostgresError,
  successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";
import {
  adminUpdateProductSchema,
  managerUpdateProductSchema,
} from "@/lib/validations/product";

type RouteContext = { params: Promise<{ id: string }> };

const ALWAYS_LOCKED_FIELDS = ["sku", "current_stock"] as const;
const MANAGER_FORBIDDEN_FIELDS = [
  "buy_price",
  "sell_price",
  "name",
  "category_id",
  "supplier_id",
  "sku",
  "current_stock",
] as const;

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["admin", "manager"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const rawBody = (await request.json()) as Record<string, unknown>;

  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return errorResponse("Payload update produk tidak valid", 400);
  }

  for (const field of ALWAYS_LOCKED_FIELDS) {
    if (field in rawBody) {
      return errorResponse(
        `Kolom ${field} tidak dapat diubah secara langsung melalui endpoint ini`,
        403,
      );
    }
  }

  if (access.user.role === "manager") {
    for (const field of MANAGER_FORBIDDEN_FIELDS) {
      if (field in rawBody) {
        return errorResponse(
          `Manager tidak memiliki izin untuk mengubah kolom ${field}`,
          403,
        );
      }
    }
  }

  const current = await pool.query("SELECT * FROM products WHERE id = $1", [
    id,
  ]);
  if (current.rowCount === 0) {
    return errorResponse("Produk tidak ditemukan", 404);
  }
  const existing = current.rows[0];

  if (access.user.role === "manager") {
    const parsed = managerUpdateProductSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse(
        "Data logistik produk tidak valid",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return errorResponse("Tidak ada perubahan data", 400);
    }

    const nextMinStock = parsed.data.min_stock ?? Number(existing.min_stock);
    const nextLowStock = parsed.data.low_stock ?? Number(existing.low_stock);
    if (nextLowStock <= nextMinStock) {
      return errorResponse("Data logistik produk tidak valid", 400, {
        low_stock: ["low_stock harus lebih besar dari min_stock"],
      });
    }

    try {
      const result = await pool.query(
        `UPDATE products
            SET rack_location = $1,
                min_stock = $2,
                low_stock = $3,
                unit = $4,
                description = $5,
                image_url = $6,
                updated_at = NOW()
          WHERE id = $7
          RETURNING *`,
        [
          parsed.data.rack_location ?? existing.rack_location,
          nextMinStock,
          nextLowStock,
          parsed.data.unit ?? existing.unit,
          parsed.data.description ?? existing.description,
          parsed.data.image_url ?? existing.image_url,
          id,
        ],
      );
      return successResponse(
        result.rows[0],
        "Atribut logistik produk berhasil diperbarui",
      );
    } catch (error) {
      console.error(error);
      return errorResponse("Gagal memperbarui produk", 500);
    }
  }

  const parsed = adminUpdateProductSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(
      "Data produk tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return errorResponse("Tidak ada perubahan data", 400);
  }

  const nextMinStock = parsed.data.min_stock ?? Number(existing.min_stock);
  const nextLowStock = parsed.data.low_stock ?? Number(existing.low_stock);
  if (nextLowStock <= nextMinStock) {
    return errorResponse("Data produk tidak valid", 400, {
      low_stock: ["low_stock harus lebih besar dari min_stock"],
    });
  }

  try {
    if (
      parsed.data.supplier_id !== undefined &&
      parsed.data.supplier_id !== existing.supplier_id
    ) {
      const supplier = await pool.query(
        "SELECT id FROM users WHERE id = $1 AND role = 'supplier' AND supplier_status = 'Approved'",
        [parsed.data.supplier_id],
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
          SET name = $1,
              category_id = $2,
              supplier_id = $3,
              description = $4,
              buy_price = $5,
              sell_price = $6,
              min_stock = $7,
              low_stock = $8,
              unit = $9,
              rack_location = $10,
              image_url = $11,
              updated_at = NOW()
        WHERE id = $12
        RETURNING *`,
      [
        parsed.data.name ?? existing.name,
        parsed.data.category_id ?? existing.category_id,
        parsed.data.supplier_id ?? existing.supplier_id,
        parsed.data.description ?? existing.description,
        parsed.data.buy_price ?? Number(existing.buy_price),
        parsed.data.sell_price ?? Number(existing.sell_price),
        nextMinStock,
        nextLowStock,
        parsed.data.unit ?? existing.unit,
        parsed.data.rack_location ?? existing.rack_location,
        parsed.data.image_url ?? existing.image_url,
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
  const access = await requireRole(["admin"]);
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
        "Produk tidak dapat dihapus karena memiliki Daftar Transaksi atau PO",
        409,
      );
    }
    console.error(error);
    return errorResponse("Gagal menghapus produk", 500);
  }
}
