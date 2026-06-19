// Art of Cuts — interactions

// Current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Sticky nav: background after scrolling + hide on scroll down, show on scroll up
const nav = document.getElementById("nav");
let lastScrollY = window.scrollY;

const onScroll = () => {
  const y = window.scrollY;

  nav.classList.toggle("scrolled", y > 40);

  // Keep nav visible near the very top or while the mobile menu is open
  if (y < 120 || nav.classList.contains("open")) {
    nav.classList.remove("nav--hidden");
  } else if (y > lastScrollY) {
    nav.classList.add("nav--hidden"); // scrolling down
  } else {
    nav.classList.remove("nav--hidden"); // scrolling up
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

// Scroll-reveal animations via IntersectionObserver
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

// Calendly placeholder (demo only — replace with real embed later)
document.getElementById("calendlyDemo").addEventListener("click", (e) => {
  e.preventDefault();
  alert("Hier komt straks de Calendly-planner. Bellen kan via 06-14450069.");
});
