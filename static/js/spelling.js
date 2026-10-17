// Spelling practice: word list -> learn (flashcards) or test (blanks, then the whole word) -> results.
// Saved lists live in localStorage on the student's own device.
(function () {
  const root = document.getElementById("spelling");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const STORE_KEY = "ace-spelling-lists";
  const SAMPLE = "persuade\nconsequence, a result of an action\nnecessary\nenvironment\nfascinating\nimmediately\nreluctant, not willing to do something\ndisappointed";
  const VIEWS = ["setup", "mode", "learn", "test", "results"];
  const STEP_OF = { setup: "setup", mode: "mode", learn: "practise", test: "practise", results: "results" };
  const canSpeak = "speechSynthesis" in window;

  let words = [];            // [{ word, meaning }]
  let learnIndex = 0;
  let seenAll = false;
  let queue = [];
  let testIndex = 0;
  let score = 0;
  let mistakes = [];         // [{ word, typed }]

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const isLetter = (ch) => /\p{L}/u.test(ch);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const refreshIcons = () => window.lucide && window.lucide.createIcons();

  function show(view, scroll = true) {
    VIEWS.forEach((v) => ($("sp-" + v).hidden = v !== view));
    if (canSpeak && view !== "learn" && view !== "test") speechSynthesis.cancel();
    const step = STEP_OF[view];
    let reached = true;
    document.querySelectorAll("#sp-steps button").forEach((b) => {
      const current = b.dataset.step === step;
      b.classList.toggle("current", current);
      b.classList.toggle("done", reached && !current);
      if (current) {
        reached = false;
        b.setAttribute("aria-current", "step");
      } else b.removeAttribute("aria-current");
      // Only "Words" and "Choose" can be jumped back to; the others need a mode picked first.
      b.disabled = current || !(b.dataset.step === "setup" || (b.dataset.step === "mode" && words.length));
    });
    $("sp-no-speech").hidden = canSpeak || (view !== "learn" && view !== "test");
    if (!scroll) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
  document.querySelectorAll("[data-go], #sp-steps button").forEach((b) =>
    b.addEventListener("click", () => {
      const target = b.dataset.go || b.dataset.step;
      // Leaving the word list always re-reads it, so corrected spellings are picked up.
      if (target === "mode" && !$("sp-setup").hidden) $("sp-start").click();
      else show(target);
    })
  );

  function speak(text) {
    if (!canSpeak) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85;
      u.lang = "en-GB";
      speechSynthesis.speak(u);
    } catch (e) { /* speech failed: the student can tap again */ }
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function parseWords(raw) {
    return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const [word, ...rest] = line.split(",");
      return { word: word.trim(), meaning: rest.join(",").trim() };
    }).filter((w) => w.word);
  }

  // ---------- 1. Word list ----------
  const textarea = $("sp-words");
  const message = (text, isError) => {
    $("sp-message").textContent = text;
    $("sp-message").classList.toggle("error", !!isError);
  };
  const updateCount = () => {
    const n = parseWords(textarea.value).length;
    $("sp-count").textContent = plural(n, "word");
  };
  textarea.addEventListener("input", () => { updateCount(); message(""); });
  $("sp-sample").addEventListener("click", () => { textarea.value = SAMPLE; updateCount(); message(""); textarea.focus(); });

  $("sp-start").addEventListener("click", () => {
    words = parseWords(textarea.value);
    if (!words.length) { message("Type at least one word to start.", true); textarea.focus(); return; }
    $("sp-ready").textContent = `${plural(words.length, "word")} ready. How do you want to practise?`;
    show("mode");
  });

  const readLists = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { return null; }
  };
  const writeLists = (lists) => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(lists)); return true; } catch (e) { return false; }
  };

  function renderSaved() {
    const lists = readLists() || {};
    const names = Object.keys(lists);
    $("sp-saved").hidden = names.length === 0;
    const box = $("sp-chips");
    box.innerHTML = "";
    names.forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.innerHTML = `<button type="button" class="chip-load">${escapeHtml(name)} <small>${plural(lists[name].length, "word")}</small></button>
        <button type="button" class="chip-x" aria-label="Delete ${escapeHtml(name)}">✕</button>`;
      chip.querySelector(".chip-load").addEventListener("click", () => {
        textarea.value = lists[name].map((w) => (w.meaning ? `${w.word}, ${w.meaning}` : w.word)).join("\n");
        updateCount();
        message(`Loaded “${name}”.`);
      });
      const x = chip.querySelector(".chip-x");
      x.addEventListener("click", () => {
        if (!chip.classList.contains("confirm")) {
          chip.classList.add("confirm");
          x.textContent = "Delete?";
          return;
        }
        delete lists[name];
        writeLists(lists);
        renderSaved();
        message(`Deleted “${name}”.`);
      });
      box.appendChild(chip);
    });
  }

  $("sp-save-open").addEventListener("click", () => {
    if (!parseWords(textarea.value).length) { message("Type some words before saving.", true); return; }
    $("sp-save-form").hidden = false;
    $("sp-save-name").focus();
  });
  $("sp-save-cancel").addEventListener("click", () => ($("sp-save-form").hidden = true));
  $("sp-save-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("sp-save-name").value.trim();
    if (!name) { $("sp-save-name").focus(); return; }
    const lists = readLists();
    if (!lists) { message("Sorry, this browser won’t let us save lists.", true); return; }
    lists[name] = parseWords(textarea.value);
    if (!writeLists(lists)) { message("Sorry, this browser won’t let us save lists.", true); return; }
    $("sp-save-form").hidden = true;
    $("sp-save-name").value = "";
    message(`Saved “${name}”. You’ll find it below next time.`);
    renderSaved();
  });

  // ---------- 2. Mode ----------
  const WHOLE_KEY = "ace-spelling-whole";
  try { $("sp-whole").checked = localStorage.getItem(WHOLE_KEY) === "1"; } catch (e) { /* ignore */ }
  // Can be switched on or off mid-test; it applies to the word on screen straight away.
  $("sp-whole").addEventListener("change", () => {
    const whole = $("sp-whole").checked;
    try { localStorage.setItem(WHOLE_KEY, whole ? "1" : "0"); } catch (e) { /* ignore */ }
    if ($("sp-test").hidden) return;
    if (whole && !$("sp-stage-blanks").hidden) toTyping();
    else if (!whole && !$("sp-stage-type").hidden && !$("sp-answer").readOnly) renderBlanks();
  });
  // The card must be visible before it can be measured, so show the view first.
  $("sp-pick-learn").addEventListener("click", () => { learnIndex = 0; seenAll = words.length === 1; show("learn"); renderCard(); });
  $("sp-pick-test").addEventListener("click", () => startTest(words));
  $("sp-learn-to-test").addEventListener("click", () => startTest(words));

  // ---------- 3a. Learn ----------
  const card = $("sp-card");
  function renderCard() {
    const w = words[learnIndex];
    card.classList.remove("flipped");
    $("sp-learn-count").textContent = `${learnIndex + 1} / ${words.length}`;
    $("sp-learn-bar").style.width = ((learnIndex + 1) / words.length) * 100 + "%";
    $("sp-card-front").innerHTML = `<span class="card-word">${escapeHtml(w.word)}</span>`;
    $("sp-card-back").innerHTML = `<span class="letter-row">${[...w.word].map((ch) =>
      ch === " " ? '<span class="gap"></span>' : `<span>${escapeHtml(ch.toUpperCase())}</span>`).join("")}</span>` +
      (w.meaning ? `<span class="card-meaning">${escapeHtml(w.meaning)}</span>` : "");
    fitCard();
    $("sp-learn-done").hidden = !seenAll;
  }
  // Shrink the word and the letter tiles until they fit on one line inside the card.
  function fitCard() {
    const front = $("sp-card-front");
    const word = front.querySelector(".card-word");
    const room = front.clientWidth - 40;
    let size = 46;
    word.style.fontSize = size + "px";
    while (word.scrollWidth > room && size > 14) word.style.fontSize = --size + "px";

    const row = $("sp-card-back").querySelector(".letter-row");
    const tiles = row.querySelectorAll("span:not(.gap)");
    const gaps = row.querySelectorAll(".gap").length;
    const gap = 4;
    const width = Math.min(34, Math.floor((room - gaps * 10 - gap * (tiles.length + gaps - 1)) / tiles.length));
    row.style.gap = gap + "px";
    tiles.forEach((t) => {
      t.style.width = width + "px";
      t.style.height = Math.round(width * 1.25) + "px";
      t.style.fontSize = Math.max(11, Math.round(width * 0.65)) + "px";
    });
  }
  window.addEventListener("resize", () => { if (!$("sp-learn").hidden) fitCard(); });
  const move = (step) => {
    learnIndex = (learnIndex + step + words.length) % words.length;
    if (learnIndex === words.length - 1) seenAll = true;
    renderCard();
  };
  card.addEventListener("click", () => card.classList.toggle("flipped"));
  $("sp-prev").addEventListener("click", () => move(-1));
  $("sp-next").addEventListener("click", () => move(1));
  $("sp-learn-speak").addEventListener("click", () => speak(words[learnIndex].word));
  document.addEventListener("keydown", (e) => {
    if ($("sp-learn").hidden || e.target.matches("input, textarea")) return;
    if (e.key === "ArrowRight") move(1);
    else if (e.key === "ArrowLeft") move(-1);
  });

  // ---------- 3b. Test ----------
  function startTest(list) {
    queue = shuffle(list);
    testIndex = 0;
    score = 0;
    mistakes = [];
    show("test");
    renderTestWord();
  }

  const current = () => queue[testIndex].word;

  function renderTestWord() {
    $("sp-test-count").textContent = `${testIndex + 1} / ${queue.length}`;
    $("sp-test-bar").style.width = (testIndex / queue.length) * 100 + "%";
    if ($("sp-whole").checked) {
      toTyping();
      return;
    }
    renderBlanks();
    setTimeout(() => speak(current()), 300);
  }

  // Hide about half of the letters inside the word (never the first and last), at random.
  // Spaces, hyphens and apostrophes are always shown.
  function hiddenPositions(word) {
    const letters = [...word].map((ch, i) => (isLetter(ch) ? i : -1)).filter((i) => i >= 0);
    if (letters.length <= 2) return new Set(letters.slice(-1));
    const inner = letters.slice(1, -1);
    const count = Math.max(1, Math.round(inner.length / 2));
    return new Set(shuffle(inner).slice(0, count));
  }

  function renderBlanks() {
    $("sp-stage-type").hidden = true;
    $("sp-stage-blanks").hidden = false;
    const word = current();
    const hidden = hiddenPositions(word);
    const row = $("sp-tiles");
    row.innerHTML = "";
    const chars = [...word];
    row.style.setProperty("--tiles", chars.length);
    chars.forEach((ch, i) => {
      const tile = document.createElement("span");
      tile.className = "tile";
      if (!hidden.has(i)) {
        tile.classList.add(ch === " " ? "space" : "given");
        tile.textContent = ch === " " ? "" : ch.toUpperCase();
      } else {
        const input = document.createElement("input");
        input.maxLength = 1;
        input.autocomplete = "off";
        input.setAttribute("autocapitalize", "off");
        input.spellcheck = false;
        input.dataset.answer = ch.toLowerCase();
        input.setAttribute("aria-label", `Letter ${i + 1}`);
        input.addEventListener("input", onTileInput);
        input.addEventListener("keydown", onTileKey);
        tile.appendChild(input);
      }
      row.appendChild(tile);
    });
    $("sp-blanks-next").disabled = true;
    const first = row.querySelector("input");
    if (first) first.focus();
  }

  function onTileInput(e) {
    const input = e.target;
    const val = input.value.trim().toLowerCase();
    input.classList.remove("right", "wrong");
    if (!val) return;
    if (val === input.dataset.answer) {
      input.classList.add("right");
      input.readOnly = true;
      const inputs = [...$("sp-tiles").querySelectorAll("input")];
      const next = inputs.slice(inputs.indexOf(input) + 1).find((i) => !i.readOnly);
      if (next) next.focus();
    } else {
      input.classList.add("wrong");
      input.select();
    }
    const done = [...$("sp-tiles").querySelectorAll("input")].every((i) => i.classList.contains("right"));
    $("sp-blanks-next").disabled = !done;
    if (done) $("sp-blanks-next").focus();
  }

  function onTileKey(e) {
    if (e.key !== "Backspace" || e.target.value) return;
    const open = [...$("sp-tiles").querySelectorAll("input:not([readonly])")];
    const idx = open.indexOf(e.target);
    if (idx > 0) open[idx - 1].focus();
  }

  const toTyping = () => {
    $("sp-stage-blanks").hidden = true;
    $("sp-stage-type").hidden = false;
    $("sp-answer").value = "";
    $("sp-answer").className = "";
    $("sp-answer").readOnly = false;
    $("sp-check").disabled = false;
    $("sp-feedback").textContent = "";
    $("sp-feedback").className = "sp-feedback";
    $("sp-test-next").hidden = true;
    $("sp-type-label").textContent = $("sp-whole").checked ? "Spell the word you hear" : "Now spell the whole word";
    $("sp-answer").focus();
    setTimeout(() => speak(current()), 200);
  };
  $("sp-blanks-next").addEventListener("click", toTyping);
  $("sp-blanks-skip").addEventListener("click", toTyping);
  $("sp-test-speak").addEventListener("click", () => speak(current()));

  $("sp-stage-type").addEventListener("submit", (e) => {
    e.preventDefault();
    const answer = $("sp-answer");
    const typed = answer.value.trim();
    if (!typed || answer.readOnly) return;
    answer.readOnly = true;
    $("sp-check").disabled = true;
    const word = current();
    const feedback = $("sp-feedback");
    if (typed.toLowerCase() === word.toLowerCase()) {
      score++;
      answer.className = "right";
      feedback.textContent = ["Correct! ✓", "Well done! ✓", "Spot on! ✓", "Great spelling! ✓"][Math.floor(Math.random() * 4)];
      feedback.className = "sp-feedback right";
      setTimeout(nextWord, 1100);
    } else {
      mistakes.push({ word, typed });
      answer.className = "wrong";
      feedback.innerHTML = `Not quite. It’s spelled <strong>${escapeHtml(word)}</strong>.`;
      feedback.className = "sp-feedback wrong";
      $("sp-test-next").hidden = false;
      $("sp-test-next").focus();
    }
  });
  $("sp-test-next").addEventListener("click", nextWord);

  function nextWord() {
    testIndex++;
    if (testIndex < queue.length) renderTestWord();
    else showResults();
  }

  // ---------- 4. Results ----------
  function showResults() {
    const total = queue.length;
    const pct = score / total;
    $("sp-score").textContent = `${score}/${total}`;
    $("sp-ring").style.setProperty("--pct", pct * 100 + "%");
    const stars = pct === 1 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
    $("sp-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    $("sp-result-title").textContent =
      pct === 1 ? "Perfect score! Amazing! 🎉" : pct >= 0.7 ? "Great work! Nearly there." : "Good try! Practise these and test again.";
    $("sp-mistakes").innerHTML = mistakes.length
      ? `<h3>Words to practise</h3><ul class="mistake-list">${mistakes.map((m) =>
          `<li><span class="typed">${escapeHtml(m.typed)}</span><i aria-hidden="true">→</i><strong>${escapeHtml(m.word)}</strong></li>`).join("")}</ul>`
      : "";
    $("sp-retry").hidden = mistakes.length === 0;
    show("results");
    if (pct === 1 && window.confettiBurst) window.confettiBurst();
  }

  $("sp-retry").addEventListener("click", () => {
    startTest(mistakes.map((m) => words.find((w) => w.word === m.word) || { word: m.word, meaning: "" }));
  });

  show("setup", false);
  updateCount();
  renderSaved();
  refreshIcons();
})();
