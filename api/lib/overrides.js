import {
  SLOT_MINUTES,
  getAllSlotsForDate,
  getBarberIdVariants,
  normalizeBarberId,
} from "./schedule.js";

function parseDateString(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseTimeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function generateSlotsFromRange(openTime, closeTime, dateStr) {
  const date = parseDateString(dateStr);
  const now = new Date();
  const isToday = isSameDay(date, now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(openTime);
  const end = parseTimeToMinutes(closeTime);
  const slots = [];

  let time = start;
  while (time + SLOT_MINUTES <= end) {
    if (!isToday || time > nowMinutes) {
      slots.push(formatTime(time));
    }
    time += SLOT_MINUTES;
  }

  return slots;
}

export function applyAvailabilityOverrides(baseSlots, overrides, dateStr) {
  const slots = new Set(baseSlots);

  for (const row of overrides) {
    if (row.kind === "close" && row.override_time) {
      slots.delete(row.override_time);
    }
  }

  for (const row of overrides) {
    if (row.kind !== "open") continue;

    if (row.override_time) {
      slots.add(row.override_time);
      continue;
    }

    if (row.open_time && row.close_time) {
      generateSlotsFromRange(row.open_time, row.close_time, dateStr).forEach((slot) => {
        slots.add(slot);
      });
    }
  }

  return Array.from(slots).sort();
}

export async function fetchOverridesForDates(sql, barberId, dates) {
  if (!dates.length) return [];

  const variants = getBarberIdVariants(normalizeBarberId(barberId));
  return sql`
    SELECT
      id,
      barber_id,
      override_date::text AS override_date,
      override_time,
      open_time,
      close_time,
      kind
    FROM availability_overrides
    WHERE barber_id = ANY(${variants})
      AND override_date >= ${dates[0]}
      AND override_date <= ${dates[dates.length - 1]}
    ORDER BY override_date ASC, override_time ASC NULLS FIRST
  `;
}

export function groupOverridesByDate(overrideRows) {
  const map = new Map();
  for (const row of overrideRows) {
    if (!map.has(row.override_date)) map.set(row.override_date, []);
    map.get(row.override_date).push(row);
  }
  return map;
}

export function getSlotsForBarberDate(dateStr, overrideRowsForDate) {
  const base = getAllSlotsForDate(dateStr);
  return applyAvailabilityOverrides(base, overrideRowsForDate || [], dateStr);
}
