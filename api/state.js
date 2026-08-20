import { getState, json, fail, methodNotAllowed } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    return json(res, 200, await getState());
  } catch (err) {
    return fail(res, err);
  }
}
