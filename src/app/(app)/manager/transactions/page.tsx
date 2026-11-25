"use client";

import { Suspense } from "react";
import { TransactionManagement } from "@/components/features/transactionManagement";
import { Spinner } from "@/components/ui/spinner";

export default function ManagerTransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      }
    >
      <TransactionManagement accessRole="manager" />
    </Suspense>
  );
}
