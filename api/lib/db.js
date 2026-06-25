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
    CREATE TABLE IF NOT EXISTS availability_overrides (
      id TEXT PRIMARY KEY,
      barber_id TEXT NOT NULL,
      override_date DATE NOT NULL,
      override_time TEXT,
      open_time TEXT,
      close_time TEXT,
      kind TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  schemaReady = true;
}

export function normalizeDateString(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}
