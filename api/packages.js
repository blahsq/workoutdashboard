import {
  getState, setState, currentPackage, requireAuth, readBody,
  json, fail, methodNotAllowed, todayInWarsaw, validDate, HttpError
} from "./_lib.js";

/** POST /api/packages — jawne założenie nowego pakietu (nigdy nie dzieje się automatycznie). */
export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    requireAuth(req);
    const body = readBody(req);

    const size = body.size ?? 10;
    if (!Number.isInteger(size) || size < 1 || size > 100) {
      throw new HttpError(400, "invalid_size", "Pole 'size' musi być liczbą całkowitą 1–100.");
    }

    const purchasedAt = body.purchasedAt ?? todayInWarsaw();
    if (!validDate(purchasedAt)) {
      throw new HttpError(400, "invalid_date", "Pole 'purchasedAt' musi mieć format YYYY-MM-DD.");
    }

    const state = await getState();
    const active = currentPackage(state);
    if (active && active.sessions.length < active.size && body.force !== true) {
      throw new HttpError(409, "active_package_not_exhausted",
        `Pakiet ${active.id} ma jeszcze ${active.size - active.sessions.length} wolnych treningów. ` +
        `Aby mimo to założyć nowy, wyślij \"force\": true.`,
        { packageId: active.id, remaining: active.size - active.sessions.length });
    }

    const pkg = {
      id: body.id ?? nextPackageId(state, purchasedAt),
      size,
      purchasedAt,
      sessions: []
    };
    state.packages.push(pkg);
    await setState(state);

    return json(res, 201, { package: pkg, state });
  } catch (err) {
    return fail(res, err);
  }
}

function nextPackageId(state, purchasedAt) {
  const base = purchasedAt.slice(0, 7);
  const taken = new Set(state.packages.map(p => p.id));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
