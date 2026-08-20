# workoutdashboard

Prosty dashboard (bez frameworków) pokazujący stan pakietu treningów personalnych —
ile treningów jest w pakiecie i ile już zostało wykorzystanych.

## Uruchomienie lokalne

Otwórz `index.html` w przeglądarce albo:

```bash
python3 -m http.server 8000
```

## Dane

Dane są zamockowane w `data.js` (`PACKAGE_DATA`). Aby zaktualizować stan pakietu,
zmień pole `done` przy poszczególnych treningach lub `packageSize`.

## Deploy

Statyczny site — Vercel wykrywa go bez konfiguracji (brak build stepu).
