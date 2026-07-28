import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fdk-admin-secret-change-in-production"
);

export interface JwtPayload {
  userId: string;
  login: string;
  fullName: string;
  role: "ADMIN" | "SUPERVISOR" | "EMPLOYEE";
  dept: string | null;
  extraDepts: string[];
  gender: "K" | "M";
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as unknown as JwtPayload;
    // Backward compat: old tokens may not have extraDepts
    if (!p.extraDepts) p.extraDepts = [];
    return p;
  } catch {
    return null;
  }
}
