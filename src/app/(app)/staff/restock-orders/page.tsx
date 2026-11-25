"use client";

import { Suspense } from "react";
import { RestockManagement } from "@/components/features/restockManagement";
import { Spinner } from "@/components/ui/spinner";

export default function StaffRestockOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      }
    >
      <RestockManagement accessRole="staff" />
    </Suspense>
  );
}
