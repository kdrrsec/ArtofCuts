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

// Single-select helper for a group of buttons
function singleSelect(container, selector) {
  if (!container) return;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(selector);
    if (!btn || btn.disabled || btn.classList.contains("is-closed")) return;
    container.querySelectorAll(selector).forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
  });
}

// Build the next open days (shop closed on Sunday=0 and Monday=1)
const daysWrap = document.getElementById("bookerDays");
if (daysWrap) {
  const dayNames = ["zo", "ma", "di", "wo", "do", "vr", "za"];
  const closedDays = [0, 1]; // zondag, maandag
  const today = new Date();
  let added = 0;
  for (let i = 0; added < 6 && i < 21; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (closedDays.includes(d.getDay())) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day" + (added === 0 ? " is-active" : "");
    btn.innerHTML = `<small>${dayNames[d.getDay()]}</small><b>${d.getDate()}</b>`;
    daysWrap.appendChild(btn);
    added++;
  }
}

singleSelect(document.querySelector(".booker__options"), ".chip");
singleSelect(daysWrap, ".day");
singleSelect(document.querySelector(".booker__times"), ".slot");

const bookerSubmit = document.getElementById("bookerSubmit");
if (bookerSubmit) {
  bookerSubmit.addEventListener("click", () => {
    alert(
      "Bedankt! Het online afsprakensysteem wordt binnenkort geactiveerd.\n" +
      "Bel ons gerust op 06-14450069 om alvast te boeken."
    );
  });
}
