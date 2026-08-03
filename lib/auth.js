import crypto from "crypto";

export const SESSION_COOKIE = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "dev-secret-change-me";
}

export function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || "";
  return Boolean(expected) && password === expected;
}

export function makeSessionToken() {
  return crypto
    .createHash("sha256")
    .update(`${process.env.ADMIN_PASSWORD || ""}:${secret()}`)
    .digest("hex");
}

export function isValidSessionToken(token) {
  if (!token) return false;
  const expected = makeSessionToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
