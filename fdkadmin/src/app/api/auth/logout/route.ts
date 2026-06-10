import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("fdk_session");
  response.cookies.delete("fdk_worker");
  return response;
}
