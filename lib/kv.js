const PHONE_KEY = "whatsapp_phone";

function hasKvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function getPhone() {
  if (hasKvConfigured()) {
    try {
      const { kv } = await import("@vercel/kv");
      const stored = await kv.get(PHONE_KEY);
      if (stored) return String(stored);
    } catch (err) {
      console.error("No se pudo leer el numero desde Vercel KV:", err);
    }
  }
  return process.env.DEFAULT_PHONE || "";
}

export async function setPhone(phone) {
  if (!hasKvConfigured()) {
    const err = new Error(
      "Vercel KV no esta configurado. Anda a Storage > Create Database > KV en el dashboard de Vercel y conectalo a este proyecto."
    );
    err.code = "KV_NOT_CONFIGURED";
    throw err;
  }
  const { kv } = await import("@vercel/kv");
  await kv.set(PHONE_KEY, phone);
}
