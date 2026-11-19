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

  if (req.nextUrl.pathname.startsWith("/login") && token.role) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (req.nextUrl.pathname.startsWith("/dashboard") && token.role === "admin") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url))
  }

  if (req.nextUrl.pathname.startsWith("/admin") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
}
