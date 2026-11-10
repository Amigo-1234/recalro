/* ==========================================================================
   FeatureTheatre: one interactive, local-only demo per feature.
   Every demo is a small component { play(), stop() }:
     - play() runs a short, one-off sequence that shows the capability,
     - the visitor can then interact with it directly,
     - stop() cancels any running sequence (when the tab changes or the
       section scrolls out of view). Nothing loops forever, nothing is saved.
   All content is sample data and is labelled as such in the UI.
   ========================================================================== */
(function () {
  "use strict";
  const M = window.RecalroMotion;
  const icon = (n) => window.R.icon(n);
  const { wait, animate, reduced } = M;
  const SPRING = "cubic-bezier(.3, 1.35, .5, 1)";

  /* A cancellable run: calling fresh() cancels whatever sequence was running. */
  function runner() {
    let token = { cancelled: true };
    return {
      fresh() { token.cancelled = true; token = { cancelled: false }; return token; },
      stop() { token.cancelled = true; },
    };
  }

  /* ---------------------------------------------------------------- AI Tutor */
  const TUTOR = [
    { q: "Why does entropy always increase?", a: "Think of entropy as the number of ways energy can be spread out. In an isolated system, spread-out arrangements vastly outnumber tidy ones, so the system drifts towards them on its own. That drift is the second law: ΔS ≥ 0.", src: "Thermo_Week4.pdf · page 12" },
    { q: "Explain Bernoulli like I'm 12", a: "Imagine a crowd squeezing through a narrow doorway. To keep everyone moving, people near the door walk faster. Fluids do the same in a narrow pipe, and because the energy goes into speed, there's less left pushing on the walls. Faster flow, lower pressure.", src: "Fluids_Lecture3.pdf · page 4" },
    { q: "Quiz me on Carnot efficiency", a: "Here's one: an engine runs between 600 K and 300 K. Using η = 1 − Tc/Th, what's its best possible efficiency? Take a moment… it's 1 − 300/600 = 50%. Want a harder one with Celsius temperatures?", src: "Your flashcards · Thermodynamics" },
  ];
  function TutorDemo(body) {
    body.innerHTML = `
      <div class="dm-chat">
        <div class="dm-log" aria-live="polite"></div>
        <div class="dm-suggest" role="group" aria-label="Ask the tutor a sample question">
          ${TUTOR.map((t, i) => `<button type="button" class="dm-chip" data-q="${i}">${t.q}</button>`).join("")}
        </div>
      </div>`;
    const log = body.querySelector(".dm-log"), r = runner();
    async function ask(i) {
      const tk = r.fresh(), t = TUTOR[i];
      body.querySelectorAll("[data-q]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.q) === i)));
      log.innerHTML = `<div class="dm-msg dm-me">${t.q}</div>`;
      animate(log.lastChild, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300 });
      if (!(await wait(350, tk))) return;
      log.insertAdjacentHTML("beforeend", `<div class="dm-msg dm-ai dm-typing" aria-label="Tutor is typing"><span class="dm-av">${icon("sparkles")}</span><span class="dm-dots"><i></i><i></i><i></i></span></div>`);
      if (!(await wait(1100, tk))) return;
      const bubble = log.lastChild;
      bubble.classList.remove("dm-typing"); bubble.removeAttribute("aria-label");
      bubble.innerHTML = `<span class="dm-av">${icon("sparkles")}</span><div><p></p><small class="dm-src">${icon("file")} ${t.src}</small></div>`;
      const p = bubble.querySelector("p"), src = bubble.querySelector(".dm-src");
      if (reduced()) { p.textContent = t.a; src.classList.add("is-in"); return; }
      // Gradual reveal: the explanation arrives word by word, like a real stream.
      for (const word of t.a.split(" ")) {
        if (tk.cancelled) return;
        const w = document.createElement("span"); w.className = "dm-word"; w.textContent = word + " ";
        p.append(w);
        await wait(38, tk);
      }
      src.classList.add("is-in");
    }
    body.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) ask(Number(b.dataset.q)); });
    return { play: () => ask(0), stop: r.stop };
  }

  /* -------------------------------------------------------------- Flashcards */
  const CARDS = [
    { q: "What does the second law say about entropy?", a: "The entropy of an isolated system never decreases (ΔS ≥ 0)." },
    { q: "Carnot efficiency formula?", a: "η = 1 − Tc / Th, with temperatures in kelvin." },
    { q: "Bernoulli's principle in one line?", a: "Faster fluid, lower pressure: P + ½ρv² + ρgh stays constant." },
    { q: "What is |3 + 4i|?", a: "5, because √(3² + 4²) = 5." },
  ];
  const NEXT = { Again: "10 min", Hard: "1 day", Good: "3 days", Easy: "6 days" };
  function FlashcardDemo(body) {
    body.innerHTML = `
      <div class="dm-fc">
        <div class="dm-fc-top"><span class="dm-fc-count" aria-live="polite"></span><span class="dm-bar"><i></i></span><span class="dm-fc-mastery">${icon("brain")}<b>0</b> mastered</span></div>
        <div class="dm-fc-stage"><button type="button" class="dm-card"><span class="dm-face dm-front"></span><span class="dm-face dm-back"></span></button><p class="dm-fc-next" aria-live="polite"></p></div>
        <div class="dm-fc-actions"></div>
      </div>`;
    const card = body.querySelector(".dm-card"), actions = body.querySelector(".dm-fc-actions"), r = runner();
    let i = 0, flipped = false, mastered = 0;
    function show() {
      const c = CARDS[i]; flipped = false; card.classList.remove("is-flipped"); card.hidden = false;
      body.querySelector(".dm-fc-count").textContent = `Card ${i + 1} of ${CARDS.length}`;
      body.querySelector(".dm-bar i").style.width = `${(i / CARDS.length) * 100}%`;
      card.querySelector(".dm-front").innerHTML = `<small>Question</small><b>${c.q}</b><em>Tap to flip</em>`;
      card.querySelector(".dm-back").innerHTML = `<small>Answer</small><b>${c.a}</b>`;
      card.setAttribute("aria-label", `Question: ${c.q}. Activate to show the answer.`);
      actions.innerHTML = `<button type="button" class="dm-btn dm-btn-primary" data-fc="flip">Show answer</button>`;
    }
    function flip() {
      if (flipped) return; flipped = true; card.classList.add("is-flipped");
      card.setAttribute("aria-label", `Answer: ${CARDS[i].a}`);
      actions.innerHTML = `<div class="dm-rates" role="group" aria-label="How well did you remember it?">${Object.keys(NEXT).map((k) => `<button type="button" class="dm-rate dm-rate-${k.toLowerCase()}" data-rate="${k}">${k}<small>${NEXT[k]}</small></button>`).join("")}</div>`;
    }
    async function rate(k) {
      const tk = r.fresh();
      if (k === "Good" || k === "Easy") { mastered++; const m = body.querySelector(".dm-fc-mastery"); m.querySelector("b").textContent = mastered; m.classList.remove("is-bump"); void m.offsetWidth; m.classList.add("is-bump"); }
      body.querySelector(".dm-fc-next").textContent = `Next review in ${NEXT[k]}`;
      actions.innerHTML = "";
      await animate(card, [{ transform: "rotateY(180deg)" }, { transform: `rotateY(180deg) translateX(${k === "Again" ? 60 : -60}%) rotate(${k === "Again" ? 8 : -8}deg)`, opacity: 0 }], { duration: 380, easing: "ease-in" }).finished;
      if (tk.cancelled) return;
      i++;
      if (i >= CARDS.length) {
        card.hidden = true; body.querySelector(".dm-bar i").style.width = "100%";
        body.querySelector(".dm-fc-count").textContent = "Deck complete";
        actions.innerHTML = `<div class="dm-done"><b>${CARDS.length} cards reviewed · ${mastered} mastered</b><span>Recalro scheduled each one for the day you're about to forget it.</span><button type="button" class="dm-btn" data-fc="restart">Review again</button></div>`;
        return;
      }
      show();
      animate(card, [{ opacity: 0, transform: "scale(.92) translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 360, easing: SPRING });
    }
    card.addEventListener("click", () => (flipped ? card.classList.toggle("is-flipped") : flip()));
    actions.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.fc === "flip") flip();
      else if (b.dataset.rate) rate(b.dataset.rate);
      else if (b.dataset.fc === "restart") { i = 0; mastered = 0; body.querySelector(".dm-fc-mastery b").textContent = "0"; body.querySelector(".dm-fc-next").textContent = ""; show(); card.focus(); }
    });
    return {
      async play() { const tk = r.fresh(); i = 0; mastered = 0; body.querySelector(".dm-fc-mastery b").textContent = "0"; body.querySelector(".dm-fc-next").textContent = ""; show(); if (await wait(1200, tk)) flip(); },
      stop: r.stop,
    };
  }

  /* --------------------------------------------------------- Knowledge Vault */
  const VAULT = [
    { t: "PV = nRT", c: 0 }, { t: "Second law: ΔS ≥ 0", c: 1 }, { t: "Entropy: energy dispersal", c: 2 },
    { t: "η = 1 − Tc/Th", c: 0 }, { t: "Newton II: F = ma", c: 1 }, { t: "Viscosity: resistance to flow", c: 2 },
    { t: "P + ½ρv² + ρgh = const", c: 0 }, { t: "Conservation of mass", c: 1 }, { t: "Enthalpy: H = U + PV", c: 2 },
  ];
  const ROT = [-7, 5, -3, 8, -5, 3, -8, 6, -2];
  function VaultDemo(body) {
    body.innerHTML = `
      <div class="dm-vault">
        <div class="dm-pile"></div>
        <div class="dm-cols">
          ${["Formulas", "Laws", "Definitions"].map((h, n) => `<div class="dm-col dm-col-${n}"><h4>${icon(["sigma", "scale", "book"][n])}${h}<span>0</span></h4><div class="dm-col-list"></div></div>`).join("")}
        </div>
        <div class="dm-vault-foot"><span class="dm-vault-status" aria-live="polite">9 notes, unsorted</span><button type="button" class="dm-btn dm-btn-primary" data-vault>Organise my vault</button></div>
      </div>`;
    const pile = body.querySelector(".dm-pile"), lists = [...body.querySelectorAll(".dm-col-list")], btn = body.querySelector("[data-vault]");
    const items = VAULT.map((v, n) => { const el = document.createElement("span"); el.className = `dm-note dm-note-${v.c}`; el.textContent = v.t; el.style.setProperty("--r", `${ROT[n]}deg`); pile.append(el); return el; });
    let sorted = false; const r = runner();
    function set(toSorted) {
      const first = new Map(items.map((el) => [el, el.getBoundingClientRect()]));
      sorted = toSorted;
      body.querySelector(".dm-vault").classList.toggle("is-sorted", sorted);
      items.forEach((el, n) => (sorted ? lists[VAULT[n].c] : pile).append(el));
      lists.forEach((l, n) => (l.parentElement.querySelector("h4 span").textContent = sorted ? VAULT.filter((v) => v.c === n).length : 0));
      items.forEach((el, n) => {
        const a = first.get(el), b = el.getBoundingClientRect();
        const from = `translate(${a.left - b.left}px, ${a.top - b.top}px) rotate(${sorted ? ROT[n] : 0}deg)`;
        animate(el, [{ transform: from }, { transform: sorted ? "none" : `rotate(${ROT[n]}deg)` }], { duration: 700, delay: n * 45, easing: SPRING });
      });
      btn.textContent = sorted ? "Mix them up again" : "Organise my vault";
      body.querySelector(".dm-vault-status").textContent = sorted ? "Sorted into 3 categories, ready to revise" : "9 notes, unsorted";
    }
    btn.addEventListener("click", () => { r.stop(); set(!sorted); });
    return { async play() { const tk = r.fresh(); if (sorted) set(false); if (await wait(900, tk)) set(true); }, stop: r.stop };
  }

  /* --------------------------------------------------------- Forgetting Curve */
  const W = 600, H = 260, X0 = 44, X1 = 584, Y0 = 22, Y1 = 214, DAYS = 30;
  const px = (d) => X0 + (d / DAYS) * (X1 - X0), py = (r) => Y1 - r * (Y1 - Y0);
  const decay = (from, to, S) => { const pts = []; for (let t = from; t <= to + 1e-9; t += 0.25) pts.push([px(t), py(Math.exp(-(t - from) / S))]); return pts; };
  const pathOf = (pts) => pts.map((p, n) => `${n ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const REVIEWS = [{ d: 0, S: 2 }, { d: 1, S: 5 }, { d: 3, S: 11 }, { d: 7, S: 24 }, { d: 15, S: 52 }];
  const WITH_END = Math.round(Math.exp(-(30 - 15) / 52) * 100), WITHOUT_END = Math.max(1, Math.round(Math.exp(-30 / 6) * 100));
  function CurveDemo(body) {
    const segs = REVIEWS.map((rv, n) => decay(rv.d, n < REVIEWS.length - 1 ? REVIEWS[n + 1].d : DAYS, rv.S));
    body.innerHTML = `
      <div class="dm-curve">
        <div class="dm-seg" role="group" aria-label="Compare memory">
          <button type="button" data-mode="without" aria-pressed="true">Without reviews</button>
          <button type="button" data-mode="with" aria-pressed="false">With spaced reviews</button>
        </div>
        <svg viewBox="0 0 ${W} ${H}" class="dm-curve-svg" role="img" aria-label="Retention over 30 days. Without reviews it falls to about ${WITHOUT_END}%. With reviews on days 1, 3, 7 and 15 it stays near ${WITH_END}%.">
          ${[0, 0.25, 0.5, 0.75, 1].map((v) => `<line class="dm-grid" x1="${X0}" x2="${X1}" y1="${py(v)}" y2="${py(v)}"/><text class="dm-axis" x="${X0 - 8}" y="${py(v) + 4}" text-anchor="end">${v * 100}%</text>`).join("")}
          ${[0, 7, 14, 21, 28].map((d) => `<text class="dm-axis" x="${px(d)}" y="${H - 18}" text-anchor="middle">Day ${d}</text>`).join("")}
          <path class="dm-c-without" d="${pathOf(decay(0, DAYS, 6))}"/>
          <g class="dm-c-with">${segs.map((s, n) => `<path d="${pathOf(s)}${n < segs.length - 1 ? ` L${px(REVIEWS[n + 1].d).toFixed(1)} ${py(1)}` : ""}" data-seg="${n}"/>`).join("")}</g>
          <g class="dm-c-points">${REVIEWS.slice(1).map((rv, n) => `<g class="dm-pt" data-pt="${n}" transform="translate(${px(rv.d)} ${py(1)})"><circle r="7"/><text y="-14" text-anchor="middle">Review ${n + 1}</text></g>`).join("")}</g>
        </svg>
        <div class="dm-curve-read">
          <span class="dm-read dm-read-without"><small>Day 30 without reviews</small><b data-read="without">${WITHOUT_END}%</b></span>
          <span class="dm-read dm-read-with"><small>Day 30 with Recalro</small><b data-read="with">–</b></span>
          <span class="dm-curve-note">Illustrative memory model, not a measurement.</span>
        </div>
      </div>`;
    const svg = body.querySelector("svg"), without = svg.querySelector(".dm-c-without"), withPaths = [...svg.querySelectorAll("[data-seg]")], pts = [...svg.querySelectorAll(".dm-pt")];
    const r = runner();
    const draw = (path, dur) => { const len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = reduced() ? 0 : len; path.getBoundingClientRect(); path.style.transition = reduced() ? "none" : `stroke-dashoffset ${dur}ms cubic-bezier(.4,0,.2,1)`; path.style.strokeDashoffset = 0; };
    const hide = (path) => { const len = path.getTotalLength(); path.style.transition = "none"; path.style.strokeDasharray = len; path.style.strokeDashoffset = len; };
    function pressed(mode) { body.querySelectorAll(".dm-seg [data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode))); body.querySelector(".dm-curve").dataset.view = mode; }
    async function showWithout(tk) {
      pressed("without"); withPaths.forEach(hide); pts.forEach((p) => p.classList.remove("is-in"));
      body.querySelector('[data-read="with"]').textContent = "–";
      draw(without, 1300); return wait(1300, tk);
    }
    async function showWith(tk) {
      pressed("with"); withPaths.forEach(hide); pts.forEach((p) => p.classList.remove("is-in"));
      without.style.transition = "none"; without.style.strokeDashoffset = 0;
      for (let n = 0; n < withPaths.length; n++) {
        draw(withPaths[n], 520);
        if (!(await wait(520, tk))) return;
        if (pts[n]) pts[n].classList.add("is-in");
      }
      M.AnimatedCounter(body.querySelector('[data-read="with"]'), { to: WITH_END, suffix: "%", dur: 700 });
    }
    body.addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (!b) return; const tk = r.fresh(); b.dataset.mode === "with" ? showWith(tk) : showWithout(tk); });
    return { async play() { const tk = r.fresh(); hide(without); if (!(await showWithout(tk))) return; if (await wait(700, tk)) showWith(tk); }, stop: r.stop };
  }

  /* ----------------------------------------------------------- Exam Simulator */
  const EXAM = [
    { q: "A Carnot engine runs between 600 K and 300 K. What is its maximum efficiency?", o: ["25%", "50%", "67%", "100%"], a: 1, topic: "Thermodynamics", why: "η = 1 − 300/600 = 0.5" },
    { q: "Water flows steadily into a narrower section of pipe. What happens to its speed?", o: ["It decreases", "It stays the same", "It increases", "It drops to zero"], a: 2, topic: "Fluid mechanics", why: "Continuity: A₁v₁ = A₂v₂, so smaller area means higher speed." },
    { q: "What is the modulus of 3 + 4i?", o: ["5", "7", "12", "25"], a: 0, topic: "Mathematics", why: "|z| = √(3² + 4²) = 5" },
  ];
  const PER_Q = 40;
  function ExamDemo(body) {
    body.innerHTML = `<div class="dm-exam"></div>`;
    const root = body.firstElementChild, r = runner();
    let i = 0, answers = [], timer = 0, left = PER_Q;
    const stopTimer = () => { clearInterval(timer); timer = 0; };
    function render() {
      const q = EXAM[i];
      root.innerHTML = `
        <div class="dm-exam-top">
          <span class="dm-exam-count" aria-live="polite">Question ${i + 1} of ${EXAM.length}</span>
          <span class="dm-exam-dots" aria-hidden="true">${EXAM.map((_, n) => `<i class="${n < i ? (answers[n] ? "ok" : "no") : n === i ? "cur" : ""}"></i>`).join("")}</span>
          <span class="dm-exam-time">${icon("clock")}<b>${left}s</b></span>
        </div>
        <div class="dm-timebar"><i style="width:${(left / PER_Q) * 100}%"></i></div>
        <p class="dm-exam-topic">${q.topic}</p>
        <h4 class="dm-exam-q">${q.q}</h4>
        <div class="dm-opts">${q.o.map((o, n) => `<button type="button" class="dm-opt" data-opt="${n}"><span>${"ABCD"[n]}</span>${o}</button>`).join("")}</div>
        <div class="dm-exam-foot" aria-live="polite"></div>`;
      animate(root.querySelector(".dm-exam-q"), [{ opacity: 0, transform: "translateX(14px)" }, { opacity: 1, transform: "none" }], { duration: 320 });
    }
    function startTimer(fromStart = true) {
      stopTimer(); if (fromStart) left = PER_Q;
      if (reduced()) return;
      timer = setInterval(() => {
        left--;
        const t = root.querySelector(".dm-exam-time b"), bar = root.querySelector(".dm-timebar i");
        if (t) t.textContent = `${left}s`;
        if (bar) bar.style.width = `${(left / PER_Q) * 100}%`;
        root.querySelector(".dm-timebar")?.classList.toggle("is-low", left <= 10);
        if (left <= 0) answer(-1);
      }, 1000);
    }
    function answer(n) {
      if (root.querySelector(".dm-opt[disabled]")) return;
      stopTimer();
      const q = EXAM[i], ok = n === q.a; answers[i] = ok;
      root.querySelectorAll(".dm-opt").forEach((b, k) => { b.disabled = true; if (k === q.a) b.classList.add("is-right"); else if (k === n) b.classList.add("is-wrong"); });
      root.querySelector(".dm-exam-dots").children[i].className = ok ? "ok" : "no";
      root.querySelector(".dm-exam-foot").innerHTML = `<p class="dm-why ${ok ? "ok" : "no"}">${n === -1 ? "Time's up. " : ok ? "Correct. " : "Not quite. "}${q.why}</p><button type="button" class="dm-btn dm-btn-primary" data-exam="next">${i < EXAM.length - 1 ? "Next question" : "See results"}</button>`;
    }
    function results() {
      stopTimer();
      const score = answers.filter(Boolean).length, pct = Math.round((score / EXAM.length) * 100);
      root.innerHTML = `
        <div class="dm-result">
          <span class="dm-ring" style="--p:0"><b>${pct}%</b><small>${score} of ${EXAM.length}</small></span>
          <div class="dm-result-body">
            <h4>${pct >= 70 ? "You're on track" : "A few gaps to close"}</h4>
            <p>${pct >= 70 ? "Above the 70% practice target." : "Below the 70% practice target, so Recalro adds these topics to tomorrow's review."}</p>
            <ul>${EXAM.map((q, n) => `<li class="${answers[n] ? "ok" : "no"}">${icon(answers[n] ? "check" : "x")}${q.topic}</li>`).join("")}</ul>
            <button type="button" class="dm-btn" data-exam="restart">Try again</button>
          </div>
        </div>`;
      requestAnimationFrame(() => requestAnimationFrame(() => root.querySelector(".dm-ring")?.style.setProperty("--p", pct)));
    }
    function start() { r.fresh(); i = 0; answers = []; left = PER_Q; render(); startTimer(); }
    root.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-opt]"); if (opt) { answer(Number(opt.dataset.opt)); return; }
      const b = e.target.closest("[data-exam]"); if (!b) return;
      if (b.dataset.exam === "next") { i++; if (i < EXAM.length) { render(); startTimer(); root.querySelector(".dm-opt")?.focus(); } else results(); }
      if (b.dataset.exam === "restart") start();
    });
    return {
      play: start,
      stop() { r.stop(); stopTimer(); },
      // Off-screen the clock pauses; it picks up where it left off on return.
      resume() { if (root.querySelector(".dm-opt:not([disabled])")) startTimer(false); },
    };
  }

  /* ------------------------------------------------------------- Study Groups */
  const GOAL = 300;
  const MEMBERS = [{ n: "Ada", c: 92, col: 1 }, { n: "Tunde", c: 74, col: 2 }, { n: "Mei", c: 61, col: 3 }, { n: "You", c: 48, col: 0, you: true }];
  function GroupsDemo(body) {
    body.innerHTML = `
      <div class="dm-group">
        <div class="dm-group-head">
          <span class="dm-group-ic">${icon("flag")}</span>
          <div><small>Weekly challenge · Sample group</small><h4>Review ${GOAL} cards together</h4></div>
          <b class="dm-group-total"><span>0</span> / ${GOAL}</b>
        </div>
        <div class="dm-bar dm-bar-lg"><i></i></div>
        <ul class="dm-members">${MEMBERS.map((m, n) => `<li class="${m.you ? "is-you" : ""}" style="--i:${n}"><span class="dm-av dm-av-${m.col}">${m.n[0]}</span><b>${m.n}</b><span class="dm-bar"><i></i></span><em>0</em></li>`).join("")}</ul>
        <div class="dm-feed" aria-live="polite"></div>
        <button type="button" class="dm-btn dm-btn-primary" data-group>Log a 15-card session</button>
      </div>`;
    const r = runner(), counts = MEMBERS.map((m) => m.c);
    const total = () => counts.reduce((a, b) => a + b, 0);
    const rows = [...body.querySelectorAll(".dm-members li")], btn = body.querySelector("[data-group]");
    function paint(animateNums) {
      const max = Math.max(...counts, 1);
      rows.forEach((row, n) => { row.querySelector(".dm-bar i").style.width = `${(counts[n] / 130) * 100}%`; const em = row.querySelector("em"); if (animateNums) M.AnimatedCounter(em, { to: counts[n], from: Number(em.textContent) || 0, dur: 800 }); else em.textContent = counts[n]; });
      body.querySelector(".dm-bar-lg i").style.width = `${Math.min(100, (total() / GOAL) * 100)}%`;
      const t = body.querySelector(".dm-group-total span");
      M.AnimatedCounter(t, { to: total(), from: Number(t.textContent) || 0, dur: 800 });
      void max;
    }
    const feed = (html) => { const f = body.querySelector(".dm-feed"); f.innerHTML = `<p>${html}</p>`; animate(f.firstChild, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 300 }); };
    function reset() { MEMBERS.forEach((m, n) => (counts[n] = m.c)); body.querySelector(".dm-group").classList.remove("is-done"); btn.disabled = false; btn.textContent = "Log a 15-card session"; rows.forEach((row) => { row.querySelector(".dm-bar i").style.width = "0"; row.querySelector("em").textContent = "0"; }); body.querySelector(".dm-bar-lg i").style.width = "0"; body.querySelector(".dm-group-total span").textContent = "0"; body.querySelector(".dm-feed").innerHTML = ""; }
    btn.addEventListener("click", () => {
      if (body.querySelector(".dm-group").classList.contains("is-done")) { reset(); requestAnimationFrame(() => paint(true)); return; }
      counts[3] += 15; paint(true);
      const row = rows[3]; row.classList.remove("is-bump"); void row.offsetWidth; row.classList.add("is-bump");
      if (total() >= GOAL) {
        body.querySelector(".dm-group").classList.add("is-done");
        feed(`<b>Challenge complete!</b> Everyone in the group earns the Team Spirit badge.`);
        btn.textContent = "Start a new week";
        window.R?.burst?.(body.querySelector(".dm-group-total"), { count: 22, spread: 110 });
      } else feed(`<b>You</b> reviewed 15 cards · ${GOAL - total()} to go for the group`);
    });
    return {
      async play() {
        const tk = r.fresh(); reset();
        if (!(await wait(200, tk))) return;
        paint(true);
        if (!(await wait(1400, tk))) return;
        feed(`<b>Mei</b> just finished a 12-card session on Fluids`);
        if (!(await wait(2200, tk))) return;
        feed(`<b>Ada</b> is on a 9-day streak. Your turn: log a session to push the group past ${GOAL}.`);
      },
      stop: r.stop,
    };
  }

  /* ------------------------------------------------------------ Gamification */
  const BADGES = [{ id: "first", t: "First deck", d: "Finish a deck", ic: "cards" }, { id: "week", t: "Week warrior", d: "7-day streak", ic: "flame" }, { id: "lvl", t: "Level 4", d: "Reach level 4", ic: "star" }];
  function RewardsDemo(body) {
    body.innerHTML = `
      <div class="dm-rw">
        <div class="dm-rw-card dm-rw-xp">
          <small>Total XP</small>
          <b class="dm-rw-num"><span>0</span> XP</b>
          <div class="dm-rw-level"><span class="dm-rw-lv">Level <b>3</b></span><span class="dm-bar dm-bar-orange"><i></i></span><span class="dm-rw-to">540 / 600</span></div>
        </div>
        <div class="dm-rw-card dm-rw-streak">
          <span class="dm-flame">${icon("flame")}</span>
          <div><b><span class="dm-rw-days">6</span>-day streak</b><small>Study today to keep it going</small></div>
          <ol class="dm-week" aria-label="This week">${"MTWTFSS".split("").map((d, n) => `<li style="--i:${n}"><i></i><span>${d}</span></li>`).join("")}</ol>
        </div>
        <ul class="dm-badges">${BADGES.map((b) => `<li data-badge="${b.id}"><span class="dm-badge-ic">${icon(b.ic)}</span><b>${b.t}</b><small>${b.d}</small></li>`).join("")}</ul>
        <div class="dm-rw-foot"><p class="dm-rw-msg" aria-live="polite"></p><button type="button" class="dm-btn dm-btn-primary" data-rw>Finish today's session · +60 XP</button></div>
      </div>`;
    const r = runner(), num = body.querySelector(".dm-rw-num span"), bar = body.querySelector(".dm-rw-level i"), btn = body.querySelector("[data-rw]"), msg = body.querySelector(".dm-rw-msg");
    let done = false;
    const badge = (id, on) => body.querySelector(`[data-badge="${id}"]`).classList.toggle("is-on", on);
    const pop = (el) => animate(el, [{ transform: "scale(.6)", opacity: 0.4 }, { transform: "scale(1.15)", opacity: 1, offset: 0.6 }, { transform: "scale(1)" }], { duration: 560, easing: SPRING });
    function setup(xp) {
      done = false; num.textContent = "0"; bar.style.width = "0";
      body.querySelector(".dm-rw-lv b").textContent = "3"; body.querySelector(".dm-rw-to").textContent = "540 / 600";
      body.querySelector(".dm-rw-days").textContent = "6"; msg.textContent = "";
      body.querySelectorAll(".dm-week li").forEach((li, n) => li.classList.toggle("is-on", n < 6));
      body.querySelector(".dm-rw-streak").classList.remove("is-hot");
      badge("first", true); badge("week", false); badge("lvl", false);
      btn.textContent = "Finish today's session · +60 XP";
      requestAnimationFrame(() => { M.AnimatedCounter(num, { to: xp, dur: 900 }); bar.style.width = "90%"; });
    }
    async function finish() {
      const tk = r.fresh(); btn.disabled = true;
      M.AnimatedCounter(num, { from: 540, to: 600, dur: 700 }); bar.style.width = "100%";
      body.querySelector(".dm-rw-to").textContent = "600 / 600";
      window.R?.floatReward?.("+60 XP", btn);
      if (!(await wait(800, tk))) return;
      body.querySelector(".dm-rw-lv b").textContent = "4"; pop(body.querySelector(".dm-rw-lv"));
      bar.style.transition = "none"; bar.style.width = "0"; void bar.offsetWidth; bar.style.transition = ""; bar.style.width = "6%";
      body.querySelector(".dm-rw-to").textContent = "600 / 1,050";
      msg.textContent = "Level up! You reached level 4.";
      badge("lvl", true); pop(body.querySelector('[data-badge="lvl"]'));
      if (!(await wait(900, tk))) return;
      const day = body.querySelectorAll(".dm-week li")[6]; day.classList.add("is-on"); pop(day);
      body.querySelector(".dm-rw-days").textContent = "7"; body.querySelector(".dm-rw-streak").classList.add("is-hot");
      msg.textContent = "7-day streak milestone! Week warrior unlocked.";
      badge("week", true); pop(body.querySelector('[data-badge="week"]'));
      window.R?.burst?.(body.querySelector('[data-badge="week"]'), { count: 24, spread: 110 });
      done = true; btn.disabled = false; btn.textContent = "Replay";
    }
    btn.addEventListener("click", () => (done ? (r.fresh(), setup(540)) : finish()));
    return { play() { r.fresh(); btn.disabled = false; setup(540); }, stop: r.stop };
  }

  /* ------------------------------------------------------------ The theatre */
  const DEMOS = [
    { id: "tutor", label: "AI Tutor", icon: "sparkles", blurb: "Explanations that build step by step.", title: "Ask about your own notes", desc: "Answers stream in gradually and point back to the page they came from.", make: TutorDemo },
    { id: "flashcards", label: "Flashcards", icon: "cards", blurb: "Flip, recall, rate. Repeat less.", title: "Recall first, then check", desc: "Flip the card, rate how well you knew it and watch it get scheduled.", make: FlashcardDemo },
    { id: "vault", label: "Knowledge Vault", icon: "archive", blurb: "Formulas and concepts, sorted.", title: "Everything worth keeping, in order", desc: "Formulas, laws and definitions from your notes, grouped so they're easy to revise.", make: VaultDemo },
    { id: "curve", label: "Forgetting Curve", icon: "brain", blurb: "Memory fades. Reviews lift it.", title: "Review just before you'd forget", desc: "Each review resets the curve and makes the next drop slower.", make: CurveDemo },
    { id: "exam", label: "Exam Simulator", icon: "clipboard", blurb: "Timed practice with real feedback.", title: "Practise under exam conditions", desc: "Timed questions, instant explanations and a result you can act on.", make: ExamDemo },
    { id: "groups", label: "Study Groups", icon: "users", blurb: "Shared goals keep you going.", title: "Progress together", desc: "Members push a shared challenge forward, one session at a time.", make: GroupsDemo },
    { id: "rewards", label: "Gamification", icon: "trophy", blurb: "XP, streaks and earned badges.", title: "Effort you can feel", desc: "XP, levels, streak milestones and achievements, all earned by studying.", make: RewardsDemo },
  ];

  function FeatureTheatre(root) {
    if (!root) return null;
    root.innerHTML = `
      <div class="mk-th-tabs" role="tablist" aria-label="Recalro features" aria-orientation="vertical">
        ${DEMOS.map((d, n) => `<button type="button" role="tab" class="mk-th-tab" id="tab-${d.id}" aria-controls="demo-${d.id}" aria-selected="${n === 0}" tabindex="${n === 0 ? 0 : -1}"><span class="mk-th-ic">${icon(d.icon)}</span><span><b>${d.label}</b><small>${d.blurb}</small></span></button>`).join("")}
      </div>
      <div class="mk-th-stage">
        ${DEMOS.map((d, n) => `
          <div class="mk-th-panel" role="tabpanel" id="demo-${d.id}" aria-labelledby="tab-${d.id}" ${n ? "hidden" : ""}>
            <header class="mk-th-head"><div><h3>${d.title}</h3><p>${d.desc}</p></div><div class="mk-th-meta"><span class="mk-th-tag">Interactive preview · sample data</span><button type="button" class="mk-th-replay" data-replay aria-label="Replay the ${d.label} demo">${icon("refresh")}<span>Replay</span></button></div></header>
            <div class="mk-th-body"></div>
          </div>`).join("")}
      </div>`;
    const tabs = [...root.querySelectorAll("[role=tab]")], panels = [...root.querySelectorAll("[role=tabpanel]")];
    const demos = DEMOS.map((d, n) => d.make(panels[n].querySelector(".mk-th-body")));
    let current = 0, visible = false;
    const played = new Set(), touched = new Set();
    panels.forEach((p, n) => ["pointerdown", "keydown", "click"].forEach((ev) => p.addEventListener(ev, () => touched.add(n))));

    function select(n, { focus = false, play = true } = {}) {
      if (n === current && played.has(n)) { if (focus) tabs[n].focus(); return; }
      demos[current].stop();
      tabs.forEach((t, k) => { t.setAttribute("aria-selected", String(k === n)); t.tabIndex = k === n ? 0 : -1; });
      panels.forEach((p, k) => (p.hidden = k !== n));
      current = n;
      if (focus) tabs[n].focus();
      animate(panels[n], [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 360 });
      tabs[n].scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: reduced() ? "auto" : "smooth" });
      if (play && visible) { played.add(n); demos[n].play(); }
    }
    root.addEventListener("click", (e) => {
      const t = e.target.closest("[role=tab]"); if (t) { select(tabs.indexOf(t)); return; }
      if (e.target.closest("[data-replay]")) { demos[current].stop(); touched.delete(current); played.add(current); demos[current].play(); }
    });
    root.querySelector(".mk-th-tabs").addEventListener("keydown", (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (e.key in keys) { e.preventDefault(); select((current + keys[e.key] + tabs.length) % tabs.length, { focus: true }); }
      else if (e.key === "Home") { e.preventDefault(); select(0, { focus: true }); }
      else if (e.key === "End") { e.preventDefault(); select(tabs.length - 1, { focus: true }); }
    });
    // Only the visible demo runs, and only while the section is on screen.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => entries.forEach((en) => {
        visible = en.isIntersecting;
        const d = demos[current];
        if (visible) {
          // Untouched demos replay their intro; ones the visitor is using keep their state.
          if (!played.has(current) || !touched.has(current)) { played.add(current); d.play(); } else d.resume?.();
        } else d.stop();
      // "Visible" = any part of the theatre crosses the middle of the viewport. Unlike a
      // ratio threshold, this doesn't flicker when switching tabs changes the panel height.
      }), { rootMargin: "-35% 0px -35% 0px" }).observe(root);
    } else { visible = true; demos[0].play(); played.add(0); }

    return { show(id) { const n = DEMOS.findIndex((d) => d.id === id); if (n >= 0) { played.delete(n); touched.delete(n); select(n); } } };
  }

  let theatre = null;
  window.RecalroMarketing = Object.assign(window.RecalroMarketing || {}, {
    FeatureTheatre(root) { theatre = FeatureTheatre(root); return theatre; },
    showDemo(id) { theatre?.show(id); },
  });
})();
