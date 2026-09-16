import { NextRequest, NextResponse } from "next/server";

function isPhone(ua: string) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("raseed_session")?.value;
  const ua = request.headers.get("user-agent") ?? "";

  if (pathname === "/login" || pathname === "/login/") {
    const dest = isPhone(ua) ? "/booker/login" : "/office/login";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (
    pathname.startsWith("/office") &&
    pathname !== "/office/login" &&
    !session
  ) {
    return NextResponse.redirect(new URL("/office/login", request.url));
  }

  if (
    pathname.startsWith("/booker") &&
    pathname !== "/booker/login" &&
    !session
  ) {
    return NextResponse.redirect(new URL("/booker/login", request.url));
  }

  if (pathname === "/office/login" && session) {
    return NextResponse.redirect(new URL("/office", request.url));
  }
  if (pathname === "/booker/login" && session) {
    return NextResponse.redirect(new URL("/booker", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/login/", "/office/:path*", "/booker/:path*"],
};
