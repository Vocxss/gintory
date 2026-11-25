"use client";

import { Input } from "@/components/ui/input";

export function ProductQuantityPicker({
  title,
  emptyText,
  products,
  values,
  onChange,
}: {
  title: string;
  emptyText: string;
  products: Array<{
    id: string;
    name: string;
    subtitle: string;
    max?: number;
  }>;
  values: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {products.length ? (
        <div className="grid gap-2">
          {products.map((product) => {
            const currentValue = values[product.id] ?? 0;
            const isOverMax =
              product.max !== undefined && currentValue > product.max;

            return (
              <div
                key={product.id}
                className="flex flex-col gap-1 rounded border p-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.subtitle}
                    </p>
                  </div>
                  <Input
                    className="w-24"
                    type="number"
                    min={0}
                    max={product.max}
                    aria-invalid={isOverMax}
                    value={currentValue}
                    onChange={(event) =>
                      onChange({
                        ...values,
                        [product.id]: Number(event.target.value),
                      })
                    }
                  />
                </div>
                {isOverMax && (
                  <p className="text-xs text-destructive">
                    Jumlah tidak boleh melebihi batas maksimal ({product.max})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}
