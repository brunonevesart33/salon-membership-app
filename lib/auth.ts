import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function sessionSecret() {
  const configured = process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV === "production" && !configured) throw new Error("NEXTAUTH_SECRET must be configured in production");
  return new TextEncoder().encode(configured || "development-only-change-me-please-32-chars");
}
export async function makeSession(id: string, role: "CLIENT" | "ADMIN") {
  const token = await new SignJWT({ role }).setProtectedHeader({ alg: "HS256" }).setSubject(id).setIssuedAt().setExpirationTime("7d").sign(sessionSecret());
  (await cookies()).set("salon_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function getSession() {
  const token = (await cookies()).get("salon_session")?.value;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, sessionSecret()); return { id: String(payload.sub), role: payload.role as "CLIENT" | "ADMIN" }; }
  catch { return null; }
}
