import { NextResponse } from "next/server";

export function successResponse<T>(
  data: T,
  message = "Request berhasil diproses",
  status = 200,
  meta?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      ...(meta ? { meta } : {}),
    },
    { status },
  );
}

export function errorResponse(
  message: string,
  status: number,
  errors?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(errors ? { errors } : {}),
    },
    { status },
  );
}

export function getPagination(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageValue = Number(searchParams.get("page") ?? "1");
  const limitValue = Number(searchParams.get("limit") ?? "10");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const limit =
    Number.isInteger(limitValue) && limitValue > 0
      ? Math.min(limitValue, 100)
      : 10;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    searchParams,
  };
}

export function isPostgresError(
  error: unknown,
  code: string,
): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
