import { neon } from "@neondatabase/serverless";

let sqlClient;
let schemaReady;

export function isDbConfigured() {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url.startsWith("postgres"));
}

export function getSql() {
  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL is niet geconfigureerd. Voeg een Neon Postgres database toe in Vercel.");
  }
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
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
  schemaReady = true;
}

export function normalizeDateString(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}
