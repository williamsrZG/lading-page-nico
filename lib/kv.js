const SCHEDULE_KEY = "whatsapp_schedule";
const TIMEZONE = process.env.SCHEDULE_TIMEZONE || "America/Argentina/Buenos_Aires";
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function hasKvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function defaultSchedule() {
  const phone = (process.env.DEFAULT_PHONE || "").replace(/\D/g, "");
  return {
    shifts: [
      { phone, start: "00:00", end: "12:00" },
      { phone, start: "12:00", end: "00:00" },
    ],
  };
}

function normalizeSchedule(raw) {
  if (!raw || !Array.isArray(raw.shifts) || raw.shifts.length !== 2) {
    return defaultSchedule();
  }
  const shifts = raw.shifts.map((s) => ({
    phone: typeof s?.phone === "string" || typeof s?.phone === "number" ? String(s.phone).replace(/\D/g, "") : "",
    start: TIME_RE.test(s?.start) ? s.start : "00:00",
    end: TIME_RE.test(s?.end) ? s.end : "00:00",
  }));
  return { shifts };
}

export function isValidSchedule(schedule) {
  if (!schedule || !Array.isArray(schedule.shifts) || schedule.shifts.length !== 2) {
    return false;
  }
  return schedule.shifts.every((s) => {
    const digits = String(s.phone || "").replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 && TIME_RE.test(s.start) && TIME_RE.test(s.end);
  });
}

export async function getSchedule() {
  if (hasKvConfigured()) {
    try {
      const { kv } = await import("@vercel/kv");
      const stored = await kv.get(SCHEDULE_KEY);
      if (stored) return normalizeSchedule(stored);
    } catch (err) {
      console.error("No se pudo leer el horario desde Vercel KV:", err);
    }
  }
  return defaultSchedule();
}

export async function setSchedule(schedule) {
  if (!hasKvConfigured()) {
    const err = new Error(
      "Vercel KV no esta configurado. Anda a Storage > Create Database en el dashboard de Vercel y conectalo a este proyecto."
    );
    err.code = "KV_NOT_CONFIGURED";
    throw err;
  }
  if (!isValidSchedule(schedule)) {
    const err = new Error("Datos de horario invalidos.");
    err.code = "INVALID_SCHEDULE";
    throw err;
  }

  const clean = {
    shifts: schedule.shifts.map((s) => ({
      phone: String(s.phone).replace(/\D/g, ""),
      start: s.start,
      end: s.end,
    })),
  };

  const { kv } = await import("@vercel/kv");
  await kv.set(SCHEDULE_KEY, clean);
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isWithinRange(current, start, end) {
  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function getCurrentMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export async function getActivePhone() {
  const schedule = await getSchedule();
  const current = getCurrentMinutes();
  const active = schedule.shifts.find((s) => isWithinRange(current, toMinutes(s.start), toMinutes(s.end)));
  return (active || schedule.shifts[0])?.phone || (process.env.DEFAULT_PHONE || "").replace(/\D/g, "");
}
