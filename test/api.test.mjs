process.env.WORKOUT_TOKEN = "s3cret";
process.env.KV_REST_API_URL = "https://fake.upstash.io";
process.env.KV_REST_API_TOKEN = "faketoken";

// --- atrapa Upstash REST ---
const store = new Map();
globalThis.fetch = async (_url, opts) => {
  const cmd = JSON.parse(opts.body);
  const [op, key, value, ...rest] = cmd;
  let result = null;
  if (op === "GET") result = store.has(key) ? store.get(key) : null;
  else if (op === "SET") {
    const nx = rest.includes("NX") || value === "1" && rest.includes("NX");
    if (cmd.includes("NX")) { if (store.has(key)) result = null; else { store.set(key, value); result = "OK"; } }
    else { store.set(key, value); result = "OK"; }
  }
  return { ok: true, json: async () => ({ result }) };
};

const { default: state } = await import("../api/state.js");
const { default: sessions } = await import("../api/sessions.js");
const { default: packages } = await import("../api/packages.js");

function mkRes() {
  const r = { headers: {}, code: null, payload: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = c => { r.code = c; return r; };
  r.send = b => { r.payload = JSON.parse(b); return r; };
  return r;
}
const auth = { authorization: "Bearer s3cret" };
async function call(h, req) {
  const res = mkRes();
  await h({ method: "GET", headers: {}, query: {}, ...req }, res);
  return res;
}
let fails = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + extra}`);
  if (!cond) fails++;
};

// 1. pusty stan
let r = await call(state, {});
check("GET /api/state na pustym stanie -> 200, brak pakietów", r.code === 200 && r.payload.packages.length === 0, JSON.stringify(r.payload));

// 2. log bez pakietu
r = await call(sessions, { method: "POST", headers: auth, body: {} });
check("POST /api/sessions bez pakietu -> 409 no_active_package", r.code === 409 && r.payload.error === "no_active_package", JSON.stringify(r.payload));

// 3. brak tokena
r = await call(sessions, { method: "POST", headers: {}, body: {} });
check("POST bez tokena -> 401", r.code === 401, JSON.stringify(r.payload));

// 4. zły token
r = await call(sessions, { method: "POST", headers: { authorization: "Bearer zly" }, body: {} });
check("POST ze złym tokenem -> 401", r.code === 401, JSON.stringify(r.payload));

// 5. GET publiczny (bez tokena) działa
r = await call(state, {});
check("GET /api/state bez tokena -> 200 (publiczny)", r.code === 200);

// 6. nowy pakiet
r = await call(packages, { method: "POST", headers: auth, body: { size: 10, purchasedAt: "2026-07-09" } });
check("POST /api/packages -> 201, id 2026-07", r.code === 201 && r.payload.package.id === "2026-07", JSON.stringify(r.payload));

// 7. log treningu
r = await call(sessions, { method: "POST", headers: auth, body: { date: "2026-07-09" } });
check("POST /api/sessions -> 201, n=1, remaining=9", r.code === 201 && r.payload.session.n === 1 && r.payload.remaining === 9, JSON.stringify(r.payload));

// 8. idempotencja
r = await call(sessions, { method: "POST", headers: auth, body: { date: "2026-07-23", idempotencyKey: "k1" } });
check("POST z idempotencyKey (1. raz) -> 201 n=2", r.code === 201 && r.payload.session.n === 2, JSON.stringify(r.payload));
r = await call(sessions, { method: "POST", headers: auth, body: { date: "2026-07-23", idempotencyKey: "k1" } });
check("POST z tym samym idempotencyKey -> 200 duplicate, bez nowego slotu", r.code === 200 && r.payload.duplicate === true && r.payload.state.packages[0].sessions.length === 2, JSON.stringify(r.payload));

// 9. zła data
r = await call(sessions, { method: "POST", headers: auth, body: { date: "2026-02-30" } });
check("POST z datą 2026-02-30 -> 400 invalid_date", r.code === 400 && r.payload.error === "invalid_date", JSON.stringify(r.payload));

// 10. nowy pakiet gdy stary niewyczerpany
r = await call(packages, { method: "POST", headers: auth, body: {} });
check("POST /api/packages przy niewyczerpanym -> 409", r.code === 409 && r.payload.error === "active_package_not_exhausted", JSON.stringify(r.payload));

// 11. undo
r = await call(sessions, { method: "DELETE", headers: auth, query: { n: "1" } });
check("DELETE ?n=1 -> 200, przenumerowanie", r.code === 200 && r.payload.state.packages[0].sessions.length === 1 && r.payload.state.packages[0].sessions[0].n === 1, JSON.stringify(r.payload));

r = await call(sessions, { method: "DELETE", headers: auth, query: { n: "99" } });
check("DELETE ?n=99 -> 404", r.code === 404, JSON.stringify(r.payload));

// 12. wyczerpanie pakietu
for (let i = 0; i < 9; i++) await call(sessions, { method: "POST", headers: auth, body: { date: `2026-08-${String(i + 1).padStart(2, "0")}` } });
r = await call(state, {});
check("pakiet zapełniony do 10/10", r.payload.packages[0].sessions.length === 10, JSON.stringify(r.payload.packages[0].sessions.length));
r = await call(sessions, { method: "POST", headers: auth, body: {} });
check("POST przy pełnym pakiecie -> 409 package_exhausted (bez auto-dosypania)", r.code === 409 && r.payload.error === "package_exhausted", JSON.stringify(r.payload));

// 13. nowy pakiet po wyczerpaniu
r = await call(packages, { method: "POST", headers: auth, body: { purchasedAt: "2026-09-01" } });
check("POST /api/packages po wyczerpaniu -> 201, id 2026-09", r.code === 201 && r.payload.package.id === "2026-09", JSON.stringify(r.payload));
r = await call(state, {});
check("historia zachowana: 2 pakiety", r.payload.packages.length === 2);

// 14. metody
r = await call(state, { method: "POST" });
check("POST /api/state -> 405", r.code === 405);

console.log(fails === 0 ? "\nWszystkie testy przeszły." : `\n${fails} testów nie przeszło.`);
process.exit(fails === 0 ? 0 : 1);
