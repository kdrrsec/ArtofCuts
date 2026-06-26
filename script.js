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
const navBackdrop = document.getElementById("navBackdrop");
const navMenu = document.getElementById("navMenu");
const navLogo = document.querySelector(".nav__logo");
const root = document.documentElement;
const isMobileMenu = () => window.matchMedia("(max-width: 640px)").matches;

function preventBackgroundScroll(event) {
  if (event.target.closest(".nav-menu__panel")) return;
  event.preventDefault();
}

function setMenuOpen(open) {
  if (!open) {
    root.style.scrollBehavior = "auto";
  }

  if (open && isMobileMenu()) {
    document.addEventListener("touchmove", preventBackgroundScroll, { passive: false });
    document.addEventListener("wheel", preventBackgroundScroll, { passive: false });
    root.classList.add("menu-open");
  } else {
    document.removeEventListener("touchmove", preventBackgroundScroll);
    document.removeEventListener("wheel", preventBackgroundScroll);
    root.classList.remove("menu-open");
  }

  nav.classList.toggle("open", open);
  nav.classList.remove("nav--hidden");
  navMenu.classList.toggle("is-open", open);
  navMenu.setAttribute("aria-hidden", open ? "false" : "true");
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (navBackdrop) navBackdrop.setAttribute("aria-hidden", open ? "false" : "true");

  if (!open) {
    window.setTimeout(() => {
      root.style.scrollBehavior = "";
    }, 450);
  }
}

navToggle.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setMenuOpen(!nav.classList.contains("open"));
});

navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") setMenuOpen(false);
});

if (navBackdrop) {
  navBackdrop.addEventListener("click", (event) => {
    event.preventDefault();
    setMenuOpen(false);
  });
}

if (navLogo) {
  navLogo.addEventListener("click", (event) => {
    if (nav.classList.contains("open")) event.preventDefault();
  });
}

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
   Afsprakensysteem
   ----------------------------------------------------------- */

const openingHours = {
  0: null,
  1: null,
  2: { open: [10, 0], close: [18, 0] },
  3: { open: [10, 0], close: [18, 0] },
  4: { open: [10, 0], close: [20, 0] },
  5: { open: [10, 0], close: [18, 0] },
  6: { open: [9, 0], close: [16, 30] },
};

const dayNames = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const monthNames = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

const daysWrap = document.getElementById("bookerDays");
const timesWrap = document.getElementById("bookerTimes");
const bookerForm = document.getElementById("bookerForm");
const bookerDetails = document.getElementById("bookerDetails");
const bookerSubmit = document.getElementById("bookerSubmit");
const bookerError = document.getElementById("bookerError");
const bookerSuccess = document.getElementById("bookerSuccess");
const bookerSuccessText = document.getElementById("bookerSuccessText");
const bookerCancelLink = document.getElementById("bookerCancelLink");

let availabilityByDate = new Map();
let bookableDates = [];
let availabilityRequestId = 0;

const SLOT_MINUTES = 45;

function toMinutes([hours, minutes]) {
  return hours * 60 + minutes;
}

function getLocalSlotsForDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
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
      slots.push(`${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`);
    }
    time += SLOT_MINUTES;
  }

  return slots;
}

