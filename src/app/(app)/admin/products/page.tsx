"use client";

import { ProductManagement } from "@/components/features/productManagement";

export default function AdminProductsPage() {
  return <ProductManagement accessRole="admin" />;
}
