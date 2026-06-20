import { verifyPortalPassword, createPortalToken } from "../../lib/auth.js";
import { handleOptions, readJsonBody, sendJson } from "../../lib/http.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    if (!process.env.PORTAL_PASSWORD) {
      return sendJson(res, 503, { error: "Portaal is nog niet geconfigureerd" });
    }

    const body = await readJsonBody(req);
    if (!verifyPortalPassword(body.password)) {
      return sendJson(res, 401, { error: "Onjuist wachtwoord" });
    }

    return sendJson(res, 200, {
      token: createPortalToken(),
      expiresInHours: 12,
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Serverfout" });
  }
}
