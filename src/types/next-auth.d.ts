import type { DefaultSession } from "next-auth";
import type { UserRole, SupplierStatus } from "@/lib/types/database";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    company_name?: string | null;
    supplier_status?: SupplierStatus | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      company_name?: string | null;
      supplier_status?: SupplierStatus | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    company_name?: string | null;
    supplier_status?: SupplierStatus | null;
  }
}
