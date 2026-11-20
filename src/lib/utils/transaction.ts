import type { PoolClient } from "pg";

export async function runTransaction<T>(
  client: PoolClient,
  work: () => Promise<T>,
): Promise<T> {
  await client.query("BEGIN");
  try {
    const result = await work();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export function makeDocumentNumber(
  prefix: "PO" | "TRX-IN" | "TRX-OUT",
  date: string,
) {
  const compactDate = date.replaceAll("-", "");
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase();
  return `${prefix}-${compactDate}-${random}`;
}
