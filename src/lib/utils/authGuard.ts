import { auth } from "@/app/api/[...nextauth]/route";
import { errorResponse } from "@/lib/utils/apiResponse";
import type { UserRole } from "@/lib/types/database";

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await auth();

  if (!session?.user) {
    return {
      response: errorResponse(
        "Sesi tidak ditemukan atau sudah kedaluwarsa",
        401,
      ),
    };
  }

  const role = session.user.role;
  if (!role || !allowedRoles.includes(role)) {
    return {
      response: errorResponse("Anda tidak memiliki akses ke resource ini", 403),
    };
  }

  return { session, user: session.user };
}
