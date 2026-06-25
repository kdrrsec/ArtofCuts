import { ensureSchema, getSql } from "./lib/db.js";
import { BARBERS, SERVICES, normalizeBarberId } from "./lib/schedule.js";
import { handleOptions, sendJson } from "./lib/http.js";
import { getQuery } from "./lib/query.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const query = getQuery(req);
    const token = query.token;

    if (!token) {
      return sendJson(res, 400, { error: "Token ontbreekt" });
    }

    await ensureSchema();
    const sql = getSql();

    const rows = await sql`
      SELECT
        id,
        barber_id,
        service,
        appointment_date::text AS appointment_date,
        appointment_time,
        first_name,
        last_name,
        email,
        phone,
        cancelled_at
      FROM appointments
      WHERE cancel_token = ${token}
      LIMIT 1
    `;

    if (!rows.length) {
      return sendJson(res, 404, { error: "Afspraak niet gevonden" });
    }

    const row = rows[0];
    return sendJson(res, 200, {
      appointment: {
        id: row.id,
        barber: row.barber_id,
        barberName: BARBERS[normalizeBarberId(row.barber_id)],
        service: row.service,
        serviceName: SERVICES[row.service],
        date: row.appointment_date,
        time: row.appointment_time,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        cancelled: Boolean(row.cancelled_at),
      },
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Serverfout" });
  }
}
