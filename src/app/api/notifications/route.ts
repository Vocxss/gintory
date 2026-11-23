import { successResponse } from "@/lib/utils/apiResponse";
import { requireRole } from "@/lib/utils/authGuard";
import { pool } from "@/lib/utils/pool";

export async function GET() {
  const access = await requireRole(["admin", "manager", "staff", "supplier"]);
  if ("response" in access) return access.response;

  const [notifications, unread] = await Promise.all([
    pool.query(
      `SELECT id, title, message, link, is_read, created_at
         FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20`,
      [access.user.id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
         FROM notifications
        WHERE user_id = $1 AND is_read = FALSE`,
      [access.user.id],
    ),
  ]);

  return successResponse(
    notifications.rows,
    "Daftar notifikasi berhasil diambil",
    200,
    { unread_count: unread.rows[0]?.count ?? 0 },
  );
}
