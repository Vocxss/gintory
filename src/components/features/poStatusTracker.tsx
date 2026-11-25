"use client";

import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAIN_STEPS = [
  "Pending",
  "Confirmed",
  "In Transit",
  "Inspecting",
  "Received",
] as const;

export function PoStatusTracker({
  status,
  statusReason,
}: {
  status: string;
  statusReason?: string | null;
}) {
  const isRejected = status === "Rejected";
  const isReturned = status === "Returned";
  const steps = isReturned
    ? ["Pending", "Confirmed", "In Transit", "Inspecting", "Returned"]
    : [...MAIN_STEPS];

  const activeIndex = isRejected ? 0 : steps.indexOf(status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracker Status Purchase Order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {steps.map((step, index) => {
            const reached = !isRejected && index <= activeIndex;
            const failedStep = isReturned && step === "Returned";
            return (
              <div
                key={step}
                className="flex items-center gap-2 rounded-md border p-2.5"
              >
                {failedStep ? (
                  <XCircle className="size-4 shrink-0 text-destructive" />
                ) : reached ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={`text-xs font-medium ${
                    failedStep
                      ? "text-destructive"
                      : reached
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {isRejected && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Purchase Order Ditolak Supplier</p>
              {statusReason && <p className="text-xs">{statusReason}</p>}
            </div>
          </div>
        )}

        {isReturned && statusReason && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Barang Diretur (Returned)</p>
              <p className="text-xs">{statusReason}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
