// Mock data — docelowo do podmiany na realne źródło (API / Sheets / DB)
const PACKAGE_DATA = {
  client: "Krzysztof",
  trainer: "Łukasz",
  packageSize: 10,
  purchasedAt: "2026-07-09",
  sessions: [
    { n: 1,  date: "2026-07-09", done: true },
    { n: 2,  date: "2026-07-23", done: true },
    { n: 3,  date: "2026-07-30", done: true },
    { n: 4,  date: "2026-08-04", done: true },
    { n: 5,  date: "2026-08-13", done: true },
    { n: 6,  date: "2026-08-20", done: true },
    { n: 7,  date: null, done: false },
    { n: 8,  date: null, done: false },
    { n: 9,  date: null, done: false },
    { n: 10, date: null, done: false }
  ]
};
