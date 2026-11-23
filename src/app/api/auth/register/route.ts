import bcrypt from "bcrypt";
import type { NextRequest } from "next/server";
import {
  errorResponse,
  isPostgresError,
  successResponse,
} from "@/lib/utils/apiResponse";
import { notifyRole } from "@/lib/utils/notify";
import { pool } from "@/lib/utils/pool";
import { runTransaction } from "@/lib/utils/transaction";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  const parsed = registerSchema.safeParse(await req.json());

  if (!parsed.success) {
    return errorResponse(
      "Data pendaftaran tidak valid",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { full_name, email, password, company_name } = parsed.data;
  const client = await pool.connect();

  try {
    const created = await runTransaction(client, async () => {
      const existed = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email],
      );
      if (existed.rowCount && existed.rowCount > 0) {
        throw Object.assign(new Error("EMAIL_EXISTS"), { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const inserted = await client.query(
        `INSERT INTO users (full_name, email, password, role, company_name, supplier_status)
         VALUES ($1, $2, $3, 'supplier', $4, 'Pending')
         RETURNING id, full_name, email, role, company_name, supplier_status, created_at`,
        [full_name, email, hashedPassword, company_name],
      );

      await notifyRole({
        client,
        role: "admin",
        title: "Pendaftaran Supplier Baru",
        message: `${company_name} (${full_name}) mendaftar dan menunggu verifikasi Anda.`,
        link: "/admin/suppliers",
      });

      return inserted.rows[0];
    });

    return successResponse(
      created,
      "Pendaftaran berhasil, menunggu verifikasi Admin",
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return errorResponse("Email sudah terdaftar", 409);
    }
    if (isPostgresError(error, "23505")) {
      return errorResponse("Email sudah terdaftar", 409);
    }
    console.error(error);
    return errorResponse("Terjadi kesalahan pada server", 500);
  } finally {
    client.release();
  }
}
