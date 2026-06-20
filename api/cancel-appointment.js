import { ensureSchema, getSql } from "../../lib/db.js";
import { handleOptions, readJsonBody, sendJson } from "../../lib/http.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const token = body.token;

    if (!token) {
      return sendJson(res, 400, { error: "Token ontbreekt" });
    }

    await ensureSchema();
    const sql = getSql();

    const rows = await sql`
      UPDATE appointments
      SET cancelled_at = NOW()
      WHERE cancel_token = ${token}
        AND cancelled_at IS NULL
      RETURNING id
    `;

    if (!rows.length) {
      return sendJson(res, 404, { error: "Afspraak niet gevonden of al geannuleerd" });
    }

    return sendJson(res, 200, { message: "Afspraak geannuleerd" });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Serverfout" });
  }
}
