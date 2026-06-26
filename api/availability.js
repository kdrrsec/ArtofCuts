import { ensureSchema, getSql, isDbConfigured, normalizeDateString } from "./lib/db.js";
import { getAllSlotsForDate, getBookableDates, BARBERS, isValidBarberId, normalizeBarberId, getBarberIdVariants } from "./lib/schedule.js";
import { getOverridesForDates } from "./lib/overrides.js";
import { handleOptions, sendJson } from "./lib/http.js";
import { getQuery } from "./lib/query.js";

async function getBookedSlots(barberId, dates) {
  if (!isDbConfigured() || !dates.length) return new Map();

  await ensureSchema();
  const sql = getSql();
  const barberVariants = getBarberIdVariants(barberId);

  const rows = await sql`
    SELECT appointment_date::text AS appointment_date, appointment_time
    FROM appointments
    WHERE barber_id = ANY(${barberVariants})
      AND appointment_date >= ${dates[0]}
      AND appointment_date <= ${dates[dates.length - 1]}
      AND cancelled_at IS NULL
  `;

  const dateSet = new Set(dates);
  const bookedByDate = new Map();

  for (const row of rows) {
    const key = normalizeDateString(row.appointment_date);
    if (!dateSet.has(key)) continue;
    if (!bookedByDate.has(key)) bookedByDate.set(key, new Set());
    bookedByDate.get(key).add(row.appointment_time);
  }

  return bookedByDate;
}

function buildAvailabilityDays(dates, bookedByDate, overridesMap) {
  return dates.map((date) => {
    const override = overridesMap.get(date) || null;
    const allSlots = getAllSlotsForDate(date, override);
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
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const query = getQuery(req);
    const barberId = normalizeBarberId(query.barber);
    const datesParam = query.dates;

    if (!barberId || !isValidBarberId(barberId)) {
      return sendJson(res, 400, { error: "Ongeldige kapper" });
    }

    let dates;
    let overridesMap = new Map();
    let bookedByDate = new Map();

    if (datesParam) {
      dates = String(datesParam).split(",").map((d) => d.trim()).filter(Boolean);
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lookaheadDates = [];
      for (let offset = 0; offset < 56; offset++) {
        const date = new Date(today);
        date.setDate(today.getDate() + offset);
        lookaheadDates.push([
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-"));
      }
      try {
        overridesMap = await getOverridesForDates(lookaheadDates, barberId);
      } catch (dbError) {
        console.error("Overrides niet geladen:", dbError.message);
      }
      dates = getBookableDates(14, 56, overridesMap);
    }

    if (!dates.length) {
      res.setHeader("Cache-Control", "no-store");
      return sendJson(res, 200, { days: [], barber: barberId, dbConnected: isDbConfigured() });
    }

    try {
      overridesMap = await getOverridesForDates(dates, barberId);
      bookedByDate = await getBookedSlots(barberId, dates);
    } catch (dbError) {
      console.error("Availability fallback zonder database:", dbError.message);
    }

    const days = buildAvailabilityDays(dates, bookedByDate, overridesMap);
    res.setHeader("Cache-Control", "no-store");
    return sendJson(res, 200, { days, barber: barberId, dbConnected: isDbConfigured() });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Serverfout" });
  }
}
