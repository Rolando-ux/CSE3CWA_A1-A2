import { NextRequest, NextResponse } from "next/server";
import { LAST_TAB_COOKIE, NAV_LINKS } from "./app/nav-links";

const VALID_PATHS = new Set(NAV_LINKS.map((link) => link.href));

export function proxy(request: NextRequest) {
  // Only redirect on a real full-page load (typing the URL, refreshing,
  // opening a bookmark) - not on Next.js's own client-side navigation
  // requests, otherwise clicking "Home" from another page would bounce
  // straight back to the last remembered tab.
  const isDocumentRequest = request.headers.get("sec-fetch-dest") === "document";

  if (!isDocumentRequest) {
    return NextResponse.next();
  }

  const lastTab = request.cookies.get(LAST_TAB_COOKIE)?.value;

  if (lastTab && lastTab !== "/" && VALID_PATHS.has(lastTab)) {
    return NextResponse.redirect(new URL(lastTab, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
