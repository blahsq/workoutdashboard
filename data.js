// Fallback używany, gdy /api/state nie odpowiada (np. otwarcie index.html z dysku).
// Kształt identyczny jak odpowiedź API — front ma jedną ścieżkę renderowania.
const FALLBACK_STATE = {
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
      ]
    }
  ]
};
