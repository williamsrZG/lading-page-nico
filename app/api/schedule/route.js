import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSchedule, setSchedule } from "@/lib/kv";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET() {
  const schedule = await getSchedule();
  return NextResponse.json(schedule);
}

export async function POST(request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const shifts = Array.isArray(body?.shifts) ? body.shifts : null;

  if (!shifts || shifts.length !== 2) {
    return NextResponse.json({ error: "Faltan datos de los dos numeros." }, { status: 400 });
  }

  for (const shift of shifts) {
    const digits = String(shift?.phone || "").replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      return NextResponse.json(
        { error: "Numero invalido. Usa codigo de pais + numero, solo digitos (ej: 5491122334455)." },
        { status: 400 }
      );
    }
    if (!TIME_RE.test(shift?.start) || !TIME_RE.test(shift?.end)) {
      return NextResponse.json({ error: "Horario invalido. Completa ambos horarios." }, { status: 400 });
    }
  }

  const schedule = {
    shifts: shifts.map((s) => ({
      phone: String(s.phone).replace(/\D/g, ""),
      start: s.start,
      end: s.end,
    })),
  };

  try {
    await setSchedule(schedule);
  } catch (err) {
    return NextResponse.json({ error: err.message || "No se pudo guardar el horario." }, { status: 500 });
  }

  return NextResponse.json(schedule);
}
