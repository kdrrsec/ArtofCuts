import { ensureSchema, getSql, isDbConfigured, normalizeDateString } from "./db.js";
import { isValidBarberId, normalizeBarberId } from "./schedule.js";

function normalizeOverrideRow(row) {
  if (!row) return null;
  return {
    date: normalizeDateString(row.override_date),
    barber: normalizeBarberId(row.barber_id),
    isClosed: Boolean(row.is_closed),
    openTime: row.open_time || null,
    closeTime: row.close_time || null,
    addedSlots: Array.isArray(row.added_slots) ? row.added_slots : [],
    blockedSlots: Array.isArray(row.blocked_slots) ? row.blocked_slots : [],
    note: row.note || "",
    updatedAt: row.updated_at,
  };
}

export async function getOverridesForDates(dates, barberId) {
  const map = new Map();
  if (!dates.length || !barberId || !isValidBarberId(barberId)) return map;
  if (!isDbConfigured()) return map;

  await ensureSchema();
  const sql = getSql();
  const normalizedBarber = normalizeBarberId(barberId);
  const uniqueDates = [...new Set(dates.map(normalizeDateString).filter(Boolean))];
  const rows = await sql`
    SELECT
      override_date::text AS override_date,
      barber_id,
      is_closed,
      open_time,
      close_time,
      added_slots,
      blocked_slots,
      note,
      updated_at
    FROM schedule_overrides
    WHERE override_date = ANY(${uniqueDates})
      AND barber_id = ${normalizedBarber}
  `;

  for (const row of rows) {
    const override = normalizeOverrideRow(row);
    if (override) map.set(override.date, override);
  }

  return map;
}

export async function getOverrideForDate(date, barberId) {
  const map = await getOverridesForDates([date], barberId);
  return map.get(normalizeDateString(date)) || null;
}

export async function upsertOverride({
  date,
  barberId,
  isClosed = false,
  openTime = null,
  closeTime = null,
  addedSlots = [],
  blockedSlots = [],
  note = "",
}) {
  if (!barberId || !isValidBarberId(barberId)) {
    throw new Error("Kies een kapper");
  }

  await ensureSchema();
  const sql = getSql();
  const normalizedDate = normalizeDateString(date);
  const normalizedBarber = normalizeBarberId(barberId);

  const hasCustomHours = Boolean(openTime && closeTime);
  const hasSlotChanges = addedSlots.length > 0 || blockedSlots.length > 0;
  const hasNote = Boolean(note?.trim());

  if (!isClosed && !hasCustomHours && !hasSlotChanges && !hasNote) {
    await sql`
      DELETE FROM schedule_overrides
      WHERE override_date = ${normalizedDate}
        AND barber_id = ${normalizedBarber}
    `;
    return null;
  }

  const rows = await sql`
    INSERT INTO schedule_overrides (
      override_date,
      barber_id,
      is_closed,
      open_time,
      close_time,
      added_slots,
      blocked_slots,
      note,
      updated_at
    ) VALUES (
      ${normalizedDate},
      ${normalizedBarber},
      ${Boolean(isClosed)},
      ${openTime || null},
      ${closeTime || null},
      ${addedSlots},
      ${blockedSlots},
      ${note?.trim() || null},
      NOW()
    )
    ON CONFLICT (override_date, barber_id) DO UPDATE SET
      is_closed = EXCLUDED.is_closed,
      open_time = EXCLUDED.open_time,
      close_time = EXCLUDED.close_time,
      added_slots = EXCLUDED.added_slots,
      blocked_slots = EXCLUDED.blocked_slots,
      note = EXCLUDED.note,
      updated_at = NOW()
    RETURNING
      override_date::text AS override_date,
      barber_id,
      is_closed,
      open_time,
      close_time,
      added_slots,
      blocked_slots,
      note,
      updated_at
  `;

  return normalizeOverrideRow(rows[0]);
}

export async function deleteOverride(date, barberId) {
  if (!isDbConfigured()) return false;
  if (!barberId || !isValidBarberId(barberId)) {
    throw new Error("Kies een kapper");
  }

  await ensureSchema();
  const sql = getSql();
  await sql`
    DELETE FROM schedule_overrides
    WHERE override_date = ${normalizeDateString(date)}
      AND barber_id = ${normalizeBarberId(barberId)}
  `;
  return true;
}
