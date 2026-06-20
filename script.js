// Art of Cuts — interactions

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Sticky nav: background + hide on scroll down, show on scroll up
const nav = document.getElementById("nav");
let lastScrollY = window.scrollY;

const onScroll = () => {
  const y = window.scrollY;
  nav.classList.toggle("scrolled", y > 40);

  if (y < 120 || nav.classList.contains("open")) {
    nav.classList.remove("nav--hidden");
  } else if (y > lastScrollY) {
    nav.classList.add("nav--hidden");
  } else {
    nav.classList.remove("nav--hidden");
  }
  lastScrollY = y;
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// Mobile menu
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
navToggle.addEventListener("click", () => nav.classList.toggle("open"));
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") nav.classList.remove("open");
});

// Scroll-reveal animations
const revealEls = document.querySelectorAll("[data-reveal]");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

/* -----------------------------------------------------------
   Afspraak-preview (eigen boekingssysteem — wordt aangesloten)
   ----------------------------------------------------------- */

const openingHours = {
  0: null, // zondag
  1: null, // maandag
  2: { open: [10, 0], close: [18, 0] }, // dinsdag
  3: { open: [10, 0], close: [18, 0] }, // woensdag
  4: { open: [10, 0], close: [20, 0] }, // donderdag
  5: { open: [10, 0], close: [18, 0] }, // vrijdag
  6: { open: [9, 0], close: [16, 30] }, // zaterdag
};

const SLOT_MINUTES = 45;
const dayNames = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const monthNames = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function toMinutes([hours, minutes]) {
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getSlotsForDate(date) {
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
    if (isToday && time <= nowMinutes) {
      time += SLOT_MINUTES;
      continue;
    }
    slots.push(formatTime(time));
    time += SLOT_MINUTES;
  }

  return slots;
}

function isDateBookable(date) {
  return getSlotsForDate(date).length > 0;
}

// Single-select helper for a group of buttons
function singleSelect(container, selector, onChange) {
  if (!container) return;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(selector);
    if (!btn || btn.disabled || btn.classList.contains("is-closed")) return;
    container.querySelectorAll(selector).forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    if (onChange) onChange(btn);
  });
}

const daysWrap = document.getElementById("bookerDays");
const timesWrap = document.getElementById("bookerTimes");

function renderTimeSlots(date) {
  if (!timesWrap) return;
  timesWrap.innerHTML = "";

  const slots = getSlotsForDate(date);
  if (!slots.length) {
    timesWrap.innerHTML = '<p class="booker__empty">Geen tijden meer beschikbaar op deze dag.</p>';
    return;
  }

  slots.forEach((time, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot" + (index === 0 ? " is-active" : "");
    btn.textContent = time;
    timesWrap.appendChild(btn);
  });
}

function getSelectedDayDate() {
  const active = daysWrap?.querySelector(".day.is-active");
  if (!active?.dataset.date) return null;
  const [year, month, day] = active.dataset.date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildBookingDays() {
  if (!daysWrap) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let added = 0;

  for (let offset = 0; added < 8 && offset < 42; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    if (!isDateBookable(date)) continue;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day" + (added === 0 ? " is-active" : "");
    btn.dataset.date = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    const showMonth = date.getMonth() !== today.getMonth() || date.getDate() === 1;
    btn.innerHTML = showMonth
      ? `<small>${dayNames[date.getDay()]} ${monthNames[date.getMonth()]}</small><b>${date.getDate()}</b>`
      : `<small>${dayNames[date.getDay()]}</small><b>${date.getDate()}</b>`;

    daysWrap.appendChild(btn);
    added++;
  }

  const firstDay = getSelectedDayDate();
  if (firstDay) renderTimeSlots(firstDay);
}

buildBookingDays();

singleSelect(document.querySelector(".booker__options"), ".chip");
singleSelect(document.getElementById("bookerBarbers"), ".barber-pick");
singleSelect(daysWrap, ".day", () => {
  const selectedDay = getSelectedDayDate();
  if (selectedDay) renderTimeSlots(selectedDay);
});
singleSelect(timesWrap, ".slot");

// Pre-select barber when clicking a team card
function selectBarber(id) {
  const barbersWrap = document.getElementById("bookerBarbers");
  if (!barbersWrap || !id) return;
  const btn = barbersWrap.querySelector(`[data-barber="${id}"]`);
  if (!btn) return;
  barbersWrap.querySelectorAll(".barber-pick").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
}

document.querySelectorAll(".team .barber[data-barber]").forEach((link) => {
  link.addEventListener("click", () => selectBarber(link.dataset.barber));
});

const bookerSubmit = document.getElementById("bookerSubmit");
if (bookerSubmit) {
  bookerSubmit.addEventListener("click", () => {
    alert(
      "Bedankt! Het online afsprakensysteem wordt binnenkort geactiveerd.\n" +
      "Bel ons gerust op 06-14450069 om alvast te boeken."
    );
  });
}
