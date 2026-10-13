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
