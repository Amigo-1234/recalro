/* A calmer dashboard built from the same live learner state as the other pages. */
(function () {
  "use strict";
  const R = window.R, ui = R.ui, esc = R.esc, icon = R.icon;
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(value) || 0));

  R.page("dashboard", { title: "Dashboard", render(view) {
    const due = R.dueCards(), fresh = R.newCards();
    const todayMins = R.minutesFor(R.activityOn(R.dayKey()));
    const weeklyMins = R.minutesFor(R.activitySince(R.startOfWeek()));
    const goal = R.state.settings.dailyGoal || 30;
    const goalPct = clamp(todayMins / goal * 100);
    const accuracy = R.accuracy(R.activitySince(R.addDays(R.startOfDay(), -6)));
    const subjects = R.subjects().map((subject) => ({ subject, last: R.lastStudied(subject.id) }))
      .sort((a, b) => (b.last || "").localeCompare(a.last || "")).slice(0, 3);
    const quests = R.todaysQuests();
    const streak = R.streak(), level = R.levelInfo();
    const todayTasks = R.state.planner.filter((task) => task.date === R.dayKey()).slice(0, 2);
    const upcoming = R.cards().filter((card) => {
      const saved = R.state.cards[card.id], next = saved?.due ? new Date(saved.due) : null;
      return next && next > new Date() && next < R.addDays(new Date(), 7);
    }).slice(0, 3);
    const primary = due.length ? ui.link(`Review ${R.plural(due.length, "card")}`, "review", { icon: "play", size: "lg" })
      : fresh.length ? ui.link("Learn new cards", "flashcards", { icon: "play", size: "lg" })
      : ui.link("Take a quick practice", "practice", { icon: "zap", size: "lg" });
    const summary = [
      { label: "Study streak", value: R.plural(streak.current, "day"), detail: streak.todayDone ? `Best: ${R.plural(streak.best, "day")}` : streak.current ? "Study today to keep it going" : "Start with one session", route: "quests", glyph: "flame", cls: "is-streak" },
      { label: "Flashcards due", value: due.length, detail: `${fresh.length} new available`, route: "review", glyph: "cards" },
      { label: "Study time", value: `${(weeklyMins / 60).toFixed(1)} h`, detail: "This week · estimated", route: "reports", glyph: "clock" },
      { label: "Recent accuracy", value: R.pct(accuracy), detail: "Last 7 days", route: "analytics", glyph: "target" },
    ];

    view.innerHTML = `
      <div class="dash dash-modern">
        <section class="hero-card" aria-labelledby="dashGreeting">
          <div class="hero-main">
            <h1 id="dashGreeting">${esc(R.timeGreeting())}, <span class="dash-name">${esc(R.firstName())}</span></h1>
            <p>${due.length ? `You have ${R.plural(due.length, "card")} ready for review. A short session will keep you moving.` : "Choose one small step today and keep your learning moving."}</p>
            <div class="hero-actions">${primary}${ui.link("Ask the tutor", "tutor", { tone: "ghost", icon: "sparkles", size: "lg" })}</div>
          </div>
          <div class="hero-goal">
            <div class="goal-title"><b>Daily goal</b><span>${Math.round(todayMins)} of ${goal} min</span></div>
            ${ui.progress(goalPct, { label: `Daily goal: ${Math.round(todayMins)} of ${goal} minutes` })}
            <small>${goalPct}% complete · estimated from activity</small>
          </div>
        </section>

        <div class="stat-row" aria-label="Your learning at a glance">
          ${summary.map((item) => `<a class="stat ${item.cls || ""}" href="#/app/${item.route}">
            <span class="stat-ic">${icon(item.glyph)}</span>
            <span class="stat-copy"><span class="stat-label">${item.label}</span><strong>${item.value}</strong><small>${item.detail}</small></span>
          </a>`).join("")}
        </div>

        <section class="card dash-section dash-continue">
          <div class="card-head"><div class="card-title"><h2>Continue learning</h2></div>${ui.link("All subjects", "subjects", { tone: "ghost", size: "sm", iconRight: "arrow-right" })}</div>
          <div class="continue-list">${subjects.map(({ subject, last }) => {
            const modules = R.moduleStatus(subject), active = modules.find((item) => item.status === "active") || modules[modules.length - 1];
            const mastery = clamp(R.subjectMastery(subject.id));
            const route = active ? `flashcards?module=${active.id}` : `subjects/${subject.id}`;
            return `<a class="continue-item" href="#/app/${route}">
              <span class="ci-icon">${icon("book")}</span>
              <span class="ci-body"><span class="ci-top"><strong>${esc(subject.name)}</strong></span>
                <small>${last ? `Last studied ${R.relTime(last)}` : "Ready when you are"}</small>
                <span class="ci-progress">${ui.progress(mastery, { label: `${subject.name} mastery` })}<span>${mastery}%</span></span>
              </span>${icon("chevron-right", "ci-arrow")}
            </a>`;
          }).join("") || ui.empty({ icon: "book", title: "Your subjects will appear here", body: "Add a subject to start building your learning space." })}</div>
        </section>

        <section class="card dash-section dash-plan">
          <div class="card-head"><div class="card-title"><h2>Today's learning plan</h2><p>${quests.filter((quest) => quest.done).length} of ${quests.length} quests complete · Level ${level.level}</p></div>${ui.link("Quests", "quests", { tone: "ghost", size: "sm" })}</div>
          <ul class="plan-list">
            ${quests.slice(0, 3).map((quest) => `<li class="plan-item ${quest.done ? "is-done" : ""}">
              <span class="plan-check">${icon(quest.done ? "check" : quest.icon)}</span>
              <span class="plan-copy"><b>${esc(quest.title)}</b><small>${quest.progress} of ${quest.target} complete</small></span>
            </li>`).join("")}
            ${todayTasks.map((task) => `<li class="plan-item ${task.done ? "is-done" : ""}">
              <button type="button" class="plan-check as-btn" data-plan="${esc(task.id)}" aria-pressed="${task.done}" aria-label="Mark ${esc(task.title)} as ${task.done ? "not done" : "done"}">${icon(task.done ? "check" : "calendar")}</button>
              <span class="plan-copy"><b>${esc(task.title)}</b><small>${task.duration} min · Study planner</small></span>
            </li>`).join("")}
          </ul>
          ${todayTasks.length ? "" : `<a class="plan-add" href="#/app/planner">${icon("plus")}Plan a study block</a>`}
        </section>

        <section class="card dash-section dash-progress">
          <div class="card-head"><div class="card-title"><h2>Learning progress</h2><p>Your activity over the last 7 days</p></div>${ui.link("Full analytics", "analytics", { tone: "ghost", size: "sm", iconRight: "arrow-right" })}</div>
          <div id="dashChart"></div>
        </section>

        <section class="card dash-section dash-upcoming">
          <div class="card-head"><div class="card-title"><h2>Upcoming reviews</h2></div>${ui.link("Review center", "review", { tone: "ghost", size: "sm" })}</div>
          <div class="due-hero"><div><strong>${due.length}</strong><span>due now</span></div><div><strong>${fresh.length}</strong><span>new</span></div></div>
          ${upcoming.length ? `<ul class="mini-list">${upcoming.map((card) => `<li>${ui.subjectDot(card.subject)}<span>${esc(card.front)}</span></li>`).join("")}</ul>` : `<p class="muted small">Review cards to build a schedule for the week ahead.</p>`}
        </section>
      </div>`;

    const series = R.series(7);
    R.$("#dashChart", view).innerHTML = R.chart.columns(series.map((day, index) => ({
      label: R.dayName(day.day).slice(0, 3), value: day.xp, highlight: index === 6,
      tip: `${R.fmtDate(day.day, { weekday: "long" })}: ${R.fmt(day.xp)} XP`,
    })), { aria: "XP earned per day, last 7 days", unit: " XP" });
    view.addEventListener("click", (event) => {
      const button = event.target.closest("[data-plan]");
      if (!button) return;
      const task = R.state.planner.find((item) => item.id === button.dataset.plan);
      if (!task) return;
      task.done = !task.done;
      R.save();
      if (task.done) R.toast(`Nice work: ${task.title} done.`);
      R.refresh();
    });
  } });
})();
