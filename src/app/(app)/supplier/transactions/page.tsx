"use client";

import { TransactionManagement } from "@/components/features/transactionManagement";
import { Spinner } from "@/components/ui/spinner";
import { Suspense } from "react";

export default function SupplierTransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center py-12">
          <Spinner />
        </div>
      }
    >
      <TransactionManagement accessRole="supplier" />
    </Suspense>
  );
}
