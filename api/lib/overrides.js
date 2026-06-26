import { ensureSchema, getSql, isDbConfigured, normalizeDateString } from "./db.js";

function normalizeOverrideRow(row) {
  if (!row) return null;
  return {
    date: normalizeDateString(row.override_date),
    isClosed: Boolean(row.is_closed),
    openTime: row.open_time || null,
    closeTime: row.close_time || null,
    addedSlots: Array.isArray(row.added_slots) ? row.added_slots : [],
    blockedSlots: Array.isArray(row.blocked_slots) ? row.blocked_slots : [],
    note: row.note || "",
    updatedAt: row.updated_at,
  };
}

export async function getOverridesForDates(dates) {
  const map = new Map();
  if (!dates.length) return map;
  if (!isDbConfigured()) return map;

  await ensureSchema();
  const sql = getSql();
  const uniqueDates = [...new Set(dates.map(normalizeDateString).filter(Boolean))];
  const rows = await sql`
    SELECT
      override_date::text AS override_date,
      is_closed,
      open_time,
      close_time,
      added_slots,
      blocked_slots,
      note,
      updated_at
    FROM schedule_overrides
    WHERE override_date = ANY(${uniqueDates})
  `;

  for (const row of rows) {
    const override = normalizeOverrideRow(row);
    if (override) map.set(override.date, override);
  }

  return map;
}

export async function getOverrideForDate(date) {
  const map = await getOverridesForDates([date]);
  return map.get(normalizeDateString(date)) || null;
}

export async function upsertOverride({
  date,
  isClosed = false,
  openTime = null,
  closeTime = null,
  addedSlots = [],
  blockedSlots = [],
  note = "",
}) {
  await ensureSchema();
  const sql = getSql();
  const normalizedDate = normalizeDateString(date);

  const hasCustomHours = Boolean(openTime && closeTime);
  const hasSlotChanges = addedSlots.length > 0 || blockedSlots.length > 0;
  const hasNote = Boolean(note?.trim());

  if (!isClosed && !hasCustomHours && !hasSlotChanges && !hasNote) {
    await sql`DELETE FROM schedule_overrides WHERE override_date = ${normalizedDate}`;
    return null;
  }

  const rows = await sql`
    INSERT INTO schedule_overrides (
      override_date,
      is_closed,
      open_time,
      close_time,
      added_slots,
      blocked_slots,
      note,
      updated_at
    ) VALUES (
      ${normalizedDate},
      ${Boolean(isClosed)},
      ${openTime || null},
      ${closeTime || null},
      ${addedSlots},
      ${blockedSlots},
      ${note?.trim() || null},
      NOW()
    )
    ON CONFLICT (override_date) DO UPDATE SET
      is_closed = EXCLUDED.is_closed,
      open_time = EXCLUDED.open_time,
      close_time = EXCLUDED.close_time,
      added_slots = EXCLUDED.added_slots,
      blocked_slots = EXCLUDED.blocked_slots,
      note = EXCLUDED.note,
      updated_at = NOW()
    RETURNING
      override_date::text AS override_date,
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

export async function deleteOverride(date) {
  if (!isDbConfigured()) return false;
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM schedule_overrides WHERE override_date = ${normalizeDateString(date)}`;
  return true;
}
