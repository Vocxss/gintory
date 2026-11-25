export const APP_TIME_ZONE = "Asia/Makassar";

/**
 * Tanggal hari ini (YYYY-MM-DD) pada zona waktu aplikasi.
 * Memakai zona waktu tetap agar hasil di browser dan di server konsisten,
 * dan tidak bergeser ke hari sebelumnya seperti `toISOString()` (UTC).
 */
export function getTodayDateString(timeZone: string = APP_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const PAST_TRANSACTION_DATE_MESSAGE =
  "Tanggal transaksi tidak boleh sebelum hari ini";
