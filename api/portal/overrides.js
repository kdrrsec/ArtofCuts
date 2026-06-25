import crypto from "crypto";
import { ensureSchema, getSql } from "../lib/db.js";
import {
  BARBERS,
  isValidBarberId,
  normalizeBarberId,
} from "../lib/schedule.js";
import { fetchOverridesForDates, generateSlotsFromRange } from "../lib/overrides.js";
import { getBearerToken, verifyPortalToken } from "../lib/auth.js";
import { handleOptions, readJsonBody, sendJson } from "../lib/http.js";
import { getQuery } from "../lib/query.js";

function formatOverrideLabel(row) {
  if (row.override_time) {
    return row.kind === "close"
      ? `Tijd dicht: ${row.override_time}`
      : `Extra tijd: ${row.override_time}`;
  }
  return `Hele dag open: ${row.open_time} – ${row.close_time}`;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const portalToken = getBearerToken(req);
  if (!verifyPortalToken(portalToken)) {
    return sendJson(res, 401, { error: "Niet ingelogd" });
  }

  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === "GET") {
      const query = getQuery(req);
      const date = query.date;
      const barberId = query.barber ? normalizeBarberId(query.barber) : null;

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendJson(res, 400, { error: "Kies een geldige datum" });
      }
      if (!barberId || !isValidBarberId(barberId)) {
        return sendJson(res, 400, { error: "Kies een geldige kapper" });
      }

      const rows = await fetchOverridesForDates(sql, barberId, [date]);
      return sendJson(res, 200, {
        overrides: rows.map((row) => ({
          id: row.id,
          barber: normalizeBarberId(row.barber_id),
          barberName: BARBERS[normalizeBarberId(row.barber_id)],
          date: row.override_date,
          time: row.override_time,
          openTime: row.open_time,
          closeTime: row.close_time,
          kind: row.kind,
          label: formatOverrideLabel(row),
        })),
      });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const action = body.action;

      if (action === "delete") {
        const { id } = body;
        if (!id) return sendJson(res, 400, { error: "ID ontbreekt" });

        const rows = await sql`
          DELETE FROM availability_overrides
          WHERE id = ${id}
          RETURNING id
        `;
        if (!rows.length) return sendJson(res, 404, { error: "Openzetting niet gevonden" });
        return sendJson(res, 200, { message: "Openzetting verwijderd" });
      }

      const barber = normalizeBarberId(body.barber);
      const date = body.date;
      const kind = body.kind || "open";
      const time = body.time?.trim() || null;
      const openTime = body.openTime?.trim() || null;
      const closeTime = body.closeTime?.trim() || null;

      if (!barber || !isValidBarberId(barber)) {
        return sendJson(res, 400, { error: "Kies een geldige kapper" });
      }
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendJson(res, 400, { error: "Kies een geldige datum" });
      }
      if (!["open", "close"].includes(kind)) {
        return sendJson(res, 400, { error: "Ongeldig type" });
      }

      if (time) {
        if (!/^\d{2}:\d{2}$/.test(time)) {
          return sendJson(res, 400, { error: "Ongeldige tijd" });
        }
      } else if (kind === "open") {
        if (!openTime || !closeTime) {
          return sendJson(res, 400, { error: "Vul openingstijden in voor een hele dag" });
        }
        if (generateSlotsFromRange(openTime, closeTime, date).length === 0) {
          return sendJson(res, 400, { error: "Geen geldige tijdslots in dit bereik" });
        }
      } else {
        return sendJson(res, 400, { error: "Kies een tijd om te sluiten" });
      }

      const id = crypto.randomUUID();
      await sql`
        INSERT INTO availability_overrides (
          id, barber_id, override_date, override_time, open_time, close_time, kind
        ) VALUES (
          ${id}, ${barber}, ${date}, ${time}, ${openTime}, ${closeTime}, ${kind}
        )
      `;

      return sendJson(res, 201, {
        id,
        message: kind === "open" ? "Beschikbaarheid geopend" : "Tijdslot gesloten",
      });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Serverfout" });
  }
}
