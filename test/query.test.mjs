process.env.WORKOUT_TOKEN = "s3cret";
process.env.KV_REST_API_URL = "https://fake.upstash.io";
process.env.KV_REST_API_TOKEN = "faketoken";
const store = new Map();
globalThis.fetch = async (_u, o) => {
  const cmd = JSON.parse(o.body); const [op, key, value] = cmd; let result = null;
  if (op === "GET") result = store.has(key) ? store.get(key) : null;
  else if (op === "SET") { if (cmd.includes("NX")) { if (store.has(key)) result = null; else { store.set(key, value); result = "OK"; } } else { store.set(key, value); result = "OK"; } }
  return { ok: true, json: async () => ({ result }) };
};
const { default: sessions } = await import("../api/sessions.js");
const { default: packages } = await import("../api/packages.js");
const mk = () => { const r = { headers:{} }; r.setHeader=(k,v)=>r.headers[k]=v; r.status=c=>{r.code=c;return r;}; r.send=b=>{r.payload=JSON.parse(b);return r;}; return r; };
const auth = { authorization: "Bearer s3cret" };
const call = async (h, req) => { const res = mk(); await h({ method:"GET", headers:{}, query:{}, ...req }, res); return res; };
let fails = 0;
const check = (n,c,e="") => { console.log(`${c?"PASS":"FAIL"}  ${n}${c?"":"  -> "+e}`); if(!c) fails++; };

await call(packages, { method:"POST", headers:auth, body:{ size:10, purchasedAt:"2026-07-09" } });

// bez ciała w ogóle (body undefined) — dokładnie tak wyśle skrót
let r = await call(sessions, { method:"POST", headers:auth, query:{ idempotencyKey:"2026-08-27" } });
check("POST bez ciała, idempotencyKey w query -> 201", r.code===201 && r.payload.session.n===1, JSON.stringify(r.payload));
check("  summary obecne", typeof r.payload.summary === "string" && r.payload.summary.includes("Zostało"), r.payload.summary);

r = await call(sessions, { method:"POST", headers:auth, query:{ idempotencyKey:"2026-08-27" } });
check("powtórka tego samego klucza z query -> duplicate", r.code===200 && r.payload.duplicate===true, JSON.stringify(r.payload));

r = await call(sessions, { method:"POST", headers:auth, query:{ date:"2026-08-13" } });
check("date z query -> zapisana data", r.code===201 && r.payload.session.date==="2026-08-13", JSON.stringify(r.payload.session));

r = await call(sessions, { method:"POST", headers:auth, query:{ date:"2026-13-99" } });
check("zła data z query -> 400", r.code===400 && r.payload.error==="invalid_date", JSON.stringify(r.payload));

r = await call(sessions, { method:"POST", headers:auth, body:{ date:"2026-08-01" } });
check("stara ścieżka (JSON body) nadal działa", r.code===201 && r.payload.session.date==="2026-08-01", JSON.stringify(r.payload.session));

console.log(fails===0 ? "\nOK" : `\n${fails} FAIL`);
process.exit(fails?1:0);
