import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";

export async function GET(request: Request) {
  const access = await requireRole(["admin", "manager"]);
  if ("response" in access) return access.response;

  const { searchParams } = new URL(request.url);
  const requestedStatus = searchParams.get("status");

  if (
    access.user.role === "manager" &&
    requestedStatus &&
    requestedStatus !== "Approved"
  ) {
    return errorResponse(
      "Manager hanya dapat melihat supplier yang sudah Approved",
      403,
    );
  }

  const effectiveStatus =
    access.user.role === "manager"
      ? "Approved"
      : requestedStatus &&
          ["Pending", "Approved", "Rejected"].includes(requestedStatus)
        ? requestedStatus
        : undefined;

  const values: string[] = [];
  const where = ["role = 'supplier'"];
  if (effectiveStatus) {
    values.push(effectiveStatus);
    where.push(`supplier_status = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT id, full_name, email, role, company_name, supplier_status,
            rejection_reason, created_at, updated_at
       FROM users
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC`,
    values,
  );
  return successResponse(result.rows, "Daftar supplier berhasil diambil");
}
