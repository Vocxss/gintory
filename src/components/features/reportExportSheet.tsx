"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

const ROLE_SHEETS: Record<"admin" | "manager", string[]> = {
  admin: [
    "Ringkasan (Total Nilai Inventori, Status Stok, Supplier & Akun)",
    "Inventori Produk (Harga Beli, Harga Jual, Nilai Stok & Status)",
    "Kategori Produk",
    "Pengguna & Verifikasi Supplier",
    "Riwayat Transaksi Gudang",
  ],
  manager: [
    "Ringkasan Operasional (Stok, Pending Approval, Inspeksi & Retur)",
    "Produk & Status Stok Kritis",
    "Daftar Purchase Order & Klaim Refund",
    "Riwayat Transaksi Gudang",
    "Daftar Supplier Aktif (Approved)",
  ],
};

export function ReportExportButton({
  role,
  defaultStartDate = "",
  defaultEndDate = "",
}: {
  role: "admin" | "manager";
  defaultStartDate?: string;
  defaultEndDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpen = () => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setErrorMessage("");
    setOpen(true);
  };

  const handleExport = async () => {
    setErrorMessage("");
    if (startDate && endDate && endDate < startDate) {
      setErrorMessage("Tanggal akhir tidak boleh sebelum tanggal mulai");
      return;
    }

    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const query = params.toString();
      const response = await fetch(
        `/api/reports/export${query ? `?${query}` : ""}`,
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Gagal mengunduh laporan Excel");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename =
        filenameMatch?.[1] ??
        `laporan-gintory-${role}-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengekspor laporan",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        <FileSpreadsheet /> Ekspor Laporan (.xlsx)
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Buat & Ekspor Laporan Excel (.xlsx)</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 p-6">
            <p className="text-sm text-muted-foreground">
              Laporan akan disusun otomatis sesuai hak akses role{" "}
              <strong className="capitalize">{role}</strong>. Kosongkan tanggal
              untuk mengekspor seluruh periode.
            </p>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sheet yang disertakan:
              </p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-foreground">
                {ROLE_SHEETS[role].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="report-start-date">
                  Tanggal Mulai (Opsional)
                </FieldLabel>
                <Input
                  id="report-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="report-end-date">
                  Tanggal Akhir (Opsional)
                </FieldLabel>
                <Input
                  id="report-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </Field>
            </FieldGroup>

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                disabled={isDownloading}
                onClick={handleExport}
              >
                {isDownloading ? <Spinner /> : <Download />}
                {isDownloading ? "Menyusun Laporan..." : "Unduh Excel (.xlsx)"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isDownloading}
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
