export const openingHours = {
  0: null,
  1: null,
  2: { open: [10, 0], close: [18, 0] },
  3: { open: [10, 0], close: [18, 0] },
  4: { open: [10, 0], close: [20, 0] },
  5: { open: [10, 0], close: [18, 0] },
  6: { open: [9, 0], close: [16, 30] },
};

export const SLOT_MINUTES = 45;

export const BARBERS = {
  bewar: "Bewar Z.",
  zennar: "Zennar Z.",
};

const LEGACY_BARBER_IDS = {
  "barbier-1": "bewar",
  "barbier-2": "zennar",
};

export function normalizeBarberId(id) {
  if (!id) return id;
  if (BARBERS[id]) return id;
  return LEGACY_BARBER_IDS[id] || id;
}

export function isValidBarberId(id) {
  return Boolean(BARBERS[normalizeBarberId(id)]);
}

export function getBarberIdVariants(id) {
  const normalized = normalizeBarberId(id);
  const variants = new Set([normalized]);
  for (const [legacy, current] of Object.entries(LEGACY_BARBER_IDS)) {
    if (current === normalized) variants.add(legacy);
  }
  return Array.from(variants);
}

export const SERVICES = {
  knippen: "Knippen",
  baard: "Baard",
  "knippen-baard": "Knippen + Baard",
  kind: "Knippen kind",
};

function toMinutes([hours, minutes]) {
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

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

export function getAllSlotsForDate(dateInput) {
  const date = typeof dateInput === "string" ? parseDateString(dateInput) : dateInput;
  const hours = openingHours[date.getDay()];
  if (!hours) return [];

  const start = toMinutes(hours.open);
  const end = toMinutes(hours.close);
  const now = new Date();
  const isToday = isSameDay(date, now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
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

export function isDateOpen(dateStr) {
  return getAllSlotsForDate(dateStr).length > 0;
}

export function getBookableDates(count = 14, maxLookahead = 56) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [];

  for (let offset = 0; dates.length < count && offset < maxLookahead; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const dateStr = formatDate(date);
    if (isDateOpen(dateStr)) dates.push(dateStr);
  }

  return dates;
}

export function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
