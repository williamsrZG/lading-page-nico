import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return NextResponse.json({ loggedIn: isValidSessionToken(token) });
}
