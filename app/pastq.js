/* ==========================================================================
   Past Questions (EKSU first) and the CBT workspace.
   Components:
     PastQuestionsDashboard · PerformanceOverview · ExaminationLibrary
     (CourseSearch, CourseFilters, QuestionCollectionCard) · ExaminationSetup
     CBTWorkspace (CBTQuestion, AnswerOption, ExaminationProgress,
     ExaminationTimer, FlagQuestion, QuestionNavigator/QuestionPalette,
     SubmissionConfirmation) · CorrectAnswerFeedback · IncorrectAnswerFeedback
     · ExplanationPanel · SimilarQuestionsPrompt · SimilarQuestionsSession ·
     ExaminationResults · AnswerReview
   Routes:  #/app/pastq · pastq/setup/<collection> · pastq/run · pastq/result/<attempt>
   Data: window.RecalroPastQ (demonstration bank, see pastq-data.js). Progress is
   stored locally in R.state.pastq and logged to activity as type "pastq".
   ========================================================================== */
(function () {
  "use strict";
  const R = window.R, ui = R.ui, esc = R.esc, icon = R.icon, D = window.RecalroPastQ;
  const KEYS = ["A", "B", "C", "D"];
  const phone = () => window.matchMedia("(max-width: 767px)").matches;
  R.content.minutes.pastq = 1.5; // estimated study time per answered question

  const store = () => (R.state.pastq = R.state.pastq || { attempts: [] });
  const coll = (id) => D.collections.find((c) => c.id === id);
  const qOf = (id) => D.questions.find((x) => x.id === id);
  const qsIn = (cid) => D.questions.filter((x) => x.collection === cid);
  const inst = (id) => D.institutions.find((i) => i.id === id);
  const semName = (s) => (s === 1 ? "First semester" : "Second semester");
  const verified = (c) => c.source.kind === "past" && c.source.verified;
  const sessionLabel = (c) => c.session || "Undated practice set";
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s)) % 60).padStart(2, "0")}`;
  const md = (t) => (t ? R.md(t) : "");
  const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const sourceNote = (c) => verified(c) ? `${icon("check-circle")}Verified past question · ${esc(c.session)}` : `${icon("info")}Demo practice question · not from an EKSU exam paper`;

  /* ---------- Performance (from real activity in this browser) ---------- */
  function performance() {
    const log = R.state.activity.filter((a) => a.t === "pastq");
    const correct = log.filter((a) => a.correct).length;
    const recent = log.slice(-30), recentAcc = recent.length ? (recent.filter((a) => a.correct).length / recent.length) * 100 : 0;
    const unique = new Set(log.map((a) => a.qid)).size, coverage = (unique / D.questions.length) * 100;
    return {
      log, attempted: log.length, correct, incorrect: log.length - correct,
      accuracy: log.length ? (correct / log.length) * 100 : null,
      courses: new Set(log.map((a) => a.collection)).size,
      readiness: log.length >= 20 ? Math.round(recentAcc * 0.7 + coverage * 0.3) : null, unique, coverage,
    };
  }
  const collectionStats = (cid) => {
    const log = R.state.activity.filter((a) => a.t === "pastq" && a.collection === cid);
    const attempts = store().attempts.filter((a) => a.collection === cid);
    const best = attempts.length ? Math.max(...attempts.map((a) => (a.total ? (a.score / a.total) * 100 : 0))) : null;
    return { seen: new Set(log.map((a) => a.qid)).size, attempts: attempts.length, best };
  };

  /* ======================= PastQuestionsDashboard ======================= */
  const filters = { q: "", level: "", semester: "", faculty: "", department: "", session: "" };
  R.page("pastq", {
    title: "Past Questions",
    crumb: (ctx) => ({ setup: "Set up", run: "CBT", result: "Results" }[ctx.sub[0]] || null),
    leave: (ctx) => {
      if ((ctx.page === "pastq" && ctx.sub[0] === "run") || !run || run.finished) return true;
      if (!Object.keys(run.answers).length && !Object.keys(run.checked).length) { run = null; return true; }
      return R.confirm({ title: run.mode === "exam" ? "Leave this exam?" : "Leave this practice session?", body: "Your answers in this session will be lost. Submit or finish first to keep your results.", confirmLabel: "Leave", tone: "danger", cancelLabel: "Keep going" }).then((ok) => { if (ok) run = null; return ok; });
    },
    render(view, ctx) {
      view.classList.add("view-pastq");
      const [sub, arg] = ctx.sub;
      if (sub === "setup") return ExaminationSetup(view, arg);
      if (sub === "run") return CBTWorkspace(view);
      if (sub === "result") return ExaminationResults(view, arg);
      return PastQuestionsDashboard(view);
    },
  });

  function PastQuestionsDashboard(view) {
    const p = performance(), eksu = inst("eksu");
    const last = [...store().attempts].reverse()[0];
    const cont = last ? coll(last.collection) : D.collections[0];
    view.innerHTML = `
      <section class="pq-hero">
        <div class="pq-hero-copy">
          <span class="pq-inst" title="${esc(eksu.name)}"><b>${esc(eksu.short)}</b>${esc(eksu.name)}</span>
          <h1>Past Questions</h1>
          <p>Practise smarter. Understand your mistakes. Walk into your examinations prepared.</p>
          <div class="pq-hero-actions">
            <a class="btn btn-primary btn-lg" href="#/app/pastq/setup/${cont.id}">${icon("play")}<span>${last ? `Continue ${esc(cont.code)}` : "Start practising"}</span></a>
            <a class="btn btn-glass" href="#pqLibrary" data-scroll>${icon("search")}<span>Find a course</span></a>
          </div>
        </div>
        <div class="pq-hero-ring">${ui.ring(p.readiness ?? 0, { size: 128, stroke: 11, tone: "orange", label: p.readiness == null ? "—" : `${p.readiness}%`, sub: "readiness", aria: p.readiness == null ? "Readiness appears after 20 answers" : `Readiness ${p.readiness}%` })}
          <small>${p.readiness == null ? `Answer ${Math.max(0, 20 - p.attempted)} more questions to see your readiness` : "70% recent accuracy · 30% bank coverage"}</small></div>
      </section>
      <p class="pq-notice">${icon("info")}<span><b>Demonstration question bank.</b> These are original practice questions written for this prototype and organised like EKSU 100-level courses. They are not official EKSU past questions, and Recalro is not affiliated with or endorsed by Ekiti State University. Verified past papers will appear here once the question bank is connected.</span></p>

      <section class="pq-perf" aria-label="Your performance">
        ${tile("Attempted", p.attempted, "clipboard", "questions answered")}
        ${tile("Correct", p.correct, "check-circle", "answers", "good")}
        ${tile("Incorrect", p.incorrect, "x", "to learn from", "bad")}
        ${tile("Accuracy", p.accuracy == null ? "—" : R.pct(p.accuracy), "target", p.accuracy == null ? "no answers yet" : "all time", "", p.accuracy)}
        ${tile("Courses", `${p.courses}<small>/${D.collections.length}</small>`, "book", "practised")}
      </section>
      ${store().attempts.length ? `<section class="pq-recent card"><div class="card-head"><div class="card-title"><span class="card-icon">${icon("clock")}</span><h2>Recent activity</h2></div></div>
        <ul>${[...store().attempts].reverse().slice(0, 4).map((a) => { const c = coll(a.collection), pct = a.total ? Math.round((a.score / a.total) * 100) : 0; return `<li><a href="#/app/pastq/result/${a.id}"><span class="pq-code">${esc(c.code)}</span><span><b>${a.mode === "exam" ? "Exam mode" : "Practice mode"} · ${a.score}/${a.total}</b><small>${R.relTime(a.finishedAt)}</small></span><span class="pq-mini-bar"><i style="width:${pct}%"></i></span><b class="pq-pct">${pct}%</b>${icon("chevron-right")}</a></li>`; }).join("")}</ul></section>` : ""}

      <section class="pq-library" id="pqLibrary" aria-labelledby="pqLibTitle">
        <div class="pq-lib-head"><h2 id="pqLibTitle">Examination library</h2><span class="pq-count" aria-live="polite"></span></div>
        <div class="pq-search-row">
          <label class="pq-search">${icon("search")}<span class="sr-only">Search by course code or title</span><input type="search" placeholder="Course code or title, e.g. MTH 101" value="${esc(filters.q)}" data-pq-search autocomplete="off"></label>
          <button type="button" class="btn btn-soft pq-filter-btn" data-filters aria-haspopup="dialog">${icon("filter")}<span>Filters</span><i class="pq-fcount" hidden></i></button>
        </div>
        <div class="pq-active" aria-label="Active filters"></div>
        <div class="pq-grid"></div>
      </section>`;
    drawLibrary(view);
    view.addEventListener("input", (e) => { if (e.target.matches("[data-pq-search]")) { filters.q = e.target.value; drawLibrary(view); } });
    view.addEventListener("click", (e) => {
      if (e.target.closest("[data-filters]")) openFilters(view);
      const rm = e.target.closest("[data-unfilter]"); if (rm) { filters[rm.dataset.unfilter] = ""; drawLibrary(view); }
      if (e.target.closest("[data-clear-filters]")) { Object.keys(filters).forEach((k) => (filters[k] = "")); R.$("[data-pq-search]", view).value = ""; drawLibrary(view); }
      const sc = e.target.closest("[data-scroll]"); if (sc) { e.preventDefault(); R.$("#pqLibrary", view).scrollIntoView({ behavior: R.reducedMotion() ? "auto" : "smooth" }); R.$("[data-pq-search]", view).focus({ preventScroll: true }); }
    });
    R.$$(".pq-perf .pq-tile b[data-count]", view).forEach((b) => R.countUp(b, Number(b.dataset.count), { from: 0, dur: 700 }));
  }
  function tile(label, value, ic, sub, tone = "", pct = null) {
    const numeric = typeof value === "number";
    return `<div class="pq-tile ${tone}"><span class="pq-tile-ic">${icon(ic)}</span><span class="pq-tile-label">${label}</span><b ${numeric ? `data-count="${value}"` : ""}>${numeric ? 0 : value}</b><small>${sub}</small>${pct != null ? `<span class="pq-tile-bar"><i style="width:${pct}%"></i></span>` : ""}</div>`;
  }

  /* ---------- ExaminationLibrary ---------- */
  const FACETS = [
    { key: "level", label: "Level", values: () => [...new Set(D.collections.map((c) => String(c.level)))], show: (v) => `${v} Level` },
    { key: "semester", label: "Semester", values: () => [...new Set(D.collections.map((c) => String(c.semester)))], show: (v) => semName(Number(v)) },
    { key: "faculty", label: "Faculty", values: () => [...new Set(D.collections.map((c) => c.faculty))], show: (v) => v },
    { key: "department", label: "Department", values: () => [...new Set(D.collections.map((c) => c.department))], show: (v) => v },
    { key: "session", label: "Exam session / year", values: () => [...new Set(D.collections.map((c) => sessionLabel(c)))], show: (v) => v },
  ];
  const facetValue = (c, key) => (key === "session" ? sessionLabel(c) : String(c[key]));
  function matching() {
    const q = filters.q.trim().toLowerCase().replace(/\s+/g, " ");
    return D.collections.filter((c) => {
      if (q && !`${c.code} ${c.code.replace(/\s/g, "")} ${c.title} ${c.department}`.toLowerCase().includes(q)) return false;
      return FACETS.every((f) => !filters[f.key] || facetValue(c, f.key) === filters[f.key]);
    });
  }
  function drawLibrary(view) {
    const list = matching(), active = FACETS.filter((f) => filters[f.key]);
    R.$(".pq-count", view).textContent = `${list.length} of ${D.collections.length} courses`;
    const badge = R.$(".pq-fcount", view); badge.hidden = !active.length; badge.textContent = active.length;
    R.$(".pq-active", view).innerHTML = active.length ? `${active.map((f) => `<button type="button" class="pq-chip" data-unfilter="${f.key}" aria-label="Remove filter ${esc(f.show(filters[f.key]))}">${esc(f.show(filters[f.key]))}${icon("x")}</button>`).join("")}<button type="button" class="link-btn" data-clear-filters>Clear all</button>` : "";
    R.$(".pq-grid", view).innerHTML = list.length ? list.map(QuestionCollectionCard).join("")
      : ui.empty({ icon: "search", title: "No courses match", body: "Try another course code, or clear your filters.", action: ui.btn("Clear filters", { tone: "soft", attrs: "data-clear-filters" }) });
  }
  function QuestionCollectionCard(c) {
    const qs = qsIn(c.id), s = collectionStats(c.id);
    const mix = ["easy", "medium", "hard"].map((d) => [d, qs.filter((x) => x.difficulty === d).length]).filter(([, n]) => n).map(([d, n]) => `${n} ${d}`).join(" · ");
    const seenPct = (s.seen / qs.length) * 100;
    return `<article class="pq-card">
      <div class="pq-card-top"><span class="pq-code">${esc(c.code)}</span><span class="pq-src ${verified(c) ? "is-verified" : ""}">${verified(c) ? `${icon("check-circle")}Past paper` : "Demo practice set"}</span></div>
      <h3>${esc(c.title)}</h3>
      <p class="pq-meta">${esc(c.department)} · ${c.level} Level · ${semName(c.semester)}</p>
      <ul class="pq-facts"><li>${icon("clipboard")}${qs.length} questions</li><li>${icon("calendar")}${esc(sessionLabel(c))}</li><li>${icon("gauge")}${mix}</li></ul>
      <div class="pq-status"><span class="pq-mini-bar"><i style="width:${seenPct}%"></i></span><small>${s.attempts ? `${s.seen}/${qs.length} seen · best ${Math.round(s.best)}%` : "Not started"}</small></div>
      <a class="btn btn-primary btn-block" href="#/app/pastq/setup/${c.id}">${icon("play")}<span>${s.attempts ? "Practise again" : "Start practice"}</span></a>
    </article>`;
  }
  /* CourseFilters: a bottom sheet on phones, a side panel on desktop. */
  function openFilters(view) {
    const draft = { ...filters };
    const body = `<form class="pq-filters" data-pq-filters>${FACETS.map((f) => `<fieldset><legend>${f.label}</legend><div class="pq-fopts">
        ${[["", "Any"], ...f.values().map((v) => [v, f.show(v)])].map(([v, l]) => `<label class="pq-fopt"><input type="radio" name="${f.key}" value="${esc(v)}" ${draft[f.key] === v ? "checked" : ""}><span>${esc(l)}</span></label>`).join("")}
      </div></fieldset>`).join("")}
      <div class="pq-fbar"><button type="button" class="btn btn-ghost" data-freset>Reset</button><button type="submit" class="btn btn-primary">Show <b data-fn></b> courses</button></div></form>`;
    R.sheet({ title: "Filter courses", body, cls: "pq-filter-sheet", onOpen(d, close) {
      const form = d.querySelector("form");
      const count = () => { const saved = { ...filters }; Object.assign(filters, draft); d.querySelector("[data-fn]").textContent = matching().length; Object.assign(filters, saved); };
      form.addEventListener("change", (e) => { draft[e.target.name] = e.target.value; count(); });
      d.querySelector("[data-freset]").addEventListener("click", () => { FACETS.forEach((f) => (draft[f.key] = "")); form.querySelectorAll('input[value=""]').forEach((i) => (i.checked = true)); count(); });
      form.addEventListener("submit", (e) => { e.preventDefault(); Object.assign(filters, draft); close(); drawLibrary(view); });
      count();
    }, onClose: () => R.$("[data-filters]", view)?.focus() });
  }

  /* ======================= ExaminationSetup ======================= */
  const setup = { count: 10, mode: "practice", timer: "per-q" };
  function ExaminationSetup(view, cid) {
    const c = coll(cid);
    if (!c) { view.innerHTML = ui.empty({ icon: "info", title: "Course not found", body: "This collection isn't in the question bank.", action: ui.link("Back to Past Questions", "pastq") }); return; }
    const qs = qsIn(cid), counts = [5, 10, 20, 40].filter((n) => n < qs.length).concat(qs.length);
    if (!counts.includes(setup.count)) setup.count = Math.min(10, qs.length);
    const s = collectionStats(cid);
    view.innerHTML = `
      <a class="pq-back" href="#/app/pastq">${icon("arrow-left")}Past Questions</a>
      <section class="pq-setup">
        <header class="pq-setup-head"><span class="pq-code">${esc(c.code)}</span><h1>${esc(c.title)}</h1>
          <p>${esc(inst(c.institution).short)} · ${esc(c.department)} · ${c.level} Level · ${semName(c.semester)}</p>
          <ul class="pq-facts"><li>${icon("calendar")}${esc(sessionLabel(c))}</li><li>${icon("clipboard")}${qs.length} questions available</li>${s.attempts ? `<li>${icon("award")}Best ${Math.round(s.best)}%</li>` : ""}</ul>
          <p class="pq-src-note">${sourceNote(c)}</p></header>
        <form class="pq-setup-form" data-setup>
          <fieldset class="pq-modes"><legend>Mode</legend>
            ${modeTile("practice", "Practice mode", "bulb", "Check each answer as you go, with full explanations and similar questions after a mistake.")}
            ${modeTile("exam", "Exam mode", "clock", "A realistic CBT: timed, no answers revealed until you submit. Review everything afterwards.")}
          </fieldset>
          <fieldset><legend>Number of questions</legend><div class="pq-seg">${counts.map((n) => `<label><input type="radio" name="count" value="${n}" ${n === setup.count ? "checked" : ""}><span>${n === qs.length ? `All ${n}` : n}</span></label>`).join("")}</div></fieldset>
          <fieldset class="pq-timer-set" ${setup.mode === "exam" ? "" : "hidden"}><legend>Time</legend><div class="pq-seg">
            ${[["per-q", "1 min / question"], ["fast", "45 s / question"], ["none", "Untimed"]].map(([v, l]) => `<label><input type="radio" name="timer" value="${v}" ${v === setup.timer ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
            <p class="pq-hint" data-time-hint></p></fieldset>
          <button type="submit" class="btn btn-primary btn-lg btn-block pq-start">${icon("play")}<span></span></button>
        </form>
      </section>`;
    const form = R.$("[data-setup]", view);
    const sync = () => {
      const limit = timeLimit(setup.count);
      R.$(".pq-timer-set", view).hidden = setup.mode !== "exam";
      R.$("[data-time-hint]", view).textContent = limit ? `${fmtTime(limit)} for ${setup.count} questions. The exam submits automatically when time runs out.` : "No time limit. Practise at your own pace.";
      R.$(".pq-start span", view).textContent = setup.mode === "exam" ? `Start exam · ${setup.count} questions` : `Start practice · ${setup.count} questions`;
    };
    form.addEventListener("change", (e) => { const { name, value } = e.target; setup[name] = name === "count" ? Number(value) : value; sync(); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      startRun({ collection: cid, mode: setup.mode, qids: shuffle(qs.map((x) => x.id)).slice(0, setup.count), limit: setup.mode === "exam" ? timeLimit(setup.count) : null });
    });
    sync();
  }
  const timeLimit = (n) => (setup.timer === "none" ? null : n * (setup.timer === "fast" ? 45 : 60));
  const modeTile = (v, title, ic, desc) => `<label class="pq-mode"><input type="radio" name="mode" value="${v}" ${setup.mode === v ? "checked" : ""}><span class="pq-mode-box"><span class="pq-mode-ic">${icon(ic)}</span><span><b>${title}</b><small>${desc}</small></span><span class="pq-mode-tick" aria-hidden="true">${icon("check")}</span></span></label>`;

  /* ======================= CBTWorkspace ======================= */
  let run = null;
  function startRun({ collection, mode, qids, limit, origin }) {
    run = { id: R.uid(), collection, mode, qids, answers: {}, checked: {}, flags: [], index: 0, startedAt: Date.now(), limit, similar: null, origin: origin || null, xp: 0, finished: false };
    R.go("pastq/run");
  }

  function CBTWorkspace(view) {
    if (!run || run.finished) { R.go("pastq"); return; }
    R.setFocusMode(true);
    const c = coll(run.collection), exam = run.mode === "exam";
    view.innerHTML = `
      <div class="cbt" data-mode="${run.mode}">
        <header class="cbt-top">
          <button type="button" class="icon-btn" data-exit aria-label="Exit session">${icon("x")}</button>
          <div class="cbt-title"><b>${esc(c.code)}</b><small>${exam ? "Exam mode" : "Practice mode"} · demo questions</small></div>
          ${run.limit ? `<div class="cbt-timer" role="timer" aria-label="Time remaining">${icon("clock")}<b>--:--</b></div>` : !exam ? `<span class="cbt-score" aria-label="Correct so far">${icon("check-circle")}<b>0</b></span>` : ""}
          <button type="button" class="btn btn-primary btn-sm cbt-submit" data-submit>${exam ? "Submit" : "Finish"}</button>
        </header>
        <div class="cbt-progress" role="progressbar" aria-label="Questions answered" aria-valuemin="0" aria-valuemax="100"><i></i></div>
        <div class="cbt-body">
          <main class="cbt-main"><div class="cbt-banner" hidden></div><section class="cbt-q" aria-live="polite"></section><div class="cbt-fb"></div></main>
          <aside class="cbt-side" aria-label="Question navigator"></aside>
        </div>
        <nav class="cbt-controls" aria-label="Question controls">
          <button type="button" class="cbt-ctl" data-prev>${icon("arrow-left")}<span>Previous</span></button>
          <button type="button" class="cbt-ctl cbt-pal-btn" data-palette aria-haspopup="dialog">${icon("grid")}<span class="cbt-pos"></span></button>
          <button type="button" class="cbt-ctl cbt-next" data-next><span>Next</span>${icon("arrow-right")}</button>
        </nav>
      </div>`;
    const qBox = R.$(".cbt-q", view), fb = R.$(".cbt-fb", view), side = R.$(".cbt-side", view), banner = R.$(".cbt-banner", view);
    let pending = null, timer = 0;

    /* ExaminationTimer */
    if (run.limit) {
      const tick = () => {
        const left = run.limit - (Date.now() - run.startedAt) / 1000, el = R.$(".cbt-timer", view);
        if (!el) return;
        el.querySelector("b").textContent = fmtTime(Math.max(0, left));
        el.classList.toggle("is-low", left <= 60);
        if (left <= 0) { clearInterval(timer); R.toast("Time's up. Your exam was submitted.", { icon: "clock" }); finish(); }
        else if (Math.floor(left) === 300 || Math.floor(left) === 60) R.$(".cbt-timer", view).setAttribute("aria-label", `${Math.round(left / 60)} minute${left > 61 ? "s" : ""} remaining`);
      };
      tick(); timer = setInterval(tick, 1000);
    }

    const cur = () => (run.similar ? run.similar.qids[run.similar.index] : run.qids[run.index]);
    const isChecked = (id) => (run.similar ? run.similar.checked[id] != null : run.checked[id] != null);
    const chosenOf = (id) => (run.similar ? run.similar.checked[id] : exam ? run.answers[id] : run.checked[id]);

    /* CBTQuestion + AnswerOption */
    function drawQuestion(dir = 0) {
      const id = cur(), q = qOf(id), sim = run.similar;
      const n = sim ? sim.index + 1 : run.index + 1, total = sim ? sim.qids.length : run.qids.length;
      const locked = !exam && isChecked(id), chosen = chosenOf(id) ?? (pending?.id === id ? pending.i : null);
      const flagged = run.flags.includes(id);
      banner.hidden = !sim;
      if (sim) banner.innerHTML = `<span>${icon("target")}<b>Similar questions</b> · ${esc(sim.topic)} · ${n} of ${total}</span><button type="button" class="link-btn" data-sim-exit>Back to question ${sim.returnIndex + 1}</button>`;
      qBox.innerHTML = `
        <div class="cbt-qhead">
          <span class="cbt-qnum">Question ${n}<small> of ${total}</small></span>
          <span class="cbt-tag">${esc(q.topic)}</span><span class="cbt-diff d-${q.difficulty}">${q.difficulty}</span>
          ${sim ? "" : `<button type="button" class="cbt-flag ${flagged ? "is-on" : ""}" data-flag aria-pressed="${flagged}">${icon("flag")}<span>${flagged ? "Flagged" : "Flag"}</span></button>`}
        </div>
        <h2 class="cbt-qtext" id="cbtQ">${esc(q.q)}</h2>
        <div class="cbt-opts" role="radiogroup" aria-labelledby="cbtQ">
          ${q.options.map((o, i) => {
            const state = locked ? (i === q.answer ? "is-right" : i === chosen ? "is-wrong" : "is-dim") : "";
            const mark = locked && i === q.answer ? `<span class="cbt-omark">${icon("check")}<span>Correct answer</span></span>` : locked && i === chosen ? `<span class="cbt-omark">${icon("x")}<span>Your answer</span></span>` : "";
            return `<button type="button" role="radio" class="cbt-opt ${state} ${i === chosen ? "is-chosen" : ""}" aria-checked="${i === chosen}" data-opt="${i}" ${locked ? 'aria-disabled="true"' : ""} tabindex="${(chosen ?? 0) === i ? 0 : -1}"><span class="cbt-key">${KEYS[i]}</span><span class="cbt-otext">${esc(o)}</span>${mark}</button>`;
          }).join("")}
        </div>
        ${!exam && !locked ? `<button type="button" class="btn btn-primary btn-lg cbt-check" data-check ${chosen == null ? "disabled" : ""}>${icon("check")}<span>Check answer</span></button>` : ""}
        <p class="cbt-src">${sourceNote(coll(q.collection))}</p>`;
      fb.innerHTML = locked ? feedbackHTML(q, chosen) : "";
      updateChrome();
      if (dir) R.animate(qBox, [{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: "none" }], { duration: 260 });
      R.$(".cbt-main", view).scrollTop = 0;
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: R.reducedMotion() ? "auto" : "smooth" });
    }
    function updateChrome() {
      const total = run.qids.length, done = run.qids.filter((id) => (exam ? run.answers[id] != null : run.checked[id] != null)).length;
      const bar = R.$(".cbt-progress", view); bar.querySelector("i").style.width = `${(done / total) * 100}%`; bar.setAttribute("aria-valuenow", String(Math.round((done / total) * 100)));
      const sim = run.similar;
      R.$(".cbt-pos", view).innerHTML = sim ? `${sim.index + 1}<small>/${sim.qids.length}</small>` : `${run.index + 1}<small>/${total}</small>`;
      R.$(".cbt-pal-btn", view).setAttribute("aria-label", `Question navigator. Question ${run.index + 1} of ${total}, ${done} answered`);
      R.$("[data-prev]", view).disabled = sim ? sim.index === 0 : run.index === 0;
      const last = sim ? sim.index === sim.qids.length - 1 : run.index === total - 1;
      R.$(".cbt-next span", view).textContent = last ? (sim ? "Done" : exam ? "Review" : "Finish") : "Next";
      const score = R.$(".cbt-score b", view); if (score) score.textContent = run.qids.filter((id) => run.checked[id] === qOf(id).answer).length;
      side.innerHTML = paletteHTML();
    }

    /* QuestionNavigator / QuestionPalette */
    function paletteHTML() {
      const counts = { ans: 0, flag: run.flags.length };
      const cells = run.qids.map((id, i) => {
        const q = qOf(id), a = exam ? run.answers[id] : run.checked[id];
        if (a != null) counts.ans++;
        const st = a == null ? "unanswered" : exam ? "answered" : a === q.answer ? "correct" : "incorrect";
        const flag = run.flags.includes(id);
        return `<button type="button" class="pal-cell is-${st} ${flag ? "is-flag" : ""} ${i === run.index && !run.similar ? "is-cur" : ""}" data-goto="${i}" aria-label="Question ${i + 1}, ${st}${flag ? ", flagged" : ""}${i === run.index ? ", current" : ""}" ${i === run.index ? 'aria-current="step"' : ""}>${i + 1}${flag ? `<i>${icon("flag")}</i>` : ""}${!exam && a != null ? `<em>${icon(a === q.answer ? "check" : "x")}</em>` : ""}</button>`;
      }).join("");
      return `<div class="pal-head"><b>Questions</b><span>${counts.ans}/${run.qids.length} answered</span></div>
        <div class="pal-grid">${cells}</div>
        <ul class="pal-legend"><li><i class="lg-ans"></i>${exam ? "Answered" : "Correct / incorrect"}</li><li><i class="lg-un"></i>Unanswered</li><li><i class="lg-flag">${icon("flag")}</i>Flagged (${counts.flag})</li><li><i class="lg-cur"></i>Current</li></ul>`;
    }
    function openPalette() {
      R.sheet({ title: "Question navigator", body: `${paletteHTML()}${exam ? `<button type="button" class="btn btn-primary btn-block pal-submit" data-psubmit>Submit exam</button>` : ""}`, cls: "pal-sheet", onOpen(d, close) {
        d.addEventListener("click", (e) => {
          const g = e.target.closest("[data-goto]"); if (g) { close(); goTo(Number(g.dataset.goto)); }
          if (e.target.closest("[data-psubmit]")) { close(); setTimeout(confirmSubmit, 220); }
        });
        d.querySelector(".pal-cell.is-cur")?.focus();
      }, onClose: () => R.$("[data-palette]", view)?.focus() });
    }

    /* Selection and navigation */
    function select(i) {
      const id = cur();
      if (!exam && isChecked(id)) return;
      if (exam) { run.answers[id] = i; } else pending = { id, i };
      R.$$(".cbt-opt", qBox).forEach((b, k) => { const on = k === i; b.classList.toggle("is-chosen", on); b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
      const btn = R.$$(".cbt-opt", qBox)[i];
      R.animate(btn, [{ transform: "scale(1)" }, { transform: "scale(.985)" }, { transform: "scale(1)" }], { duration: 200 });
      const chk = R.$("[data-check]", qBox); if (chk) chk.disabled = false;
      updateChrome();
    }
    function goTo(i, dir) {
      if (run.similar) return;
      if (i < 0 || i >= run.qids.length) return;
      const d = dir ?? Math.sign(i - run.index);
      run.index = i; pending = null; drawQuestion(d);
      R.$(".cbt-qtext", view)?.setAttribute("tabindex", "-1"); R.$(".cbt-qtext", view)?.focus({ preventScroll: true });
    }
    function next() {
      const sim = run.similar;
      if (sim) { if (sim.index < sim.qids.length - 1) { sim.index++; pending = null; drawQuestion(1); } else endSimilar(); return; }
      if (run.index < run.qids.length - 1) goTo(run.index + 1, 1);
      else if (exam) confirmSubmit(); else confirmFinish();
    }
    function prev() {
      const sim = run.similar;
      if (sim) { if (sim.index > 0) { sim.index--; pending = null; drawQuestion(-1); } return; }
      goTo(run.index - 1, -1);
    }

    /* Practice mode: check, feedback, similar questions */
    function check() {
      const id = cur(), q = qOf(id);
      if (!pending || pending.id !== id) return;
      const chosen = pending.i, correct = chosen === q.answer;
      if (run.similar) run.similar.checked[id] = chosen; else run.checked[id] = chosen;
      pending = null;
      const xp = correct ? R.content.xp.answerCorrect : R.content.xp.answerWrong;
      run.xp += xp;
      R.record({ t: "pastq", qid: id, collection: q.collection, topic: q.topic, correct, chosen, mode: run.similar ? "similar" : "practice", xp }, R.$(".cbt-opt.is-chosen", qBox));
      drawQuestion(0);
      const panel = R.$(".cbt-fb > section", view);
      R.animate(panel, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: "cubic-bezier(.2,.9,.3,1)" });
      if (correct) R.animate(R.$(".cbt-opt.is-right", qBox), [{ transform: "scale(1)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(.3,1.6,.5,1)" });
      else R.animate(R.$(".cbt-opt.is-wrong", qBox), [{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 320 });
      // Bring the feedback into view on small screens.
      setTimeout(() => panel?.scrollIntoView({ block: "nearest", behavior: R.reducedMotion() ? "auto" : "smooth" }), 120);
      R.$(".cbt-fb [data-focus]", view)?.focus({ preventScroll: true });
    }
    function similarPool(q) {
      const done = new Set(run.qids.slice(0, run.index + 1));
      const same = D.questions.filter((x) => x.topic === q.topic && x.id !== q.id && !done.has(x.id));
      // Same topic first; same course before other courses.
      return same.sort((a, b) => (b.collection === q.collection) - (a.collection === q.collection)).slice(0, 3);
    }
    function feedbackHTML(q, chosen) {
      const correct = chosen === q.answer;
      if (correct) return `<section class="cfb cfb-good" role="status">
          <h3>${icon("check-circle")}<span>Correct!</span>${run.similar ? "" : `<span class="cfb-xp">+${R.content.xp.answerCorrect} XP</span>`}</h3>
          <p class="cfb-lead">${KEYS[q.answer]}. ${esc(q.options[q.answer])}</p>
          <details class="cfb-why"><summary>Why this is right</summary>${ExplanationPanel(q, chosen)}</details>
          <div class="cfb-actions"><button type="button" class="btn btn-primary" data-continue data-focus>${continueLabel()}${icon("arrow-right")}</button></div></section>`;
      const pool = run.similar ? [] : similarPool(q);
      return `<section class="cfb cfb-bad" role="status">
          <h3>${icon("bulb")}<span>Not quite. Let's understand why.</span></h3>
          <dl class="cfb-cmp">
            <div class="is-yours"><dt>${icon("x")}Your answer</dt><dd><b>${KEYS[chosen]}</b> ${esc(q.options[chosen])}</dd></div>
            <div class="is-right"><dt>${icon("check")}Correct answer</dt><dd><b>${KEYS[q.answer]}</b> ${esc(q.options[q.answer])}</dd></div>
          </dl>
          ${ExplanationPanel(q, chosen, true)}
          ${run.similar ? `<div class="cfb-actions"><button type="button" class="btn btn-primary" data-continue data-focus>${continueLabel()}${icon("arrow-right")}</button></div>`
            : pool.length ? `<div class="cfb-sim"><p><b>Want to practise similar questions before moving on?</b><small>${pool.length} more on ${esc(q.topic)}. You'll come back here afterwards.</small></p>
              <div class="cfb-actions"><button type="button" class="btn btn-primary" data-similar data-focus>${icon("target")}<span>Practise similar questions</span></button><button type="button" class="btn btn-soft" data-continue>${continueLabel()}${icon("arrow-right")}</button></div></div>`
            : `<div class="cfb-sim"><p><b>No similar questions yet</b><small>There are no other questions on ${esc(q.topic)} in the bank right now.</small></p><div class="cfb-actions"><button type="button" class="btn btn-primary" data-continue data-focus>${continueLabel()}${icon("arrow-right")}</button></div></div>`}
        </section>`;
    }
    const continueLabel = () => { const sim = run.similar; if (sim) return sim.index < sim.qids.length - 1 ? "Next similar question" : "Finish similar questions"; return run.index < run.qids.length - 1 ? "Continue to next question" : "See results"; };
    function startSimilar() {
      const q = qOf(cur()), pool = similarPool(q);
      if (!pool.length) return;
      run.similar = { topic: q.topic, qids: pool.map((x) => x.id), index: 0, checked: {}, returnIndex: run.index };
      pending = null; drawQuestion(1);
    }
    function endSimilar() {
      const sim = run.similar, right = sim.qids.filter((id) => sim.checked[id] === qOf(id).answer).length;
      run.similar = null;
      qBox.innerHTML = `<div class="sim-done"><span class="sim-done-ic">${icon(right === sim.qids.length ? "award" : "target")}</span><h2>${right} of ${sim.qids.length} similar questions right</h2>
        <p>${right === sim.qids.length ? `${esc(sim.topic)} is clicking. Nice work.` : `Keep an eye on ${esc(sim.topic)}. It will come up again.`}</p>
        <button type="button" class="btn btn-primary btn-lg" data-resume data-focus>${run.index < run.qids.length - 1 ? `Continue to question ${run.index + 2}` : "See results"}${icon("arrow-right")}</button></div>`;
      fb.innerHTML = ""; banner.hidden = true; updateChrome();
      R.animate(qBox.firstElementChild, [{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 320 });
      R.$("[data-resume]", view).focus();
    }

    /* SubmissionConfirmation */
    function confirmSubmit() {
      const total = run.qids.length, answered = run.qids.filter((id) => run.answers[id] != null).length, left = run.limit ? run.limit - (Date.now() - run.startedAt) / 1000 : null;
      R.sheet({ title: "Submit your exam?", cls: "submit-sheet", body: `<ul class="sub-stats">
          <li class="is-ans"><b>${answered}</b><span>Answered</span></li>
          <li class="${total - answered ? "is-warn" : ""}"><b>${total - answered}</b><span>Unanswered</span></li>
          <li><b>${run.flags.length}</b><span>Flagged</span></li>
          ${left != null ? `<li><b>${fmtTime(left)}</b><span>Time left</span></li>` : ""}</ul>
        ${total - answered ? `<p class="sub-warn">${icon("info")}Unanswered questions are marked incorrect.</p>` : ""}
        <div class="sub-actions"><button type="button" class="btn btn-ghost" data-close>Return to exam</button><button type="button" class="btn btn-primary" data-dosubmit>Submit now</button></div>`,
        onOpen(d, close) { d.querySelector("[data-dosubmit]").addEventListener("click", () => { close(); finish(); }); } });
    }
    async function confirmFinish() {
      const left = run.qids.filter((id) => run.checked[id] == null).length;
      if (left && !(await R.confirm({ title: "Finish practice?", body: `${R.plural(left, "question")} not checked yet. Your results will include only the questions you checked.`, confirmLabel: "Finish", cancelLabel: "Keep practising" }))) return;
      finish();
    }

    /* Finish → stored attempt → results */
    function finish() {
      if (run.finished) return;
      clearInterval(timer);
      run.finished = true;
      const answers = exam ? run.answers : run.checked;
      const qids = exam ? run.qids : run.qids.filter((id) => run.checked[id] != null);
      const score = qids.filter((id) => answers[id] === qOf(id).answer).length;
      let xp = run.xp;
      if (exam) {
        const entries = run.qids.filter((id) => run.answers[id] != null).map((id) => { const q = qOf(id), correct = run.answers[id] === q.answer; return { t: "pastq", qid: id, collection: q.collection, topic: q.topic, correct, chosen: run.answers[id], mode: "exam", xp: correct ? R.content.xp.answerCorrect : R.content.xp.answerWrong }; });
        entries.push({ t: "pastq-exam", collection: run.collection, xp: R.content.xp.examFinish });
        xp = R.sum(entries, (e) => e.xp);
        R.record(entries);
      }
      const attempt = { id: run.id, collection: run.collection, mode: run.mode, qids, answers: { ...answers }, flags: [...run.flags], score, total: qids.length, xp, startedAt: new Date(run.startedAt).toISOString(), finishedAt: new Date().toISOString(), durationSec: Math.round((Date.now() - run.startedAt) / 1000), limit: run.limit };
      store().attempts.push(attempt); R.save();
      run = null;
      R.go(`pastq/result/${attempt.id}`);
    }

    /* Events */
    view.addEventListener("click", async (e) => {
      const o = e.target.closest("[data-opt]"); if (o) { select(Number(o.dataset.opt)); return; }
      if (e.target.closest("[data-check]")) check();
      if (e.target.closest("[data-continue]")) next();
      if (e.target.closest("[data-similar]")) startSimilar();
      if (e.target.closest("[data-sim-exit]")) { run.similar = null; pending = null; drawQuestion(-1); }
      if (e.target.closest("[data-resume]")) { if (run.index < run.qids.length - 1) goTo(run.index + 1, 1); else confirmFinish(); }
      if (e.target.closest("[data-next]")) next();
      if (e.target.closest("[data-prev]")) prev();
      if (e.target.closest("[data-palette]")) openPalette();
      const g = e.target.closest(".cbt-side [data-goto]"); if (g) goTo(Number(g.dataset.goto));
      if (e.target.closest("[data-flag]")) { const id = cur(); run.flags = run.flags.includes(id) ? run.flags.filter((x) => x !== id) : [...run.flags, id]; const f = R.$("[data-flag]", qBox), on = run.flags.includes(id); f.classList.toggle("is-on", on); f.setAttribute("aria-pressed", String(on)); f.querySelector("span").textContent = on ? "Flagged" : "Flag"; R.animate(f, [{ transform: "rotate(0)" }, { transform: "rotate(-12deg)" }, { transform: "rotate(0)" }], { duration: 300 }); updateChrome(); }
      if (e.target.closest("[data-submit]")) { if (exam) confirmSubmit(); else confirmFinish(); }
      if (e.target.closest("[data-exit]")) R.go("pastq");
    });
    const onKey = (e) => {
      if (!view.isConnected || document.querySelector("dialog[open]") || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
      const k = e.key.toLowerCase(), idx = ["1", "2", "3", "4"].indexOf(k) >= 0 ? Number(k) - 1 : ["a", "b", "c", "d"].indexOf(k);
      const onOpt = document.activeElement?.classList.contains("cbt-opt");
      if (idx >= 0 && !e.metaKey && !e.ctrlKey) { e.preventDefault(); select(idx); R.$$(".cbt-opt", qBox)[idx]?.focus(); }
      else if (onOpt && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); const opts = R.$$(".cbt-opt", qBox), i = opts.indexOf(document.activeElement), n = (i + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length; opts[n].focus(); if (exam || !isChecked(cur())) select(n); }
      else if (e.key === "Enter" && !e.target.closest("button:not(.cbt-opt)")) { e.preventDefault(); if (R.$("[data-check]:not([disabled])", qBox)) check(); else if (!exam && isChecked(cur())) next(); else if (exam) next(); }
      else if (e.key === "ArrowRight" && !onOpt) next();
      else if (e.key === "ArrowLeft" && !onOpt) prev();
      else if (k === "f" && !run.similar) R.$("[data-flag]", qBox)?.click();
    };
    document.addEventListener("keydown", onKey);
    drawQuestion();
    return () => { clearInterval(timer); document.removeEventListener("keydown", onKey); R.setFocusMode(false); };
  }

  /* ---------- ExplanationPanel ---------- */
  function ExplanationPanel(q, chosen, open) {
    const x = q.explanation;
    return `<div class="exp ${open ? "is-open" : ""}">
      ${open ? `<h4>${icon("book")}Explanation</h4>` : ""}
      ${md(x.concept)}
      ${x.formula || x.given ? `<dl class="exp-grid">${x.formula ? `<div><dt>Formula</dt><dd class="exp-math">${esc(x.formula)}</dd></div>` : ""}${x.given ? `<div><dt>Given</dt><dd class="exp-math">${esc(x.given)}</dd></div>` : ""}</dl>` : ""}
      ${x.steps?.length ? `<p class="exp-label">Working</p><ol class="exp-steps">${x.steps.map((s) => `<li class="exp-math">${esc(s)}</li>`).join("")}</ol>` : ""}
      ${x.result ? `<p class="exp-result">${icon("check-circle")}<span><b>Answer:</b> ${esc(x.result)}</span></p>` : ""}
      ${x.why ? md(x.why) : ""}
      ${chosen != null && chosen !== q.answer && x.wrong?.[chosen] ? `<p class="exp-wrong"><b>Why ${KEYS[chosen]} is wrong:</b> ${R.md(x.wrong[chosen]).replace(/^<p>|<\/p>$/g, "")}</p>` : ""}
      ${x.mistake ? `<p class="exp-mistake">${icon("info")}<span><b>Common mistake:</b> ${esc(x.mistake)}</span></p>` : ""}
    </div>`;
  }

  /* ======================= ExaminationResults + AnswerReview ======================= */
  function ExaminationResults(view, attemptId) {
    R.setFocusMode(false);
    const a = store().attempts.find((x) => x.id === attemptId);
    if (!a) { view.innerHTML = ui.empty({ icon: "info", title: "Result not found", body: "This attempt isn't stored in this browser.", action: ui.link("Back to Past Questions", "pastq") }); return; }
    const c = coll(a.collection), pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
    const unanswered = a.qids.filter((id) => a.answers[id] == null).length, wrong = a.total - a.score - unanswered;
    const byTopic = {}; a.qids.forEach((id) => { const q = qOf(id); const t = (byTopic[q.topic] = byTopic[q.topic] || { n: 0, ok: 0 }); t.n++; if (a.answers[id] === q.answer) t.ok++; });
    const mistakes = a.qids.filter((id) => a.answers[id] !== qOf(id).answer);
    const title = !a.total ? "No answers checked" : pct === 100 ? "Perfect score!" : pct >= 70 ? "You're exam-ready on this set" : pct >= 50 ? "Getting there" : "Lots to learn from";
    view.innerHTML = `
      <a class="pq-back" href="#/app/pastq">${icon("arrow-left")}Past Questions</a>
      <section class="pq-res ${pct >= 70 ? "is-pass" : ""}">
        <div class="pq-res-ring">${ui.ring(pct, { size: 150, stroke: 12, tone: pct >= 70 ? "teal" : "orange", label: `${pct}%`, sub: `${a.score}/${a.total}` })}</div>
        <div class="pq-res-copy"><span class="eyebrow">${esc(c.code)} · ${a.mode === "exam" ? "Exam mode" : "Practice mode"}</span><h1>${title}</h1>
          <p>${a.mode === "exam" ? `You answered ${a.total - unanswered} of ${a.total} questions in ${fmtTime(a.durationSec)}${a.limit ? ` (limit ${fmtTime(a.limit)})` : ""}.` : `You checked ${a.total} questions in ${fmtTime(a.durationSec)}.`} The 70% line is a practice target, not an official pass mark.</p>
          <ul class="pq-res-stats"><li class="good">${icon("check")}<b>${a.score}</b>correct</li><li class="bad">${icon("x")}<b>${wrong}</b>incorrect</li>${a.mode === "exam" ? `<li>${icon("info")}<b>${unanswered}</b>unanswered</li>` : ""}<li>${icon("bolt")}<b>+${a.xp}</b>XP</li></ul>
          <div class="pq-res-actions">
            ${mistakes.length ? ui.btn(`Practise my ${mistakes.length} mistake${mistakes.length > 1 ? "s" : ""}`, { icon: "target", attrs: "data-mistakes" }) : ""}
            ${ui.link("Try again", `pastq/setup/${c.id}`, { tone: "soft", icon: "refresh" })}
            ${ui.link("Back to library", "pastq", { tone: "ghost" })}
          </div></div>
      </section>
      ${Object.keys(byTopic).length ? ui.card(`<ul class="pq-topics">${Object.entries(byTopic).map(([t, v]) => `<li><span>${esc(t)}</span><span class="pq-tbar"><i style="--w:${(v.ok / v.n) * 100}%" class="${v.ok / v.n >= 0.7 ? "ok" : ""}"></i></span><b>${v.ok}/${v.n}</b></li>`).join("")}</ul>`, { title: "By topic", icon: "chart" }) : ""}
      <section class="pq-review" aria-labelledby="pqRevTitle">
        <div class="pq-review-head"><h2 id="pqRevTitle">Answer review</h2>
          <div class="segmented" role="radiogroup" aria-label="Show questions">${[["all", `All ${a.total}`], ["wrong", `Incorrect ${mistakes.length}`], ["flag", `Flagged ${a.flags.length}`]].map(([v, l], i) => `<button type="button" role="radio" aria-checked="${i === 0}" class="${i === 0 ? "is-on" : ""}" data-rfilter="${v}">${l}</button>`).join("")}</div></div>
        <ol class="pq-rlist">${a.qids.map((id, i) => AnswerReviewItem(qOf(id), a.answers[id], a.flags.includes(id), i)).join("")}</ol>
      </section>`;
    // Animated results: ring fills, topic bars grow, a little celebration for strong scores.
    R.$$(".pq-tbar i", view).forEach((el, i) => R.animate(el, [{ width: 0 }, { width: getComputedStyle(el).getPropertyValue("--w") }], { duration: 700, delay: 200 + i * 90, easing: "cubic-bezier(.3,1.2,.5,1)", fill: "backwards" }));
    if (pct >= 70 && a.total >= 5) setTimeout(() => R.burst(R.$(".pq-res-ring", view), { count: 26, spread: 130 }), 350);
    view.addEventListener("click", (e) => {
      const f = e.target.closest("[data-rfilter]");
      if (f) {
        R.$$("[data-rfilter]", view).forEach((b) => { const on = b === f; b.classList.toggle("is-on", on); b.setAttribute("aria-checked", String(on)); });
        R.$$(".pq-ritem", view).forEach((li) => (li.hidden = f.dataset.rfilter === "wrong" ? li.dataset.ok === "1" : f.dataset.rfilter === "flag" ? li.dataset.flag !== "1" : false));
      }
      if (e.target.closest("[data-mistakes]")) startRun({ collection: a.collection, mode: "practice", qids: mistakes, limit: null, origin: a.id });
    });
  }
  function AnswerReviewItem(q, chosen, flagged, i) {
    const ok = chosen === q.answer, none = chosen == null;
    return `<li class="pq-ritem ${ok ? "is-ok" : "is-bad"}" data-ok="${ok ? 1 : 0}" data-flag="${flagged ? 1 : 0}">
      <div class="pq-rq"><span class="pq-rn">${i + 1}</span><b>${esc(q.q)}</b><span class="pq-rstate">${icon(ok ? "check-circle" : "x")}${ok ? "Correct" : none ? "Unanswered" : "Incorrect"}</span></div>
      <p class="pq-ra ${ok ? "good" : "bad"}">Your answer: ${none ? "<i>Not answered</i>" : `<b>${KEYS[chosen]}</b> ${esc(q.options[chosen])}`}${flagged ? ` <span class="pq-rflag">${icon("flag")}Flagged</span>` : ""}</p>
      ${ok ? "" : `<p class="pq-ra good">Correct answer: <b>${KEYS[q.answer]}</b> ${esc(q.options[q.answer])}</p>`}
      <details class="cfb-why" ${ok ? "" : "open"}><summary>Explanation</summary>${ExplanationPanel(q, chosen)}</details></li>`;
  }

  R.pastq = { performance, collections: () => D.collections };
})();
