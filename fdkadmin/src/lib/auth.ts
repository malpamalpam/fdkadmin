import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE_NAME = "fdk_session";
const WORKER_COOKIE = "fdk_worker";

export async function getSession(): Promise<{ authenticated: boolean; worker: string | null }> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  const worker = cookieStore.get(WORKER_COOKIE);

  return {
    authenticated: session?.value === "valid",
    worker: worker?.value || null,
  };
}

export function verifyAuth(request: NextRequest): { authenticated: boolean; worker: string | null } {
  const session = request.cookies.get(COOKIE_NAME);
  const worker = request.cookies.get(WORKER_COOKIE);

  return {
    authenticated: session?.value === "valid",
    worker: worker?.value || null,
  };
}