function buildLocalAvailability(dates) {
  return dates.map((date) => {
    const slots = getLocalSlotsForDate(date);
    return {
      date,
      total: slots.length,
      booked: 0,
      fullness: 0,
      slots,
    };
  });
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isDateLocallyOpen(date) {
  const hours = openingHours[date.getDay()];
  if (!hours) return false;
  const now = new Date();
  if (!isSameDay(date, now)) return true;
  return toMinutes(hours.close) > now.getHours() * 60 + now.getMinutes();
}

function formatDateString(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getLocalBookableDates(count = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [];

  for (let offset = 0; dates.length < count && offset < 42; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    if (isDateLocallyOpen(date)) dates.push(formatDateString(date));
  }

  return dates;
}

function getSelectedBarber() {
  return document.querySelector("#bookerBarbers .barber-pick.is-active")?.dataset.barber || null;
}

function getSelectedService() {
  return document.querySelector(".booker__options .chip.is-active")?.dataset.service || null;
}

function getSelectedDate() {
  return daysWrap?.querySelector(".day.is-active")?.dataset.date || null;
}

function getSelectedTime() {
  return timesWrap?.querySelector(".slot.is-active")?.textContent || null;
}

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

function renderDayButton(dateStr, dayData, isActive, today) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "day" + (isActive ? " is-active" : "") + (dayData && !dayData.slots.length ? " is-full" : "");
  btn.dataset.date = dateStr;
  if (dayData && !dayData.slots.length) btn.disabled = true;

  const showMonth = date.getMonth() !== today.getMonth() || date.getDate() === 1;
  const fullness = dayData?.fullness || 0;

  btn.innerHTML = `
    <small>${showMonth ? `${dayNames[date.getDay()]} ${monthNames[date.getMonth()]}` : dayNames[date.getDay()]}</small>
    <b>${date.getDate()}</b>
    <span class="day__fill" aria-hidden="true"><span class="day__fill-bar" style="--fill: ${fullness}%"></span></span>
  `;

  return btn;
}

function updateDetailsStep() {
  const ready = Boolean(getSelectedDate() && getSelectedTime());
  if (bookerDetails) bookerDetails.hidden = !ready;
}

function renderTimeSlots(dateStr) {
  if (!timesWrap) return;
  timesWrap.innerHTML = "";

  const dayData = availabilityByDate.get(dateStr);
  const slots = dayData?.slots || [];

  if (!slots.length) {
    timesWrap.innerHTML = '<p class="booker__empty">Geen tijden meer beschikbaar op deze dag.</p>';
    updateDetailsStep();
    return;
  }

  slots.forEach((time) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot";
    btn.textContent = time;
    timesWrap.appendChild(btn);
  });

  updateDetailsStep();
}

function renderBookingDays(preferredDate) {
  if (!daysWrap) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  daysWrap.innerHTML = "";

  let activeDate = null;
  if (preferredDate && availabilityByDate.get(preferredDate)?.slots?.length) {
    activeDate = preferredDate;
  } else {
    activeDate = bookableDates.find((dateStr) => availabilityByDate.get(dateStr)?.slots?.length) || null;
  }

  bookableDates.forEach((dateStr) => {
    const dayData = availabilityByDate.get(dateStr);
    if (!dayData) return;

    const btn = renderDayButton(dateStr, dayData, dateStr === activeDate, today);
    daysWrap.appendChild(btn);
  });

  if (activeDate) {
    renderTimeSlots(activeDate);
  } else {
    timesWrap.innerHTML = '<p class="booker__empty">Geen beschikbare dagen voor deze kapper.</p>';
  }
}

async function fetchAvailability() {
  const barber = getSelectedBarber();
  if (!barber || !daysWrap) return;

  const requestId = ++availabilityRequestId;
  if (bookerDetails) bookerDetails.hidden = true;
  hideBookingError();
  const params = new URLSearchParams({ barber });

  try {
    const res = await fetch(`/api/availability?${params.toString()}`, { cache: "no-store" });
    const contentType = res.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error("API niet bereikbaar");
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Kon beschikbaarheid niet laden");
    if (requestId !== availabilityRequestId || barber !== getSelectedBarber()) return;
    if (data.barber && data.barber !== barber) return;

    bookableDates = data.days.map((day) => day.date);
    availabilityByDate = new Map(data.days.map((day) => [day.date, day]));
    renderBookingDays(getSelectedDate());
    hideBookingError();
  } catch (error) {
    if (requestId !== availabilityRequestId || barber !== getSelectedBarber()) return;
    console.warn("Availability fallback:", error);
    bookableDates = getLocalBookableDates();
    const localDays = buildLocalAvailability(bookableDates);
    availabilityByDate = new Map(localDays.map((day) => [day.date, day]));
    renderBookingDays(getSelectedDate());
  }
}

function showBookingError(message) {
  if (!bookerError) return;
  bookerError.hidden = false;
  bookerError.textContent = message;
}

function hideBookingError() {
  if (!bookerError) return;
  bookerError.hidden = true;
  bookerError.textContent = "";
}

function showBookingSuccess(details, cancelUrl) {
  hideBookingError();
  if (bookerDetails) bookerDetails.hidden = true;
  if (bookerSuccess) bookerSuccess.hidden = false;
  if (bookerSuccessText) {
    bookerSuccessText.textContent = `${details.firstName} ${details.lastName}, je staat gepland op ${details.dateLabel} om ${details.time} bij ${details.barberName} voor ${details.serviceName}.`;
  }
  if (bookerCancelLink) bookerCancelLink.href = cancelUrl;
}

