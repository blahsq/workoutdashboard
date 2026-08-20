import { timingSafeEqual } from "node:crypto";

const STATE_KEY = "workouts:state";
const IDEM_PREFIX = "workouts:idem:";
const IDEM_TTL_SECONDS = 86400;

/* ---------- Upstash REST (bez zależności npm) ---------- */

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new HttpError(500, "storage_not_configured",
      "Brak konfiguracji Redisa (KV_REST_API_URL / KV_REST_API_TOKEN).");
  }
  return { url: url.replace(/\/$/, ""), token };
}

async function redis(command) {
  const { url, token } = redisConfig();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    throw new HttpError(502, "storage_error", `Redis odpowiedział ${res.status}.`);
  }
  const body = await res.json();
  if (body.error) throw new HttpError(502, "storage_error", body.error);
  return body.result;
}

/* ---------- stan ---------- */

export const EMPTY_STATE = { schema: 1, client: "", trainer: "", packages: [] };

export async function getState() {
  const raw = await redis(["GET", STATE_KEY]);
  if (!raw) return { ...EMPTY_STATE };
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new HttpError(500, "corrupt_state", "Zapisany stan nie jest poprawnym JSON-em.");
  }
}

export async function setState(state) {
  await redis(["SET", STATE_KEY, JSON.stringify(state)]);
  return state;
}

/** Zwraca true, jeśli klucz jest nowy (czyli żądanie nie jest powtórką). */
export async function claimIdempotencyKey(key) {
  const result = await redis(["SET", IDEM_PREFIX + key, "1", "NX", "EX", String(IDEM_TTL_SECONDS)]);
  return result === "OK";
}

export function currentPackage(state) {
  return state.packages.length ? state.packages[state.packages.length - 1] : null;
}

/* ---------- HTTP ---------- */

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function requireAuth(req) {
  const expected = process.env.WORKOUT_TOKEN;
  if (!expected) {
    throw new HttpError(500, "token_not_configured", "Brak WORKOUT_TOKEN w zmiennych środowiskowych.");
  }
  const header = req.headers.authorization || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new HttpError(401, "unauthorized", "Nieprawidłowy lub brakujący token.");
  }
}

export function readBody(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === "object") return body;
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "invalid_json", "Body nie jest poprawnym JSON-em.");
  }
}

export function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).send(JSON.stringify(payload));
}

export function fail(res, err) {
  if (err instanceof HttpError) {
    return json(res, err.status, { error: err.code, message: err.message, summary: err.message, ...err.extra });
  }
  console.error(err);
  return json(res, 500, { error: "internal_error", message: "Nieoczekiwany błąd.", summary: "Nieoczekiwany błąd." });
}

export function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  return json(res, 405, { error: "method_not_allowed", message: `Dozwolone metody: ${allowed.join(", ")}.` });
}

/* ---------- daty ---------- */

/** Dzisiejsza data w strefie Europe/Warsaw jako YYYY-MM-DD. */
export function todayInWarsaw() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
