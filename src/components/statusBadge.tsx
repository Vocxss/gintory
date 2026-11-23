"use client";

import { Badge } from "@/components/ui/badge";

const roleStyles: Record<string, string> = {
  admin: "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200",
  manager:
    "bg-orange-100 text-secondary dark:bg-secondary dark:text-orange-300",
  staff:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  supplier:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
};

const stockStyles: Record<string, string> = {
  "Out of Stock":
    "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  Severe: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  Low: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Normal:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

const statusStyles: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Confirmed: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  "In Transit": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  Inspecting:
    "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  Received:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Shipped: "bg-blue-100 text-blue-800 dark:bg-teal-950 dark:text-teal-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  Returned: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export function StockStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="ghost" className={stockStyles[status] ?? ""}>
      {status}
    </Badge>
  );
}

export function WorkflowStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="ghost" className={statusStyles[status] ?? ""}>
      {status}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="ghost" className={roleStyles[role] ?? ""}>
      {role.charAt(0).toUpperCase() + role.substring(1)}
    </Badge>
  );
}
