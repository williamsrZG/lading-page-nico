const SCHEDULE_KEY = "whatsapp_schedule";
const TIMEZONE = process.env.SCHEDULE_TIMEZONE || "America/Argentina/Buenos_Aires";
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const MAX_SHIFTS = 24;

function hasKvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Deja solo digitos y completa el formato de WhatsApp para celulares de Argentina:
// 3562458009 (10 digitos, sin codigo de pais) -> 5493562458009
// 543562458009 (con 54 pero sin el 9)        -> 5493562458009
export function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `549${digits}`;
  if (digits.length === 12 && digits.startsWith("54") && !digits.startsWith("549")) {
    return `549${digits.slice(2)}`;
  }
  return digits;
}

function defaultSchedule() {
  const phone = normalizePhone(process.env.DEFAULT_PHONE);
  return { shifts: [{ phone, start: "00:00", end: "00:00" }] };
}

function normalizeSchedule(raw) {
  if (!raw || !Array.isArray(raw.shifts) || raw.shifts.length === 0) {
    return defaultSchedule();
  }
  const shifts = raw.shifts.map((s) => ({
    phone: typeof s?.phone === "string" || typeof s?.phone === "number" ? normalizePhone(s.phone) : "",
    start: TIME_RE.test(s?.start) ? s.start : "00:00",
    end: TIME_RE.test(s?.end) ? s.end : "00:00",
  }));
  return { shifts };
}

// Devuelve un mensaje de error o null si el horario es valido.
export function validateShifts(shifts) {
  if (!Array.isArray(shifts) || shifts.length === 0) {
    return "Tenes que cargar al menos un numero.";
  }
  if (shifts.length > MAX_SHIFTS) {
    return `Como maximo se pueden cargar ${MAX_SHIFTS} numeros.`;
  }
  for (let i = 0; i < shifts.length; i++) {
    const s = shifts[i];
    const digits = normalizePhone(s?.phone);
    if (digits.length < 8 || digits.length > 15) {
      return `Numero ${i + 1}: numero invalido. Usa codigo de area + numero (ej: 3562458009) o el formato completo (ej: 5493562458009).`;
    }
    if (!TIME_RE.test(s?.start) || !TIME_RE.test(s?.end)) {
      return `Numero ${i + 1}: completa los dos horarios.`;
    }
  }
  return null;
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
  const error = validateShifts(schedule?.shifts);
  if (error) {
    const err = new Error(error);
    err.code = "INVALID_SCHEDULE";
    throw err;
  }

  const clean = {
    shifts: schedule.shifts.map((s) => ({
      phone: normalizePhone(s.phone),
      start: s.start,
      end: s.end,
    })),
  };

  const { kv } = await import("@vercel/kv");
  await kv.set(SCHEDULE_KEY, clean);
  return clean;
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

// Indice del turno activo en este momento. Si dos turnos se superponen gana el
// que esta mas arriba en la lista; si la hora no cae en ningun turno se usa el
// Numero 1 como respaldo.
export function getActiveIndex(shifts, current = getCurrentMinutes()) {
  const index = shifts.findIndex((s) => isWithinRange(current, toMinutes(s.start), toMinutes(s.end)));
  return index === -1 ? 0 : index;
}

export async function getActiveState() {
  const schedule = await getSchedule();
  const current = getCurrentMinutes();
  const covered = schedule.shifts.some((s) => isWithinRange(current, toMinutes(s.start), toMinutes(s.end)));
  return { ...schedule, activeIndex: getActiveIndex(schedule.shifts, current), covered };
}

export async function getActivePhone() {
  const { shifts } = await getSchedule();
  return shifts[getActiveIndex(shifts)]?.phone || normalizePhone(process.env.DEFAULT_PHONE);
}
