import { neon } from "@neondatabase/serverless";

let sqlClient;
let schemaReady;

const DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "NEON_DATABASE_URL",
  "STORAGE_URL",
  "DATABASE_URL_UNPOOLED",
];

export function getDatabaseUrl() {
  for (const key of DATABASE_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.startsWith("postgres")) return value;
  }
  return null;
}

export function isDbConfigured() {
  return Boolean(getDatabaseUrl());
}

export function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Database niet gevonden. Zet DATABASE_URL in Vercel (Storage → Neon Postgres) en redeploy."
    );
  }
  if (!sqlClient) sqlClient = neon(databaseUrl);
  return sqlClient;
}

export async function ensureSchema() {
  if (schemaReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      barber_id TEXT NOT NULL,
      service TEXT NOT NULL,
      appointment_date DATE NOT NULL,
      appointment_time TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      cancel_token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cancelled_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_idx
    ON appointments (barber_id, appointment_date, appointment_time)
    WHERE cancelled_at IS NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS schedule_overrides (
      override_date DATE NOT NULL,
      barber_id TEXT NOT NULL,
      is_closed BOOLEAN NOT NULL DEFAULT FALSE,
      open_time TEXT,
      close_time TEXT,
      added_slots TEXT[] NOT NULL DEFAULT '{}',
      blocked_slots TEXT[] NOT NULL DEFAULT '{}',
      note TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (override_date, barber_id)
    )
  `;

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'schedule_overrides'
  `;
  const columnNames = new Set(columns.map((row) => row.column_name));
  if (!columnNames.has("barber_id")) {
    await sql`ALTER TABLE schedule_overrides ADD COLUMN barber_id TEXT NOT NULL DEFAULT 'bewar'`;
    await sql`ALTER TABLE schedule_overrides DROP CONSTRAINT IF EXISTS schedule_overrides_pkey`;
    await sql`ALTER TABLE schedule_overrides ADD PRIMARY KEY (override_date, barber_id)`;
  }

  schemaReady = true;
}

export function normalizeDateString(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}
