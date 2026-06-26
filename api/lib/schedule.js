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

function parseClockTime(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return [hours, minutes];
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

function getHoursForDate(date, override = null) {
  if (override?.isClosed) return null;

  const customOpen = parseClockTime(override?.openTime);
  const customClose = parseClockTime(override?.closeTime);
  if (customOpen && customClose) {
    return { open: customOpen, close: customClose };
  }

  return openingHours[date.getDay()] || null;
}

function generateSlotsFromHours(hours, date) {
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

export function getAllSlotsForDate(dateInput, override = null) {
  const date = typeof dateInput === "string" ? parseDateString(dateInput) : dateInput;
  const hours = getHoursForDate(date, override);
  let slots = generateSlotsFromHours(hours, date);

  const added = Array.isArray(override?.addedSlots) ? override.addedSlots : [];
  const blocked = new Set(Array.isArray(override?.blockedSlots) ? override.blockedSlots : []);
  const now = new Date();
  const isToday = isSameDay(date, now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const slot of added) {
    if (!/^\d{2}:\d{2}$/.test(slot) || slots.includes(slot) || blocked.has(slot)) continue;
    if (isToday) {
      const [hours, minutes] = slot.split(":").map(Number);
      if (hours * 60 + minutes <= nowMinutes) continue;
    }
    slots.push(slot);
  }

  slots = slots.filter((slot) => !blocked.has(slot));
  slots.sort();
  return slots;
}

export function isDateOpen(dateStr, override = null) {
  return getAllSlotsForDate(dateStr, override).length > 0;
}

export function getBookableDates(count = 14, maxLookahead = 56, overridesMap = new Map()) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [];

  for (let offset = 0; offset < maxLookahead; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const dateStr = formatDate(date);
    const override = overridesMap.get(dateStr) || null;
    if (isDateOpen(dateStr, override)) dates.push(dateStr);
    if (dates.length >= count) break;
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

export function isValidClockTime(value) {
  return Boolean(parseClockTime(value));
}
