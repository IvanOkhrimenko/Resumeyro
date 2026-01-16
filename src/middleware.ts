import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

// Routes that require authentication (without locale prefix)
const protectedRoutes = ["/dashboard", "/resumes", "/billing", "/settings", "/ai", "/admin"];

// Routes that should redirect to dashboard if already logged in
const authRoutes = ["/login", "/register"];

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip i18n middleware for API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // First, run the i18n middleware to handle locale routing
  const response = intlMiddleware(req);

  // Extract the pathname without locale prefix for auth checks
  const localePattern = /^\/(en|uk)(\/|$)/;
  const pathnameWithoutLocale = pathname.replace(localePattern, "/");

  // Check for session cookie (NextAuth creates this cookie when logged in)
  const sessionCookie =
    req.cookies.get("authjs.session-token") ||
    req.cookies.get("__Secure-authjs.session-token");

  const isLoggedIn = !!sessionCookie;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Extract locale from URL for redirects
  const localeMatch = pathname.match(localePattern);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth routes while logged in
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except static files and api routes
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
