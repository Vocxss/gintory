import { pool } from "@/lib/pool";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { supplierStatusSchema } from "@/lib/validations/supplier";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["admin"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = supplierStatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Status supplier tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const result = await pool.query(
    `UPDATE users
        SET supplier_status = $1, updated_at = NOW()
      WHERE id = $2 AND role = 'supplier'
      RETURNING id, full_name, email, role, company_name, supplier_status,
                created_at, updated_at`,
    [parsed.data.supplier_status, id],
  );
  if (result.rowCount === 0) {
    return errorResponse("Supplier tidak ditemukan", 404);
  }

  return successResponse(result.rows[0], "Status supplier berhasil diperbarui");
}
