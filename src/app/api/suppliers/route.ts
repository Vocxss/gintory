import { pool } from "@/lib/pool";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";

export async function GET(request: Request) {
  const access = await requireRole(["admin", "gintory_manager"]);
  if ("response" in access) return access.response;

  const { searchParams } = new URL(request.url);
  const requestedStatus = searchParams.get("status");
  if (
    access.user.role === "gintory_manager" &&
    requestedStatus !== "Approved"
  ) {
    return errorResponse(
      "Manager hanya dapat melihat supplier yang sudah Approved",
      403,
    );
  }

  const status =
    requestedStatus &&
    ["Pending", "Approved", "Rejected"].includes(requestedStatus)
      ? requestedStatus
      : undefined;
  const values: string[] = [];
  const where = ["role = 'supplier'"];
  if (status) {
    values.push(status);
    where.push(`supplier_status = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT id, full_name, email, role, company_name, supplier_status,
            created_at, updated_at
       FROM users
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC`,
    values,
  );
  return successResponse(result.rows, "Daftar supplier berhasil diambil");
}
