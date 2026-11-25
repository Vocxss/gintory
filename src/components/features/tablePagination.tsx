"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function buildPageList(
  page: number,
  totalPages: number,
): Array<number | "ellipsis-start" | "ellipsis-end"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages: Array<number | "ellipsis-start" | "ellipsis-end"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push("ellipsis-start");
  for (let current = start; current <= end; current += 1) {
    pages.push(current);
  }
  if (end < totalPages - 1) pages.push("ellipsis-end");
  pages.push(totalPages);
  return pages;
}

export function TablePagination({
  page,
  totalPages,
  total,
  pageSize = 20,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  onPageChange: (nextPage: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const pages = buildPageList(page, safeTotalPages);

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        Menampilkan {startItem}–{endItem} dari {total} data (Halaman {page} dari{" "}
        {safeTotalPages})
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#prev"
              text="Sebelumnya"
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              onClick={(event) => {
                event.preventDefault();
                if (page > 1) onPageChange(page - 1);
              }}
            />
          </PaginationItem>
          {pages.map((item) => (
            <PaginationItem key={item}>
              {typeof item !== "number" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href={`#page-${item}`}
                  isActive={item === page}
                  onClick={(event) => {
                    event.preventDefault();
                    if (item !== page) onPageChange(item);
                  }}
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#next"
              text="Berikutnya"
              aria-disabled={page >= safeTotalPages}
              className={
                page >= safeTotalPages ? "pointer-events-none opacity-50" : ""
              }
              onClick={(event) => {
                event.preventDefault();
                if (page < safeTotalPages) onPageChange(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
