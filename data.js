// Mock data — docelowo do podmiany na realne źródło (API / Sheets / DB)
const PACKAGE_DATA = {
  client: "Krzysztof",
  trainer: "Michał K.",
  packageSize: 10,
  purchasedAt: "2026-06-02",
  sessions: [
    { n: 1,  date: "2026-06-04", focus: "Klatka + triceps",   done: true },
    { n: 2,  date: "2026-06-09", focus: "Plecy + biceps",     done: true },
    { n: 3,  date: "2026-06-16", focus: "Nogi",               done: true },
    { n: 4,  date: "2026-06-23", focus: "Klatka + barki",     done: true },
    { n: 5,  date: "2026-07-01", focus: "Plecy + core",       done: true },
    { n: 6,  date: "2026-07-08", focus: "Nogi + pośladki",    done: true },
    { n: 7,  date: "2026-07-15", focus: "Full body",          done: true },
    { n: 8,  date: null,        focus: null,                  done: false },
    { n: 9,  date: null,        focus: null,                  done: false },
    { n: 10, date: null,        focus: null,                  done: false }
  ]
};
