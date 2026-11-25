"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { RestockDetailView } from "@/components/features/restockDetailView";
import { Spinner } from "@/components/ui/spinner";

function Content() {
  const params = useParams<{ id: string }>();
  return <RestockDetailView id={params.id} accessRole="manager" />;
}

export default function ManagerRestockDetailPage() {
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
