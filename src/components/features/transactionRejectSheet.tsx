"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import type { TransactionListItem } from "@/components/features/transactionFormSheet";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

const rejectionSchema = z.object({
  rejection_reason: z.string().trim().min(1, "Alasan penolakan wajib diisi"),
});

export function TransactionRejectSheet({
  target,
  isPending,
  onClose,
  onConfirm,
}: {
  target: TransactionListItem | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (id: string, reason: string) => void;
}) {
  const form = useForm<z.infer<typeof rejectionSchema>>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { rejection_reason: "" },
  });

  useEffect(() => {
    if (target) form.reset({ rejection_reason: "" });
  }, [target, form]);

  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Tolak Transaksi</SheetTitle>
        </SheetHeader>
        {target && (
          <form
            className="p-6"
            onSubmit={form.handleSubmit((values) =>
              onConfirm(target.id, values.rejection_reason),
            )}
          >
            <FieldGroup>
              <p className="text-sm text-muted-foreground">
                {target.type === "INCOMING"
                  ? "Menolak barang masuk akan otomatis mengubah status PO terkait menjadi Returned."
                  : "Masukkan alasan penolakan pengajuan barang keluar."}
              </p>
              <Controller
                name="rejection_reason"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="trx-reject-reason">
                      Alasan penolakan
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id="trx-reject-reason"
                      placeholder="Wajib diisi"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Button type="submit" variant="destructive" disabled={isPending}>
                Konfirmasi Tolak
              </Button>
            </FieldGroup>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
