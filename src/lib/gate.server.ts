import { redirect } from "@tanstack/react-router";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env.SESSION_SECRET!,
    name: "fin-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export function getGateSession() {
  return useSession<GateSession>(sessionConfig());
}

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function credentialsValid(username: string, password: string): boolean {
  const u = process.env.SITE_USERNAME;
  const p = process.env.SITE_PASSWORD;
  if (!u || !p) throw new Error("Credenciais do sistema não configuradas");
  return matches(username.trim().toLowerCase(), u.trim().toLowerCase()) && matches(password, p);
}

export async function requireUnlocked() {
  const session = await getGateSession();
  if (!session.data.unlocked) throw redirect({ to: "/login" });
  return session;
}
