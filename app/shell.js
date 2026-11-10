/* ==========================================================================
   Recalro app shell: grouped navigation, hash router, top bar with live
   gamification chips, notifications, command palette, theme and mobile nav.
   Routes look like  #/app/<page>[/<sub>][?key=value]
   ========================================================================== */
(function () {
  "use strict";
  const R = window.R;
  const { esc, icon } = { esc: R.esc, icon: R.icon };

  /* ---------- Information architecture ---------- */
  R.NAV = [
    { id: "overview", label: "Overview", items: [{ route: "dashboard", label: "Dashboard", icon: "home", keywords: "home overview command centre" }] },
    { id: "learning", label: "My Learning", items: [
      { route: "subjects", label: "My Subjects", icon: "book", keywords: "courses materials upload documents" },
      { route: "roadmap", label: "Learning Roadmap", icon: "map", keywords: "path modules milestones journey" },
      { route: "planner", label: "Study Planner", icon: "calendar", keywords: "schedule calendar deadlines tasks" },
      { route: "vault", label: "Knowledge Vault", icon: "archive", keywords: "formulas definitions laws dates notes library" } ] },
    { id: "study", label: "Study Tools", items: [
      { route: "flashcards", label: "Flashcards", icon: "cards", badge: "due", keywords: "cards decks recall" },
      { route: "review", label: "Review Center", icon: "refresh", keywords: "due queue spaced repetition" },
      { route: "practice", label: "Quick Practice", icon: "zap", keywords: "quiz questions" },
      { route: "exam", label: "Exam Simulator", icon: "clipboard", keywords: "test timed mock" },
      { route: "tutor", label: "AI Tutor", icon: "sparkles", keywords: "chat ask explain it to me" },
      { route: "summaries", label: "Summaries", icon: "file", keywords: "notes read aloud listen audio" } ] },
    { id: "insights", label: "Insights", items: [
      { route: "analytics", label: "Learning Analytics", icon: "chart", keywords: "stats charts trends" },
      { route: "weakness", label: "Weakness Detector", icon: "target", keywords: "mistakes weak topics" },
      { route: "memory", label: "Memory Center", icon: "brain", keywords: "forgetting curve retention" },
      { route: "readiness", label: "Exam Readiness", icon: "gauge", keywords: "prepared score" },
      { route: "reports", label: "Weekly Reports", icon: "report", keywords: "summary week export" } ] },
    { id: "community", label: "Community", items: [
      { route: "groups", label: "Study Groups", icon: "users", keywords: "team collaborate" },
      { route: "challenges", label: "Challenges", icon: "swords", keywords: "weekly goals" },
      { route: "leaderboards", label: "Leaderboards", icon: "trophy", keywords: "league ranking" } ] },
    { id: "rewards", label: "Rewards", items: [
      { route: "quests", label: "Daily Quests", icon: "check-circle", keywords: "goals today" },
      { route: "achievements", label: "Achievements", icon: "award", keywords: "badges" },
      { route: "store", label: "Avatar & Reward Store", icon: "bag", keywords: "shop gems avatar frame" } ] },
    { id: "account", label: "Account", items: [
      { route: "profile", label: "Profile", icon: "user", keywords: "me avatar" },
      { route: "settings", label: "Settings", icon: "settings", keywords: "preferences theme goal" } ] },
  ];
  const navItem = (route) => { for (const g of R.NAV) for (const it of g.items) if (it.route === route) return { ...it, group: g }; return null; };
  // Names used by the marketing page and older code.
  const LEGACY = { Dashboard: "dashboard", "AI Tutor": "tutor", Flashcards: "flashcards", "Exam Simulator": "exam", Roadmap: "roadmap", "Knowledge Vault": "vault", "Memory Center": "memory", "Study Planner": "planner", "Study Groups": "groups", Subjects: "subjects", "Exam Readiness": "readiness", "Weekly Reports": "reports", Settings: "settings" };

  /* ---------- Page registry & router ---------- */
  R.pages = {};
  R.page = (id, def) => { R.pages[id] = def; };
  R.go = (route) => { const target = `#/app/${route}`; if (location.hash === target) R.renderRoute(); else location.hash = target; };
  R.parseRoute = (hash = location.hash) => {
    const m = hash.match(/^#\/app\/?([^?]*)(?:\?(.*))?$/);
    if (!m) return null;
    const parts = (m[1] || "dashboard").split("/").filter(Boolean);
    return { page: parts[0] || "dashboard", sub: parts.slice(1), query: Object.fromEntries(new URLSearchParams(m[2] || "")), path: m[1] || "dashboard", hash };
  };
  let current = null, lastHash = null, cleanup = null;
  R.renderRoute = async () => {
    const appEl = document.getElementById("app");
    if (!appEl || appEl.classList.contains("hidden")) return;
    const ctx = R.parseRoute();
    if (!ctx) return;
    const def = R.pages[ctx.page] || R.pages.dashboard;
    // Let the current page veto navigation (e.g. leaving an exam in progress).
    if (current && current.def.leave && lastHash && lastHash !== ctx.hash) {
      const ok = await current.def.leave(ctx);
      // Restoring the old hash fires hashchange, which is ignored because it equals lastHash.
      if (!ok) { location.hash = lastHash; return; }
    }
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    current = { def, ctx };
    lastHash = ctx.hash;
    R.setFocusMode(false);
    const view = freshView(`view view-${ctx.page}`);
    try { cleanup = def.render(view, ctx) || null; }
    catch (error) { console.error(`Recalro: the ${ctx.page} page failed to render`, error); view.innerHTML = R.ui.empty({ icon: "info", title: "This page couldn't load", body: "Something went wrong while building this page. Try again, or head back to your dashboard.", action: R.ui.link("Back to dashboard", "dashboard") }); }
    updateChrome(ctx, def);
    R.animate(view, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 260 });
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  };
  R.currentRoute = () => current?.ctx;
  // Pages attach listeners to the view, so every render gets a brand-new element.
  function freshView(cls) {
    const old = R.$("#view"), view = document.createElement("main");
    view.id = "view"; view.tabIndex = -1; view.className = cls || old.className;
    old.replaceWith(view);
    return view;
  }
  R.refresh = () => {
    if (!current) return;
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const y = window.scrollY, view = freshView();
    try { cleanup = current.def.render(view, current.ctx) || null; } catch (error) { console.error(error); }
    window.scrollTo(0, y);
  };
  window.addEventListener("hashchange", () => { if (location.hash !== lastHash) R.renderRoute(); });

  /* ---------- Theme (light / dark / system) ---------- */
  const THEME_KEY = "recalro-theme", darkMq = window.matchMedia("(prefers-color-scheme: dark)");
  R.getTheme = () => { try { return localStorage.getItem(THEME_KEY) || "light"; } catch { return "light"; } };
  R.applyTheme = () => { const t = R.getTheme(); document.body.classList.toggle("dark", t === "dark" || (t === "system" && darkMq.matches)); };
  R.setTheme = (t) => { try { localStorage.setItem(THEME_KEY, t); } catch (e) { console.error("Recalro: could not save theme", e); } R.applyTheme(); R.emit("theme"); };
  darkMq.addEventListener("change", R.applyTheme);
  R.applyTheme();

  /* ---------- Shell markup ---------- */
  function navMarkup() {
    const open = R.state.settings.navOpen || {};
    return R.NAV.map((g) => {
      const items = g.items.map((it) => `<a class="nav-link" href="#/app/${it.route}" data-route="${it.route}" data-label="${esc(it.label)}">${icon(it.icon)}<span class="nav-label">${it.label}</span>${it.badge ? `<span class="nav-badge" data-badge="${it.badge}" hidden></span>` : ""}</a>`).join("");
      if (g.id === "overview") return `<div class="nav-group nav-group-flat">${items}</div>`;
      const isOpen = open[g.id] !== false;
      return `<div class="nav-group ${isOpen ? "is-open" : ""}" data-group="${g.id}"><button type="button" class="nav-group-head" aria-expanded="${isOpen}" aria-controls="ng-${g.id}"><span>${g.label}</span>${icon("chevron-down")}</button><div class="nav-group-items" id="ng-${g.id}"><div>${items}</div></div></div>`;
    }).join("");
  }
  function build() {
    const appEl = document.getElementById("app");
    appEl.innerHTML = `
    <div class="shell ${R.state.settings.sidebarCollapsed ? "is-collapsed" : ""}" id="shell">
      <a class="skip-link" href="#view">Skip to content</a>
      <aside class="sidebar" id="sidebar" aria-label="Main navigation">
        <div class="sb-top">
          <a class="sb-brand" href="#/app/dashboard" aria-label="Recalro dashboard"><img src="assets/recalro-logo.png" width="1254" height="1254" alt=""><span class="sb-word">recal<b>ro</b></span></a>
          <button type="button" class="icon-btn sb-collapse" id="sbCollapse" aria-label="Collapse sidebar" aria-pressed="false">${icon("sidebar")}</button>
          <button type="button" class="icon-btn sb-close" id="sbClose" aria-label="Close navigation">${icon("x")}</button>
        </div>
        <button type="button" class="sb-search" data-cmd>${icon("search")}<span>Search Recalro</span><kbd class="sb-kbd">${/Mac|iP/.test(navigator.platform) ? "⌘" : "Ctrl"} K</kbd></button>
        <nav class="sb-nav" id="sbNav">${navMarkup()}</nav>
        <a class="sb-foot" href="#/app/profile" id="sbFoot"></a>
      </aside>
      <div class="scrim" id="scrim"></div>
      <div class="main">
        <header class="topbar">
          <button type="button" class="icon-btn tb-menu" id="tbMenu" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon("menu")}</button>
          <a class="tb-brand" href="#/app/dashboard" aria-label="Recalro dashboard"><img src="assets/recalro-logo.png" width="1254" height="1254" alt=""></a>
          <nav class="crumbs" id="crumbs" aria-label="Breadcrumb"></nav>
          <div class="tb-right">
            <button type="button" class="icon-btn tb-search" data-cmd aria-label="Search">${icon("search")}</button>
            <a class="chip chip-streak" href="#/app/quests" id="chipStreak">${icon("flame")}<b data-streak>0</b><span class="sr-only"> day streak</span></a>
            <a class="chip chip-gem" href="#/app/store" id="chipGem">${icon("gem")}<b data-gems>0</b><span class="sr-only"> gems</span></a>
            <a class="chip chip-xp" href="#/app/achievements" id="chipXp" data-xp-chip><span class="chip-lv">Lv <b data-level>1</b></span><span class="chip-bar"><i data-xpbar></i></span><span class="sr-only" data-xp-sr></span></a>
            <div class="pop-wrap">
              <button type="button" class="icon-btn tb-bell" id="bellBtn" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">${icon("bell")}<i class="bell-dot" hidden></i></button>
              <div class="popover pop-notes" id="notesPop" hidden></div>
            </div>
            <div class="pop-wrap">
              <button type="button" class="tb-avatar" id="avatarBtn" aria-label="Account menu" aria-haspopup="true" aria-expanded="false"></button>
              <div class="popover pop-menu" id="menuPop" hidden></div>
            </div>
          </div>
        </header>
        <main id="view" class="view" tabindex="-1"></main>
      </div>
      <nav class="tabbar" aria-label="Quick navigation">
        <a href="#/app/dashboard" data-tab="dashboard">${icon("home")}<span>Home</span></a>
        <a href="#/app/subjects" data-tab="subjects roadmap planner vault">${icon("book")}<span>Learn</span></a>
        <a href="#/app/flashcards" data-tab="flashcards review practice exam" class="tab-primary">${icon("cards")}<span>Review</span><i class="tab-badge" data-badge="due" hidden></i></a>
        <a href="#/app/tutor" data-tab="tutor summaries">${icon("sparkles")}<span>Tutor</span></a>
        <button type="button" id="tabMore" data-tab="more">${icon("grid")}<span>More</span></button>
      </nav>
    </div>`;
    wire();
    R.updateChips(true);
  }

  /* ---------- Chrome updates ---------- */
  function updateChrome(ctx, def) {
    const item = navItem(ctx.page);
    R.$$(".nav-link").forEach((a) => { const on = a.dataset.route === ctx.page; a.classList.toggle("is-active", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (item && item.group.id !== "overview") setGroupOpen(item.group.id, true, false);
    R.$$(".tabbar [data-tab]").forEach((t) => t.classList.toggle("is-active", t.dataset.tab.split(" ").includes(ctx.page)));
    const extra = def.crumb ? def.crumb(ctx) : null;
    const pageLabel = item ? item.label : def.title || "Recalro";
    const parts = [];
    if (item && item.group.id !== "overview") parts.push(`<span>${item.group.label}</span>`);
    parts.push(extra ? `<a href="#/app/${ctx.page}">${esc(pageLabel)}</a>` : `<span aria-current="page">${esc(pageLabel)}</span>`);
    if (extra) parts.push(`<span aria-current="page">${esc(extra)}</span>`);
    R.$("#crumbs").innerHTML = parts.join(`<i>${icon("chevron-right")}</i>`);
    document.title = `${extra || pageLabel} · Recalro`;
    closeDrawer();
  }
  R.setFocusMode = (on) => R.$("#shell")?.classList.toggle("is-focus", !!on);

  let chipState = null;
  R.updateChips = (initial = false) => {
    if (!R.$("#shell")) return;
    const lv = R.levelInfo(), st = R.streak(), due = R.dueCards().length;
    const streakEl = R.$("[data-streak]"), gemEl = R.$("[data-gems]"), lvEl = R.$("[data-level]");
    if (initial || !chipState) { streakEl.textContent = st.current; gemEl.textContent = R.fmt(R.state.gems); lvEl.textContent = lv.level; gemEl.dataset.value = R.state.gems; }
    else {
      if (chipState.gems !== R.state.gems) { R.countUp(gemEl, R.state.gems, { from: chipState.gems }); pulse("#chipGem"); }
      if (chipState.streak !== st.current) { streakEl.textContent = st.current; pulse("#chipStreak"); }
      if (chipState.level !== lv.level) { lvEl.textContent = lv.level; pulse("#chipXp"); }
    }
    R.$("#chipStreak").classList.toggle("is-cold", !st.todayDone);
    R.$("#chipStreak").setAttribute("data-tip", st.todayDone ? `${st.current}-day streak. You've studied today.` : st.current ? `${st.current}-day streak. Study today to keep it going.` : "Start a streak by studying today.");
    R.$("#chipGem").setAttribute("data-tip", `${R.fmt(R.state.gems)} demo gems. Spend them in the reward store.`);
    R.$("#chipXp").setAttribute("data-tip", `Level ${lv.level} · ${R.fmt(lv.into)} / ${R.fmt(lv.needed)} XP to level ${lv.level + 1}`);
    R.$("[data-xp-sr]").textContent = `, ${Math.round(lv.pct)}% to next level`;
    R.$("[data-xpbar]").style.setProperty("--p", `${lv.pct}%`);
    R.$$("[data-badge='due']").forEach((b) => { b.hidden = !due; b.textContent = due > 99 ? "99+" : due; });
    const unread = R.state.notifications.filter((n) => !n.read).length;
    R.$(".bell-dot").hidden = !unread;
    R.$("#bellBtn").setAttribute("aria-label", unread ? `Notifications, ${unread} unread` : "Notifications");
    R.$("#avatarBtn").innerHTML = R.ui.avatar(34);
    R.$("#sbFoot").innerHTML = `${R.ui.avatar(38)}<span class="sb-foot-text"><b>${esc(R.displayName())}</b><small>Level ${lv.level} · ${R.fmt(lv.xp)} XP</small>${R.ui.progress(lv.pct, { size: "thin", label: "Progress to next level" })}</span>`;
    chipState = { gems: R.state.gems, streak: st.current, level: lv.level };
  };
  const pulse = (sel) => R.animate(R.$(sel), [{ transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }], { duration: 450, easing: "cubic-bezier(.3,1.5,.5,1)" });
  R.on("change", () => { R.updateChips(); document.body.classList.toggle("reduce-motion", !!R.state.settings.reduceMotion); });
  R.on("earned", (res) => R.reward(res, res.anchor));
  R.refreshWith = (ctx) => { if (!current || !ctx) return; current.ctx = ctx; lastHash = ctx.hash; R.refresh(); };
  R.on("save-error", () => R.toast("Your browser couldn't save this change. Check its storage settings.", { icon: "info", tone: "toast-warn" }));

  /* ---------- Navigation behaviour ---------- */
  function setGroupOpen(id, open, persist = true) {
    const g = R.$(`.nav-group[data-group="${id}"]`); if (!g) return;
    g.classList.toggle("is-open", open);
    g.querySelector(".nav-group-head").setAttribute("aria-expanded", String(open));
    if (persist) { R.state.settings.navOpen = { ...R.state.settings.navOpen, [id]: open }; R.save(); }
  }
  const isDrawerMode = () => window.matchMedia("(max-width: 1023px)").matches;
  function openDrawer() { R.$("#shell").classList.add("drawer-open"); R.$("#tbMenu").setAttribute("aria-expanded", "true"); setTimeout(() => R.$("#sidebar .nav-link.is-active, #sidebar .nav-link")?.focus(), 50); }
  function closeDrawer() { const s = R.$("#shell"); if (!s || !s.classList.contains("drawer-open")) return; s.classList.remove("drawer-open"); R.$("#tbMenu").setAttribute("aria-expanded", "false"); }
  function applyCollapsed() {
    const collapsed = !!R.state.settings.sidebarCollapsed;
    R.$("#shell").classList.toggle("is-collapsed", collapsed);
    const btn = R.$("#sbCollapse");
    btn.setAttribute("aria-pressed", String(collapsed));
    btn.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    btn.setAttribute("data-tip", collapsed ? "Expand sidebar" : "Collapse sidebar");
    // Tooltips only matter when labels are hidden.
    R.$$(".nav-link").forEach((a) => { if (collapsed) a.setAttribute("data-tip", a.dataset.label); else a.removeAttribute("data-tip"); });
  }
  function wire() {
    R.$("#sbNav").addEventListener("click", (e) => { const head = e.target.closest(".nav-group-head"); if (head) { const g = head.closest(".nav-group"); setGroupOpen(g.dataset.group, !g.classList.contains("is-open")); } });
    R.$("#sbCollapse").addEventListener("click", () => { R.state.settings.sidebarCollapsed = !R.state.settings.sidebarCollapsed; R.save(); applyCollapsed(); });
    applyCollapsed();
    R.$("#tbMenu").addEventListener("click", openDrawer);
    R.$("#tabMore").addEventListener("click", openDrawer);
    R.$("#sbClose").addEventListener("click", closeDrawer);
    R.$("#scrim").addEventListener("click", closeDrawer);
    R.$$("[data-cmd]").forEach((b) => b.addEventListener("click", R.openCommand));
    R.$("#bellBtn").addEventListener("click", (e) => { e.stopPropagation(); togglePop("notes"); });
    R.$("#avatarBtn").addEventListener("click", (e) => { e.stopPropagation(); togglePop("menu"); });
    document.addEventListener("click", (e) => { if (!e.target.closest(".pop-wrap")) closePops(); });
    R.$("#notesPop").addEventListener("click", (e) => { if (e.target.closest("a")) closePops(); });
    R.$("#sidebar").addEventListener("click", (e) => { if (e.target.closest("a") && isDrawerMode()) closeDrawer(); });
    document.addEventListener("keydown", (e) => {
      if (R.$("#app").classList.contains("hidden")) return;
      if (e.key === "Escape") { closePops(); closeDrawer(); }
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing && !document.querySelector("dialog[open]"))) { e.preventDefault(); R.openCommand(); }
    });
  }

  /* ---------- Popovers: notifications & account menu ---------- */
  function closePops() { ["notes", "menu"].forEach((k) => { const p = R.$(k === "notes" ? "#notesPop" : "#menuPop"); if (p && !p.hidden) { p.hidden = true; R.$(k === "notes" ? "#bellBtn" : "#avatarBtn").setAttribute("aria-expanded", "false"); } }); }
  function togglePop(kind) {
    const pop = R.$(kind === "notes" ? "#notesPop" : "#menuPop"), btn = R.$(kind === "notes" ? "#bellBtn" : "#avatarBtn");
    const opening = pop.hidden;
    closePops();
    if (!opening) return;
    pop.innerHTML = kind === "notes" ? notesMarkup() : menuMarkup();
    pop.hidden = false; btn.setAttribute("aria-expanded", "true");
    R.animate(pop, [{ opacity: 0, transform: "translateY(-6px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 180 });
    if (kind === "notes") {
      R.state.notifications.forEach((n) => (n.read = true)); R.save(); R.updateChips();
      pop.querySelector("[data-clear]")?.addEventListener("click", () => { R.state.notifications = []; R.save(); pop.innerHTML = notesMarkup(); R.updateChips(); });
    } else wireMenu(pop);
    pop.querySelector("a,button")?.focus();
  }
  function wireMenu(pop) {
    pop.querySelector("[data-theme-cycle]").addEventListener("click", () => {
      const order = ["light", "dark", "system"];
      R.setTheme(order[(order.indexOf(R.getTheme()) + 1) % 3]);
      pop.innerHTML = menuMarkup(); wireMenu(pop);
      pop.querySelector("[data-theme-cycle]").focus();
    });
    pop.querySelector("[data-signout]").addEventListener("click", () => { closePops(); R.signOut(); });
    pop.addEventListener("click", (e) => { if (e.target.closest("a")) closePops(); });
  }
  function notesMarkup() {
    const due = R.dueCards().length, quests = R.todaysQuests().filter((q) => !q.done).length;
    const live = [];
    if (due) live.push(`<a class="note-item live" href="#/app/review">${icon("refresh")}<span><b>${R.plural(due, "card")} due for review</b><small>From your review schedule</small></span></a>`);
    if (quests) live.push(`<a class="note-item live" href="#/app/quests">${icon("check-circle")}<span><b>${R.plural(quests, "daily quest")} left today</b><small>Finish them for bonus XP and gems</small></span></a>`);
    const list = R.state.notifications.slice(0, 12).map((n) => `<a class="note-item" href="#/app/${n.route || "dashboard"}">${icon(n.icon)}<span><b>${esc(n.text)}</b><small>${R.relTime(n.at)}</small></span></a>`).join("");
    return `<div class="pop-head"><b>Notifications</b>${R.state.notifications.length ? `<button type="button" class="link-btn" data-clear>Clear all</button>` : ""}</div>
      <div class="pop-body">${live.join("")}${list || (live.length ? "" : `<p class="pop-empty">You're all caught up.</p>`)}</div>`;
  }
  function menuMarkup() {
    const theme = R.getTheme(), user = window.RecalroAuth?.currentUser() || {};
    return `<div class="menu-user">${R.ui.avatar(40)}<span><b>${esc(R.displayName())}</b><small>${esc(user.email || "Demo account")}</small></span></div>
      <a class="menu-item" href="#/app/profile">${icon("user")}Profile</a>
      <a class="menu-item" href="#/app/settings">${icon("settings")}Settings</a>
      <button type="button" class="menu-item" data-theme-cycle>${icon(theme === "dark" ? "moon" : "sun")}Theme: <span class="menu-val">${theme[0].toUpperCase() + theme.slice(1)}</span></button>
      <div class="menu-sep"></div>
      <button type="button" class="menu-item" data-signout>${icon("logout")}Sign out</button>`;
  }

  /* ---------- Command palette ---------- */
  R.commands = () => {
    const out = [];
    R.NAV.forEach((g) => g.items.forEach((it) => out.push({ kind: "Go to", label: it.label, sub: g.label, icon: it.icon, keywords: it.keywords, run: () => R.go(it.route) })));
    out.push(
      { kind: "Action", label: "Start a review session", icon: "refresh", keywords: "flashcards due", run: () => R.go("review") },
      { kind: "Action", label: "Start a practice exam", icon: "clipboard", keywords: "test", run: () => R.go("exam") },
      { kind: "Action", label: "Ask the AI Tutor", icon: "sparkles", keywords: "chat new", run: () => R.go("tutor?new=1") },
      { kind: "Action", label: "Explain it to me", icon: "quote", keywords: "teach back feynman", run: () => R.go("tutor/explain") },
      { kind: "Action", label: "Read text aloud", icon: "volume", keywords: "audio speech listen", run: () => R.go("summaries/listen") },
      { kind: "Action", label: "Save to Knowledge Vault", icon: "bookmark", keywords: "add formula definition", run: () => R.go("vault?new=1") },
      { kind: "Action", label: "Add a subject", icon: "plus", keywords: "create course", run: () => R.go("subjects?new=1") },
      { kind: "Action", label: "Toggle dark mode", icon: "moon", keywords: "theme appearance light", run: () => R.setTheme(document.body.classList.contains("dark") ? "light" : "dark") },
      { kind: "Action", label: "Sign out", icon: "logout", keywords: "log out", run: () => R.signOut() },
    );
    R.subjects().forEach((s) => out.push({ kind: "Subject", label: s.name, sub: s.field, icon: "book", keywords: (s.modules || []).map((m) => m.name).join(" "), run: () => R.go(`subjects/${s.id}`) }));
    R.vaultItems().forEach((v) => out.push({ kind: "Vault", label: v.title, sub: v.detail, icon: "archive", keywords: v.category, run: () => R.go(`vault?q=${encodeURIComponent(v.title)}`) }));
    return out;
  };
  R.openCommand = () => {
    if (document.querySelector(".cmd-dialog[open]")) return;
    closePops(); closeDrawer();
    const all = R.commands();
    let results = [], active = 0;
    R.dialog({ cls: "cmd-dialog", labelled: false,
      body: `<div class="cmd-input">${icon("search")}<input type="text" placeholder="Search pages, actions, subjects and vault…" aria-label="Search Recalro" role="combobox" aria-expanded="true" aria-controls="cmdList" autocomplete="off"><kbd>Esc</kbd></div><ul class="cmd-list" id="cmdList" role="listbox"></ul>`,
      onOpen: (d, close) => {
        const input = d.querySelector("input"), list = d.querySelector("#cmdList");
        const draw = () => {
          const qv = input.value.trim().toLowerCase();
          results = (qv ? all.filter((c) => `${c.label} ${c.sub || ""} ${c.keywords || ""} ${c.kind}`.toLowerCase().includes(qv)) : all.filter((c) => c.kind !== "Vault")).slice(0, 40);
          active = R.clamp(active, 0, Math.max(0, results.length - 1));
          let lastKind = "";
          list.innerHTML = results.length ? results.map((c, i) => { const head = c.kind !== lastKind ? `<li class="cmd-group" role="presentation">${c.kind}</li>` : ""; lastKind = c.kind; return `${head}<li role="option" id="cmd-${i}" class="cmd-item ${i === active ? "is-active" : ""}" aria-selected="${i === active}" data-i="${i}">${icon(c.icon)}<span><b>${esc(c.label)}</b>${c.sub ? `<small>${esc(c.sub)}</small>` : ""}</span>${i === active ? icon("arrow-right", "cmd-go") : ""}</li>`; }).join("") : `<li class="cmd-empty">No results for “${esc(input.value)}”</li>`;
          input.setAttribute("aria-activedescendant", results.length ? `cmd-${active}` : "");
          list.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
        };
        const run = (i) => { const c = results[i]; if (!c) return; close(); setTimeout(c.run, 10); };
        input.addEventListener("input", () => { active = 0; draw(); });
        input.addEventListener("keydown", (e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(results.length - 1, active + 1); draw(); }
          if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
          if (e.key === "Enter") { e.preventDefault(); run(active); }
        });
        list.addEventListener("click", (e) => { const li = e.target.closest("[data-i]"); if (li) run(Number(li.dataset.i)); });
        list.addEventListener("mousemove", (e) => { const li = e.target.closest("[data-i]"); if (li && Number(li.dataset.i) !== active) { active = Number(li.dataset.i); draw(); } });
        draw(); input.focus();
      } });
  };

  /* ---------- Entry points used by the marketing/auth script ---------- */
  let built = false;
  R.openApp = (page = "dashboard") => {
    const route = LEGACY[page] || page;
    if (!built) { build(); built = true; }
    R.applyTheme();
    R.updateChips(true);
    document.body.classList.toggle("reduce-motion", !!R.state.settings.reduceMotion);
    document.getElementById("app").classList.remove("hidden");
    // Setting the hash updates location synchronously; render now, and the
    // resulting hashchange is skipped because the hash already matches.
    if (location.hash !== `#/app/${route}`) location.hash = `#/app/${route}`;
    lastHash = null;
    R.renderRoute();
  };
  R.closeApp = () => {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    current = null; lastHash = null;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (location.hash.startsWith("#/app")) history.replaceState(null, "", location.pathname + location.search);
    document.title = "Recalro — Learn with purpose. Remember for life.";
  };
  R.signOut = async () => {
    if (current?.def.leave) { const ok = await current.def.leave({ page: "signout" }); if (!ok) return; }
    window.RecalroAuth?.signOut();
  };
})();
