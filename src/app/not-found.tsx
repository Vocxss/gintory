"use client";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ChevronLeftIcon, Sad01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex justify-center items-center">
      <Empty>
        <EmptyMedia variant={"icon"}>
          <HugeiconsIcon icon={Sad01Icon} />
        </EmptyMedia>
        <EmptyTitle>Halaman Tidak Ditemukan</EmptyTitle>
        <EmptyDescription>
          Halaman yang kamu cari tidak ada. Silahkan kembali ke halaman
          sebelumnya
        </EmptyDescription>
        <EmptyContent>
          <Button onClick={() => router.back()} size={"sm"}>
            <HugeiconsIcon icon={ChevronLeftIcon} /> Kembali
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
