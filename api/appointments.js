import crypto from "crypto";
import { ensureSchema, getSql } from "../../lib/db.js";
import { BARBERS, SERVICES, getAllSlotsForDate } from "../../lib/schedule.js";
import { handleOptions, readJsonBody, sendJson } from "../../lib/http.js";

function createId() {
  return crypto.randomUUID();
}

function createCancelToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const {
      barber,
      service,
      date,
      time,
      firstName,
      lastName,
      email,
      phone,
    } = body;

    if (!barber || !BARBERS[barber]) {
      return sendJson(res, 400, { error: "Kies een geldige kapper" });
    }
    if (!service || !SERVICES[service]) {
      return sendJson(res, 400, { error: "Kies een geldige dienst" });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendJson(res, 400, { error: "Kies een geldige datum" });
    }
    if (!time) {
      return sendJson(res, 400, { error: "Kies een tijd" });
    }
    if (!firstName?.trim() || !lastName?.trim()) {
      return sendJson(res, 400, { error: "Voornaam en achternaam zijn verplicht" });
    }

    const allowedSlots = getAllSlotsForDate(date);
    if (!allowedSlots.includes(time)) {
      return sendJson(res, 400, { error: "Deze tijd is niet beschikbaar" });
    }

    await ensureSchema();
    const sql = getSql();

    const existing = await sql`
      SELECT id FROM appointments
      WHERE barber_id = ${barber}
        AND appointment_date = ${date}::date
        AND appointment_time = ${time}
        AND cancelled_at IS NULL
      LIMIT 1
    `;

    if (existing.length > 0) {
      return sendJson(res, 409, { error: "Deze tijd is zojuist geboekt. Kies een andere tijd." });
    }

    const id = createId();
    const cancelToken = createCancelToken();

    await sql`
      INSERT INTO appointments (
        id, barber_id, service, appointment_date, appointment_time,
        first_name, last_name, email, phone, cancel_token
      ) VALUES (
        ${id}, ${barber}, ${service}, ${date}::date, ${time},
        ${firstName.trim()}, ${lastName.trim()},
        ${email?.trim() || null}, ${phone?.trim() || null}, ${cancelToken}
      )
    `;

    const origin = req.headers["x-forwarded-host"]
      ? `https://${req.headers["x-forwarded-host"]}`
      : req.headers.origin || "https://artofcuts.vercel.app";

    return sendJson(res, 201, {
      id,
      cancelToken,
      cancelUrl: `${origin}/annuleren.html?token=${cancelToken}`,
      message: "Afspraak bevestigd",
    });
  } catch (error) {
    console.error(error);
    if (error.message?.includes("appointments_active_slot_idx")) {
      return sendJson(res, 409, { error: "Deze tijd is zojuist geboekt. Kies een andere tijd." });
    }
    return sendJson(res, 500, { error: error.message || "Serverfout" });
  }
}
