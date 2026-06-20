import { ensureSchema, getSql } from "../../lib/db.js";
import { getAllSlotsForDate, getBookableDates, BARBERS } from "../../lib/schedule.js";
import { handleOptions, sendJson } from "../../lib/http.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const url = new URL(req.url, "http://localhost");
    const barberId = url.searchParams.get("barber");
    const datesParam = url.searchParams.get("dates");

    if (!barberId || !BARBERS[barberId]) {
      return sendJson(res, 400, { error: "Ongeldige kapper" });
    }

    await ensureSchema();
    const sql = getSql();

    const dates = datesParam
      ? datesParam.split(",").map((d) => d.trim()).filter(Boolean)
      : getBookableDates();

    const rows = await sql`
      SELECT appointment_date::text AS appointment_date, appointment_time
      FROM appointments
      WHERE barber_id = ${barberId}
        AND appointment_date >= ${dates[0]}::date
        AND appointment_date <= ${dates[dates.length - 1]}::date
        AND cancelled_at IS NULL
    `;

    const dateSet = new Set(dates);
    const bookedByDate = new Map();
    for (const row of rows) {
      if (!dateSet.has(row.appointment_date)) continue;
      const key = row.appointment_date;
      if (!bookedByDate.has(key)) bookedByDate.set(key, new Set());
      bookedByDate.get(key).add(row.appointment_time);
    }

    const days = dates.map((date) => {
      const allSlots = getAllSlotsForDate(date);
      const booked = bookedByDate.get(date) || new Set();
      const availableSlots = allSlots.filter((slot) => !booked.has(slot));
      const total = allSlots.length;
      const bookedCount = total - availableSlots.length;
      const fullness = total === 0 ? 0 : Math.round((bookedCount / total) * 100);

      return {
        date,
        total,
        booked: bookedCount,
        fullness,
        slots: availableSlots,
      };
    });

    return sendJson(res, 200, { days });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Serverfout" });
  }
}