async function submitBooking() {
  hideBookingError();

  const barber = getSelectedBarber();
  const service = getSelectedService();
  const date = getSelectedDate();
  const time = getSelectedTime();

  if (!bookerForm?.reportValidity()) return;
  if (!barber || !service || !date || !time) {
    showBookingError("Kies een dienst, kapper, dag en tijd.");
    return;
  }

  const formData = new FormData(bookerForm);
  const payload = {
    barber,
    service,
    date,
    time,
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
  };

  if (bookerSubmit) {
    bookerSubmit.disabled = true;
    bookerSubmit.textContent = "Bezig met boeken…";
  }

  try {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Boeken mislukt");

    const [year, month, day] = date.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dateLabel = `${dayNames[dateObj.getDay()]} ${day} ${monthNames[dateObj.getMonth()]}`;

    const barberName = document.querySelector(`#bookerBarbers [data-barber="${barber}"] .barber-pick__name`)?.textContent || barber;
    const serviceName = document.querySelector(`.booker__options [data-service="${service}"]`)?.textContent?.split(" · ")[0] || service;

    showBookingSuccess(
      { ...payload, dateLabel, barberName, serviceName },
      data.cancelUrl
    );
  } catch (error) {
    showBookingError(error.message);
    await fetchAvailability();
  } finally {
    if (bookerSubmit) {
      bookerSubmit.disabled = false;
      bookerSubmit.textContent = "Bevestig afspraak";
    }
  }
}

if (daysWrap) {
  singleSelect(document.querySelector(".booker__options"), ".chip");
  singleSelect(document.getElementById("bookerBarbers"), ".barber-pick", fetchAvailability);
  singleSelect(daysWrap, ".day", (btn) => renderTimeSlots(btn.dataset.date));
  singleSelect(timesWrap, ".slot", updateDetailsStep);

  fetchAvailability();
}

function selectBarber(id) {
  const barbersWrap = document.getElementById("bookerBarbers");
  if (!barbersWrap || !id) return;
  const btn = barbersWrap.querySelector(`[data-barber="${id}"]`);
  if (!btn) return;
  barbersWrap.querySelectorAll(".barber-pick").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  fetchAvailability();
}

document.querySelectorAll(".team .barber[data-barber]").forEach((link) => {
  link.addEventListener("click", () => selectBarber(link.dataset.barber));
});

if (bookerSubmit) {
  bookerSubmit.addEventListener("click", submitBooking);
}

/* -----------------------------------------------------------
   Google reviews
   ----------------------------------------------------------- */

const reviewsTrack = document.getElementById("reviewsTrack");
const reviewsNav = document.getElementById("reviewsNav");
const reviewsSummary = document.getElementById("reviewsSummary");
const reviewsScore = document.getElementById("reviewsScore");
const reviewsGoogleLink = document.getElementById("reviewsGoogleLink");
const reviewsStatus = document.getElementById("reviewsStatus");
const reviewsCount = document.getElementById("reviewsCount");
const reviewsPrev = document.getElementById("reviewsPrev");
const reviewsNext = document.getElementById("reviewsNext");

let googleReviews = [];
let reviewsWindowStart = 0;

function getReviewsPerPage() {
  return window.matchMedia("(max-width: 700px)").matches ? 1 : 2;
}

function renderStars(rating) {
  const rounded = Math.round(rating);
  return "★★★★★".slice(0, rounded) + "☆☆☆☆☆".slice(0, 5 - rounded);
}

function getMaxReviewsWindowStart() {
  return Math.max(0, googleReviews.length - getReviewsPerPage());
}

function updateReviewsNavButtons() {
  if (!reviewsPrev || !reviewsNext) return;
  const hasOverflow = googleReviews.length > getReviewsPerPage();
  reviewsPrev.disabled = !hasOverflow || reviewsWindowStart <= 0;
  reviewsNext.disabled = !hasOverflow || reviewsWindowStart >= getMaxReviewsWindowStart();
}

