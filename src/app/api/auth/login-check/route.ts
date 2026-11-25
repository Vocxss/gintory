import bcrypt from "bcrypt";
import type { NextRequest } from "next/server";
import type { IUserRow } from "@/lib/types/database";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { pool } from "@/lib/utils/pool";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success) {
    return errorResponse(
      "Email atau password tidak valid.",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { email, password } = parsed.data;
  const { rows } = await pool.query<
    Pick<
      IUserRow,
      "id" | "password" | "role" | "supplier_status" | "rejection_reason"
    >
  >(
    `SELECT id, password, role, supplier_status, rejection_reason
       FROM users
      WHERE LOWER(email) = LOWER($1)`,
    [email],
  );

  if (rows.length === 0) {
    return errorResponse("Email atau password tidak valid.", 401, {
      code: "INVALID_CREDENTIALS",
    });
  }

  const user = rows[0];
  const checked = await bcrypt.compare(password, user.password);
  if (!checked) {
    return errorResponse("Email atau password tidak valid.", 401, {
      code: "INVALID_CREDENTIALS",
    });
  }

  if (user.role === "supplier" && user.supplier_status === "Pending") {
    return errorResponse(
      "Akun supplier Anda masih berstatus Pending dan menunggu verifikasi Admin.",
      403,
      {
        code: "SUPPLIER_PENDING",
        supplier_status: "Pending",
      },
    );
  }

  if (user.role === "supplier" && user.supplier_status === "Rejected") {
    const reason =
      user.rejection_reason?.trim() || "Pendaftaran akun ditolak oleh Admin.";
    return errorResponse(
      `Akun supplier Anda ditolak Admin. Alasan: ${reason}`,
      403,
      {
        code: "SUPPLIER_REJECTED",
        supplier_status: "Rejected",
        rejection_reason: reason,
      },
    );
  }

  return successResponse({ ok: true }, "Kredensial valid");
}
