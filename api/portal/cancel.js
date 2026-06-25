import { ensureSchema, getSql } from "../lib/db.js";
import { getBearerToken, verifyPortalToken } from "../lib/auth.js";
import { handleOptions, readJsonBody, sendJson } from "../lib/http.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const portalToken = getBearerToken(req);
  if (!verifyPortalToken(portalToken)) {
    return sendJson(res, 401, { error: "Niet ingelogd" });
  }

  try {
    const body = await readJsonBody(req);
    const { id } = body;

    if (!id) {
      return sendJson(res, 400, { error: "Afspraak-ID ontbreekt" });
    }

    await ensureSchema();
    const sql = getSql();

    const rows = await sql`
      UPDATE appointments
      SET cancelled_at = NOW()
      WHERE id = ${id}
        AND cancelled_at IS NULL
      RETURNING id, appointment_date::text AS appointment_date, appointment_time, barber_id
    `;

    if (!rows.length) {
      return sendJson(res, 404, { error: "Afspraak niet gevonden of al geannuleerd" });
    }

    return sendJson(res, 200, {
      message: "Afspraak geannuleerd — tijdslot is weer vrij",
      appointment: rows[0],
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Serverfout" });
  }
}
