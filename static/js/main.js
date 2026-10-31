// Render icons, and toggle the mobile menu.
if (window.lucide) lucide.createIcons();

const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");
if (toggle && nav) {
  const setOpen = (open) => {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      setOpen(false);
      toggle.focus();
    }
  });
}

// Year tabs on the schedule page. The hash (#year-2026) picks the tab, so links and Back work.
const yearTabs = document.querySelectorAll(".year-tabs [role=tab]");
if (yearTabs.length) {
  document.documentElement.classList.add("js-tabs");
  const showYear = (hash) => {
    const target = [...yearTabs].find((t) => t.hash === hash) || yearTabs[0];
    yearTabs.forEach((tab) => {
      const selected = tab === target;
      tab.setAttribute("aria-selected", String(selected));
      document.querySelector(tab.hash).hidden = !selected;
    });
  };
  yearTabs.forEach((tab) =>
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      if (location.hash !== tab.hash) history.pushState(null, "", tab.hash);
      showYear(tab.hash);
      // Bring the top of the timetable back into view if the parent had scrolled down.
      const tabs = document.querySelector(".year-tabs");
      const top = tabs.parentElement.getBoundingClientRect().top + window.scrollY - 90;
      if (window.scrollY > top) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      }
    })
  );
  window.addEventListener("popstate", () => showYear(location.hash));
  showYear(location.hash);
}

// Home hero slideshow: moves right every few seconds and loops through a copy of the first
// slide, so it always scrolls the same way. Pauses while hovered or focused; no auto-play
// for visitors who prefer reduced motion. Swiping works through native scroll-snap.
const slideshow = document.querySelector(".slideshow");
if (slideshow && slideshow.querySelectorAll(".slide").length > 1) {
  const track = slideshow.querySelector(".slide-track");
  const dots = slideshow.querySelectorAll(".slide-dots button");
  const count = dots.length;
  const clone = track.firstElementChild.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.inert = true;
  track.append(clone);

  const current = () => Math.round(track.scrollLeft / track.clientWidth);
  const goTo = (i, behavior = "smooth") => track.scrollTo({ left: i * track.clientWidth, behavior });
  const markDot = (at = current()) => dots.forEach((d, i) => d.setAttribute("aria-current", String(i === at % count)));
  const next = () => {
    const i = current() + 1;
    goTo(i);
    markDot(i);
    if (i === count) setTimeout(() => goTo(0, "instant"), 800);
  };

  let settle;
  track.addEventListener("scroll", () => {
    markDot();
    clearTimeout(settle);
    // Once the copy of the first slide is fully in view, jump back to the real one.
    settle = setTimeout(() => { if (current() === count) goTo(0, "instant"); }, 120);
  });
  dots.forEach((dot, i) => dot.addEventListener("click", () => { goTo(i); markDot(i); }));
  window.addEventListener("resize", () => goTo(current() % count, "instant"));
  markDot();

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let paused = false;
    const pause = (on) => () => { paused = on; };
    slideshow.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") paused = true; });
    slideshow.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") paused = false; });
    slideshow.addEventListener("focusin", (e) => { if (e.target.matches(":focus-visible")) paused = true; });
    slideshow.addEventListener("focusout", pause(false));
    slideshow.addEventListener("touchstart", pause(true), { passive: true });
    slideshow.addEventListener("touchend", () => setTimeout(pause(false), 4000), { passive: true });
    setInterval(() => { if (!paused && !document.hidden) next(); }, 5000);
  }
}

// Long reviews are cut to 4 lines; show "Read more" only where text is cut off.
const reviewTexts = document.querySelectorAll(".review-text");
if (reviewTexts.length) {
  const updateReadMore = () =>
    reviewTexts.forEach((text) => {
      const button = text.nextElementSibling;
      const cut = !text.classList.contains("expanded") && text.scrollHeight > text.clientHeight + 1;
      button.hidden = !cut && !text.classList.contains("expanded");
    });
  reviewTexts.forEach((text) =>
    text.nextElementSibling.addEventListener("click", (e) => {
      const open = text.classList.toggle("expanded");
      e.currentTarget.textContent = open ? "Read less" : "Read more";
      e.currentTarget.setAttribute("aria-expanded", String(open));
      updateReadMore();
    })
  );
  window.addEventListener("resize", updateReadMore);
  updateReadMore();
}
