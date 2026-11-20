import type { IUserRow } from "@/lib/types/database";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { pool } from "@/lib/utils/pool";
import { registerSchema } from "@/lib/validations/auth";
import bcrypt from "bcrypt";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema?.safeParse(body);

  if (!parsed?.success) {
    return NextResponse.json(
      {
        message: "Data tidak valid",
        error: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { full_name, email, password, company_name } = parsed.data;

  try {
    const { rows: existedAccount } = await pool.query<IUserRow>(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (existedAccount.length > 0) {
      return errorResponse("Akun sudah terdaftar", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (full_name, email, password, role, company_name, supplier_status) VALUES ($1, $2, $3, $4, $5, $6)",
      [full_name, email, hashedPassword, "supplier", company_name, "Pending"],
    );

    return successResponse(null, "Akun berhasil dibuat", 201);
  } catch (error) {
    console.error(error);
    return errorResponse("Terjadi kesalahan pada server", 500);
  }
}
