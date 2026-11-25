"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FolderTree } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { ImageUploadField } from "@/components/features/imageUploadField";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/inputGroup";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { categorySchema } from "@/lib/validations/category";

export type CategoryItem = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  product_count: number;
};

export type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoryFormSheet({
  open,
  editing,
  isPending,
  errorMessage,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  editing: CategoryItem | null;
  isPending: boolean;
  errorMessage?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CategoryFormValues) => void;
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "", image_url: "" },
  });

  const categoryName = useWatch({ control: form.control, name: "name" });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        description: editing.description,
        image_url: editing.image_url,
      });
    } else {
      form.reset({ name: "", description: "", image_url: "" });
    }
  }, [editing, form, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {editing ? "Edit Kategori" : "Tambah Kategori"}
          </SheetTitle>
        </SheetHeader>
        <form className="p-6" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="category-name">Nama kategori</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <FolderTree />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="category-name"
                      placeholder="Gaming Mouse"
                    />
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="category-description">
                    Deskripsi
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="category-description"
                      placeholder="Deskripsi kategori"
                    />
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="image_url"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="category-image">
                    Gambar kategori
                  </FieldLabel>
                  <ImageUploadField
                    id="category-image"
                    uploadType="categories"
                    prefix={categoryName}
                    value={field.value}
                    disabled={isPending}
                    onChange={field.onChange}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                Simpan
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
            </div>
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  );
}
