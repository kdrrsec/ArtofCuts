import { getOverridesForDates, upsertOverride, deleteOverride } from "../lib/overrides.js";
import { getBearerToken, verifyPortalToken } from "../lib/auth.js";
import { isValidBarberId, isValidClockTime, normalizeBarberId } from "../lib/schedule.js";
import { handleOptions, readJsonBody, sendJson } from "../lib/http.js";
import { getQuery } from "../lib/query.js";

function parseSlotList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map((slot) => String(slot).trim()).filter((slot) => /^\d{2}:\d{2}$/.test(slot)))];
  }
  return [];
}

function requireBarberId(value) {
  const barberId = normalizeBarberId(value);
  if (!barberId || !isValidBarberId(barberId)) {
    return null;
  }
  return barberId;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const token = getBearerToken(req);
  if (!verifyPortalToken(token)) {
    return sendJson(res, 401, { error: "Niet ingelogd" });
  }

  try {
    if (req.method === "GET") {
      const query = getQuery(req);
      const barberId = requireBarberId(query.barber);
      const dates = query.dates
        ? String(query.dates).split(",").map((d) => d.trim()).filter(Boolean)
        : query.date
          ? [String(query.date).trim()]
          : [];

      if (!barberId) {
        return sendJson(res, 400, { error: "Kies een kapper" });
      }

      if (!dates.length || dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
        return sendJson(res, 400, { error: "Kies een geldige datum" });
      }

      const overrides = await getOverridesForDates(dates, barberId);
      const items = dates.map((date) => overrides.get(date) || null);
      return sendJson(res, 200, { overrides: items, barber: barberId });
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const date = body.date;
      const barberId = requireBarberId(body.barber);

      if (!barberId) {
        return sendJson(res, 400, { error: "Kies een kapper" });
      }

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendJson(res, 400, { error: "Kies een geldige datum" });
      }

      const openTime = body.openTime ? String(body.openTime).trim() : null;
      const closeTime = body.closeTime ? String(body.closeTime).trim() : null;

      if ((openTime && !closeTime) || (!openTime && closeTime)) {
        return sendJson(res, 400, { error: "Vul zowel open- als sluitingstijd in" });
      }

      if (openTime && (!isValidClockTime(openTime) || !isValidClockTime(closeTime))) {
        return sendJson(res, 400, { error: "Gebruik tijden als 10:00" });
      }

      const override = await upsertOverride({
        date,
        barberId,
        isClosed: Boolean(body.isClosed),
        openTime,
        closeTime,
        addedSlots: parseSlotList(body.addedSlots),
        blockedSlots: parseSlotList(body.blockedSlots),
        note: body.note ? String(body.note) : "",
      });

      return sendJson(res, 200, {
        override,
        message: override ? "Extra opening opgeslagen" : "Dag teruggezet naar standaard",
      });
    }

    if (req.method === "DELETE") {
      const query = getQuery(req);
      const date = query.date;
      const barberId = requireBarberId(query.barber);

      if (!barberId) {
        return sendJson(res, 400, { error: "Kies een kapper" });
      }

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendJson(res, 400, { error: "Kies een geldige datum" });
      }

      await deleteOverride(date, barberId);
      return sendJson(res, 200, { message: "Dag teruggezet naar standaard" });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Serverfout" });
  }
}
