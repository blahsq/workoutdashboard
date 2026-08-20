process.env.WORKOUT_TOKEN = "s3cret";
process.env.KV_REST_API_URL = "https://fake.upstash.io";
process.env.KV_REST_API_TOKEN = "faketoken";
const store = new Map();
globalThis.fetch = async (_u, o) => {
  const cmd = JSON.parse(o.body); const [op, key, value] = cmd; let result = null;
  if (op === "GET") result = store.has(key) ? store.get(key) : null;
  else if (op === "SET") { if (cmd.includes("NX")) { if (store.has(key)) result=null; else { store.set(key,value); result="OK"; } } else { store.set(key,value); result="OK"; } }
  return { ok: true, json: async () => ({ result }) };
};
const { default: sessions } = await import("../api/sessions.js");
const { default: packages } = await import("../api/packages.js");
const mk = () => { const r={headers:{}}; r.setHeader=(k,v)=>r.headers[k]=v; r.status=c=>{r.code=c;return r;}; r.send=b=>{r.payload=JSON.parse(b);return r;}; return r; };
const auth = { authorization: "Bearer s3cret" };
const call = async (h,req) => { const res=mk(); await h({method:"GET",headers:{},query:{},...req},res); return res; };
let fails=0; const check=(n,c,e="")=>{console.log(`${c?"PASS":"FAIL"}  ${n}${c?"":"  -> "+e}`); if(!c)fails++;};

await call(packages,{method:"POST",headers:auth,body:{size:10,purchasedAt:"2026-07-09"}});

// dokładnie to, co wyśle skrót: statyczny URL, ciało z nieznanym polem
let r = await call(sessions,{method:"POST",headers:auth,body:{source:"shortcut"},query:{}});
check("skrót: POST bez date i bez klucza -> 201", r.code===201 && r.payload.session.n===1, JSON.stringify(r.payload.summary));
const today = r.payload.session.date;

r = await call(sessions,{method:"POST",headers:auth,body:{source:"shortcut"},query:{}});
check("drugie tapnięcie tego samego dnia -> 200 duplicate, bez nowego slotu",
  r.code===200 && r.payload.duplicate===true && r.payload.state.packages[0].sessions.length===1, JSON.stringify(r.payload.summary));
console.log("     komunikat:", r.payload.summary);

r = await call(sessions,{method:"POST",headers:auth,query:{allowSameDay:"true"},body:{}});
check("drugi trening tego samego dnia z allowSameDay=true -> 201",
  r.code===201 && r.payload.session.n===2, JSON.stringify(r.payload.summary));

r = await call(sessions,{method:"POST",headers:auth,body:{date:"2026-07-15"}});
check("inna data -> 201 normalnie", r.code===201 && r.payload.session.date==="2026-07-15", JSON.stringify(r.payload.summary));

// w pakiecie są teraz DWA treningi z dzisiejszą datą (drugi przez allowSameDay),
// więc usuwamy oba i dopiero wtedy dzień jest znów wolny
r = await call(sessions,{method:"DELETE",headers:auth,query:{n:"1"}});
check("undo dalej działa", r.code===200, JSON.stringify(r.payload.summary));
await call(sessions,{method:"DELETE",headers:auth,query:{n:"1"}});
r = await call(sessions,{method:"POST",headers:auth,body:{date:today}});
check("po cofnięciu wszystkich wpisów z tego dnia można zapisać go ponownie", r.code===201, JSON.stringify(r.payload.summary));

console.log(fails===0?"\nOK":`\n${fails} FAIL`); process.exit(fails?1:0);
