/* ==========================================================================
   Recalro app shell: grouped navigation, hash router, top bar with live
   gamification chips, notifications, command palette, theme and mobile nav.
   Routes look like  #/app/<page>[/<sub>][?key=value]
   ========================================================================== */
(function () {
  "use strict";
  const R = window.R;
  const { esc, icon } = { esc: R.esc, icon: R.icon };

  /* ---------- Information architecture ----------
     Groups keep the rail short: collapsed, each group is one icon that opens a
     side panel; expanded, only the group you're in is open (accordion).
     Profile and Settings live in the account area, not the feature list. */
  R.NAV = [
    { id: "overview", label: "Overview", icon: "home", items: [{ route: "dashboard", label: "Dashboard", icon: "home", keywords: "home overview command centre" }] },
    { id: "learning", label: "Learning", icon: "book", items: [
      { route: "subjects", label: "Subjects", icon: "book", keywords: "courses materials upload documents" },
      { route: "roadmap", label: "Learning Roadmap", icon: "map", keywords: "path modules milestones journey" },
      { route: "planner", label: "Study Planner", icon: "calendar", keywords: "schedule calendar deadlines tasks" },
      { route: "vault", label: "Knowledge Vault", icon: "archive", keywords: "formulas definitions laws dates notes library" } ] },
    { id: "study", label: "Study Tools", icon: "cards", items: [
      { route: "flashcards", label: "Flashcards", icon: "cards", badge: "due", keywords: "cards decks recall" },
      { route: "review", label: "Review Center", icon: "refresh", keywords: "due queue spaced repetition" },
      { route: "practice", label: "Quick Practice", icon: "zap", keywords: "quiz questions" },
      { route: "exam", label: "Exam Simulator", icon: "clipboard", keywords: "test timed mock" },
      { route: "tutor", label: "AI Tutor", icon: "sparkles", keywords: "chat ask explain it to me" },
      { route: "summaries", label: "Summaries", icon: "file", keywords: "notes read aloud listen audio" } ] },
    { id: "insights", label: "Insights", icon: "chart", items: [
      { route: "analytics", label: "Analytics", icon: "chart", keywords: "stats charts trends" },
      { route: "weakness", label: "Weakness Detector", icon: "target", keywords: "mistakes weak topics" },
      { route: "memory", label: "Memory Center", icon: "brain", keywords: "forgetting curve retention" },
      { route: "readiness", label: "Exam Readiness", icon: "gauge", keywords: "prepared score" },
      { route: "reports", label: "Weekly Reports", icon: "report", keywords: "summary week export" } ] },
    { id: "community", label: "Community", icon: "users", items: [
      { route: "groups", label: "Study Groups", icon: "users", keywords: "team collaborate" },
      { route: "challenges", label: "Challenges", icon: "swords", keywords: "weekly goals" },
      { route: "leaderboards", label: "Leaderboards", icon: "trophy", keywords: "league ranking" } ] },
    { id: "rewards", label: "Rewards", icon: "award", items: [
      { route: "achievements", label: "Achievements", icon: "award", keywords: "badges" },
      { route: "quests", label: "Daily Quests", icon: "check-circle", keywords: "goals today" },
      { route: "store", label: "Reward Store", icon: "bag", keywords: "shop gems avatar frame" } ] },
  ];
  R.ACCOUNT = [
    { route: "profile", label: "Profile", icon: "user", keywords: "me avatar" },
    { route: "settings", label: "Settings", icon: "settings", keywords: "preferences theme goal" },
  ];
  // Bottom bar on phones: four destinations + More. Each claims the routes it covers.
  const TABS = [
    { id: "home", label: "Home", icon: "home", route: "dashboard", covers: ["dashboard"] },
    { id: "learn", label: "Learn", icon: "book", route: "subjects", covers: ["subjects", "roadmap", "planner", "vault"] },
    { id: "practice", label: "Practice", icon: "cards", route: "review", covers: ["review", "flashcards", "practice", "exam"], badge: "due" },
    { id: "tutor", label: "AI Tutor", icon: "sparkles", route: "tutor", covers: ["tutor", "summaries"] },
  ];
  const navItem = (route) => { for (const g of R.NAV) for (const it of g.items) if (it.route === route) return { ...it, group: g }; const a = R.ACCOUNT.find((x) => x.route === route); return a ? { ...a, group: { id: "account", label: "Account" } } : null; };
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
  // Pages that change their own URL (e.g. the tutor giving a new chat its id) use this
  // so the router stays in sync and a later navigation to the old URL still renders.
  R.replaceRoute = (route) => {
    const hash = `#/app/${route}`;
    history.replaceState(null, "", hash);
    lastHash = hash;
    if (current) current.ctx = R.parseRoute(hash);
  };
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

  /* ---------- AppShell markup ----------
     DesktopNavigationRail (≥768px): grouped accordion, collapsible to an icon rail.
     MobileBottomNavigation (<768px): Home · Learn · Practice · AI Tutor · More.
     MobileNavigationHub: full-screen sheet opened by More. */
  const navLink = (it) => `<a class="nav-link" href="#/app/${it.route}" data-route="${it.route}" data-label="${esc(it.label)}">${icon(it.icon)}<span class="nav-label">${it.label}</span>${it.badge ? `<span class="nav-badge" data-badge="${it.badge}" hidden></span>` : ""}</a>`;
  function navMarkup() {
    return R.NAV.map((g) => {
      if (g.id === "overview") return `<div class="nav-group nav-group-flat">${g.items.map(navLink).join("")}</div>`;
      return `<div class="nav-group" data-group="${g.id}">
        <button type="button" class="nav-group-head" aria-expanded="false" aria-controls="ng-${g.id}" data-label="${esc(g.label)}">${icon(g.icon, "ng-ic")}<span class="ng-label">${g.label}</span>${icon("chevron-down", "ng-chev")}</button>
        <div class="nav-group-items" id="ng-${g.id}"><div>${g.items.map(navLink).join("")}</div></div></div>`;
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
          <button type="button" class="icon-btn sb-collapse" id="sbCollapse" aria-pressed="false">${icon("sidebar")}</button>
        </div>
        <button type="button" class="sb-search" data-cmd data-label="Search">${icon("search")}<span>Search</span><kbd class="sb-kbd">${/Mac|iP/.test(navigator.platform) ? "⌘" : "Ctrl"} K</kbd></button>
        <nav class="sb-nav" id="sbNav">${navMarkup()}</nav>
        <div class="rail-flyout" id="railFlyout" hidden></div>
        <button type="button" class="sb-foot" id="sbFoot" data-account aria-haspopup="dialog"></button>
      </aside>
      <div class="main">
        <header class="topbar">
          <a class="tb-brand" href="#/app/dashboard" aria-label="Recalro dashboard"><img src="assets/recalro-logo.png" width="1254" height="1254" alt=""></a>
          <nav class="crumbs" id="crumbs" aria-label="Breadcrumb"></nav>
          <p class="tb-title" id="tbTitle" aria-hidden="true"></p>
          <div class="tb-right">
            <button type="button" class="icon-btn tb-search" data-cmd aria-label="Search">${icon("search")}</button>
            <a class="chip chip-streak" href="#/app/quests" id="chipStreak">${icon("flame")}<b data-streak>0</b><span class="sr-only"> day streak</span></a>
            <a class="chip chip-gem" href="#/app/store" id="chipGem">${icon("gem")}<b data-gems>0</b><span class="sr-only"> gems</span></a>
            <a class="chip chip-xp" href="#/app/achievements" id="chipXp" data-xp-chip><span class="chip-lv">Lv <b data-level>1</b></span><span class="chip-bar"><i data-xpbar></i></span><span class="sr-only" data-xp-sr></span></a>
            <button type="button" class="icon-btn tb-bell" id="bellBtn" aria-label="Notifications" aria-haspopup="dialog">${icon("bell")}<i class="bell-dot" hidden></i></button>
            <button type="button" class="tb-avatar" id="avatarBtn" data-account aria-label="Account" aria-haspopup="dialog"></button>
          </div>
        </header>
        <main id="view" class="view" tabindex="-1"></main>
      </div>
      <nav class="tabbar" id="tabbar" aria-label="Main">
        ${TABS.map((t) => `<a href="#/app/${t.route}" data-tab="${t.id}"><span class="tab-ic">${icon(t.icon)}${t.badge ? `<i class="tab-badge" data-badge="${t.badge}" hidden></i>` : ""}</span><span class="tab-label">${t.label}</span></a>`).join("")}
        <button type="button" id="tabMore" data-tab="more" aria-haspopup="dialog"><span class="tab-ic">${icon("grid")}</span><span class="tab-label">More</span></button>
      </nav>
    </div>`;
    wire();
    R.updateChips(true);
  }

  /* ---------- Chrome updates ---------- */
  function activeTab(page) { const t = TABS.find((x) => x.covers.includes(page)); return t ? t.id : "more"; }
  function updateChrome(ctx, def) {
    const item = navItem(ctx.page);
    R.$$(".nav-link").forEach((a) => { const on = a.dataset.route === ctx.page; a.classList.toggle("is-active", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    R.$$(".nav-group").forEach((g) => g.classList.toggle("has-active", !!item && g.dataset.group === item.group.id));
    if (item && item.group.id !== "overview" && item.group.id !== "account") openGroup(item.group.id);
    R.$("#shell").dataset.route = ctx.page;
    const tab = activeTab(ctx.page);
    R.$$(".tabbar [data-tab]").forEach((t) => { const on = t.dataset.tab === tab; t.classList.toggle("is-active", on); if (on) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); });
    const extra = def.crumb ? def.crumb(ctx) : null;
    const pageLabel = item ? item.label : def.title || "Recalro";
    const parts = [];
    if (item && item.group.id !== "overview") parts.push(`<span>${item.group.label}</span>`);
    parts.push(extra ? `<a href="#/app/${ctx.page}">${esc(pageLabel)}</a>` : `<span aria-current="page">${esc(pageLabel)}</span>`);
    if (extra) parts.push(`<span aria-current="page">${esc(extra)}</span>`);
    R.$("#crumbs").innerHTML = parts.join(`<i>${icon("chevron-right")}</i>`);
    R.$("#tbTitle").textContent = extra || pageLabel;
    document.title = `${extra || pageLabel} · Recalro`;
    closeFlyout();
  }
  // Focus mode hides all navigation chrome (exams, flashcard review).
  R.setFocusMode = (on) => { R.$("#shell")?.classList.toggle("is-focus", !!on); document.body.classList.toggle("focus-mode", !!on); };

  let chipState = null;
  R.updateChips = (initial = false) => {
    if (!R.$("#shell")) return;
    const lv = R.levelInfo(), st = R.streak(), due = R.dueCards().length;
    const streakEl = R.$("[data-streak]"), gemEl = R.$("[data-gems]"), lvEl = R.$("[data-level]");
    if (initial || !chipState) { streakEl.textContent = st.current; gemEl.textContent = R.fmt(R.state.gems); lvEl.textContent = lv.level; gemEl.dataset.value = R.state.gems; }
    else {
      if (chipState.gems !== R.state.gems) { R.countUp(gemEl, R.state.gems, { from: chipState.gems }); pulse("#chipGem"); }
      if (chipState.streak !== st.current) { streakEl.textContent = st.current; pulse("#chipStreak"); R.$("#chipStreak").classList.add("is-lit"); setTimeout(() => R.$("#chipStreak")?.classList.remove("is-lit"), 1400); }
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
    R.$("#sbFoot").innerHTML = `${R.ui.avatar(36)}<span class="sb-foot-text"><b>${esc(R.displayName())}</b><small>Level ${lv.level} · ${R.fmt(lv.xp)} XP</small>${R.ui.progress(lv.pct, { size: "thin", label: "Progress to next level" })}</span>`;
    R.$("#sbFoot").setAttribute("aria-label", `Account: ${R.displayName()}, level ${lv.level}`);
    R.$("#sbFoot").setAttribute("data-label", R.displayName());
    chipState = { gems: R.state.gems, streak: st.current, level: lv.level };
  };
  const pulse = (sel) => R.animate(R.$(sel), [{ transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }], { duration: 450, easing: "cubic-bezier(.3,1.5,.5,1)" });
  R.on("change", () => { R.updateChips(); document.body.classList.toggle("reduce-motion", !!R.state.settings.reduceMotion); });
  R.on("earned", (res) => R.reward(res, res.anchor));
  R.refreshWith = (ctx) => { if (!current || !ctx) return; current.ctx = ctx; lastHash = ctx.hash; R.refresh(); };
  R.on("save-error", () => R.toast("Your browser couldn't save this change. Check its storage settings.", { icon: "info", tone: "toast-warn" }));

  /* ---------- Rail behaviour ---------- */
  const tabletRail = () => window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches;
  const isRail = () => tabletRail() || !!R.state.settings.sidebarCollapsed;
  // Accordion: one group open at a time keeps the expanded sidebar short.
  function openGroup(id) {
    R.$$(".nav-group[data-group]").forEach((g) => {
      const on = g.dataset.group === id;
      g.classList.toggle("is-open", on);
      g.querySelector(".nav-group-head").setAttribute("aria-expanded", String(on && !isRail()));
    });
  }
  function applyCollapsed() {
    const rail = isRail();
    R.$("#shell").classList.toggle("is-collapsed", rail);
    const btn = R.$("#sbCollapse");
    btn.setAttribute("aria-pressed", String(rail));
    btn.setAttribute("aria-label", rail ? "Expand sidebar" : "Collapse sidebar");
    btn.setAttribute("data-tip", rail ? "Expand sidebar" : "Collapse sidebar");
    // In the rail, labels are hidden, so every control gets a tooltip.
    R.$$(".nav-group-flat .nav-link, .nav-group-head, .sb-search, .sb-foot").forEach((a) => { if (rail) a.setAttribute("data-tip", a.dataset.label); else a.removeAttribute("data-tip"); });
    R.$$(".nav-group-head").forEach((h) => { h.setAttribute("aria-haspopup", rail ? "true" : "false"); if (rail) h.setAttribute("aria-expanded", "false"); else h.setAttribute("aria-expanded", String(h.closest(".nav-group").classList.contains("is-open"))); });
    closeFlyout();
  }
  // Collapsed rail: a group icon opens a contextual side panel with that group's pages.
  let flyoutFor = null;
  function openFlyout(head) {
    const g = R.NAV.find((x) => x.id === head.closest(".nav-group").dataset.group), fly = R.$("#railFlyout");
    if (flyoutFor === g.id) { closeFlyout(); return; }
    closeFlyout();
    flyoutFor = g.id;
    fly.innerHTML = `<p class="fly-title">${g.label}</p>${g.items.map(navLink).join("")}`;
    const cur = R.currentRoute()?.page;
    R.$$(".nav-link", fly).forEach((a) => { if (a.dataset.route === cur) { a.classList.add("is-active"); a.setAttribute("aria-current", "page"); } });
    R.updateChips();
    const sb = R.$("#sidebar").getBoundingClientRect(), r = head.getBoundingClientRect();
    fly.hidden = false;
    fly.style.top = `${Math.max(8, Math.min(r.top - sb.top - 8, window.innerHeight - fly.offsetHeight - 12))}px`;
    head.setAttribute("aria-expanded", "true"); head.classList.add("is-flyout");
    R.animate(fly, [{ opacity: 0, transform: "translateX(-8px)" }, { opacity: 1, transform: "none" }], { duration: 180 });
    fly.querySelector(".nav-link")?.focus();
  }
  function closeFlyout(returnFocus) {
    const fly = R.$("#railFlyout"); if (!fly || fly.hidden) return;
    const head = R.$(`.nav-group[data-group="${flyoutFor}"] .nav-group-head`);
    fly.hidden = true; flyoutFor = null;
    if (head) { head.setAttribute("aria-expanded", "false"); head.classList.remove("is-flyout"); if (returnFocus) head.focus(); }
  }

  /* ---------- MobileNavigationHub ---------- */
  function openHub() {
    const lv = R.levelInfo(), st = R.streak(), cur = R.currentRoute()?.page;
    const tile = (it) => `<a class="hub-tile ${it.route === cur ? "is-active" : ""}" href="#/app/${it.route}" data-close ${it.route === cur ? 'aria-current="page"' : ""}><span class="hub-ic">${icon(it.icon)}</span><span>${it.label}</span>${it.badge ? `<i class="hub-badge" data-badge="${it.badge}" hidden></i>` : ""}</a>`;
    const groups = R.NAV.filter((g) => g.id !== "overview");
    const body = `
      <div class="hub-search">${icon("search")}<input type="search" placeholder="Find a feature" aria-label="Find a feature" autocomplete="off"></div>
      <a class="hub-me" href="#/app/profile" data-close>${R.ui.avatar(46)}<span><b>${esc(R.displayName())}</b><small>Level ${lv.level} · ${R.fmt(lv.xp)} XP · ${st.current}-day streak</small>${R.ui.progress(lv.pct, { size: "thin", label: "Progress to next level" })}</span>${icon("chevron-right")}</a>
      ${groups.map((g) => `<section class="hub-group" data-hub-group><h3>${g.label}</h3><div class="hub-grid">${g.items.map(tile).join("")}</div></section>`).join("")}
      <section class="hub-group" data-hub-group><h3>Account</h3><div class="hub-grid">${R.ACCOUNT.map(tile).join("")}</div>
        <div class="hub-row"><span>Theme</span>${R.ui.segmented("theme", [["light", "Light"], ["dark", "Dark"], ["system", "Auto"]], R.getTheme())}</div>
        <button type="button" class="hub-signout" data-signout>${icon("logout")}Sign out</button></section>
      <p class="hub-empty" hidden>No features match.</p>`;
    R.sheet({ title: "Everything in Recalro", body, variant: "full", cls: "hub-sheet", onOpen(d, close) {
      R.$("#tabMore").setAttribute("aria-expanded", "true");
      R.updateChips();
      R.$$("[data-badge='due']", d).forEach((b) => { const n = R.dueCards().length; b.hidden = !n; b.textContent = n > 99 ? "99+" : n; });
      const input = d.querySelector(".hub-search input");
      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase(); let any = false;
        R.$$("[data-hub-group]", d).forEach((g) => { let n = 0; R.$$(".hub-tile", g).forEach((t) => { const hit = !q || t.textContent.toLowerCase().includes(q) || (navItem(t.getAttribute("href").split("/").pop())?.keywords || "").includes(q); t.hidden = !hit; if (hit) n++; }); g.hidden = !n && !!q; if (n) any = true; });
        d.querySelector(".hub-empty").hidden = any;
      });
      d.addEventListener("click", (e) => {
        const seg = e.target.closest("[data-seg=theme]");
        if (seg) { R.setTheme(seg.dataset.value); R.$$("[data-seg=theme]", d).forEach((b) => { const on = b === seg; b.classList.toggle("is-on", on); b.setAttribute("aria-checked", String(on)); }); }
        if (e.target.closest("[data-signout]")) { close(); setTimeout(() => R.signOut(), 220); }
      });
      R.$$(".hub-group", d).forEach((g, i) => R.animate(g, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 320, delay: 40 * i }));
    }, onClose: () => { R.$("#tabMore")?.setAttribute("aria-expanded", "false"); R.$("#tabMore")?.focus(); } });
  }

  /* ---------- Notifications & account: sheets, not dropdowns ---------- */
  function openNotifications() {
    R.state.notifications.forEach((n) => (n.read = true)); R.save(); R.updateChips();
    R.sheet({ title: "Notifications", body: notesMarkup(), cls: "notes-sheet", onOpen(d, close) {
      d.addEventListener("click", (e) => {
        if (e.target.closest("a")) close();
        if (e.target.closest("[data-clear]")) { R.state.notifications = []; R.save(); d.querySelector(".sheet-body").innerHTML = notesMarkup(); R.updateChips(); }
      });
    }, onClose: () => R.$("#bellBtn")?.focus() });
  }
  function openAccount(opener) {
    R.sheet({ title: "Account", body: menuMarkup(), cls: "account-sheet", onOpen(d, close) {
      d.addEventListener("click", (e) => {
        const seg = e.target.closest("[data-seg=theme]");
        if (seg) { R.setTheme(seg.dataset.value); R.$$("[data-seg=theme]", d).forEach((b) => { const on = b === seg; b.classList.toggle("is-on", on); b.setAttribute("aria-checked", String(on)); }); }
        if (e.target.closest("a")) close();
        if (e.target.closest("[data-signout]")) { close(); setTimeout(() => R.signOut(), 220); }
      });
    }, onClose: () => opener?.focus() });
  }
  function notesMarkup() {
    const due = R.dueCards().length, quests = R.todaysQuests().filter((q) => !q.done).length;
    const live = [];
    if (due) live.push(`<a class="note-item live" href="#/app/review">${icon("refresh")}<span><b>${R.plural(due, "card")} due for review</b><small>From your review schedule</small></span></a>`);
    if (quests) live.push(`<a class="note-item live" href="#/app/quests">${icon("check-circle")}<span><b>${R.plural(quests, "daily quest")} left today</b><small>Finish them for bonus XP and gems</small></span></a>`);
    const list = R.state.notifications.slice(0, 20).map((n) => `<a class="note-item" href="#/app/${n.route || "dashboard"}">${icon(n.icon)}<span><b>${esc(n.text)}</b><small>${R.relTime(n.at)}</small></span></a>`).join("");
    return `${live.length ? `<p class="sheet-label">Right now</p>${live.join("")}` : ""}
      ${list ? `<div class="sheet-label-row"><p class="sheet-label">Recent</p><button type="button" class="link-btn" data-clear>Clear all</button></div>${list}` : live.length ? "" : `<div class="pop-empty">${icon("check-circle")}<p>You're all caught up.</p></div>`}`;
  }
  function menuMarkup() {
    const user = window.RecalroAuth?.currentUser() || {}, lv = R.levelInfo();
    return `<div class="menu-user">${R.ui.avatar(48)}<span><b>${esc(R.displayName())}</b><small>${esc(user.email || "Demo account")}</small><small>Level ${lv.level} · ${R.fmt(lv.xp)} XP</small></span></div>
      <a class="menu-item" href="#/app/profile">${icon("user")}Profile${icon("chevron-right", "menu-go")}</a>
      <a class="menu-item" href="#/app/settings">${icon("settings")}Settings${icon("chevron-right", "menu-go")}</a>
      <a class="menu-item" href="#/app/achievements">${icon("award")}Achievements${icon("chevron-right", "menu-go")}</a>
      <div class="menu-theme"><span>Theme</span>${R.ui.segmented("theme", [["light", "Light"], ["dark", "Dark"], ["system", "Auto"]], R.getTheme())}</div>
      <button type="button" class="menu-item menu-signout" data-signout>${icon("logout")}Sign out</button>`;
  }

  /* ---------- Wiring ---------- */
  function wire() {
    R.$("#sbNav").addEventListener("click", (e) => {
      const head = e.target.closest(".nav-group-head"); if (!head) return;
      if (isRail()) { openFlyout(head); return; }
      const g = head.closest(".nav-group");
      if (g.classList.contains("is-open")) { g.classList.remove("is-open"); head.setAttribute("aria-expanded", "false"); } else openGroup(g.dataset.group);
    });
    R.$("#sbCollapse").addEventListener("click", () => { R.state.settings.sidebarCollapsed = !R.state.settings.sidebarCollapsed; R.save(); applyCollapsed(); const item = navItem(R.currentRoute()?.page); if (item) openGroup(item.group.id); });
    window.matchMedia("(min-width: 768px) and (max-width: 1023px)").addEventListener("change", applyCollapsed);
    applyCollapsed();
    R.$("#railFlyout").addEventListener("click", (e) => { if (e.target.closest("a")) closeFlyout(); });
    R.$("#railFlyout").addEventListener("keydown", (e) => {
      const links = R.$$(".nav-link", R.$("#railFlyout")), i = links.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); links[(i + 1) % links.length].focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); links[(i - 1 + links.length) % links.length].focus(); }
    });
    document.addEventListener("pointerdown", (e) => { if (!e.target.closest("#railFlyout, .nav-group-head")) closeFlyout(); });
    R.$("#tabMore").addEventListener("click", openHub);
    R.$$("[data-cmd]").forEach((b) => b.addEventListener("click", R.openCommand));
    R.$("#bellBtn").addEventListener("click", openNotifications);
    R.$$("[data-account]").forEach((b) => b.addEventListener("click", () => openAccount(b)));
    document.addEventListener("keydown", (e) => {
      if (R.$("#app").classList.contains("hidden")) return;
      if (e.key === "Escape" && !R.$("#railFlyout").hidden) { closeFlyout(true); return; }
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing && !document.querySelector("dialog[open]"))) { e.preventDefault(); R.openCommand(); }
    });
    // Virtual keyboard: hide the bottom bar while typing so inputs and the tutor composer stay visible.
    const vv = window.visualViewport;
    if (vv) {
      const onVV = () => {
        const open = window.innerHeight - vv.height > 140 && /INPUT|TEXTAREA/.test(document.activeElement?.tagName);
        document.body.classList.toggle("kb-open", open);
        document.documentElement.style.setProperty("--vvh", `${vv.height}px`);
      };
      vv.addEventListener("resize", onVV); onVV();
      document.addEventListener("focusout", () => setTimeout(onVV, 50));
    }
  }

  /* ---------- Command palette ---------- */
  R.commands = () => {
    const out = [];
    R.NAV.forEach((g) => g.items.forEach((it) => out.push({ kind: "Go to", label: it.label, sub: g.label, icon: it.icon, keywords: it.keywords, run: () => R.go(it.route) })));
    R.ACCOUNT.forEach((it) => out.push({ kind: "Go to", label: it.label, sub: "Account", icon: it.icon, keywords: it.keywords, run: () => R.go(it.route) }));
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
    closeFlyout();
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
