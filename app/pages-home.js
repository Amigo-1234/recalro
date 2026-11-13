/* ==========================================================================
   Dashboard + Insights pages: Dashboard, Learning Analytics, Weakness
   Detector, Memory Center, Exam Readiness, Weekly Reports.
   Every number here is derived from activity recorded in this browser.
   ========================================================================== */
(function () {
  "use strict";
  const R = window.R, ui = R.ui, { esc, icon } = { esc: R.esc, icon: R.icon };
  const sc = (id) => `var(--s${R.subjectIndex(id) % 4})`;
  const wk = (d) => R.dayName(d).slice(0, 3);

  /* ======================= DASHBOARD ======================= */
  function greetingLine() {
    const st = R.streak(), due = R.dueCards().length, quests = R.todaysQuests(), left = quests.filter((q) => !q.done).length;
    if (!R.state.activity.length) return "Welcome to your learning workspace. Start with a short review and Recalro will begin tracking your progress.";
    if (st.atRisk) return `Your ${st.current}-day streak is waiting. One focused session today keeps it alive.`;
    if (due) return `You have ${R.plural(due, "card")} ready for review${left ? ` and ${R.plural(left, "quest")} left today` : ""}.`;
    if (left) return `${R.plural(left, "daily quest")} left. Small steps, stronger understanding.`;
    return "Everything due is done. Explore something new or get ahead on your roadmap.";
  }
  function weekDots() {
    const start = R.startOfWeek(), days = R.studyDays(), today = R.dayKey();
    return `<div class="week-dots">${Array.from({ length: 7 }, (_, i) => { const d = R.addDays(start, i), k = R.dayKey(d), done = days.has(k); return `<span class="wd ${done ? "is-done" : ""} ${k === today ? "is-today" : ""}" data-tip="${esc(R.fmtDate(d, { weekday: "long" }))}: ${done ? "studied" : k > today ? "upcoming" : "no study"}"><i>${done ? icon("check") : ""}</i><small>${R.dayName(d, "narrow")}</small></span>`; }).join("")}</div>`;
  }
  function league() {
    const total = R.totalXP(), lg = [...R.content.leagues].reverse().find((l) => total >= l.min) || R.content.leagues[0];
    const weekly = R.sum(R.activitySince(R.startOfWeek()), (a) => a.xp);
    const board = [...R.content.peers.map(([n, x]) => ({ name: n, xp: x })), { name: R.displayName(), xp: weekly, me: true }].sort((a, b) => b.xp - a.xp);
    return { lg, weekly, board, rank: board.findIndex((b) => b.me) + 1 };
  }
  R.league = league;
  function statTile({ label, value, sub, icon: ic, tone = "", tip = "", extra = "", href }) {
    return `<${href ? `a href="#/app/${href}"` : "div"} class="stat ${tone}" ${tip ? `data-tip="${esc(tip)}"` : ""}><div class="stat-top"><span>${label}</span><span class="stat-ic">${icon(ic)}</span></div><strong>${value}</strong>${sub ? `<small>${sub}</small>` : ""}${extra}</${href ? "a" : "div"}>`;
  }

  R.page("dashboard", { title: "Dashboard", render(view) {
    const lv = R.levelInfo(), st = R.streak(), due = R.dueCards(), fresh = R.newCards();
    const last7 = R.activitySince(R.addDays(R.startOfDay(), -6)), prev7 = R.state.activity.filter((a) => { const t = new Date(a.at); return t >= R.addDays(R.startOfDay(), -13) && t < R.addDays(R.startOfDay(), -6); });
    const acc = R.accuracy(last7), accPrev = R.accuracy(prev7);
    const delta = acc != null && accPrev != null ? Math.round(acc - accPrev) : null;
    const weekMins = R.minutesFor(R.activitySince(R.startOfWeek()));
    const todayMins = R.minutesFor(R.activityOn(R.dayKey())), goal = R.state.settings.dailyGoal;
    const quests = R.todaysQuests(), plannerToday = R.state.planner.filter((p) => p.date === R.dayKey());
    const lg = league();
    const recent = R.subjects().map((s) => ({ s, last: R.lastStudied(s.id) })).sort((a, b) => (b.last || "").localeCompare(a.last || ""));
    const continueList = (recent.some((r) => r.last) ? recent : recent).slice(0, 3);
    const recs = R.recommendations();
    const achievements = R.achievementList(), nextAch = achievements.filter((a) => !a.unlockedAt).sort((a, b) => b.value / b.target - a.value / a.target)[0];
    const unlocked = achievements.filter((a) => a.unlockedAt).length;
    const series = R.series(7);
    const now = new Date();

    view.innerHTML = `
    <div class="dash">
      <section class="hero-card">
        <div class="hero-main">
          <div class="eyebrow">${esc(now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }))}</div>
          <h1>${esc(R.timeGreeting ? R.timeGreeting() : "Hello")}, ${esc(R.firstName())}</h1>
          <p>${esc(greetingLine())}</p>
          <div class="hero-actions">
            ${due.length || fresh.length ? ui.link(due.length ? `Review ${R.plural(due.length, "card")}` : "Start learning new cards", due.length ? "review" : "flashcards", { icon: "play", size: "lg" }) : ui.link("Take a quick practice", "practice", { icon: "zap", size: "lg" })}
            ${ui.link("Ask the tutor", "tutor", { tone: "glass", icon: "sparkles", size: "lg" })}
          </div>
        </div>
        <div class="hero-goal">
          ${ui.ring((todayMins / goal) * 100, { size: 132, stroke: 11, tone: "on-dark", label: `${Math.round(todayMins)}<span>/${goal}</span>`, sub: "min today", aria: `Daily goal: ${Math.round(todayMins)} of ${goal} minutes` })}
          <small>Daily goal · est. from activity</small>
        </div>
      </section>

      <section class="card streak-card">
        <div class="streak-top">
          <div class="streak-flame ${st.todayDone ? "is-lit" : ""}">${icon("flame")}</div>
          <div><strong data-count="${st.current}">${st.current}</strong><span>day streak</span></div>
          <a class="league-chip" href="#/app/leaderboards" data-tip="Weekly rank among sample peers">${icon("trophy")}${lg.lg.name} · #${lg.rank}</a>
        </div>
        ${weekDots()}
        <p class="streak-note">${st.todayDone ? `You've studied today. Best streak: ${R.plural(st.best, "day")}.` : st.current ? "Study today to extend your streak." : "Complete any activity to start a streak."}</p>
      </section>

      <div class="stat-row">
        ${statTile({ label: "Total XP", value: `<span data-count="${lv.xp}">${R.fmt(lv.xp)}</span>`, sub: `Level ${lv.level} · ${R.fmt(lv.needed - lv.into)} XP to level ${lv.level + 1}`, icon: "bolt", tone: "is-xp", extra: ui.progress(lv.pct, { tone: "orange", size: "thin", label: "Level progress" }), href: "achievements" })}
        ${statTile({ label: "Flashcards due", value: due.length, sub: `${fresh.length} new cards available`, icon: "cards", href: "review" })}
        ${statTile({ label: "Recent accuracy", value: R.pct(acc), sub: delta == null ? "Last 7 days" : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} pts vs previous 7 days`, icon: "target", tone: delta != null ? (delta >= 0 ? "is-up" : "is-down") : "", tip: "Share of reviews rated Good/Easy and practice answers that were correct", href: "analytics" })}
        ${statTile({ label: "Study time", value: `${(weekMins / 60).toFixed(1)}<small>h</small>`, sub: "This week · estimated", icon: "clock", tip: "Estimated from the activities you completed", href: "reports" })}
      </div>

      ${ui.card(`<div class="continue-list">${continueList.map(({ s, last }) => {
        const mods = R.moduleStatus(s), active = mods.find((m) => m.status === "active") || mods[mods.length - 1], mastery = R.subjectMastery(s.id);
        return `<article class="continue-item" style="--sc:${sc(s.id)}">
          <div class="ci-icon">${icon("book")}</div>
          <div class="ci-body"><div class="ci-top"><h3>${esc(s.name)}</h3>${s.sample ? ui.sample() : ""}</div>
            <p>${active ? `Module · ${esc(active.name)}` : "No modules yet"}</p>
            <div class="ci-progress">${ui.progress(mastery, { label: `${s.name} mastery` })}<span>${R.pct(mastery)}</span></div>
            <small>${last ? `Last studied ${R.relTime(last)}` : "Not started yet"}</small></div>
          ${ui.link(last ? "Continue" : "Start", active ? `flashcards?module=${active.id}` : `subjects/${s.id}`, { tone: "soft", size: "sm", iconRight: "arrow-right" })}
        </article>`; }).join("")}</div>`, { title: "Continue learning", icon: "book", cls: "span-8", action: ui.link("All subjects", "subjects", { tone: "ghost", size: "sm", iconRight: "arrow-right" }) })}

      ${ui.card(`<ul class="plan-list">${quests.map((q) => `<li class="plan-item ${q.done ? "is-done" : ""}">
          <span class="plan-check">${icon(q.done ? "check" : q.icon)}</span>
          <div><b>${esc(q.title)}</b>${ui.progress((q.progress / q.target) * 100, { tone: q.done ? "teal" : "orange", size: "thin", label: q.title })}<small>${q.progress}/${q.target}${q.done ? " · completed" : ""}</small></div>
          <span class="xp-tag">+${q.xp} XP</span></li>`).join("")}
          ${plannerToday.map((p) => `<li class="plan-item ${p.done ? "is-done" : ""}"><button type="button" class="plan-check as-btn" data-plan="${p.id}" aria-pressed="${p.done}" aria-label="Mark ${esc(p.title)} as ${p.done ? "not done" : "done"}">${icon(p.done ? "check" : "calendar")}</button><div><b>${esc(p.title)}</b><small>${p.time ? esc(p.time) + " · " : ""}${p.duration} min · Study planner</small></div></li>`).join("")}
        </ul>${plannerToday.length ? "" : `<a class="plan-add" href="#/app/planner">${icon("plus")}Plan a study block for today</a>`}`,
        { title: "Today's learning plan", icon: "check-circle", cls: "span-4", sub: `${quests.filter((q) => q.done).length} of ${quests.length} quests complete`, action: ui.link("Quests", "quests", { tone: "ghost", size: "sm" }) })}

      ${ui.card(`<div class="progress-tabs">${ui.segmented("dashchart", [["activity", "Activity"], ["accuracy", "Accuracy"], ["mastery", "Mastery"]], "activity")}</div><div id="dashChart"></div>`, { title: "Learning progress", icon: "chart", cls: "span-8", action: ui.link("Full analytics", "analytics", { tone: "ghost", size: "sm", iconRight: "arrow-right" }) })}

      ${ui.card(`<div class="due-hero"><div><strong>${due.length}</strong><span>due now</span></div><div><strong>${fresh.length}</strong><span>new</span></div><div><strong>${R.cards().filter((c) => { const s = R.state.cards[c.id]; return s && s.due && new Date(s.due) > new Date() && new Date(s.due) < R.addDays(new Date(), 7); }).length}</strong><span>next 7 days</span></div></div>
        ${(() => { const atRisk = R.cards().filter((c) => !R.isNew(c.id)).map((c) => ({ c, r: R.retention(c.id) })).sort((a, b) => a.r - b.r).slice(0, 3); return atRisk.length ? `<ul class="mini-list">${atRisk.map(({ c, r }) => `<li>${ui.subjectDot(c.subject)}<span>${esc(c.front)}</span><b data-tip="Estimated recall probability now">${R.pct(r * 100)}</b></li>`).join("")}</ul>` : `<p class="muted small">Review cards to build your schedule. Recalro will show what's fading here.</p>`; })()}
        ${ui.link(due.length ? "Start review" : "Learn new cards", due.length ? "review" : "flashcards", { size: "block", icon: "play" })}`,
        { title: "Upcoming reviews", icon: "refresh", cls: "span-4" })}

      ${ui.card(`<div class="recs">${recs.slice(0, 3).map((r) => `<article class="rec rec-${r.tone}"><span class="rec-icon">${icon(r.icon)}</span><div><h3>${esc(r.title)}</h3><p>${esc(r.body)}</p><small>${icon("info")}${esc(r.reason)}</small></div>${ui.link(r.action.label, r.action.route, { tone: "soft", size: "sm", iconRight: "arrow-right" })}</article>`).join("")}</div>`,
        { title: "Recommended for you", icon: "bulb", cls: "span-8", sub: "Based only on activity recorded in this workspace" })}

      ${ui.card(`<div class="game-ov">
          ${ui.ring(lv.pct, { size: 96, stroke: 9, tone: "orange", label: `${lv.level}`, sub: "level", aria: `Level ${lv.level}, ${Math.round(lv.pct)}% to next` })}
          <div class="game-ov-list">
            <a href="#/app/quests"><span>${icon("check-circle")}Daily quests</span><b>${quests.filter((q) => q.done).length}/${quests.length}</b></a>
            <a href="#/app/achievements"><span>${icon("award")}Achievements</span><b>${unlocked}/${achievements.length}</b></a>
            <a href="#/app/leaderboards"><span>${icon("trophy")}${lg.lg.name} league</span><b>#${lg.rank}</b></a>
            <a href="#/app/store"><span>${icon("gem")}Gems</span><b>${R.fmt(R.state.gems)}</b></a>
          </div></div>
          ${nextAch ? `<div class="next-ach"><span class="ach-mini">${icon(nextAch.icon)}</span><div><b>Next: ${esc(nextAch.name)}</b><small>${esc(nextAch.desc)}</small>${ui.progress((nextAch.value / nextAch.target) * 100, { tone: "orange", size: "thin", label: nextAch.name })}</div><span class="muted small">${nextAch.value}/${nextAch.target}</span></div>` : ""}
          <p class="demo-line">${ui.demo("Demo rewards")}</p>`,
        { title: "Your progress", icon: "award", cls: "span-4" })}
    </div>`;

    // Progress chart switcher
    const drawChart = (kind) => {
      const box = R.$("#dashChart", view);
      if (kind === "activity") box.innerHTML = R.chart.columns(series.map((d, i) => ({ label: wk(d.day), value: d.xp, highlight: i === 6, tip: `${R.fmtDate(d.day, { weekday: "long" })}: ${R.fmt(d.xp)} XP · ~${Math.round(d.minutes)} min` })), { aria: "XP earned per day, last 7 days", unit: " XP" }) + `<p class="chart-note">XP earned per day · today highlighted</p>`;
      if (kind === "accuracy") { const s14 = R.series(14); box.innerHTML = s14.some((d) => d.accuracy != null) ? R.chart.line(s14.map((d) => R.fmtDate(d.day)), [{ name: "Accuracy", color: "var(--teal)", values: s14.map((d) => d.accuracy) }], { max: 100, unit: "%", aria: "Daily accuracy, last 14 days" }) + `<p class="chart-note">Daily accuracy, last 14 days</p>` : ui.empty({ icon: "target", title: "No accuracy data yet", body: "Rate flashcards or answer practice questions to see your accuracy trend." }); }
      if (kind === "mastery") box.innerHTML = R.chart.hbars(R.subjects().map((s) => ({ label: s.name, value: R.subjectMastery(s.id), color: sc(s.id), sub: `${R.cards(s.id).filter((c) => !R.isNew(c.id)).length} of ${R.cards(s.id).length} cards studied` })));
    };
    drawChart("activity");
    view.addEventListener("click", (e) => {
      const seg = e.target.closest("[data-seg='dashchart']");
      if (seg) { R.$$("[data-seg='dashchart']", view).forEach((b) => { b.classList.toggle("is-on", b === seg); b.setAttribute("aria-checked", String(b === seg)); }); drawChart(seg.dataset.value); }
      const plan = e.target.closest("[data-plan]");
      if (plan) { const p = R.state.planner.find((x) => x.id === plan.dataset.plan); if (p) { p.done = !p.done; R.save(); if (p.done) { R.burst(plan, { count: 12, spread: 50 }); R.toast(`Nice work: ${p.title} done.`); } R.refresh(); } }
    });
    R.$$("[data-count]", view).forEach((el) => { const to = Number(el.dataset.count); el.dataset.value = 0; R.countUp(el, to, { from: 0, dur: 900 }); });
  } });
  R.timeGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

  /* ======================= LEARNING ANALYTICS ======================= */
  R.page("analytics", { title: "Learning Analytics", render(view, ctx) {
    const range = Number(ctx.query.range || 30);
    const s = R.series(range), list = R.activitySince(s[0].day);
    const xp = R.sum(list, (a) => a.xp), mins = R.minutesFor(list), acc = R.accuracy(list), activeDays = s.filter((d) => d.xp > 0).length;
    const weekly = range > 31;
    const cols = weekly ? Array.from({ length: Math.ceil(range / 7) }, (_, i) => { const chunk = s.slice(i * 7, i * 7 + 7); return { label: R.fmtDate(chunk[0].day), value: R.sum(chunk, (d) => d.xp), tip: `Week of ${R.fmtDate(chunk[0].day)}: ${R.fmt(R.sum(chunk, (d) => d.xp))} XP` }; }) : s.map((d, i) => ({ label: range <= 7 ? wk(d.day) : R.fmtDate(d.day, { day: "numeric" }), value: d.xp, highlight: i === s.length - 1, tip: `${R.fmtDate(d.day, { weekday: "short", month: "short", day: "numeric" })}: ${R.fmt(d.xp)} XP · ~${Math.round(d.minutes)} min` }));
    const types = [["review", "Flashcard reviews"], ["answer", "Practice answers"], ["pastq", "Past questions"], ["explain", "Explanations"], ["summary", "Summaries"], ["vault", "Vault saves"], ["chat", "Tutor questions"]].map(([t, l]) => ({ label: l, n: list.filter((a) => a.t === t).length, mins: R.minutesFor(list.filter((a) => a.t === t)) })).filter((x) => x.n);
    const totalTypeMins = R.sum(types, (t) => t.mins) || 1;
    // Insights from data
    const insights = [];
    const byDow = Array(7).fill(0); list.forEach((a) => (byDow[(new Date(a.at).getDay() + 6) % 7] += a.xp || 0));
    if (xp) { const best = byDow.indexOf(Math.max(...byDow)); insights.push({ icon: "calendar", text: `You earn the most XP on <b>${["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"][best]}</b>. Protect that time in your planner.` }); }
    const half = Math.floor(range / 2), firstHalf = R.accuracy(R.activitySince(s[0].day).filter((a) => new Date(a.at) < s[half].day)), secondHalf = R.accuracy(R.activitySince(s[half].day));
    if (firstHalf != null && secondHalf != null) insights.push({ icon: secondHalf >= firstHalf ? "arrow-up-right" : "target", text: `Accuracy ${secondHalf >= firstHalf ? "improved" : "dipped"} from <b>${R.pct(firstHalf)}</b> to <b>${R.pct(secondHalf)}</b> across this period.` });
    const subj = R.subjects().map((x) => ({ x, n: list.filter((a) => a.subject === x.id).length })).sort((a, b) => b.n - a.n);
    if (subj[0]?.n) insights.push({ icon: "book", text: `<b>${esc(subj[0].x.name)}</b> got most of your attention (${R.plural(subj[0].n, "activity", "activities")}).${subj.find((x) => !x.n) ? ` ${esc(subj.find((x) => !x.n).x.name)} hasn't been touched in this period.` : ""}` });
    if (R.weakTopics()[0]) insights.push({ icon: "target", text: `Your most error-prone topic is <b>${esc(R.weakTopics()[0].module.name)}</b>. <a href="#/app/weakness">See the weakness detector</a>.` });

    view.innerHTML = `${ui.header({ eyebrow: "Insights", title: "Learning analytics", desc: "Trends from your recorded study activity. Use them to decide where your next session should go.", actions: ui.segmented("range", [["7", "7 days"], ["30", "30 days"], ["90", "90 days"]], String(range)) })}
      <div class="stat-row">
        ${statTile({ label: "XP earned", value: R.fmt(xp), sub: `Last ${range} days`, icon: "bolt", tone: "is-xp" })}
        ${statTile({ label: "Study time", value: `${(mins / 60).toFixed(1)}<small>h</small>`, sub: "Estimated from activity", icon: "clock" })}
        ${statTile({ label: "Accuracy", value: R.pct(acc), sub: "Reviews + practice", icon: "target" })}
        ${statTile({ label: "Active days", value: `${activeDays}<small>/${range}</small>`, sub: "Days with study", icon: "calendar" })}
      </div>
      <div class="grid-12">
        ${ui.card(R.chart.columns(cols, { aria: `XP per ${weekly ? "week" : "day"}`, unit: " XP", height: 200 }) + R.chart.table([weekly ? "Week of" : "Day", "XP"], cols.map((c) => [c.tip.split(":")[0], R.fmt(c.value)])), { title: `XP per ${weekly ? "week" : "day"}`, icon: "chart", cls: "span-8" })}
        ${ui.card(insights.length ? `<ul class="insights">${insights.map((i) => `<li>${icon(i.icon)}<p>${i.text}</p></li>`).join("")}</ul>` : ui.empty({ icon: "bulb", title: "Insights appear as you study", body: "Complete a few reviews or practice questions and Recalro will surface patterns here." }), { title: "Insights", icon: "bulb", cls: "span-4" })}
        ${ui.card(s.some((d) => d.accuracy != null) ? R.chart.line(s.map((d) => R.fmtDate(d.day)), [{ name: "Accuracy", color: "var(--teal)", values: s.map((d) => d.accuracy) }], { max: 100, unit: "%", aria: "Accuracy trend" }) + R.chart.table(["Day", "Accuracy", "Attempts"], s.filter((d) => d.attempts).map((d) => [R.fmtDate(d.day), R.pct(d.accuracy), d.attempts])) : ui.empty({ icon: "target", title: "No accuracy data in this range" }), { title: "Accuracy trend", icon: "target", cls: "span-6" })}
        ${ui.card(R.chart.hbars(R.subjects().map((x) => ({ label: x.name, value: R.subjectMastery(x.id), color: sc(x.id), sub: `${R.fmt(list.filter((a) => a.subject === x.id).length)} activities in range` }))), { title: "Subject mastery", icon: "map", cls: "span-6", sub: "Share of each subject's cards you recall reliably" })}
        ${ui.card(R.chart.heatmap(range > 30 ? 13 : 8), { title: "Study consistency", icon: "calendar", cls: "span-6" })}
        ${ui.card(types.length ? R.chart.hbars(types.map((t) => ({ label: t.label, value: (t.mins / totalTypeMins) * 100, sub: `${R.fmt(t.n)} · ~${Math.round(t.mins)} min` }))) : ui.empty({ icon: "clock", title: "No activity in this range" }), { title: "Where your time goes", icon: "clock", cls: "span-6", sub: "Share of estimated study time" })}
      </div>`;
    view.addEventListener("click", (e) => { const seg = e.target.closest("[data-seg='range']"); if (seg) R.go(`analytics?range=${seg.dataset.value}`); });
  } });

  /* ======================= WEAKNESS DETECTOR ======================= */
  R.page("weakness", { title: "Weakness Detector", render(view) {
    const weak = R.weakTopics(), strong = R.strongTopics().slice(0, 4);
    const mistakes = R.state.activity.filter((a) => a.t === "answer" && !a.correct && a.qid).slice(-8).reverse().map((a) => ({ a, q: R.content.questions.find((x) => x.id === a.qid) })).filter((m) => m.q);
    const lapsed = R.cards().filter((c) => (R.state.cards[c.id]?.lapses || 0) > 0).sort((a, b) => R.state.cards[b.id].lapses - R.state.cards[a.id].lapses).slice(0, 6);
    view.innerHTML = `${ui.header({ eyebrow: "Insights", title: "Weakness detector", desc: "Turns repeated mistakes into clear revision priorities. Topics appear here only after you've attempted them at least twice." })}
      ${weak.length ? `<div class="weak-list">${weak.map((w, i) => `<article class="weak-item ${i === 0 ? "is-top" : ""}">
          <div class="weak-rank">${i === 0 ? icon("target") : i + 1}</div>
          <div class="weak-body"><div class="weak-top"><h3>${esc(w.module.name)}</h3>${ui.pill(w.rate >= 0.6 ? "High focus" : w.rate >= 0.45 ? "Review" : "Monitor", w.rate >= 0.45 ? "orange" : "neutral")}</div>
            <p>${ui.subjectDot(w.module.subject.id)}${esc(w.module.subject.name)} · missed ${w.errors} of ${w.attempts} attempts</p>
            ${ui.progress(w.rate * 100, { tone: "orange", label: "Error rate" })}<small class="muted">${R.pct(w.rate * 100)} error rate</small></div>
          <div class="weak-actions">${ui.link("Revise cards", `flashcards?module=${w.id}`, { size: "sm", icon: "cards" })}${ui.link("Practice", `practice?subject=${w.module.subject.id}`, { tone: "soft", size: "sm", icon: "zap" })}${ui.link("Ask tutor", `tutor?topic=${encodeURIComponent(w.module.name)}`, { tone: "ghost", size: "sm", icon: "sparkles" })}</div>
        </article>`).join("")}</div>`
        : ui.card(ui.empty({ icon: "target", title: R.state.activity.length ? "No weak spots detected yet" : "Not enough activity yet", body: R.state.activity.length ? "Nothing has crossed the threshold (a 30%+ miss rate over 2+ attempts). Keep practising and this will update." : "Review flashcards and answer practice questions. Recalro will flag topics you keep missing.", action: ui.link("Take a quick practice", "practice", { icon: "zap" }) }))}
      <div class="grid-12">
        ${ui.card(mistakes.length ? `<ul class="mistakes">${mistakes.map(({ a, q }) => `<li><p class="mq">${esc(q.prompt)}</p><p class="ma">${icon("x", "bad")}<span>You answered: ${esc(q.answers[a.chosen] ?? "—")}</span></p><p class="ma good">${icon("check")}<span>Correct: ${esc(q.answers[q.correct])}</span></p><small>${esc(q.explanation)}</small></li>`).join("")}</ul>` : ui.empty({ icon: "check-circle", title: "No incorrect answers logged", body: "Wrong answers from practice and exams will be listed here with explanations." }), { title: "Recent mistakes", icon: "x", cls: "span-6" })}
        ${ui.card(`${lapsed.length ? `<ul class="mini-list">${lapsed.map((c) => `<li>${ui.subjectDot(c.subject)}<span>${esc(c.front)}</span><b>${R.state.cards[c.id].lapses}× forgotten</b></li>`).join("")}</ul>` : `<p class="muted small">Cards you rate “Again” are tracked here.</p>`}
          <h3 class="sub-h">Strengths</h3>${strong.length ? R.chart.hbars(strong.map((s) => ({ label: s.module.name, value: s.mastery, color: sc(s.module.subject.id), sub: s.module.subject.name }))) : `<p class="muted small">Modules above 60% mastery will show here.</p>`}`, { title: "Frequently forgotten cards", icon: "brain", cls: "span-6" })}
      </div>`;
  } });

  /* ======================= MEMORY CENTER ======================= */
  R.page("memory", { title: "Memory Center", render(view) {
    const seen = R.cards().filter((c) => !R.isNew(c.id));
    const ret = seen.map((c) => ({ c, r: R.retention(c.id) }));
    const avg = ret.length ? (R.sum(ret, (x) => x.r) / ret.length) * 100 : null;
    const atRisk = ret.filter((x) => x.r < 0.8).sort((a, b) => a.r - b.r);
    const due = R.dueCards();
    const weekReviews = R.activitySince(R.startOfWeek()).filter((a) => a.t === "review").length;
    const horizon = Array.from({ length: 15 }, (_, i) => i);
    const curve = horizon.map((d) => (ret.length ? (R.sum(seen, (c) => R.retention(c.id, Date.now() + d * 86400000)) / seen.length) * 100 : null));
    const upcoming = Array.from({ length: 7 }, (_, i) => { const day = R.addDays(R.startOfDay(), i), next = R.addDays(day, 1); const n = seen.filter((c) => { const s = R.state.cards[c.id]; const t = new Date(s.due); return i === 0 ? t < next : t >= day && t < next; }).length; return { label: i === 0 ? "Today" : wk(day), value: n, highlight: i === 0, tip: `${i === 0 ? "Today (incl. overdue)" : R.fmtDate(day, { weekday: "long" })}: ${R.plural(n, "card")}` }; });
    const history = R.state.activity.filter((a) => a.t === "review").slice(-12).reverse();
    view.innerHTML = `${ui.header({ eyebrow: "Insights", title: "Memory center", desc: "See what's fading, what's scheduled and how well your knowledge is holding up.", actions: ui.link(due.length ? `Review ${R.plural(due.length, "due card")}` : "Open review center", "review", { icon: "play" }) })}
      <div class="stat-row">
        ${statTile({ label: "Due now", value: due.length, sub: "Ready for review", icon: "refresh" })}
        ${statTile({ label: "At risk", value: atRisk.length, sub: "Below 80% est. recall", icon: "info", tone: atRisk.length ? "is-down" : "" })}
        ${statTile({ label: "Avg. retention", value: R.pct(avg), sub: "Estimated, cards studied", icon: "brain", tip: "Model estimate from your review intervals. Not a direct measurement of memory." })}
        ${statTile({ label: "Reviewed this week", value: weekReviews, sub: "Flashcard ratings", icon: "cards" })}
      </div>
      <div class="grid-12">
        ${ui.card(ret.length ? R.chart.line(horizon.map((d) => (d === 0 ? "Now" : `+${d}d`)), [{ name: "Predicted recall", color: "var(--teal)", values: curve }], { max: 100, unit: "%", aria: "Forgetting curve: predicted average recall over the next 14 days without review" }) + `<p class="chart-note">If you stopped reviewing today, this is how average recall is predicted to decay. Each review flattens the curve.</p>` : ui.empty({ icon: "brain", title: "Your forgetting curve appears after your first reviews", body: "Recalro models how quickly each card fades based on your ratings.", action: ui.link("Review cards", "flashcards", { icon: "cards" }) }), { title: "Forgetting curve", icon: "brain", cls: "span-8", sub: "Estimated with a spaced-repetition model" })}
        ${ui.card(R.chart.columns(upcoming, { aria: "Reviews scheduled over the next 7 days", height: 170 }), { title: "Upcoming revision", icon: "calendar", cls: "span-4" })}
        ${ui.card(atRisk.length ? `<ul class="mini-list risk">${atRisk.slice(0, 8).map(({ c, r }) => `<li>${ui.subjectDot(c.subject)}<span>${esc(c.front)}</span><b class="${r < 0.6 ? "bad" : ""}">${R.pct(r * 100)}</b></li>`).join("")}</ul>${ui.link("Review at-risk cards", "review?mode=risk", { size: "block", icon: "play" })}` : `<p class="muted small">Nothing is at risk right now.</p>`, { title: "At-risk knowledge", icon: "info", cls: "span-6" })}
        ${ui.card(history.length ? `<ul class="history">${history.map((h) => { const c = R.card(h.cardId); return `<li><span class="rate rate-${(h.rating || "").toLowerCase()}">${esc(h.rating)}</span><span>${esc(c?.front || "Card")}</span><small>${R.relTime(h.at)}</small></li>`; }).join("")}</ul>` : `<p class="muted small">Your review history will appear here.</p>`, { title: "Review history", icon: "clock", cls: "span-6" })}
      </div>`;
  } });

  /* ======================= EXAM READINESS ======================= */
  R.page("readiness", { title: "Exam Readiness", render(view, ctx) {
    const subjectId = ctx.query.subject && R.subject(ctx.query.subject) ? ctx.query.subject : R.subjects()[0].id;
    const s = R.subject(subjectId), r = R.readiness(subjectId);
    const parts = [["Topic coverage", r.coverage, "Cards in this subject you've studied at least once"], ["Practice accuracy", r.practice, "Correct answers in practice and exams"], ["Review health", r.reviewHealth, "Studied cards that aren't overdue"], ["Study consistency", r.consistency, "Days you studied this subject in the last 2 weeks"]];
    const weakest = parts.filter((p) => p[1] != null).sort((a, b) => a[1] - b[1])[0];
    const advice = { "Topic coverage": ["Cover the remaining cards", `flashcards?subject=${subjectId}`], "Practice accuracy": ["Practise exam-style questions", `practice?subject=${subjectId}`], "Review health": ["Clear your overdue reviews", "review"], "Study consistency": ["Schedule short daily sessions", "planner"] };
    const deadline = R.state.deadlines.filter((d) => d.subject === subjectId && new Date(d.date) >= R.startOfDay()).sort((a, b) => a.date.localeCompare(b.date))[0];
    const label = r.score >= 80 ? "Well prepared" : r.score >= 60 ? "Building confidence" : r.score >= 35 ? "Getting started" : "Early days";
    view.innerHTML = `${ui.header({ eyebrow: "Insights", title: "Exam readiness", desc: "A transparent snapshot of your preparation, not a prediction of your result.", actions: `<label class="select-inline"><span class="sr-only">Subject</span><select id="rdSubject">${R.subjects().map((x) => `<option value="${x.id}" ${x.id === subjectId ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>` })}
      <div class="grid-12">
        ${ui.card(`<div class="readiness">${ui.ring(r.score, { size: 180, stroke: 14, label: R.pct(r.score), sub: "estimated", aria: `Estimated readiness ${Math.round(r.score)}%` })}<h2>${label}</h2><p>${esc(s.name)}${deadline ? ` · ${esc(deadline.title)} ${R.inDays(deadline.date)}` : ""}</p>${r.enoughData ? "" : `<p class="note-warn">${icon("info")}Limited data: study at least 3 cards and answer 3 questions in this subject for a meaningful estimate.</p>`}</div>`, { cls: "span-5" })}
        ${ui.card(`${R.chart.hbars(parts.map(([l, v, sub]) => ({ label: l, value: v ?? 0, sub: v == null ? "No data yet" : sub })))}<p class="chart-note">Readiness = 30% coverage + 35% practice accuracy + 20% review health + 15% consistency.</p>`, { title: "What it's made of", icon: "gauge", cls: "span-7" })}
        ${weakest ? ui.card(`<div class="priority"><span class="rec-icon">${icon("target")}</span><div><h3>${advice[weakest[0]][0]}</h3><p>${esc(weakest[0])} is your lowest component at ${R.pct(weakest[1])}. Improving it moves your readiness the most.</p></div>${ui.link("Start", advice[weakest[0]][1], { size: "sm", iconRight: "arrow-right" })}</div>`, { title: "Priority before your exam", icon: "flag", cls: "span-12" }) : ""}
      </div>`;
    R.$("#rdSubject", view).addEventListener("change", (e) => R.go(`readiness?subject=${e.target.value}`));
  } });

  /* ======================= WEEKLY REPORTS ======================= */
  R.page("reports", { title: "Weekly Reports", render(view, ctx) {
    const offset = Number(ctx.query.week || 0);
    const start = R.addDays(R.startOfWeek(), -7 * offset), end = R.addDays(start, 7), pStart = R.addDays(start, -7);
    const inRange = (a, s, e) => { const t = new Date(a.at); return t >= s && t < e; };
    const list = R.state.activity.filter((a) => inRange(a, start, end)), prev = R.state.activity.filter((a) => inRange(a, pStart, start));
    const m = (l) => ({ xp: R.sum(l, (a) => a.xp), mins: R.minutesFor(l), reviews: l.filter((a) => a.t === "review").length, acc: R.accuracy(l), days: new Set(l.map((a) => R.dayKey(a.at))).size });
    const cur = m(list), old = m(prev);
    const d = (a, b, f = (x) => x) => (b == null || a == null ? "" : a === b ? "Same as last week" : `${a > b ? "▲" : "▼"} ${f(Math.abs(a - b))} vs last week`);
    const days = Array.from({ length: 7 }, (_, i) => { const day = R.addDays(start, i), l = R.activityOn(R.dayKey(day)); return { label: wk(day), value: R.sum(l, (a) => a.xp), tip: `${R.fmtDate(day, { weekday: "long" })}: ${R.fmt(R.sum(l, (a) => a.xp))} XP` }; });
    const unlocked = R.achievementList().filter((a) => a.unlockedAt && new Date(a.unlockedAt) >= start && new Date(a.unlockedAt) < end);
    const quests = list.filter((a) => a.t === "quest").length;
    const subjects = R.subjects().map((s) => ({ s, n: list.filter((a) => a.subject === s.id).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
    const weak = R.weakTopics()[0];
    view.innerHTML = `${ui.header({ eyebrow: "Insights", title: "Weekly report", desc: `${R.fmtDate(start, { month: "long", day: "numeric" })} – ${R.fmtDate(R.addDays(end, -1), { month: "long", day: "numeric" })}`, actions: `${ui.btn("", { tone: "ghost", icon: "chevron-left", attrs: `data-week="${offset + 1}" aria-label="Previous week"` })}${ui.btn("", { tone: "ghost", icon: "chevron-right", attrs: `data-week="${Math.max(0, offset - 1)}" aria-label="Next week" ${offset === 0 ? "disabled" : ""}` })}${ui.btn("Export data", { tone: "soft", icon: "download", attrs: "data-export" })}` })}
      <div class="stat-row">
        ${statTile({ label: "XP earned", value: R.fmt(cur.xp), sub: d(cur.xp, old.xp, R.fmt), icon: "bolt", tone: "is-xp" })}
        ${statTile({ label: "Study time", value: `${(cur.mins / 60).toFixed(1)}<small>h</small>`, sub: d(+(cur.mins / 60).toFixed(1), +(old.mins / 60).toFixed(1), (x) => x.toFixed(1) + "h"), icon: "clock" })}
        ${statTile({ label: "Cards reviewed", value: cur.reviews, sub: d(cur.reviews, old.reviews), icon: "cards" })}
        ${statTile({ label: "Accuracy", value: R.pct(cur.acc), sub: cur.acc != null && old.acc != null ? d(Math.round(cur.acc), Math.round(old.acc), (x) => x + " pts") : `${cur.days} active days`, icon: "target" })}
      </div>
      <div class="grid-12">
        ${ui.card(R.chart.columns(days, { aria: "XP per day this week", unit: " XP" }), { title: "Daily activity", icon: "chart", cls: "span-7" })}
        ${ui.card(`<ul class="report-list">
            <li>${icon("calendar")}<span>Studied on <b>${R.plural(cur.days, "day")}</b></span></li>
            <li>${icon("check-circle")}<span>Completed <b>${R.plural(quests, "daily quest")}</b></span></li>
            ${subjects.map((x) => `<li>${ui.subjectDot(x.s.id)}<span><b>${esc(x.s.name)}</b>: ${R.plural(x.n, "activity", "activities")}</span></li>`).join("")}
            ${unlocked.map((a) => `<li>${icon("award")}<span>Unlocked <b>${esc(a.name)}</b></span></li>`).join("")}
          </ul>${list.length ? "" : `<p class="muted small">No activity recorded this week.</p>`}`, { title: "What moved forward", icon: "arrow-up-right", cls: "span-5" })}
        ${ui.card(weak ? `<div class="priority"><span class="rec-icon">${icon("target")}</span><div><h3>Focus next week: ${esc(weak.module.name)}</h3><p>Missed ${weak.errors} of ${weak.attempts} attempts so far.</p></div>${ui.link("Plan it", "planner", { size: "sm", tone: "soft" })}</div>` : `<p class="muted small">No clear weak spot yet. Keep a steady review rhythm.</p>`, { title: "Next week's priority", icon: "flag", cls: "span-12" })}
      </div>
      <p class="muted small">${R.state.settings.weeklyReport ? "Weekly report reminders are on." : "Weekly report reminders are paused."} Email delivery needs a connected email service. ${ui.link("Settings", "settings", { tone: "link" })}</p>`;
    view.addEventListener("click", (e) => { const w = e.target.closest("[data-week]"); if (w && !w.disabled) R.go(`reports?week=${w.dataset.week}`); if (e.target.closest("[data-export]")) R.exportData(); });
  } });

  /* Export everything this workspace has recorded (pre-existing export feature). */
  R.exportData = () => {
    const report = { exportedAt: new Date().toISOString(), note: "Recalro demo workspace export. Stored only in this browser.", totalXP: R.totalXP(), level: R.levelInfo().level, streak: R.streak(), state: R.state };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `recalro-export-${R.dayKey()}.json`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    R.toast("Your workspace export has been downloaded.", { icon: "download" });
  };
})();
