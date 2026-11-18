import { pool } from "@/lib/db";
import { IUserRow } from "@/lib/types/database";
import { registerSchema } from "@/lib/validations/auth";
import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const parsed = registerSchema?.safeParse(body)
    
    if (!parsed?.success) {
        return NextResponse.json({ message: "Data tidak valid", error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { full_name, email, password, role, company_name} = parsed.data;

    try {
            const { rows: existedAccount } = await pool.query<IUserRow>(
                'SELECT * FROM users WHERE email = $1', [email]
            )
        
            if (existedAccount.length > 0) {
                return NextResponse.json({ message: "Akun sudah terdaftar" }, { status: 400 });
            }
        
            const hashedPassword = await bcrypt.hash(password, 10);

            await pool.query(
                'INSERT INTO users (full_name, email, password, role, company_name, supplier_status) VALUES ($1, $2, $3, $4, $5, $6)',
                [full_name, email, hashedPassword, role, company_name, role === 'supplier' ? 'Pending' : null]
            ) 

            return NextResponse.json({ message: "Akun berhasil dibuat" }, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Terjadi kesalahan pada server", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}