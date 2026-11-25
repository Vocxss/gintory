"use client";

import type { TransactionListItem } from "@/components/features/transactionFormSheet";
import {
  TransactionTypeBadge,
  WorkflowStatusBadge,
} from "@/components/statusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreHorizontalIcon,
  PencilEdit02Icon,
  TrashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Eye } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdownMenu";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export function TransactionTable({
  accessRole,
  currentUserId,
  transactions,
  isPending,
  onApprove,
  onReject,
  onShip,
  onEdit,
  onDelete,
}: {
  accessRole: "admin" | "manager" | "staff" | "supplier";
  currentUserId?: string;
  transactions: TransactionListItem[];
  isPending: boolean;
  onApprove: (id: string) => void;
  onReject: (trx: TransactionListItem) => void;
  onShip: (id: string) => void;
  onEdit: (trx: TransactionListItem) => void;
  onDelete: (trx: TransactionListItem) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No. Transaksi</TableHead>
          <TableHead>Tipe</TableHead>
          <TableHead>Pihak / PO</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Tanggal</TableHead>
          <TableHead>Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length ? (
          transactions.map((trx) => {
            const isOwnerPending =
              accessRole === "staff" &&
              trx.status === "Pending" &&
              trx.created_by === currentUserId;
            return (
              <TableRow key={trx.id}>
                <TableCell className="font-medium">
                  {trx.transaction_number}
                </TableCell>
                <TableCell>
                  <TransactionTypeBadge type={trx.type} />
                </TableCell>
                <TableCell>
                  <div>
                    <p>{trx.supplier_company ?? trx.customer_name ?? "-"}</p>
                    {trx.po_number && (
                      <p className="text-xs text-muted-foreground">
                        {trx.po_number}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <WorkflowStatusBadge status={trx.status} />
                </TableCell>
                <TableCell>{formatDate(trx.transaction_date)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant={"ghost"} size={"icon-xs"}>
                          <HugeiconsIcon icon={MoreHorizontalIcon} />
                        </Button>
                      }
                    />
                    <DropdownMenuContent>
                      <DropdownMenuItem className={"text-xs"}>
                        <Link
                          href={`/${accessRole}/transactions/${trx.id}`}
                          className="flex items-center gap-2.5"
                        >
                          <Eye /> <p>Lihat detail</p>
                        </Link>
                      </DropdownMenuItem>
                      {isOwnerPending && (
                        <>
                          <DropdownMenuItem
                            onClick={() => onEdit(trx)}
                            className={"text-xs"}
                          >
                            <HugeiconsIcon icon={PencilEdit02Icon} />
                            <p>Edit</p>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={"text-xs"}
                            variant="destructive"
                            onClick={() => onDelete(trx)}
                          >
                            <HugeiconsIcon icon={TrashIcon} /> <p>Hapus</p>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center text-muted-foreground"
            >
              Belum ada transaksi
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
