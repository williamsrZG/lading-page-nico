import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPhone, setPhone } from "@/lib/kv";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

export async function GET() {
  const phone = await getPhone();
  return NextResponse.json({ phone });
}

export async function POST(request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawPhone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const digitsOnly = rawPhone.replace(/\D/g, "");

  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return NextResponse.json(
      { error: "Numero invalido. Usa codigo de pais + numero, solo digitos (ej: 5491122334455)." },
      { status: 400 }
    );
  }

  try {
    await setPhone(digitsOnly);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "No se pudo guardar el numero." },
      { status: 500 }
    );
  }

  return NextResponse.json({ phone: digitsOnly });
}
