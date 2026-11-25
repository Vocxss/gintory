import { Suspense } from "react";
import { RestockDetailView } from "@/components/features/restockDetailView";
import { Spinner } from "@/components/ui/spinner";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RestockDetailView id={id} accessRole="supplier" />;
}

export default function SupplierRestockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
