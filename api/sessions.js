import {
  getState, setState, currentPackage, claimIdempotencyKey,
  requireAuth, readBody, json, fail, methodNotAllowed,
  todayInWarsaw, validDate, HttpError
} from "./_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") return await logSession(req, res);
    if (req.method === "DELETE") return await undoSession(req, res);
    return methodNotAllowed(res, ["POST", "DELETE"]);
  } catch (err) {
    return fail(res, err);
  }
}

/** POST /api/sessions — zajmuje pierwszy wolny slot w aktualnym pakiecie. */
async function logSession(req, res) {
  requireAuth(req);
  const body = readBody(req);

  const date = body.date ?? todayInWarsaw();
  if (!validDate(date)) {
    throw new HttpError(400, "invalid_date", "Pole 'date' musi mieć format YYYY-MM-DD.");
  }

  // Powtórka tego samego żądania nie zjada drugiego treningu z pakietu.
  if (body.idempotencyKey) {
    const fresh = await claimIdempotencyKey(String(body.idempotencyKey));
    if (!fresh) {
      const state = await getState();
      const pkg = currentPackage(state);
      const remaining = pkg ? pkg.size - pkg.sessions.length : 0;
      return json(res, 200, {
        duplicate: true,
        summary: `Ten trening był już zapisany. Zostało ${remaining}.`,
        remaining,
        state
      });
    }
  }

  const state = await getState();
  const pkg = currentPackage(state);
  if (!pkg) {
    throw new HttpError(409, "no_active_package",
      "Brak aktywnego pakietu. Załóż go przez POST /api/packages.");
  }
  if (pkg.sessions.length >= pkg.size) {
    throw new HttpError(409, "package_exhausted",
      `Pakiet ${pkg.id} jest wyczerpany (${pkg.size}/${pkg.size}). Nowy pakiet: POST /api/packages.`,
      { packageId: pkg.id, size: pkg.size });
  }

  const session = {
    n: pkg.sessions.length + 1,
    date,
    loggedAt: new Date().toISOString()
  };
  pkg.sessions.push(session);
  await setState(state);

  const remaining = pkg.size - pkg.sessions.length;
  return json(res, 201, {
    session,
    summary: `Zaliczone. Zostało ${remaining} z ${pkg.size}.`,
    remaining,
    state
  });
}

/**
 * DELETE /api/sessions?n=6 — cofa pomyłkowo zalogowany trening.
 * Pozostałe treningi są przenumerowane, żeby lista slotów pozostała ciągła.
 */
async function undoSession(req, res) {
  requireAuth(req);
  const body = readBody(req);
  const raw = req.query?.n ?? body.n;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new HttpError(400, "invalid_n", "Podaj numer treningu, np. DELETE /api/sessions?n=6.");
  }

  const state = await getState();
  const pkg = currentPackage(state);
  if (!pkg) throw new HttpError(409, "no_active_package", "Brak aktywnego pakietu.");

  const index = pkg.sessions.findIndex(s => s.n === n);
  if (index === -1) {
    throw new HttpError(404, "session_not_found",
      `W pakiecie ${pkg.id} nie ma treningu nr ${n}.`);
  }

  const [removed] = pkg.sessions.splice(index, 1);
  pkg.sessions.forEach((s, i) => { s.n = i + 1; });
  await setState(state);

  const remainingAfterUndo = pkg.size - pkg.sessions.length;
  return json(res, 200, {
    removed,
    summary: `Cofnięto trening z ${removed.date}. Zostało ${remainingAfterUndo}.`,
    remaining: remainingAfterUndo,
    state
  });
}
