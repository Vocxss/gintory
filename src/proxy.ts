import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  })

  if (!token) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = String(token.role)
  const rolePrefixes: Record<string, string> = {
    admin: "/admin",
    manager: "/manager",
    staff: "/staff",
    supplier: "/supplier",
  }
  const dashboardPaths: Record<string, string> = {
    admin: "/admin/dashboard",
    manager: "/manager/dashboard",
    staff: "/staff/dashboard",
    supplier: "/supplier/dashboard",
  }
  const allowedPrefix = rolePrefixes[role]
  const dashboardPath = dashboardPaths[role]
  const pathname = req.nextUrl.pathname

  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.redirect(new URL(dashboardPath, req.url))
  }

  const roleRoutePrefixes = ["/admin", "/manager", "/staff", "/supplier"]
  const isRoleRoute = roleRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (
    isRoleRoute &&
    allowedPrefix &&
    pathname !== allowedPrefix &&
    !pathname.startsWith(`${allowedPrefix}/`)
  ) {
    return NextResponse.redirect(new URL(dashboardPath, req.url))
  }

  if (
    !isRoleRoute &&
    !["/login", "/register"].includes(pathname)
  ) {
    return NextResponse.redirect(new URL(dashboardPath, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/manager/:path*",
    "/staf/:path*",
    "/supplier/:path*",
    "/dashboard/:path*",
    "/users/:path*",
    "/products/:path*",
    "/transactions/:path*",
    "/restock-orders/:path*",
    "/login",
    "/register",
  ],
}
