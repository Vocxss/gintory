import type { PoolClient } from "pg";
import type { UserRole } from "@/lib/types/database";

type NotifyTarget = {
  client: PoolClient;
  userId: string;
  title: string;
  message: string;
  link?: string;
};

type NotifyRoleTarget = {
  client: PoolClient;
  role: UserRole;
  title: string;
  message: string;
  link?: string;
};

export async function notifyUser({
  client,
  userId,
  title,
  message,
  link,
}: NotifyTarget) {
  await client.query(
    `INSERT INTO notifications (user_id, title, message, link)
     VALUES ($1, $2, $3, $4)`,
    [userId, title, message, link ?? null],
  );
}

export async function notifyRole({
  client,
  role,
  title,
  message,
  link,
}: NotifyRoleTarget) {
  await client.query(
    `INSERT INTO notifications (user_id, title, message, link)
     SELECT id, $2, $3, $4
       FROM users
      WHERE role = $1`,
    [role, title, message, link ?? null],
  );
}
