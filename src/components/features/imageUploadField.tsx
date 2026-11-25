"use client";

import { Upload, X } from "lucide-react";
import NextImage from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function ImageUploadField({
  id,
  uploadType,
  prefix,
  value,
  disabled,
  onChange,
}: {
  id: string;
  uploadType: "categories" | "products" | "proofs";
  prefix?: string;
  value: string;
  disabled?: boolean;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", uploadType);
      if (prefix?.trim()) {
        formData.append("prefix", prefix.trim());
      }

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        success: boolean;
        message: string;
        data?: { url: string };
      };
      if (!response.ok || !payload.success || !payload.data?.url) {
        throw new Error(payload.message || "Gagal mengunggah gambar");
      }

      onChange(payload.data.url);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Gagal mengunggah gambar",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={disabled || isUploading}
          onChange={handleFileChange}
          className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-primary"
        />
        {isUploading && <Spinner />}
      </div>

      {value && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-2">
          <div className="flex min-w-0 items-center gap-3">
            <NextImage
              src={value}
              alt="Preview gambar"
              width={48}
              height={48}
              unoptimized
              className="size-12 shrink-0 rounded-md border object-cover"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Upload className="size-3" /> Gambar siap disimpan
              </p>
              <p className="truncate text-xs text-muted-foreground">{value}</p>
            </div>
          </div>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            disabled={disabled || isUploading}
            aria-label="Hapus gambar"
            onClick={() => onChange("")}
          >
            <X />
          </Button>
        </div>
      )}

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
    </div>
  );
}
