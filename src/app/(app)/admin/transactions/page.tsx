"use client";

import { Suspense } from "react";
import { TransactionManagement } from "@/components/features/transactionManagement";
import { Spinner } from "@/components/ui/spinner";

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      }
    >
      <TransactionManagement accessRole="admin" />
    </Suspense>
  );
}
