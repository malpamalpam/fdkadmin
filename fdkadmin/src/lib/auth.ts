import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { verifyToken, JwtPayload } from "./jwt";

const TOKEN_COOKIE = "fdk_token";

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE);
  if (!token?.value) return null;
  return verifyToken(token.value);
}

export async function verifyAuth(request: NextRequest): Promise<JwtPayload | null> {
  const token = request.cookies.get(TOKEN_COOKIE);
  if (!token?.value) return null;
  return verifyToken(token.value);
}

export function canAccessCase(
  user: JwtPayload,
  caseData: { dept: string; takerId?: string | null; ownerId?: string | null }
): boolean {
  if (user.role === "ADMIN" || user.role === "SUPERVISOR") return true;
  // EMPLOYEE: own dept, or cases they took/own
  if (user.dept && caseData.dept === user.dept) return true;
  if (caseData.takerId === user.userId) return true;
  if (caseData.ownerId === user.userId) return true;
  return false;
}

export function canChangeOwner(
  user: JwtPayload,
  caseData: { takerId?: string | null; ownerId?: string | null; dept: string }
): boolean {
  if (user.role === "ADMIN" || user.role === "SUPERVISOR") return true;
  if (caseData.takerId === user.userId) return true;
  if (caseData.ownerId === user.userId) return true;
  if (user.dept && caseData.dept === user.dept) return true;
  return false;
}

export function canSetDeadline(
  user: JwtPayload,
  caseData: { ownerId?: string | null; dept: string }
): boolean {
  if (user.role === "ADMIN") return true;
  if (caseData.ownerId === user.userId) return true;
  if (user.dept && caseData.dept === user.dept) return true;
  return false;
}

export function isAdmin(user: JwtPayload): boolean {
  return user.role === "ADMIN";
}

export function isAdminOrSupervisor(user: JwtPayload): boolean {
  return user.role === "ADMIN" || user.role === "SUPERVISOR";
}
