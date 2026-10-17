// PSLE English AL calculator. Marks are kept in localStorage so they survive a refresh.
(function () {
  const root = document.getElementById("al-calc");
  if (!root) return;

  const COMPONENTS = [
    { key: "lc", name: "Listening Comprehension", max: 20 },
    { key: "oral", name: "Oral", max: 40 },
    { key: "sw", name: "Situational Writing", max: 14 },
    { key: "comp", name: "Composition", max: 36 },
    { key: "p2", name: "Paper 2", max: 90 },
  ];
  const TOTAL_MAX = 200;
  // Lowest score out of 100 for each AL.
  const AL_BANDS = [
    { al: 1, min: 90 }, { al: 2, min: 85 }, { al: 3, min: 80 }, { al: 4, min: 75 },
    { al: 5, min: 65 }, { al: 6, min: 45 }, { al: 7, min: 20 }, { al: 8, min: 0 },
  ];
  const STORE_KEY = "ace-al-marks";

  const score100 = (total) => Math.round((total / TOTAL_MAX) * 100);
  const alFor = (score) => AL_BANDS.find((b) => score >= b.min).al;
  // Smallest number of extra marks that actually moves the AL up, using the same rounding.
  const marksToNextAL = (total, al) => {
    for (let t = total + 1; t <= TOTAL_MAX; t++) if (alFor(score100(t)) < al) return t - total;
    return null;
  };
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const $ = (id) => document.getElementById(id);
  const marks = {};
  COMPONENTS.forEach((c) => (marks[c.key] = 0));
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    COMPONENTS.forEach((c) => {
      const v = Number(saved[c.key]);
      if (Number.isFinite(v)) marks[c.key] = Math.min(c.max, Math.max(0, Math.round(v)));
    });
  } catch (e) { /* storage unavailable: start from zero */ }

  // Build one row per paper: name, −/number/+ and a slider, all kept in sync.
  const list = $("al-components");
  COMPONENTS.forEach((c) => {
    const row = document.createElement("div");
    row.className = "mark-row";
    row.innerHTML = `
      <label class="mark-name" for="al-in-${c.key}">${c.name}<small>out of ${c.max}</small></label>
      <div class="mark-controls">
        <button type="button" class="step-btn" data-step="-1" aria-label="One mark less for ${c.name}">−</button>
        <input type="number" id="al-in-${c.key}" min="0" max="${c.max}" step="1" inputmode="numeric">
        <button type="button" class="step-btn" data-step="1" aria-label="One mark more for ${c.name}">+</button>
      </div>
      <input type="range" class="mark-slider" min="0" max="${c.max}" step="1" aria-label="${c.name} marks">`;
    list.appendChild(row);
    const num = row.querySelector('input[type="number"]');
    const slider = row.querySelector('input[type="range"]');
    const set = (v) => {
      marks[c.key] = Math.min(c.max, Math.max(0, Math.round(Number(v) || 0)));
      update();
    };
    num.addEventListener("input", () => { if (num.value !== "") set(num.value); });
    num.addEventListener("blur", () => set(num.value));
    num.addEventListener("focus", () => num.select());
    slider.addEventListener("input", () => set(slider.value));
    row.querySelectorAll(".step-btn").forEach((b) =>
      b.addEventListener("click", () => set(marks[c.key] + Number(b.dataset.step)))
    );
    c.num = num;
    c.slider = slider;
  });

  const ladder = $("al-ladder");
  AL_BANDS.slice().reverse().forEach((b) => {
    const li = document.createElement("li");
    li.textContent = "AL" + b.al;
    li.dataset.al = b.al;
    ladder.appendChild(li);
  });

  $("al-reset").addEventListener("click", () => {
    COMPONENTS.forEach((c) => (marks[c.key] = 0));
    update();
    COMPONENTS[0].num.focus();
  });

  function focusList() {
    return COMPONENTS.map((c) => {
      const gap = c.max - marks[c.key];
      const pct = marks[c.key] / c.max;
      // Bigger papers with more marks left (and a lower % so far) come first.
      return { ...c, gap, pct, weight: gap * (c.max / TOTAL_MAX) * (1 - pct) };
    }).sort((a, b) => b.weight - a.weight);
  }

  function tip(total, score, al, ranked) {
    if (total === 0) return "Start by keying in your marks for each paper. You can use the − and + buttons or the slider.";
    if (al === 1) return "<strong>AL1, the top grade. Amazing work!</strong> Now it’s about staying consistent: keep practising timed compositions and oral so you can do this on exam day too.";
    const top = ranked[0];
    const weakest = COMPONENTS.slice().sort((a, b) => marks[a.key] / a.max - marks[b.key] / b.max)[0];
    const weakestPct = Math.round((marks[weakest.key] / weakest.max) * 100);
    let msg = `You’re at <strong>AL${al}</strong> with a score of <strong>${score}/100</strong>. `;
    if (top.gap > 0) msg += `<strong>${top.name}</strong> is where you can gain the most, with ${plural(top.gap, "mark")} still up for grabs. `;
    if (weakestPct < 60) msg += `<strong>${weakest.name}</strong> is your weakest area at ${weakestPct}%, so give it extra practice. `;
    msg += al >= 5
      ? "Paper 2 and Oral are 65% of all the marks, so working on them first gives you the biggest jump."
      : "At this level, polishing your composition and situational writing can make the difference.";
    return msg;
  }

  let lastAL = null;
  function update() {
    const total = COMPONENTS.reduce((sum, c) => sum + marks[c.key], 0);
    const score = score100(total);
    const al = alFor(score);

    COMPONENTS.forEach((c) => {
      if (document.activeElement !== c.num) c.num.value = marks[c.key];
      c.slider.value = marks[c.key];
      c.slider.style.setProperty("--pct", (marks[c.key] / c.max) * 100 + "%");
    });

    $("al-total").textContent = total;
    $("al-score").textContent = score;
    const badge = $("al-grade");
    badge.textContent = "AL" + al;
    badge.dataset.al = al;
    ladder.querySelectorAll("li").forEach((li) => {
      const current = Number(li.dataset.al) === al;
      li.classList.toggle("current", current);
      if (current) li.setAttribute("aria-current", "true"); else li.removeAttribute("aria-current");
    });

    const needed = marksToNextAL(total, al);
    const nextText = al === 1
      ? "You’ve reached the top grade!"
      : `${plural(needed, "more mark")} to reach AL${al - 1}`;
    $("al-next").innerHTML = al === 1
      ? "<strong>🎉 You’ve reached the top grade!</strong>"
      : `<strong>${plural(needed, "more mark")}</strong> to reach <strong>AL${al - 1}</strong>`;
    $("dock-al").textContent = "AL" + al;
    $("dock-al").dataset.al = al;
    $("dock-total").textContent = total;
    $("dock-next").textContent = nextText;

    const ranked = focusList();
    $("al-focus").innerHTML = ranked.map((c, i) => `
      <li class="${c.gap === 0 ? "done" : ""}">
        <span class="focus-rank">${i + 1}</span>
        <span class="focus-info">
          <strong>${c.name}</strong>
          <span class="focus-bar-row"><span class="focus-bar"><span style="width:${Math.round(c.pct * 100)}%"></span></span><small>${marks[c.key]}/${c.max}</small></span>
        </span>
        <span class="focus-gain">${c.gap === 0
          ? "<b>✓</b><small>full marks</small>"
          : `<b>+${c.gap}</b><small>${c.gap === 1 ? "mark" : "marks"} available</small>`}</span>
      </li>`).join("");
    $("al-tip").innerHTML = tip(total, score, al, ranked);

    if (al === 1 && lastAL !== null && lastAL !== 1 && window.confettiBurst) window.confettiBurst();
    lastAL = al;

    try { localStorage.setItem(STORE_KEY, JSON.stringify(marks)); } catch (e) { /* ignore */ }
  }

  update();
})();
