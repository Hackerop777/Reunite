import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";

export const AUTH_COOKIE = "lf_uid";
export const AUTH_HEADER = "x-lf-uid";

/**
 * Simulated auth — no real auth system.
 *
 * The current user is identified by EITHER:
 *  - the `x-lf-uid` request header (sent by the client from localStorage), OR
 *  - the `lf_uid` cookie.
 *
 * The header path is essential when the app runs inside a third-party iframe
 * (e.g. the sandbox preview panel): browsers do not attach SameSite=Lax/Strict
 * cookies to iframe subrequests (fetch/XHR), so a cookie-only scheme fails
 * there with "Not authenticated". The client stores the user id in localStorage
 * and sends it as a header on every request, which bypasses all SameSite /
 * third-party-cookie restrictions. The cookie remains as a fallback for
 * same-origin, top-level visits.
 */
export async function getCurrentUser() {
  const h = await headers();
  const headerUid = h.get(AUTH_HEADER);
  let uid: string | undefined = headerUid || undefined;
  if (!uid) {
    const store = await cookies();
    uid = store.get(AUTH_COOKIE)?.value;
  }
  if (!uid) return null;
  const user = await db.user.findUnique({ where: { id: uid } });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return user;
}
