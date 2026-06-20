import { ensureSchema, getSql } from "../../lib/db.js";
import { BARBERS, SERVICES } from "../../lib/schedule.js";
import { getBearerToken, verifyPortalToken } from "../../lib/auth.js";
import { handleOptions, sendJson } from "../../lib/http.js";
import { getQuery } from "../../lib/query.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const token = getBearerToken(req);
  if (!verifyPortalToken(token)) {
    return sendJson(res, 401, { error: "Niet ingelogd" });
  }

  try {
    const query = getQuery(req);
    const date = query.date;
    const barberId = query.barber;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendJson(res, 400, { error: "Kies een geldige datum" });
    }

    await ensureSchema();
    const sql = getSql();

    let rows;
    if (barberId && BARBERS[barberId]) {
      rows = await sql`
        SELECT
          id,
          barber_id,
          service,
          appointment_date::text AS appointment_date,
          appointment_time,
          first_name,
          last_name,
          email,
          phone
        FROM appointments
        WHERE appointment_date = ${date}
          AND barber_id = ${barberId}
          AND cancelled_at IS NULL
        ORDER BY appointment_time ASC
      `;
    } else {
      rows = await sql`
        SELECT
          id,
          barber_id,
          service,
          appointment_date::text AS appointment_date,
          appointment_time,
          first_name,
          last_name,
          email,
          phone
        FROM appointments
        WHERE appointment_date = ${date}
          AND cancelled_at IS NULL
        ORDER BY appointment_time ASC
      `;
    }

    const appointments = rows.map((row) => ({
      id: row.id,
      barber: row.barber_id,
      barberName: BARBERS[row.barber_id],
      service: row.service,
      serviceName: SERVICES[row.service],
      date: row.appointment_date,
      time: row.appointment_time,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
    }));

    return sendJson(res, 200, { appointments });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Serverfout" });
  }
}
