import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("raseed_session")?.value;

  if (pathname === "/office/login" || pathname === "/booker/login") {
    return NextResponse.redirect(
      new URL(session ? "/" : "/login", request.url),
    );
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/office") && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/booker") && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/login/", "/office/:path*", "/booker/:path*"],
};
