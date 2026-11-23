import {
  errorResponse,
  isPostgresError,
  successResponse,
} from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { notifyUser } from "@/lib/utils/notify";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";
import { supplierStatusSchema } from "@/lib/validations/supplier";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["admin"]);
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const parsed = supplierStatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(
      "Data verifikasi supplier tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const client = await pool.connect();
  try {
    const updated = await runTransaction(client, async () => {
      const reason =
        parsed.data.supplier_status === "Rejected"
          ? (parsed.data.rejection_reason?.trim() ?? null)
          : null;

      const result = await client.query(
        `UPDATE users
            SET supplier_status = $1,
                rejection_reason = $2,
                updated_at = NOW()
          WHERE id = $3 AND role = 'supplier'
          RETURNING id, full_name, email, role, company_name, supplier_status,
                    rejection_reason, created_at, updated_at`,
        [parsed.data.supplier_status, reason, id],
      );
      if (result.rowCount === 0) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
      }

      await notifyUser({
        client,
        userId: id,
        title:
          parsed.data.supplier_status === "Approved"
            ? "Akun Supplier Disetujui"
            : "Akun Supplier Ditolak",
        message:
          parsed.data.supplier_status === "Approved"
            ? "Pendaftaran akun supplier Anda telah disetujui Admin."
            : `Pendaftaran akun supplier Anda ditolak: ${reason}`,
        link: "/supplier/dashboard",
      });

      return result.rows[0];
    });

    return successResponse(updated, "Status supplier berhasil diperbarui");
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return errorResponse("Supplier tidak ditemukan", 404);
    }
    if (isPostgresError(error, "23514")) {
      return errorResponse("Alasan penolakan wajib diisi", 400);
    }
    console.error(error);
    return errorResponse("Gagal memperbarui status supplier", 500);
  } finally {
    client.release();
  }
}
