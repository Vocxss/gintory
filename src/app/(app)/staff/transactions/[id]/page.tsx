"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { TransactionDetail } from "@/components/features/transactionDetail";
import { Spinner } from "@/components/ui/spinner";

function Content() {
  const params = useParams<{ id: string }>();
  return <TransactionDetail id={params.id} accessRole="staff" />;
}

export default function StaffTransactionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