function updateReviewsCountLabel() {
  if (!reviewsCount) return;
  const total = googleReviews.length;
  const perPage = getReviewsPerPage();
  if (total <= perPage) {
    reviewsCount.hidden = true;
    return;
  }
  const from = reviewsWindowStart + 1;
  const to = Math.min(reviewsWindowStart + perPage, total);
  reviewsCount.hidden = false;
  reviewsCount.textContent = `Review ${from}${to > from ? `–${to}` : ""} van ${total}`;
}

function renderReviewCard(review) {
  const card = document.createElement("article");
  card.className = "reviews__card";

  const avatar = review.photoUri
    ? `<img class="reviews__avatar" src="${review.photoUri}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
    : `<span class="reviews__avatar reviews__avatar--fallback" aria-hidden="true">${review.author.charAt(0).toUpperCase()}</span>`;

  card.innerHTML = `
    <div class="reviews__card-top">
      ${avatar}
      <div class="reviews__author">
        <b>${review.author}</b>
        <small>${review.time || "Google review"}</small>
      </div>
      <span class="reviews__stars" aria-label="${review.rating} van 5 sterren">${renderStars(review.rating)}</span>
    </div>
    <p class="reviews__text"></p>
  `;
  card.querySelector(".reviews__text").textContent = review.text;
  return card;
}

function renderGoogleReviews() {
  if (!reviewsTrack) return;

  const perPage = getReviewsPerPage();
  reviewsTrack.style.setProperty("--reviews-count", String(perPage));
  reviewsTrack.innerHTML = "";

  if (!googleReviews.length) {
    reviewsNav.hidden = true;
    updateReviewsNavButtons();
    updateReviewsCountLabel();
    return;
  }

  if (reviewsWindowStart > getMaxReviewsWindowStart()) {
    reviewsWindowStart = getMaxReviewsWindowStart();
  }

  reviewsNav.hidden = false;
  googleReviews
    .slice(reviewsWindowStart, reviewsWindowStart + perPage)
    .forEach((review) => {
      reviewsTrack.appendChild(renderReviewCard(review));
    });

  updateReviewsNavButtons();
  updateReviewsCountLabel();
}

function shiftReviewsWindow(direction) {
  const nextStart = reviewsWindowStart + direction;
  if (nextStart < 0 || nextStart > getMaxReviewsWindowStart()) return;
  reviewsWindowStart = nextStart;
  renderGoogleReviews();
}

function setReviewsStatus(message) {
  if (!reviewsStatus) return;
  reviewsStatus.hidden = false;
  reviewsStatus.textContent = message;
}

async function loadGoogleReviews() {
  if (!reviewsTrack) return;

  try {
    const res = await fetch("/api/reviews", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Kon reviews niet laden");

    googleReviews = Array.isArray(data.reviews) ? data.reviews : [];
    reviewsWindowStart = 0;

    if (reviewsGoogleLink && data.googleMapsUri) {
      reviewsGoogleLink.href = data.googleMapsUri;
      reviewsSummary.hidden = false;
    }

    if (data.rating && reviewsScore) {
      reviewsSummary.hidden = false;
      const totalLabel = data.total ? `${data.total} reviews op Google` : "Reviews op Google";
      reviewsScore.innerHTML = `
        <span class="reviews__stars" aria-hidden="true">${renderStars(data.rating)}</span>
        <span>${Number(data.rating).toFixed(1)}</span>
        <small>${totalLabel}</small>
      `;
      reviewsScore.setAttribute("aria-label", `${Number(data.rating).toFixed(1)} van 5 sterren, ${totalLabel}`);
    }

    if (!googleReviews.length) {
      reviewsNav.hidden = true;
      if (data.configured) {
        setReviewsStatus("Nog geen Google-reviews om te tonen.");
      } else {
        setReviewsStatus("Google-reviews worden binnenkort getoond.");
      }
      return;
    }

    if (reviewsStatus) reviewsStatus.hidden = true;
    renderGoogleReviews();
  } catch (error) {
    console.warn("Reviews laden mislukt:", error);
    reviewsNav.hidden = true;
    setReviewsStatus("Reviews zijn nu even niet beschikbaar.");
  }
}

if (reviewsTrack) {
  reviewsPrev?.addEventListener("click", () => shiftReviewsWindow(-1));
  reviewsNext?.addEventListener("click", () => shiftReviewsWindow(1));
  window.addEventListener("resize", renderGoogleReviews);
  loadGoogleReviews();
}
