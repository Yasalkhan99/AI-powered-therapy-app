import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/_next", "/api", "/favicon.ico", "/public"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuth = !!token;

  if (!isAuth && !["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuth) {
    if (pathname === "/") {
      if (token.setupCompleted) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      } else {
        return NextResponse.redirect(new URL("/profile-setup", req.url));
      }
    }
    if (["/dashboard", "/chat", "/voice"].includes(pathname) && !token.setupCompleted) {
      return NextResponse.redirect(new URL("/profile-setup", req.url));
    }
    if (pathname === "/profile-setup" && token.setupCompleted) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}; 