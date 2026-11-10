/* ==========================================================================
   Study tools: Flashcards (deck + session), Review Center, Quick Practice,
   Exam Simulator, AI Tutor (+ Explain it to me), Summaries (+ Read aloud).
   ========================================================================== */
(function () {
  "use strict";
  const R = window.R, ui = R.ui, { esc, icon } = { esc: R.esc, icon: R.icon };
  const sc = (id) => `var(--s${R.subjectIndex(id) % 4})`;
  const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
  const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);

  /* ======================= FLASHCARDS ======================= */
  function buildQueue(q) {
    let pool = R.cards(), label = "All subjects";
    if (q.module) { pool = pool.filter((c) => c.module === q.module); label = R.module(q.module)?.name || "Module"; }
    else if (q.subject) { pool = pool.filter((c) => c.subject === q.subject); label = R.subject(q.subject)?.name || "Subject"; }
    if (q.mode === "risk") { const r = pool.filter((c) => !R.isNew(c.id)).map((c) => ({ c, r: R.retention(c.id) })).filter((x) => x.r < 0.8).sort((a, b) => a.r - b.r).map((x) => x.c); return { cards: r.slice(0, 20), label: "At-risk cards", kind: "risk" }; }
    const due = pool.filter((c) => R.isDue(c.id)).sort((a, b) => R.state.cards[a.id].due.localeCompare(R.state.cards[b.id].due));
    const fresh = q.mode === "due" ? [] : pool.filter((c) => R.isNew(c.id)).slice(0, 10);
    let cards = [...due, ...fresh], kind = "scheduled";
    if (!cards.length && q.cram) { cards = shuffle(pool).slice(0, 15); kind = "cram"; }
    return { cards, label, kind, pool };
  }
  R.page("flashcards", {
    title: "Flashcards",
    crumb: (ctx) => (ctx.query.module || ctx.query.subject || ctx.query.mode ? "Session" : null),
    render(view, ctx) {
      const q = ctx.query;
      if (q.module || q.subject || q.mode || q.cram) return session(view, q);
      // Deck overview
      const subjects = R.subjects();
      const dueAll = R.dueCards().length, newAll = R.newCards().length;
      view.innerHTML = `${ui.header({ eyebrow: "Study tools", title: "Flashcards", desc: "Bring ideas back right before you'd forget them. Rate each card honestly and Recalro schedules the next review.", actions: ui.btn("Create card", { tone: "soft", icon: "plus", attrs: "data-newcard" }) })}
        <section class="session-hero">
          <div><h2>${dueAll ? `${R.plural(dueAll, "card")} due now` : newAll ? "You're caught up on reviews" : "Every card is learned"}</h2><p>${dueAll ? "Clear your due cards first. It's the most efficient way to protect what you've learned." : newAll ? `${newAll} new cards are ready when you are.` : "Nothing is due. Cram any deck for extra practice."}</p></div>
          ${dueAll || newAll ? ui.link(dueAll ? "Start review" : "Learn new cards", dueAll ? "flashcards?mode=due" : "flashcards?mode=all", { size: "lg", icon: "play" }) : ui.link("Cram all cards", "flashcards?cram=1&mode=all", { size: "lg", icon: "refresh" })}
        </section>
        <div class="deck-grid">${subjects.map((s) => {
          const cards = R.cards(s.id), due = R.dueCards(s.id).length, fresh = R.newCards(s.id).length, m = R.subjectMastery(s.id);
          return `<article class="deck" style="--sc:${sc(s.id)}"><div class="deck-stack" aria-hidden="true"><i></i><i></i><i></i></div>
            <div class="deck-top"><h3>${esc(s.name)}</h3>${ui.ring(m, { size: 46, stroke: 5, tone: "subject", label: R.pct(m), aria: `${Math.round(m)}% mastery` })}</div>
            <div class="deck-counts"><span><b>${due}</b>due</span><span><b>${fresh}</b>new</span><span><b>${cards.length}</b>total</span></div>
            <div class="deck-modules">${(s.modules || []).map((md) => { const n = R.cards().filter((c) => c.module === md.id).length; return n ? `<a href="#/app/flashcards?module=${md.id}" class="mod-chip">${esc(md.name)}<small>${R.pct(R.moduleMastery(md.id))}</small></a>` : ""; }).join("")}</div>
            <div class="deck-actions">${cards.length ? (due + fresh ? ui.link("Study deck", `flashcards?subject=${s.id}`, { size: "sm", icon: "play" }) : ui.link("Cram deck", `flashcards?subject=${s.id}&cram=1`, { tone: "soft", size: "sm", icon: "refresh" })) : ui.btn("Add cards", { tone: "soft", size: "sm", icon: "plus", attrs: `data-newcard="${s.id}"` })}</div></article>`; }).join("")}</div>
        <p class="muted small center">${icon("info")} Scheduling uses a local SM-2 model in this prototype. Connect the backend SM-2 service to sync across devices.</p>`;
      view.addEventListener("click", (e) => { const n = e.target.closest("[data-newcard]"); if (n) R.addCardDialog(n.dataset.newcard || undefined); });
    },
  });

  function session(view, q) {
    const built = buildQueue(q);
    const queue = built.cards.map((c) => c.id), requeued = new Set();
    let index = 0, flipped = false, xp = 0, startedAt = Date.now();
    const results = [];
    if (!queue.length) {
      view.innerHTML = `<div class="session-done">${ui.empty({ icon: "check-circle", title: "Nothing due here", body: `No due or new cards in ${esc(built.label)}. You can cram the deck for extra practice. Cramming doesn't change your schedule much, but it helps before exams.`, action: `${ui.link("Cram this deck", `flashcards?${new URLSearchParams({ ...q, cram: 1 })}`, { icon: "refresh" })} ${ui.link("Back to decks", "flashcards", { tone: "ghost" })}` })}</div>`;
      return;
    }
    view.innerHTML = `<div class="fc-session">
      <div class="fc-bar"><a class="icon-btn" href="#/app/flashcards" aria-label="End session">${icon("x")}</a>${ui.progress(0, { label: "Session progress" })}<span class="fc-count" aria-live="polite"></span><span class="fc-xp" data-tip="XP earned this session">${icon("bolt")}<b>0</b></span></div>
      <div class="fc-label"><span>${esc(built.label)}</span>${built.kind === "cram" ? ui.pill("Cram", "neutral") : ""}</div>
      <div class="fc-stage"><button type="button" class="flashcard" id="fc" aria-live="polite"><span class="fc-face fc-front"></span><span class="fc-face fc-back"></span></button></div>
      <div class="fc-controls" id="fcControls"></div>
      <p class="fc-hint">${ui.kbd("Space")} flip · ${ui.kbd("1")}–${ui.kbd("4")} rate</p></div>`;
    const card = R.$("#fc", view), controls = R.$("#fcControls", view), bar = R.$(".fc-bar .progress i", view), countEl = R.$(".fc-count", view), xpEl = R.$(".fc-xp b", view);
    const total = () => queue.length;
    const draw = (animateIn = true) => {
      const c = R.card(queue[index]), mod = R.module(c.module);
      card.getAnimations?.().forEach((a) => a.cancel());
      flipped = false; card.classList.remove("is-flipped");
      card.querySelector(".fc-front").innerHTML = `<small>${ui.subjectDot(c.subject)}${esc(mod?.name || R.subject(c.subject)?.name || "")} · Question</small><b>${esc(c.front)}</b><em>Tap or press Space to reveal</em>`;
      card.querySelector(".fc-back").innerHTML = `<small>Answer</small><b>${esc(c.back)}</b><em>How well did you recall it?</em>`;
      card.setAttribute("aria-label", `Question: ${c.front}. Press to reveal the answer.`);
      controls.innerHTML = `<button type="button" class="btn btn-primary btn-lg" data-flip>${icon("eye")}<span>Reveal answer</span></button>`;
      countEl.textContent = `${Math.min(index + 1, total())} / ${total()}`;
      bar.style.setProperty("--p", `${(index / total()) * 100}%`);
      if (animateIn) R.animate(card, [{ opacity: 0, transform: "translateY(18px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 320 });
    };
    const flip = () => {
      if (flipped) { flipped = false; card.classList.remove("is-flipped"); controls.innerHTML = `<button type="button" class="btn btn-primary btn-lg" data-flip>${icon("eye")}<span>Reveal answer</span></button>`; return; }
      flipped = true; card.classList.add("is-flipped");
      const id = queue[index];
      card.setAttribute("aria-label", `Answer: ${R.card(id).back}`);
      controls.innerHTML = `<div class="rate-row">${[["Again", "1", "again"], ["Hard", "2", "hard"], ["Good", "3", "good"], ["Easy", "4", "easy"]].map(([r, k, cls]) => `<button type="button" class="rate-btn rate-${cls}" data-rate="${r}"><b>${r}</b><small>${R.previewInterval(id, r)}</small><kbd>${k}</kbd></button>`).join("")}</div>`;
      R.animate(controls, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 220 });
    };
    const rate = (rating, btn) => {
      const id = queue[index];
      const res = R.rateCard(id, rating, btn);
      xp += res.xp; R.countUp(xpEl, xp, { from: xp - res.xp, dur: 400 });
      results.push({ id, rating });
      if (rating === "Again" && !requeued.has(id)) { requeued.add(id); queue.push(id); }
      const dir = rating === "Again" ? -1 : 1;
      R.animate(card, [{ transform: card.classList.contains("is-flipped") ? "rotateY(180deg)" : "none", opacity: 1 }, { transform: `translateX(${dir * 70}px) rotate(${dir * 6}deg) ${card.classList.contains("is-flipped") ? "rotateY(180deg)" : ""}`, opacity: 0 }], { duration: 220, easing: "ease-in", fill: "forwards" }).finished.then(() => {
        index++;
        if (index >= queue.length) finish(); else draw();
      });
    };
    const finish = () => {
      const counts = { Again: 0, Hard: 0, Good: 0, Easy: 0 };
      results.forEach((r) => counts[r.rating]++);
      const unique = new Set(results.map((r) => r.id)).size, good = results.filter((r) => r.rating === "Good" || r.rating === "Easy").length;
      const acc = results.length ? (good / results.length) * 100 : 0, mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      view.innerHTML = `<div class="session-complete">
        <div class="sc-badge">${icon("check")}</div>
        <h1>Session complete</h1><p>You reviewed ${R.plural(unique, "card")} in about ${R.plural(mins, "minute")}.</p>
        <div class="sc-stats"><div><b>+${R.fmt(xp)}</b><span>XP earned</span></div><div><b>${R.pct(acc)}</b><span>recalled well</span></div><div><b>${R.streak().current}</b><span>day streak</span></div></div>
        <div class="dist">${Object.entries(counts).map(([k, v]) => `<div class="dist-col" data-tip="${k}: ${v}"><i class="rate-${k.toLowerCase()}" style="--h:${results.length ? (v / results.length) * 100 : 0}%"></i><small>${k}</small><b>${v}</b></div>`).join("")}</div>
        <div class="sc-actions">${ui.link("Back to decks", "flashcards", { tone: "soft" })}${ui.link("Dashboard", "dashboard", { iconRight: "arrow-right" })}</div></div>`;
      const badge = R.$(".sc-badge", view);
      R.animate(badge, [{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: 0.6 }, { transform: "scale(1)", opacity: 1 }], { duration: 600, easing: "cubic-bezier(.3,1.4,.5,1)" });
      setTimeout(() => R.burst(badge, { count: 28, spread: 140 }), 200);
      R.$$(".dist-col i", view).forEach((el, i) => R.animate(el, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 500, delay: 200 + i * 80 }));
    };
    draw();
    card.addEventListener("click", flip);
    controls.addEventListener("click", (e) => { if (e.target.closest("[data-flip]")) flip(); const r = e.target.closest("[data-rate]"); if (r && !r.disabled) { R.$$("[data-rate]", controls).forEach((b) => (b.disabled = true)); rate(r.dataset.rate, r); } });
    const onKey = (e) => {
      if (typing() || document.querySelector("dialog[open]") || !view.isConnected || !R.$("#fc", view)) return;
      // When the card itself has focus, its native button activation handles Space/Enter.
      if ((e.key === " " || e.key === "Enter") && (document.activeElement === document.body || document.activeElement === view)) { e.preventDefault(); flip(); }
      if (flipped && ["1", "2", "3", "4"].includes(e.key)) { const b = R.$$("[data-rate]", controls)[Number(e.key) - 1]; if (b && !b.disabled) b.click(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }

  /* ======================= REVIEW CENTER ======================= */
  R.page("review", { title: "Review Center", render(view, ctx) {
    if (ctx.query.mode === "risk") { R.go("flashcards?mode=risk"); return; }
    const due = R.dueCards(), fresh = R.newCards();
    const atRisk = R.cards().filter((c) => !R.isNew(c.id) && R.retention(c.id) < 0.8);
    const favs = R.vaultItems().filter((v) => R.state.favorites.includes(v.id));
    const bySubject = R.subjects().map((s) => ({ s, due: R.dueCards(s.id).length, fresh: R.newCards(s.id).length })).filter((x) => x.due || x.fresh);
    view.innerHTML = `${ui.header({ eyebrow: "Study tools", title: "Review center", desc: "Everything waiting for you, prioritised. Due reviews come first, then fading knowledge, then new material." })}
      <div class="queue">
        <a class="queue-card q-due ${due.length ? "" : "is-empty"}" href="#/app/flashcards?mode=due"><span class="q-ic">${icon("refresh")}</span><div><b>${due.length}</b><span>Due now</span><small>Scheduled by spaced repetition</small></div>${due.length ? icon("arrow-right", "q-go") : ui.pill("Clear", "teal", "check")}</a>
        <a class="queue-card q-risk ${atRisk.length ? "" : "is-empty"}" href="#/app/flashcards?mode=risk"><span class="q-ic">${icon("brain")}</span><div><b>${atRisk.length}</b><span>Fading</span><small>Below 80% estimated recall</small></div>${atRisk.length ? icon("arrow-right", "q-go") : ui.pill("None", "neutral")}</a>
        <a class="queue-card q-new ${fresh.length ? "" : "is-empty"}" href="#/app/flashcards?mode=all"><span class="q-ic">${icon("sparkles")}</span><div><b>${fresh.length}</b><span>New cards</span><small>Up to 10 per session</small></div>${fresh.length ? icon("arrow-right", "q-go") : ui.pill("All learned", "teal")}</a>
        <a class="queue-card q-vault" href="#/app/vault?cat=fav&recall=1"><span class="q-ic">${icon("archive")}</span><div><b>${favs.length}</b><span>Saved favourites</span><small>Quick recall from your vault</small></div>${icon("arrow-right", "q-go")}</a>
      </div>
      <div class="grid-12">
        ${ui.card(bySubject.length ? `<ul class="subject-queue">${bySubject.map(({ s, due: d, fresh: f }) => `<li style="--sc:${sc(s.id)}"><span class="sq-dot"></span><div><b>${esc(s.name)}</b><small>${d} due · ${f} new</small></div>${ui.link("Review", `flashcards?subject=${s.id}`, { tone: "soft", size: "sm" })}</li>`).join("")}</ul>` : ui.empty({ icon: "check-circle", title: "You're all caught up", body: "Nothing is due. Try a quick practice or explore your roadmap." }), { title: "By subject", icon: "book", cls: "span-6" })}
        ${ui.card(`<ul class="mini-list">${["Again", "Hard", "Good", "Easy"].map((r) => `<li><span class="rate rate-${r.toLowerCase()}">${r}</span><span>${{ Again: "You forgot it. It comes back in about 10 minutes.", Hard: "Recalled with effort. A shorter interval.", Good: "Recalled correctly. The interval grows.", Easy: "Instant recall. The interval grows faster." }[r]}</span></li>`).join("")}</ul>`, { title: "How ratings work", icon: "info", cls: "span-6" })}
      </div>`;
  } });

  /* ======================= QUICK PRACTICE ======================= */
  function pickQuestions({ subject, count = 5, difficulty }) {
    let pool = R.content.questions.filter((q) => (!subject || q.subject === subject) && (!difficulty || difficulty === "mixed" || q.difficulty === difficulty));
    if (pool.length < count) pool = R.content.questions.filter((q) => !subject || q.subject === subject);
    // Favour weak modules when practising.
    const weak = new Set(R.weakTopics().map((w) => w.id));
    return shuffle(pool).sort((a, b) => (weak.has(b.module) ? 1 : 0) - (weak.has(a.module) ? 1 : 0)).slice(0, count);
  }
  R.page("practice", { title: "Quick Practice", render(view, ctx) {
    const subject = ctx.query.subject && R.subject(ctx.query.subject) ? ctx.query.subject : "";
    const questions = pickQuestions({ subject, count: 5 });
    let i = 0, score = 0, xp = 0;
    const answers = [];
    const draw = () => {
      const q = questions[i];
      view.innerHTML = `<div class="practice">
        <div class="fc-bar"><a class="icon-btn" href="#/app/dashboard" aria-label="End practice">${icon("x")}</a>${ui.progress((i / questions.length) * 100, { label: "Practice progress" })}<span class="fc-count">${i + 1} / ${questions.length}</span><span class="fc-xp">${icon("bolt")}<b>${xp}</b></span></div>
        <div class="pq">
          <div class="pq-meta">${ui.subjectDot(q.subject)}${esc(R.subject(q.subject).name)} · ${esc(R.module(q.module)?.name || "")} ${ui.pill(q.difficulty, q.difficulty === "hard" ? "orange" : "neutral")}</div>
          <h2 id="pqPrompt">${esc(q.prompt)}</h2>
          <div class="options" role="radiogroup" aria-labelledby="pqPrompt">${q.answers.map((a, k) => `<button type="button" class="option" role="radio" aria-checked="false" data-opt="${k}"><span class="opt-key">${"ABCD"[k]}</span><span>${esc(a)}</span></button>`).join("")}</div>
          <div class="pq-feedback" id="pqFb" aria-live="polite"></div>
        </div></div>`;
      R.animate(R.$(".pq", view), [{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "none" }], { duration: 280 });
    };
    const choose = (k, btn) => {
      const q = questions[i];
      if (answers[i] != null) return;
      answers[i] = k;
      const correct = k === q.correct;
      if (correct) score++;
      R.$$(".option", view).forEach((o, n) => { o.disabled = true; o.setAttribute("aria-checked", String(n === k)); if (n === q.correct) o.classList.add("is-correct"); if (n === k && !correct) o.classList.add("is-wrong"); });
      const gain = correct ? R.content.xp.answerCorrect : R.content.xp.answerWrong;
      xp += gain;
      R.record({ t: "answer", qid: q.id, subject: q.subject, module: q.module, correct, chosen: k, xp: gain, source: "practice" }, btn);
      if (correct) R.burst(btn, { count: 10, spread: 50 }); else R.animate(btn, [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }], { duration: 360 });
      R.$("#pqFb", view).innerHTML = `<div class="fb ${correct ? "fb-good" : "fb-bad"}"><span class="fb-ic">${icon(correct ? "check" : "x")}</span><div><b>${correct ? ["Correct!", "Nice one!", "Spot on!"][Math.floor(Math.random() * 3)] : "Not quite"}</b><p>${esc(q.explanation)}</p></div><button type="button" class="btn btn-primary" data-next>${i + 1 >= questions.length ? "See results" : "Continue"}</button></div>`;
      R.animate(R.$(".fb", view), [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 240 });
      R.$("[data-next]", view).focus();
      R.$(".fc-xp b", view).textContent = xp;
    };
    const finish = () => {
      const pct = (score / questions.length) * 100;
      R.state.examHistory.push({ id: R.uid(), subject: subject || "mixed", mode: "practice", score, total: questions.length, at: new Date().toISOString(), questions: questions.map((q, n) => ({ qid: q.id, chosen: answers[n], correct: answers[n] === q.correct })) });
      R.record({ t: "exam", mode: "practice", subject: subject || undefined, score, total: questions.length, xp: 0 });
      view.innerHTML = `<div class="session-complete"><div class="sc-badge ${pct >= 80 ? "" : "sc-neutral"}">${icon(pct >= 80 ? "star" : "zap")}</div><h1>${pct === 100 ? "Perfect round!" : pct >= 60 ? "Good practice" : "Keep going"}</h1><p>${score} of ${questions.length} correct · +${xp} XP</p>
        <ol class="recap">${questions.map((q, n) => `<li class="${answers[n] === q.correct ? "ok" : "bad"}">${icon(answers[n] === q.correct ? "check" : "x")}<span>${esc(q.prompt)}</span></li>`).join("")}</ol>
        <div class="sc-actions">${ui.btn("Practice again", { icon: "refresh", attrs: "data-again" })}${ui.link("Weakness detector", "weakness", { tone: "soft" })}</div></div>`;
      if (pct >= 80) setTimeout(() => R.burst(R.$(".sc-badge", view), { count: 26, spread: 130 }), 150);
    };
    draw();
    view.addEventListener("click", (e) => {
      const o = e.target.closest("[data-opt]"); if (o) choose(Number(o.dataset.opt), o);
      if (e.target.closest("[data-next]")) { i++; if (i >= questions.length) finish(); else draw(); }
      if (e.target.closest("[data-again]")) R.refresh();
    });
    const onKey = (e) => { if (typing() || document.querySelector("dialog[open]") || !view.isConnected) return; const k = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()]; if (k != null && answers[i] == null && R.$$(".option", view)[k]) R.$$(".option", view)[k].click(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  } });

  /* ======================= EXAM SIMULATOR ======================= */
  let exam = null;
  R.page("exam", {
    title: "Exam Simulator",
    async leave() {
      if (!exam || exam.done) return true;
      const ok = await R.confirm({ title: "Leave this exam?", body: "Your answers haven't been submitted and will be lost.", confirmLabel: "Leave exam", tone: "danger", cancelLabel: "Stay" });
      if (ok) { clearInterval(exam.timer); exam = null; }
      return ok;
    },
    render(view, ctx) {
      if (exam && !exam.done) return runExam(view);
      exam = null;
      const pre = ctx.query.subject && R.subject(ctx.query.subject) ? ctx.query.subject : R.subjects()[0].id;
      const history = R.state.examHistory.filter((e) => e.mode !== "practice").slice(-8).reverse();
      view.innerHTML = `${ui.header({ eyebrow: "Study tools", title: "Exam simulator", desc: "Practise under exam conditions, then learn from every answer." })}
        <div class="grid-12">
          ${ui.card(`<form class="form exam-setup" id="examForm">
              <div class="field"><label for="exSubject">Subject</label><select id="exSubject">${R.subjects().map((s) => `<option value="${s.id}" ${s.id === pre ? "selected" : ""} ${R.content.questions.some((q) => q.subject === s.id) ? "" : "disabled"}>${esc(s.name)}${R.content.questions.some((q) => q.subject === s.id) ? "" : " (no questions yet)"}</option>`).join("")}</select></div>
              <div class="field"><span class="label">Difficulty</span>${ui.segmented("exdiff", [["mixed", "Mixed"], ["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]], "mixed")}</div>
              <div class="field"><span class="label">Questions</span>${ui.segmented("excount", [["5", "5"], ["10", "10"], ["all", "All available"]], "5")}<small class="hint" id="exAvail"></small></div>
              <label class="switch"><input type="checkbox" id="exTimed" checked><span class="switch-ui"></span><span>Timed exam <small id="exTime"></small></span></label>
              ${ui.btn("Start exam", { icon: "play", size: "lg", attrs: 'type="submit" data-start' }).replace('type="button" ', "")}
            </form>`, { title: "Configure your exam", icon: "clipboard", cls: "span-7" })}
          ${ui.card(`<ul class="exam-rules"><li>${icon("clock")}A visible timer. The exam submits automatically when time runs out.</li><li>${icon("flag")}Flag questions to revisit before you submit.</li><li>${icon("grid")}Jump between questions with the navigator.</li><li>${icon("check-circle")}See detailed results and explanations at the end.</li></ul><p class="muted small">Practice target: 70%. Official pass thresholds and question limits should come from your course backend.</p>`, { title: "How it works", icon: "info", cls: "span-5" })}
          ${ui.card(history.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Subject</th><th>Score</th><th>Time</th></tr></thead><tbody>${history.map((h) => `<tr><td>${R.fmtDate(h.at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td><td>${ui.subjectDot(h.subject)}${esc(R.subject(h.subject)?.name || "Mixed")}</td><td><b>${h.score}/${h.total}</b> ${ui.pill(R.pct((h.score / Math.max(1, h.total)) * 100), h.score / Math.max(1, h.total) >= 0.7 ? "teal" : "orange")}</td><td>${h.seconds ? fmtClock(h.seconds) : "—"}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">Your exam history will appear here.</p>`, { title: "Recent exams", icon: "clock", cls: "span-12" })}
        </div>`;
      const opts = { diff: "mixed", count: "5" };
      const avail = () => {
        const subj = R.$("#exSubject", view).value, pool = R.content.questions.filter((q) => q.subject === subj && (opts.diff === "mixed" || q.difficulty === opts.diff));
        const n = opts.count === "all" ? pool.length : Math.min(Number(opts.count), R.content.questions.filter((q) => q.subject === subj).length);
        R.$("#exAvail", view).textContent = `${pool.length} ${opts.diff === "mixed" ? "" : opts.diff + " "}questions available${pool.length < Number(opts.count) ? "; we'll top up with other difficulties" : ""}.`;
        R.$("#exTime", view).textContent = `· ${fmtClock(Math.max(1, n) * 90)} (90 s per question)`;
        return n;
      };
      avail();
      R.$("#exSubject", view).addEventListener("change", avail);
      view.addEventListener("click", (e) => { const s = e.target.closest("[data-seg]"); if (s) { R.$$(`[data-seg='${s.dataset.seg}']`, view).forEach((b) => { b.classList.toggle("is-on", b === s); b.setAttribute("aria-checked", String(b === s)); }); if (s.dataset.seg === "exdiff") opts.diff = s.dataset.value; else opts.count = s.dataset.value; avail(); } });
      R.$("#examForm", view).addEventListener("submit", (e) => {
        e.preventDefault();
        const subject = R.$("#exSubject", view).value, n = avail();
        const qs = pickQuestions({ subject, count: n, difficulty: opts.diff });
        if (!qs.length) { R.toast("No questions are available for this subject yet.", { icon: "info" }); return; }
        const timed = R.$("#exTimed", view).checked;
        exam = { subject, questions: qs, answers: Array(qs.length).fill(null), flags: new Set(), index: 0, timed, seconds: qs.length * 90, startedAt: Date.now(), done: false, timer: null };
        runExam(view);
      });
    },
  });
  function runExam(view) {
    R.setFocusMode(true);
    const subj = R.subject(exam.subject);
    view.innerHTML = `<div class="exam">
      <header class="exam-head"><div class="exam-title">${icon("clipboard")}<div><b>${esc(subj.name)} exam</b><small>${R.plural(exam.questions.length, "question")}${exam.timed ? " · timed" : ""}</small></div></div>
        <div class="exam-timer ${exam.timed ? "" : "is-untimed"}" id="exTimer" role="timer" aria-live="off">${icon("clock")}<b>${exam.timed ? fmtClock(exam.seconds) : "Untimed"}</b></div>
        <div class="exam-head-actions"><span class="exam-answered" id="exAnswered"></span>${ui.btn("Submit exam", { attrs: "data-submit" })}<button type="button" class="icon-btn" data-exit aria-label="Exit exam">${icon("x")}</button></div></header>
      <div class="exam-body"><section class="exam-q" id="exQ" aria-live="polite"></section>
        <aside class="exam-nav"><div class="exam-nav-head"><b>Questions</b><small><i class="lg-ans"></i>Answered <i class="lg-flag"></i>Flagged</small></div><div class="qgrid" id="qgrid"></div></aside></div></div>`;
    const drawNav = () => {
      R.$("#qgrid", view).innerHTML = exam.questions.map((_, n) => `<button type="button" class="qcell ${exam.answers[n] != null ? "is-ans" : ""} ${exam.flags.has(n) ? "is-flag" : ""} ${n === exam.index ? "is-cur" : ""}" data-goto="${n}" aria-label="Question ${n + 1}${exam.answers[n] != null ? ", answered" : ""}${exam.flags.has(n) ? ", flagged" : ""}" ${n === exam.index ? 'aria-current="true"' : ""}>${n + 1}</button>`).join("");
      R.$("#exAnswered", view).textContent = `${exam.answers.filter((a) => a != null).length}/${exam.questions.length} answered`;
    };
    const drawQ = (dir = 0) => {
      const q = exam.questions[exam.index], n = exam.index;
      R.$("#exQ", view).innerHTML = `<div class="exq-top"><span class="eyebrow">Question ${n + 1} of ${exam.questions.length}</span><button type="button" class="btn btn-ghost btn-sm flag-btn ${exam.flags.has(n) ? "is-on" : ""}" data-flag aria-pressed="${exam.flags.has(n)}">${icon("flag")}<span>${exam.flags.has(n) ? "Flagged" : "Flag for review"}</span></button></div>
        <h2 id="exPrompt">${esc(q.prompt)}</h2>
        <div class="options" role="radiogroup" aria-labelledby="exPrompt">${q.answers.map((a, k) => `<button type="button" class="option ${exam.answers[n] === k ? "is-selected" : ""}" role="radio" aria-checked="${exam.answers[n] === k}" data-ans="${k}"><span class="opt-key">${"ABCD"[k]}</span><span>${esc(a)}</span></button>`).join("")}</div>
        <div class="exq-nav">${ui.btn("Previous", { tone: "ghost", icon: "chevron-left", attrs: `data-prev ${n === 0 ? "disabled" : ""}` })}${n + 1 < exam.questions.length ? ui.btn("Next", { tone: "soft", iconRight: "chevron-right", attrs: "data-nextq" }) : ui.btn("Review & submit", { iconRight: "check", attrs: "data-submit" })}</div>`;
      if (dir) R.animate(R.$("#exQ", view), [{ opacity: 0, transform: `translateX(${dir * 20}px)` }, { opacity: 1, transform: "none" }], { duration: 220 });
      drawNav();
    };
    const tick = () => {
      if (!exam || exam.done) return;
      exam.seconds--;
      const t = R.$("#exTimer", view);
      if (!t) return;
      t.querySelector("b").textContent = fmtClock(exam.seconds);
      t.classList.toggle("is-warn", exam.seconds <= 60);
      if (exam.seconds === 60) R.toast("One minute remaining.", { icon: "clock", tone: "toast-warn" });
      if (exam.seconds <= 0) { R.toast("Time's up. Your exam was submitted.", { icon: "clock" }); submit(true); }
    };
    // Re-bind the timer to this render's view (a re-render creates a new view element).
    clearInterval(exam.timer);
    if (exam.timed) exam.timer = setInterval(tick, 1000);
    const submit = async (forced = false) => {
      if (!forced) {
        const un = exam.answers.filter((a) => a == null).length, fl = exam.flags.size;
        const ok = await R.confirm({ title: "Submit your exam?", body: `${un ? `<b>${R.plural(un, "question")} unanswered.</b> ` : "All questions answered. "}${fl ? `${R.plural(fl, "question")} flagged for review. ` : ""}You can't change answers after submitting.`, confirmLabel: "Submit exam", cancelLabel: "Keep working" });
        if (!ok || !exam) return;
      }
      clearInterval(exam.timer); exam.done = true;
      const spent = Math.round((Date.now() - exam.startedAt) / 1000);
      const items = exam.questions.map((q, n) => ({ q, chosen: exam.answers[n], correct: exam.answers[n] === q.correct }));
      const score = items.filter((x) => x.correct).length, total = items.length;
      R.state.examHistory.push({ id: R.uid(), subject: exam.subject, mode: "exam", score, total, at: new Date().toISOString(), timed: exam.timed, seconds: spent, questions: items.map((x) => ({ qid: x.q.id, chosen: x.chosen, correct: x.correct })) });
      const entries = items.filter((x) => x.chosen != null).map((x) => ({ t: "answer", qid: x.q.id, subject: x.q.subject, module: x.q.module, correct: x.correct, chosen: x.chosen, xp: x.correct ? R.content.xp.answerCorrect : R.content.xp.answerWrong, source: "exam" }));
      entries.push({ t: "exam", mode: "exam", subject: exam.subject, score, total, xp: R.content.xp.examFinish });
      const res = R.record(entries);
      results(view, items, score, total, spent, res.xp);
    };
    drawQ();
    view.addEventListener("click", async (e) => {
      if (!exam || exam.done) {
        const f = e.target.closest("[data-filter]"); if (f) { R.$$("[data-filter]", view).forEach((b) => { b.classList.toggle("is-on", b === f); b.setAttribute("aria-checked", String(b === f)); }); R.$$(".res-item", view).forEach((li) => (li.hidden = f.dataset.filter === "wrong" && li.classList.contains("ok"))); }
        if (e.target.closest("[data-retake]")) { exam = null; R.refresh(); }
        return;
      }
      const a = e.target.closest("[data-ans]"); if (a) { exam.answers[exam.index] = Number(a.dataset.ans); R.$$("[data-ans]", view).forEach((o) => { const on = o === a; o.classList.toggle("is-selected", on); o.setAttribute("aria-checked", String(on)); }); R.animate(a, [{ transform: "scale(.98)" }, { transform: "scale(1)" }], { duration: 160 }); drawNav(); }
      if (e.target.closest("[data-flag]")) { exam.flags.has(exam.index) ? exam.flags.delete(exam.index) : exam.flags.add(exam.index); drawQ(); }
      if (e.target.closest("[data-prev]") && exam.index > 0) { exam.index--; drawQ(-1); }
      if (e.target.closest("[data-nextq]")) { exam.index++; drawQ(1); }
      const g = e.target.closest("[data-goto]"); if (g) { const to = Number(g.dataset.goto); const dir = Math.sign(to - exam.index); exam.index = to; drawQ(dir); }
      if (e.target.closest("[data-submit]")) submit(false);
      if (e.target.closest("[data-exit]")) R.go("dashboard");
    });
    const onKey = (e) => {
      if (!exam || exam.done || typing() || document.querySelector("dialog[open]") || !view.isConnected) return;
      const k = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
      if (k != null) R.$$("[data-ans]", view)[k]?.click();
      if (e.key === "ArrowRight" && exam.index + 1 < exam.questions.length) { exam.index++; drawQ(1); }
      if (e.key === "ArrowLeft" && exam.index > 0) { exam.index--; drawQ(-1); }
      if (e.key.toLowerCase() === "f") R.$("[data-flag]", view)?.click();
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }
  function results(view, items, score, total, spent, xp) {
    R.setFocusMode(false);
    const pct = (score / total) * 100, pass = pct >= 70;
    const bySub = {};
    items.forEach((x) => { const m = R.module(x.q.module)?.name || "Other"; bySub[m] = bySub[m] || { n: 0, ok: 0 }; bySub[m].n++; if (x.correct) bySub[m].ok++; });
    view.innerHTML = `<div class="exam-results">
      <section class="res-hero ${pass ? "is-pass" : ""}">${ui.ring(pct, { size: 160, stroke: 13, tone: pass ? "teal" : "orange", label: R.pct(pct), sub: `${score}/${total}` })}
        <div><span class="eyebrow">Exam results</span><h1>${pct === 100 ? "Perfect score!" : pass ? "Practice target reached" : "Keep practising"}</h1><p>${pass ? "You cleared the 70% practice target." : "You're below the 70% practice target. Focus on the explanations below."}</p>
        <div class="res-stats"><span>${icon("clock")}${fmtClock(spent)}</span><span>${icon("bolt")}+${xp} XP</span><span>${icon("x")}${total - score} incorrect</span></div>
        <div class="sc-actions">${ui.btn("Take another exam", { icon: "refresh", attrs: "data-retake" })}${ui.link("Review weak topics", "weakness", { tone: "soft" })}</div></div></section>
      <div class="grid-12">
        ${ui.card(R.chart.hbars(Object.entries(bySub).map(([k, v]) => ({ label: k, value: (v.ok / v.n) * 100, sub: `${v.ok}/${v.n} correct` }))), { title: "By topic", icon: "target", cls: "span-4" })}
        ${ui.card(`<div class="res-filter"><div class="segmented" role="radiogroup" aria-label="Show"><button type="button" role="radio" aria-checked="true" class="is-on" data-filter="all">All questions</button><button type="button" role="radio" aria-checked="false" data-filter="wrong">Incorrect only (${total - score})</button></div></div>
          <ol class="res-list">${items.map((x, n) => `<li class="res-item ${x.correct ? "ok" : "bad"}"><div class="res-q"><span class="res-n">${n + 1}</span><b>${esc(x.q.prompt)}</b>${icon(x.correct ? "check-circle" : "x", x.correct ? "good" : "bad")}</div>
            <p class="ma ${x.correct ? "good" : "bad"}">Your answer: ${x.chosen == null ? "<i>Not answered</i>" : esc(x.q.answers[x.chosen])}</p>${x.correct ? "" : `<p class="ma good">Correct answer: ${esc(x.q.answers[x.q.correct])}</p>`}<small>${esc(x.q.explanation)}</small></li>`).join("")}</ol>`, { title: "Answers & explanations", icon: "clipboard", cls: "span-8" })}
      </div></div>`;
    if (pass) setTimeout(() => R.burst(R.$(".ring", view), { count: 30, spread: 150 }), 200);
  }

  /* ======================= AI TUTOR (+ Explain it to me) ======================= */
  const STOP = new Set("the a an and or of to in on for is are was were be by with as at it this that from what why how when which who does do can could would should about into your you me my i we our their there than then so if not no yes".split(" "));
  const words = (t) => (t.toLowerCase().match(/[a-zα-ω₀-₉²³⁰-⁹]+/gi) || []).filter((w) => w.length > 2 && !STOP.has(w));
  R.searchKnowledge = (query, subject) => {
    const qw = new Set(words(query));
    if (!qw.size) return [];
    const docs = [...R.cards().map((c) => ({ kind: "Flashcard", title: c.front, body: c.back, subject: c.subject })), ...R.vaultItems().map((v) => ({ kind: "Vault", title: v.title, body: v.detail, subject: v.subject }))];
    return docs.map((d) => { const dw = words(`${d.title} ${d.body}`); let s = 0; dw.forEach((w) => { if (qw.has(w)) s++; }); if (subject && d.subject === subject) s += 0.5; return { ...d, score: s }; }).filter((d) => d.score >= 1).sort((a, b) => b.score - a.score).slice(0, 3);
  };
  R.page("tutor", {
    title: "AI Tutor",
    crumb: (ctx) => (ctx.sub[0] === "explain" ? "Explain it to me" : null),
    render(view, ctx) {
      const tabs = ui.tabs([{ id: "chat", label: "Chat", route: "tutor", icon: "sparkles" }, { id: "explain", label: "Explain it to me", route: "tutor/explain", icon: "quote" }], ctx.sub[0] === "explain" ? "explain" : "chat", "Tutor modes");
      if (ctx.sub[0] === "explain") return explain(view, ctx, tabs);
      return chat(view, ctx, tabs);
    },
  });
  function chat(view, ctx, tabs) {
    const st = R.state;
    let chatObj = ctx.query.new ? null : st.chats.find((c) => c.id === ctx.query.chat) || st.chats[st.chats.length - 1] || null;
    let subject = ctx.query.subject || chatObj?.subject || R.subjects()[0].id;
    let attachment = null, busy = false;
    const suggestions = () => {
      const s = R.subject(subject), mod = R.moduleStatus(s).find((m) => m.status === "active") || s.modules?.[0];
      const topic = ctx.query.topic || mod?.name || s.name;
      return [`Explain ${topic} simply`, `Give me a worked example on ${topic}`, `Quiz me on ${topic}`, `What are common mistakes in ${topic}?`];
    };
    view.innerHTML = `${ui.header({ eyebrow: "Study tools", title: "AI tutor", desc: "A subject-aware study partner for questions, explanations and deeper understanding." })}${tabs}
      <div class="tutor">
        <aside class="tutor-side"><button type="button" class="btn btn-soft btn-block" data-newchat>${icon("plus")}<span>New chat</span></button><div class="chat-list" id="chatList"></div></aside>
        <section class="tutor-main">
          <div class="tutor-ctx"><label>${icon("book")}<span class="sr-only">Subject context</span><select id="tutorSubject">${R.subjects().map((s) => `<option value="${s.id}" ${s.id === subject ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>${ui.pill("AI provider not connected", "orange", "info")}</div>
          <div class="messages" id="msgs" aria-live="polite"></div>
          <div class="suggest" id="suggest"></div>
          <form class="composer" id="composer"><div class="attach-preview" id="attachPrev" hidden></div>
            <div class="composer-row"><label class="icon-btn" data-tip="Attach an image" aria-label="Attach an image">${icon("paperclip")}<input type="file" accept="image/*" id="imgIn" class="sr-only"></label>
            <textarea id="msgIn" rows="1" placeholder="Ask anything about ${esc(R.subject(subject).name)}…" aria-label="Message the tutor"></textarea>
            <button type="submit" class="send-btn" aria-label="Send">${icon("send")}</button></div>
            <small class="composer-hint">Enter to send · Shift + Enter for a new line</small></form>
        </section></div>`;
    const msgs = R.$("#msgs", view), input = R.$("#msgIn", view);
    const drawList = () => {
      R.$("#chatList", view).innerHTML = st.chats.length ? [...st.chats].reverse().map((c) => `<div class="chat-row ${chatObj && c.id === chatObj.id ? "is-active" : ""}"><a href="#/app/tutor?chat=${c.id}">${ui.subjectDot(c.subject)}<span><b>${esc(c.title)}</b><small>${R.relTime(c.updatedAt)}</small></span></a><button type="button" class="icon-btn sm" data-delchat="${c.id}" aria-label="Delete chat ${esc(c.title)}">${icon("trash")}</button></div>`).join("") : `<p class="muted small">Your conversations will appear here.</p>`;
    };
    const bubble = (m) => `<div class="msg msg-${m.role}">${m.role === "assistant" ? `<span class="msg-av">${icon("sparkles")}</span>` : ""}<div class="msg-body">${m.image ? `<img src="${m.image}" alt="Attached image" class="msg-img">` : m.imageName ? `<span class="pill pill-neutral">${icon("image")}${esc(m.imageName)}</span>` : ""}<div class="msg-text">${m.html || esc(m.text).replace(/\n/g, "<br>")}</div></div></div>`;
    const drawMsgs = () => {
      const intro = { role: "assistant", html: `<p>Hi ${esc(R.firstName())}! I'm your Recalro tutor for <b>${esc(R.subject(subject).name)}</b>.</p><p class="muted small">The AI provider isn't connected in this prototype, so I can't generate new explanations yet. I <i>can</i> search your flashcards and vault and show you what your own materials say.</p>` };
      msgs.innerHTML = [intro, ...(chatObj?.messages || [])].map(bubble).join("");
      msgs.scrollTop = msgs.scrollHeight;
      R.$("#suggest", view).innerHTML = (chatObj?.messages?.length ? [] : suggestions()).map((s) => `<button type="button" class="chip-btn" data-prompt="${esc(s)}">${icon("sparkles")}${esc(s)}</button>`).join("");
    };
    const reply = (text) => {
      const found = R.searchKnowledge(text, subject);
      const html = `<p>I can't generate a full answer until an AI provider is connected.</p>${found.length ? `<p>Here's what your own materials say:</p><div class="sources">${found.map((f) => `<div class="source"><span class="pill pill-neutral">${f.kind}</span><b>${esc(f.title)}</b><p>${esc(f.body)}</p></div>`).join("")}</div>` : `<p>I couldn't find anything about that in your flashcards or vault yet. Try different keywords, or save what you learn to your <a href="#/app/vault">Knowledge Vault</a>.</p>`}`;
      return { role: "assistant", html, sources: found.length };
    };
    const stream = async (el, html) => {
      const target = el.querySelector(".msg-text");
      if (R.reducedMotion()) { target.innerHTML = html; return; }
      // Reveal block by block, like a streamed response.
      const tmp = document.createElement("div"); tmp.innerHTML = html;
      target.innerHTML = "";
      for (const node of [...tmp.childNodes]) { target.append(node); R.animate(node.nodeType === 1 ? node : target, [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 260 }); msgs.scrollTop = msgs.scrollHeight; await new Promise((r) => setTimeout(r, 260)); }
    };
    const send = async (text) => {
      text = text.trim();
      if ((!text && !attachment) || busy) return;
      busy = true;
      if (!chatObj) { chatObj = { id: R.uid(), title: text.slice(0, 48) || "Image question", subject, messages: [], updatedAt: new Date().toISOString() }; st.chats.push(chatObj); history.replaceState(null, "", `#/app/tutor?chat=${chatObj.id}`); }
      const userMsg = { role: "user", text, ...(attachment ? (attachment.data ? { image: attachment.data } : { imageName: attachment.name }) : {}) };
      chatObj.messages.push(userMsg); chatObj.updatedAt = new Date().toISOString(); chatObj.subject = subject;
      attachment = null; R.$("#attachPrev", view).hidden = true; input.value = ""; input.style.height = "";
      R.$("#suggest", view).innerHTML = "";
      msgs.insertAdjacentHTML("beforeend", bubble(userMsg));
      R.animate(msgs.lastElementChild, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 200 });
      msgs.insertAdjacentHTML("beforeend", `<div class="msg msg-assistant is-typing"><span class="msg-av">${icon("sparkles")}</span><div class="msg-body"><div class="msg-text"><span class="typing"><i></i><i></i><i></i></span></div></div></div>`);
      msgs.scrollTop = msgs.scrollHeight;
      R.record({ t: "chat", subject, xp: R.content.xp.chat });
      await new Promise((r) => setTimeout(r, R.reducedMotion() ? 0 : 650));
      const ans = reply(text || "image");
      chatObj.messages.push(ans); R.save();
      const el = msgs.querySelector(".is-typing"); el.classList.remove("is-typing");
      await stream(el, ans.html);
      drawList(); busy = false; input.focus();
    };
    drawList(); drawMsgs();
    R.$("#composer", view).addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); } });
    input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(160, input.scrollHeight) + "px"; });
    R.$("#tutorSubject", view).addEventListener("change", (e) => { subject = e.target.value; if (chatObj) { chatObj.subject = subject; R.save(); } input.placeholder = `Ask anything about ${R.subject(subject).name}…`; drawMsgs(); });
    R.$("#imgIn", view).addEventListener("change", (e) => {
      const f = e.target.files[0]; if (!f) return;
      const prev = R.$("#attachPrev", view);
      const done = (data) => { attachment = { name: f.name, data }; prev.hidden = false; prev.innerHTML = `${data ? `<img src="${data}" alt="">` : icon("image")}<span>${esc(f.name)}</span><button type="button" class="icon-btn sm" data-unattach aria-label="Remove attachment">${icon("x")}</button>`; };
      if (f.size > 400 * 1024) { done(null); R.toast("Large image attached by name only; image analysis needs the AI provider.", { icon: "info" }); }
      else { const r = new FileReader(); r.onload = () => done(r.result); r.readAsDataURL(f); }
      e.target.value = "";
    });
    view.addEventListener("click", (e) => {
      if (e.target.closest("[data-newchat]")) { chatObj = null; history.replaceState(null, "", "#/app/tutor?new=1"); drawList(); drawMsgs(); input.focus(); }
      const p = e.target.closest("[data-prompt]"); if (p) { input.value = p.dataset.prompt; input.focus(); }
      if (e.target.closest("[data-unattach]")) { attachment = null; R.$("#attachPrev", view).hidden = true; }
      const d = e.target.closest("[data-delchat]"); if (d) { st.chats = st.chats.filter((c) => c.id !== d.dataset.delchat); if (chatObj?.id === d.dataset.delchat) chatObj = null; R.save(); drawList(); drawMsgs(); }
    });
    if (ctx.query.topic) input.value = `Help me understand ${ctx.query.topic}`;
  }
  function explain(view, ctx, tabs) {
    const s = R.subjects()[0], mod = R.moduleStatus(s).find((m) => m.status === "active");
    const topic = ctx.query.topic || (mod ? mod.name : "The second law of thermodynamics");
    const past = R.state.explanations.slice(-5).reverse();
    view.innerHTML = `${ui.header({ eyebrow: "Study tools", title: "AI tutor", desc: "Explaining an idea in your own words is one of the best ways to find gaps in understanding." })}${tabs}
      <div class="grid-12">
        ${ui.card(`<form class="form" id="explainForm"><div class="field"><label for="exTopic">Topic to explain</label><input id="exTopic" value="${esc(topic)}" required maxlength="120"></div>
            <div class="field"><label for="exText">Your explanation</label><textarea id="exText" rows="9" placeholder="Explain it as if you were teaching a classmate. Use an example if you can…"></textarea><small class="hint" id="exCount">0 words</small></div>
            ${ui.btn("Check my explanation", { icon: "sparkles", attrs: 'type="submit"' }).replace('type="button" ', "")}</form><div id="exFeedback"></div>`, { title: "Explain it to me", icon: "quote", cls: "span-8" })}
        ${ui.card(`<ol class="tips"><li>Start with a one-sentence definition.</li><li>Explain <i>why</i> it works, not only what it is.</li><li>Give a concrete example.</li><li>Name a common misconception.</li></ol>${past.length ? `<h3 class="sub-h">Your recent explanations</h3><ul class="mini-list">${past.map((p) => `<li>${icon("quote")}<span>${esc(p.topic)}</span><small>${R.relTime(p.at)}</small></li>`).join("")}</ul>` : ""}`, { title: "A strong explanation", icon: "bulb", cls: "span-4" })}
      </div>`;
    const text = R.$("#exText", view);
    text.addEventListener("input", () => (R.$("#exCount", view).textContent = `${(text.value.trim().match(/\S+/g) || []).length} words`));
    R.$("#explainForm", view).addEventListener("submit", (e) => {
      e.preventDefault();
      const t = text.value.trim(), tp = R.$("#exTopic", view).value.trim();
      if (!t) { R.toast("Write your explanation first.", { icon: "info" }); text.focus(); return; }
      // Key terms come from your own cards/vault that match the topic.
      const related = R.searchKnowledge(tp, null);
      const pool = related.length ? related : R.searchKnowledge(t, null);
      const terms = [...new Set(pool.flatMap((d) => words(`${d.title} ${d.body}`)).filter((w) => w.length > 4))].slice(0, 8);
      const tw = new Set(words(t));
      const hit = terms.filter((w) => tw.has(w)), wc = (t.match(/\S+/g) || []).length;
      const hasExample = /\b(for example|e\.g\.|such as|for instance|imagine|like when)\b/i.test(t), hasWhy = /\b(because|so that|therefore|which means|due to)\b/i.test(t);
      const checks = [[wc >= 40, `Length: ${wc} words`, wc >= 40 ? "Enough detail to show understanding." : "Aim for at least 40 words."], [hasWhy, "Explains why", hasWhy ? "You give reasons, not only facts." : "Add a “because…” to explain the mechanism."], [hasExample, "Uses an example", hasExample ? "Examples make ideas concrete." : "Add a concrete example."], [terms.length ? hit.length >= Math.ceil(terms.length / 3) : null, terms.length ? `Key terms: ${hit.length}/${terms.length}` : "Key terms", terms.length ? `From your materials: ${terms.map((w) => (hit.includes(w) ? `<b>${esc(w)}</b>` : esc(w))).join(", ")}` : "No matching cards or vault items to compare against."]];
      const passed = checks.filter((c) => c[0]).length;
      R.state.explanations.push({ topic: tp, text: t, at: new Date().toISOString(), score: passed });
      R.record({ t: "explain", xp: R.content.xp.explain, topic: tp }, e.submitter);
      R.$("#exFeedback", view).innerHTML = `<div class="feedback"><div class="fb-head">${ui.ring((passed / checks.length) * 100, { size: 64, stroke: 7, label: `${passed}/${checks.length}` })}<div><h3>${passed === checks.length ? "Excellent explanation" : passed >= 2 ? "Solid start" : "A first draft"}</h3><p class="muted small">Local text check against your own materials. It's not an AI or accuracy assessment, so compare with your course notes.</p></div></div>
        <ul class="checks">${checks.map(([ok, l, d]) => `<li class="${ok ? "ok" : ok === null ? "na" : "todo"}">${icon(ok ? "check-circle" : "info")}<div><b>${l}</b><small>${d}</small></div></li>`).join("")}</ul></div>`;
      R.animate(R.$(".feedback", view), [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 300 });
    });
  }

  /* ======================= SUMMARIES (+ Read aloud) ======================= */
  function summarize(text) {
    const sentences = (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).map((s) => s.trim()).filter((s) => s.length > 15);
    const freq = {};
    words(text).forEach((w) => (freq[w] = (freq[w] || 0) + 1));
    const scored = sentences.map((s, i) => ({ s, i, score: words(s).reduce((t, w) => t + (freq[w] || 0), 0) / Math.max(4, words(s).length) }));
    const n = R.clamp(Math.round(sentences.length * 0.3), Math.min(3, sentences.length), 7);
    const take = [...scored].sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i).map((x) => x.s);
    const terms = Object.entries(freq).filter(([w]) => w.length > 4).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
    const sections = [];
    for (let i = 0; i < sentences.length; i += 4) { const chunk = sentences.slice(i, i + 4); const top = Object.entries(chunk.flatMap(words).reduce((m, w) => ((m[w] = (m[w] || 0) + (freq[w] || 0)), m), {})).filter(([w]) => w.length > 4).sort((a, b) => b[1] - a[1])[0]; sections.push({ heading: top ? top[0][0].toUpperCase() + top[0].slice(1) : `Part ${sections.length + 1}`, text: chunk.join(" ") }); }
    return { takeaways: take, terms, sections: sections.slice(0, 6), sentenceCount: sentences.length };
  }
  const toMarkdown = (s) => `# ${s.title}\n\n_Local extractive summary created in Recalro (not AI-generated)._\n\n## Key takeaways\n${s.points.takeaways.map((t) => `- ${t}`).join("\n")}\n\n## Key terms\n${s.points.terms.join(", ")}\n\n${s.points.sections.map((x) => `## ${x.heading}\n${x.text}`).join("\n\n")}\n`;
  function readingView(s) {
    return `<article class="reading"><header><span class="eyebrow">${s.subject ? esc(R.subject(s.subject)?.name || "") : "Summary"} · ${R.fmtDate(s.createdAt)}</span><h2>${esc(s.title)}</h2><p class="muted small">${icon("info")} Local extractive summary. Sentences are selected from your text; nothing is AI-generated.</p></header>
      <section class="takeaways"><h3>${icon("star")}Key takeaways</h3><ul>${s.points.takeaways.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>
      ${s.points.terms.length ? `<div class="terms">${s.points.terms.map((t) => `<span class="pill pill-neutral">${esc(t)}</span>`).join("")}</div>` : ""}
      ${s.points.sections.length > 1 ? s.points.sections.map((x) => `<section><h3>${esc(x.heading)}</h3><p>${esc(x.text)}</p></section>`).join("") : ""}
      <footer class="reading-actions">${ui.btn("Read aloud", { tone: "soft", icon: "volume", attrs: "data-speak" })}${ui.btn("Copy", { tone: "ghost", icon: "copy", attrs: "data-copy" })}${ui.btn("Download", { tone: "ghost", icon: "download", attrs: "data-dl" })}${s.saved ? "" : ui.btn("Save", { icon: "bookmark", attrs: "data-save" })}</footer></article>`;
  }
  let speech = null;
  const stopSpeech = () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); speech = null; };
  function speak(text, { rate = 1, voice = "", onBoundary, onEnd } = {}) {
    if (!("speechSynthesis" in window)) { R.toast("Speech isn't supported in this browser.", { icon: "info" }); return null; }
    stopSpeech();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    if (voice !== "") { const v = speechSynthesis.getVoices()[Number(voice)]; if (v) u.voice = v; }
    if (onBoundary) u.onboundary = onBoundary;
    u.onend = () => { speech = null; onEnd && onEnd(); };
    u.onerror = (e) => { if (e.error !== "interrupted" && e.error !== "canceled") { console.error("Recalro: speech failed", e.error); R.toast("Audio playback stopped unexpectedly.", { icon: "info" }); } speech = null; onEnd && onEnd(); };
    speechSynthesis.speak(u);
    speech = u;
    return u;
  }
  R.page("summaries", {
    title: "Summaries",
    crumb: (ctx) => (ctx.sub[0] === "listen" ? "Read aloud" : ctx.sub[0] === "saved" ? "Saved" : null),
    render(view, ctx) {
      const tab = ctx.sub[0] || "create";
      const tabs = ui.tabs([{ id: "create", label: "Create", route: "summaries", icon: "file" }, { id: "saved", label: "Saved", route: "summaries/saved", icon: "bookmark", count: R.state.summaries.length }, { id: "listen", label: "Read aloud", route: "summaries/listen", icon: "volume" }], tab, "Summaries");
      const head = ui.header({ eyebrow: "Study tools", title: "Summaries", desc: "Turn dense material into clear revision notes, then read or listen to them." });
      if (tab === "listen") return listen(view, head + tabs);
      if (tab === "saved") {
        view.innerHTML = `${head}${tabs}${R.state.summaries.length ? `<div class="summary-grid">${[...R.state.summaries].reverse().map((s) => `<article class="summary-card"><span class="eyebrow">${s.subject ? `${ui.subjectDot(s.subject)}${esc(R.subject(s.subject)?.name || "")}` : "General"} · ${R.fmtDate(s.createdAt)}</span><h3>${esc(s.title)}</h3><p>${esc(s.points.takeaways[0] || "")}</p><div class="row-actions">${ui.btn("Open", { tone: "soft", size: "sm", attrs: `data-open="${s.id}"` })}${ui.btn("", { tone: "ghost", size: "sm", icon: "trash", attrs: `data-del="${s.id}" aria-label="Delete ${esc(s.title)}"` })}</div></article>`).join("")}</div>` : ui.empty({ icon: "bookmark", title: "No saved summaries", body: "Create a summary and save it to build your revision library.", action: ui.link("Create a summary", "summaries", { icon: "plus" }) })}`;
        view.addEventListener("click", (e) => {
          const o = e.target.closest("[data-open]"); if (o) openSummary(R.state.summaries.find((x) => x.id === o.dataset.open));
          const d = e.target.closest("[data-del]"); if (d) { R.update((st) => (st.summaries = st.summaries.filter((x) => x.id !== d.dataset.del))); R.refresh(); }
        });
        return;
      }
      let pre = null;
      if (ctx.query.from === "material") { try { pre = JSON.parse(sessionStorage.getItem("recalro-summary-source")); } catch {} sessionStorage.removeItem("recalro-summary-source"); }
      view.innerHTML = `${head}${tabs}<div class="grid-12">
        ${ui.card(`<form class="form" id="sumForm"><div class="field"><label for="sumTitle">Title</label><input id="sumTitle" maxlength="80" placeholder="e.g. Second law of thermodynamics" value="${esc(pre?.title || "")}"></div>
          <div class="field"><label for="sumSubject">Subject</label><select id="sumSubject"><option value="">None</option>${R.subjects().map((s) => `<option value="${s.id}" ${pre?.subject === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>
          <div class="field"><label for="sumText">Source text</label><textarea id="sumText" rows="10" placeholder="Paste lecture notes, a textbook passage or your own notes…">${esc(pre?.text || "")}</textarea><small class="hint" id="sumCount">0 words</small></div>
          ${ui.btn("Summarise", { icon: "sparkles", attrs: 'type="submit"' }).replace('type="button" ', "")}</form>
          <p class="note-info">${icon("info")}<span>This creates a local extractive summary by picking the most representative sentences. AI-generated summaries need a connected provider.</span></p>`, { title: "Source", icon: "file", cls: "span-5" })}
        <div class="span-7" id="sumOut">${ui.card(ui.empty({ icon: "file", title: "Your summary will appear here", body: "Paste at least a few sentences, then select Summarise." }))}</div></div>`;
      const ta = R.$("#sumText", view), count = () => (R.$("#sumCount", view).textContent = `${(ta.value.trim().match(/\S+/g) || []).length} words`);
      ta.addEventListener("input", count); count();
      let currentSummary = null;
      R.$("#sumForm", view).addEventListener("submit", (e) => {
        e.preventDefault();
        const text = ta.value.trim();
        if ((text.match(/[.!?]/g) || []).length < 2 || text.length < 80) { R.toast("Add a few full sentences so there's something to summarise.", { icon: "info" }); ta.focus(); return; }
        const points = summarize(text);
        currentSummary = { id: R.uid(), title: R.$("#sumTitle", view).value.trim() || text.split(/[.!?]/)[0].slice(0, 60), subject: R.$("#sumSubject", view).value, points, createdAt: new Date().toISOString(), sourceWords: (text.match(/\S+/g) || []).length };
        R.$("#sumOut", view).innerHTML = ui.card(readingView(currentSummary));
        R.animate(R.$("#sumOut .reading", view), [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 300 });
        R.record({ t: "summary", subject: currentSummary.subject || undefined, xp: R.content.xp.summary }, e.submitter);
      });
      R.$("#sumOut", view).addEventListener("click", (e) => actions(e, currentSummary, () => { currentSummary.saved = true; R.update((st) => st.summaries.push(currentSummary)); R.toast("Summary saved.", { icon: "bookmark" }); R.$("[data-save]", view)?.remove(); }));
      if (pre) R.$("#sumForm", view).requestSubmit();
      return stopSpeech;
    },
  });
  function actions(e, s, onSave) {
    if (!s) return;
    if (e.target.closest("[data-speak]")) { const b = e.target.closest("[data-speak]"); if (speech) { stopSpeech(); b.querySelector("span").textContent = "Read aloud"; } else { b.querySelector("span").textContent = "Stop"; speak(`${s.title}. ${s.points.takeaways.join(" ")}`, { onEnd: () => { if (b.isConnected) b.querySelector("span").textContent = "Read aloud"; } }); } }
    if (e.target.closest("[data-copy]")) navigator.clipboard?.writeText(toMarkdown(s)).then(() => R.toast("Summary copied.", { icon: "copy" }), () => R.toast("Copy failed. Select the text and copy it manually.", { icon: "info" }));
    if (e.target.closest("[data-dl]")) { const url = URL.createObjectURL(new Blob([toMarkdown(s)], { type: "text/markdown" })); const a = document.createElement("a"); a.href = url; a.download = `${s.title.replace(/[^\w]+/g, "-").toLowerCase() || "summary"}.md`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    if (e.target.closest("[data-save]")) onSave();
  }
  function openSummary(s) {
    const d = R.dialog({ title: "Summary", body: readingView({ ...s, saved: true }), size: "lg", onClose: stopSpeech });
    d.el.addEventListener("click", (e) => actions(e, s));
  }
  function listen(view, top) {
    const supported = "speechSynthesis" in window;
    view.innerHTML = `${top}<div class="grid-12">${ui.card(`<div class="player">
        <div class="field"><label for="laText">Text to read</label><textarea id="laText" rows="9">The second law of thermodynamics states that the total entropy of an isolated system can never decrease over time. In natural processes, energy tends to spread out and become less available to perform useful work.</textarea></div>
        <div class="reader" id="laReader" aria-live="off" hidden></div>
        <div class="player-controls">
          <button type="button" class="play-btn" id="laPlay" aria-label="Play" ${supported ? "" : "disabled"}>${icon("play")}</button>
          <button type="button" class="icon-btn" id="laStop" aria-label="Stop" ${supported ? "" : "disabled"}>${icon("stop")}</button>
          <div class="field inline"><label for="laVoice">Voice</label><select id="laVoice"><option value="">Default system voice</option></select></div>
          <div class="field inline"><label for="laRate">Speed</label><select id="laRate"><option value=".8">0.8×</option><option value="1" selected>1×</option><option value="1.2">1.2×</option><option value="1.5">1.5×</option></select></div>
          <span class="muted small" id="laEst"></span>
        </div>${supported ? "" : `<p class="note-warn">${icon("info")}This browser doesn't support speech synthesis.</p>`}</div>`, { title: "Read aloud", icon: "volume", cls: "span-8", sub: "Uses your device's built-in voices" })}
        ${ui.card(R.state.summaries.length ? `<ul class="mini-list">${[...R.state.summaries].reverse().slice(0, 6).map((s) => `<li><button type="button" class="link-btn" data-load="${s.id}">${icon("file")}${esc(s.title)}</button></li>`).join("")}</ul>` : `<p class="muted small">Saved summaries appear here so you can listen to them.</p>`, { title: "Listen to a summary", icon: "bookmark", cls: "span-4" })}</div>`;
    const ta = R.$("#laText", view), reader = R.$("#laReader", view), play = R.$("#laPlay", view), voiceSel = R.$("#laVoice", view);
    const voices = () => { if (!supported) return; const cur = voiceSel.value; voiceSel.innerHTML = `<option value="">Default system voice</option>` + speechSynthesis.getVoices().map((v, i) => `<option value="${i}">${esc(v.name)} (${esc(v.lang)})</option>`).join(""); voiceSel.value = cur; };
    voices(); if (supported) speechSynthesis.addEventListener("voiceschanged", voices);
    const est = () => (R.$("#laEst", view).textContent = `≈ ${Math.max(1, Math.round((ta.value.match(/\S+/g) || []).length / (160 * Number(R.$("#laRate", view).value))))} min`);
    ta.addEventListener("input", est); R.$("#laRate", view).addEventListener("change", est); est();
    let state = "idle";
    const setState = (s) => { state = s; play.innerHTML = icon(s === "playing" ? "pause" : "play"); play.setAttribute("aria-label", s === "playing" ? "Pause" : s === "paused" ? "Resume" : "Play"); play.classList.toggle("is-playing", s === "playing"); if (s === "idle") { reader.hidden = true; ta.hidden = false; } };
    play.addEventListener("click", () => {
      if (state === "playing") { speechSynthesis.pause(); setState("paused"); return; }
      if (state === "paused") { speechSynthesis.resume(); setState("playing"); return; }
      const text = ta.value.trim(); if (!text) { R.toast("Enter some text to read aloud.", { icon: "info" }); ta.focus(); return; }
      // Highlight the word being spoken where the browser reports boundaries.
      const parts = text.split(/(\s+)/); let offsets = [], pos = 0; parts.forEach((p) => { offsets.push(pos); pos += p.length; });
      reader.innerHTML = parts.map((p, i) => (/\S/.test(p) ? `<span data-o="${offsets[i]}">${esc(p)}</span>` : p)).join("");
      reader.hidden = false; ta.hidden = true;
      speak(text, { rate: Number(R.$("#laRate", view).value), voice: voiceSel.value, onBoundary: (e) => { const spans = R.$$("[data-o]", reader); let cur = null; spans.forEach((s) => { if (Number(s.dataset.o) <= e.charIndex) cur = s; }); spans.forEach((s) => s.classList.toggle("is-word", s === cur)); }, onEnd: () => setState("idle") });
      setState("playing");
    });
    R.$("#laStop", view).addEventListener("click", () => { stopSpeech(); setState("idle"); });
    view.addEventListener("click", (e) => { const l = e.target.closest("[data-load]"); if (l) { const s = R.state.summaries.find((x) => x.id === l.dataset.load); stopSpeech(); setState("idle"); ta.value = `${s.title}. ${s.points.takeaways.join(" ")}`; est(); } });
    return () => { stopSpeech(); if (supported) speechSynthesis.removeEventListener("voiceschanged", voices); };
  }
})();
