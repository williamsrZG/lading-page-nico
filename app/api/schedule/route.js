import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getActiveState, setSchedule, validateMessage, validateShifts } from "@/lib/kv";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isLoggedIn() {
  return isValidSessionToken(cookies().get(SESSION_COOKIE)?.value);
}

export async function GET() {
  if (!isLoggedIn()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json(await getActiveState());
}

export async function POST(request) {
  if (!isLoggedIn()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const error = validateShifts(body?.shifts) || validateMessage(body?.message);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    await setSchedule({ shifts: body.shifts, message: body.message });
  } catch (err) {
    return NextResponse.json({ error: err.message || "No se pudo guardar el horario." }, { status: 500 });
  }

  return NextResponse.json(await getActiveState());
}
