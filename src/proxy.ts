import { NextResponse } from "next/server";
import { auth } from "./app/api/[...nextauth]/route";

export default auth((req) => {
  const session = req.auth;

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const pathname = req.nextUrl.pathname;
  const role = session.user?.role;

  const allowedRoutes: Record<string, string[]> = {
    admin: ["/admin"],
    gintory_manager: [
      "/admin/dashboard",
      "/admin/products",
      "/admin/categories",
      "/admin/restock-orders",
      "/admin/transactions",
    ],
    gintory_staff: [
      "/admin/dashboard",
      "/admin/products",
      "/admin/transactions",
    ],
    supplier: ["/admin/dashboard", "/admin/restock-orders"],
  };

  if (
    pathname.startsWith("/admin") &&
    !allowedRoutes[role ?? ""]?.some((route) =>
      pathname === route || pathname.startsWith(`${route}/`),
    )
  ) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/admin/:path*", "/dashboard/:path*"],
};
