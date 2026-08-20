/**
 * Jednorazowy seed: wgrywa obecny stan (pakiet z 6 odbytymi treningami) do Redisa.
 *
 *   vercel env pull .env.local
 *   node --env-file=.env.local scripts/seed.mjs
 *
 * Domyślnie odmawia nadpisania istniejącego stanu — użyj --force, żeby wymusić.
 */
const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error("Brak KV_REST_API_URL / KV_REST_API_TOKEN w środowisku.");
  process.exit(1);
}

const STATE = {
  schema: 1,
  client: "Krzysztof",
  trainer: "Łukasz",
  packages: [
    {
      id: "2026-07",
      size: 10,
      purchasedAt: "2026-07-09",
      sessions: [
        { n: 1, date: "2026-07-09" },
        { n: 2, date: "2026-07-23" },
        { n: 3, date: "2026-07-30" },
        { n: 4, date: "2026-08-04" },
        { n: 5, date: "2026-08-13" },
        { n: 6, date: "2026-08-20" }
      ].map(s => ({ ...s, loggedAt: `${s.date}T18:00:00.000Z` }))
    }
  ]
};

async function redis(command) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(body.error || `HTTP ${res.status}`);
  return body.result;
}

const force = process.argv.includes("--force");
const existing = await redis(["GET", "workouts:state"]);

if (existing && !force) {
  console.error("W Redisie jest już stan. Uruchom z --force, żeby go nadpisać.");
  console.error(typeof existing === "string" ? existing : JSON.stringify(existing));
  process.exit(1);
}

await redis(["SET", "workouts:state", JSON.stringify(STATE)]);
console.log("Zapisano stan: pakiet 2026-07, 6/10 treningów.");
