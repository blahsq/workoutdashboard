# workoutdashboard

Dashboard pakietu treningów personalnych — ile treningów jest w pakiecie i ile już wykorzystanych.
Statyczny front (HTML/CSS/JS, bez frameworków) + Vercel Functions ze stanem w Redisie (Upstash).

## Konfiguracja

1. W projekcie na Vercel: **Storage → Marketplace → Upstash for Redis**. Integracja sama
   wstrzykuje `KV_REST_API_URL` i `KV_REST_API_TOKEN`.
2. Dodaj zmienną `WORKOUT_TOKEN` (Settings → Environment Variables):

   ```bash
   openssl rand -hex 32
   ```

3. Wgraj stan początkowy:

   ```bash
   vercel env pull .env.local
   node --env-file=.env.local scripts/seed.mjs
   ```

Funkcje nie mają żadnych zależności npm — Upstash jest wołany po REST przez `fetch`,
więc nie ma `node_modules` ani kroku budowania.

## API

Zapis wymaga nagłówka `Authorization: Bearer $WORKOUT_TOKEN`. Odczyt jest publiczny.

### `GET /api/state`

Zwraca cały stan (wszystkie pakiety wraz z historią).

### `POST /api/sessions` — zaloguj trening

```bash
curl -X POST https://<app>.vercel.app/api/sessions \
  -H "Authorization: Bearer $WORKOUT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-27","idempotencyKey":"2026-08-27"}'
```

| Pole | Wymagane | Domyślnie |
|---|---|---|
| `date` | nie | dzisiaj (Europe/Warsaw) |
| `idempotencyKey` | nie | brak — bez niej powtórzone żądanie zapisze drugi trening |

Każda odpowiedź (także błędna) zawiera pole `summary` — gotowy tekst po polsku do pokazania
w powiadomieniu, dzięki czemu skrót na telefonie nie musi rozgałęziać się na przypadki.

Zajmuje pierwszy wolny slot aktualnego pakietu. Gdy pakiet jest wyczerpany, zwraca
`409 package_exhausted` — nowy pakiet trzeba założyć jawnie.

### `DELETE /api/sessions?n=6` — cofnij pomyłkę

Usuwa trening nr `n`; pozostałe są przenumerowane, żeby lista slotów była ciągła.

### `POST /api/packages` — nowy pakiet

```bash
curl -X POST https://<app>.vercel.app/api/packages \
  -H "Authorization: Bearer $WORKOUT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"size":10,"purchasedAt":"2026-09-01"}'
```

Domyślnie `size` 10, `purchasedAt` dzisiaj. Jeśli poprzedni pakiet nie jest wyczerpany,
zwraca `409` — świadomy nadpis wymaga `"force": true`.

## Model danych

Jeden klucz `workouts:state` w Redisie:

```json
{
  "schema": 1,
  "client": "Krzysztof",
  "trainer": "Łukasz",
  "packages": [
    {
      "id": "2026-07",
      "size": 10,
      "purchasedAt": "2026-07-09",
      "sessions": [{ "n": 1, "date": "2026-07-09", "loggedAt": "2026-07-09T18:00:00.000Z" }]
    }
  ]
}
```

Dashboard renderuje ostatni pakiet z tablicy; wcześniejsze zostają jako historia.

## Front

`app.js` pobiera `/api/state`. Gdy API nie odpowie, renderuje `FALLBACK_STATE` z `data.js`
i dopisuje „dane offline" w podtytule — dashboard nigdy nie pokazuje pustej strony.

## Lokalnie

```bash
vercel dev            # front + funkcje
python3 -m http.server 8000   # sam front (API 404 -> dane zapasowe)
```
