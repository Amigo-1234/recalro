/* ==========================================================================
   Community, Rewards and Account: Study Groups, Challenges, Leaderboards,
   Daily Quests, Achievements, Avatar & Reward Store, Profile, Settings.
   Community members and league peers are sample data (no backend yet).
   ========================================================================== */
(function () {
  "use strict";
  const R = window.R, ui = R.ui, { esc, icon } = { esc: R.esc, icon: R.icon };
  const initials = (n) => n.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const peerAv = (n) => `<span class="avatar peer" style="--hue:${R.hash(n) % 360}" aria-hidden="true">${esc(initials(n))}</span>`;
  const checkRewards = () => R.record([]); // settles achievements without logging an activity

  /* ======================= STUDY GROUPS ======================= */
  const groupProgress = (g) => {
    const mine = R.state.joinedGroups.includes(g.id) ? R.activitySince(R.startOfWeek()).filter((a) => a.t === "review" && (!g.subject || a.subject === g.subject)).length : 0;
    return { total: Math.min(g.goal, g.baseProgress + mine), mine };
  };
  R.page("groups", {
    title: "Study Groups",
    crumb: (ctx) => (ctx.sub[0] ? R.groups().find((g) => g.id === ctx.sub[0])?.name || "Group" : null),
    render(view, ctx) {
      if (ctx.sub[0]) return groupDetail(view, ctx.sub[0]);
      const groups = R.groups(), joined = groups.filter((g) => R.state.joinedGroups.includes(g.id));
      view.innerHTML = `${ui.header({ eyebrow: "Community", title: "Study groups", desc: "Learn alongside people working toward similar goals. Share missions, celebrate progress.", actions: ui.btn("Create group", { icon: "plus", attrs: "data-newgroup" }), meta: ui.sample("Sample community") })}
        ${joined.length ? `<h2 class="section-h">Your groups</h2><div class="group-grid">${joined.map(groupCard).join("")}</div>` : ""}
        <h2 class="section-h">${joined.length ? "Discover" : "Find your people"}</h2>
        <div class="group-grid">${groups.filter((g) => !R.state.joinedGroups.includes(g.id)).map(groupCard).join("") || `<p class="muted small">You've joined every group.</p>`}</div>
        <p class="muted small">${icon("info")} Groups, members and activity are sample data. Real groups need the backend for membership, messaging and shared progress. Your own contribution is counted from your reviews.</p>`;
      view.addEventListener("click", (e) => {
        const j = e.target.closest("[data-join]"); if (j) { e.preventDefault(); toggleJoin(j.dataset.join, j); }
        if (e.target.closest("[data-newgroup]")) R.formDialog({ title: "Create a study group", description: "This creates a local group on this device. Inviting others needs the backend.", submitLabel: "Create group", fields: [{ name: "name", label: "Group name", required: true, maxLength: 60 }, { name: "topic", label: "Focus", maxLength: 60, placeholder: "e.g. Finals revision" }, { name: "goal", label: "Weekly review goal", type: "number", value: 50, min: 10, max: 1000, step: 10, required: true }],
          onSubmit: (v) => { const g = { id: "cg-" + R.uid(), name: v.name.trim(), topic: v.topic.trim() || "Personal group", goal: Number(v.goal) }; R.update((st) => { st.customGroups.push(g); st.joinedGroups.push(g.id); }); checkRewards(); R.toast(`${g.name} created.`, { icon: "users" }); R.go(`groups/${g.id}`); } });
      });
    },
  });
  function groupCard(g) {
    const joined = R.state.joinedGroups.includes(g.id), p = groupProgress(g);
    return `<a class="group-card" href="#/app/groups/${g.id}">
      <div class="gc-top"><span class="gc-icon">${icon(g.icon || "users")}</span>${joined ? ui.pill("Joined", "teal", "check") : ""}</div>
      <h3>${esc(g.name)}</h3><p>${esc(g.topic)} · ${R.plural(g.memberCount + (joined && !g.custom ? 1 : 0), "member")}</p>
      <div class="av-stack">${(g.members || []).slice(0, 4).map(peerAv).join("")}${joined ? ui.avatar(28) : ""}</div>
      <div class="gc-goal"><small>Weekly mission · ${R.fmt(p.total)}/${R.fmt(g.goal)} reviews</small>${ui.progress((p.total / g.goal) * 100, { size: "thin", label: "Group mission" })}</div>
      <button type="button" class="btn ${joined ? "btn-ghost" : "btn-soft"} btn-sm" data-join="${g.id}">${joined ? "Leave" : "Join group"}</button></a>`;
  }
  function toggleJoin(id, anchor) {
    const g = R.groups().find((x) => x.id === id), joined = R.state.joinedGroups.includes(id);
    R.update((st) => (st.joinedGroups = joined ? st.joinedGroups.filter((x) => x !== id) : [...st.joinedGroups, id]));
    if (!joined) { R.burst(anchor, { count: 14, spread: 60 }); checkRewards(); }
    R.toast(joined ? `You left ${g.name}.` : `You joined ${g.name}!`, { icon: "users" });
    R.refresh();
  }
  function groupDetail(view, id) {
    const g = R.groups().find((x) => x.id === id);
    if (!g) { view.innerHTML = ui.empty({ icon: "users", title: "Group not found", action: ui.link("All groups", "groups") }); return; }
    const joined = R.state.joinedGroups.includes(g.id), p = groupProgress(g);
    const me = R.displayName();
    const members = [...(joined ? [{ name: me, me: true, xp: R.sum(R.activitySince(R.startOfWeek()), (a) => a.xp) }] : []), ...(g.members || []).map((n) => ({ name: n, xp: (R.hash(n + g.id) % 300) + 40 }))].sort((a, b) => b.xp - a.xp);
    const feed = [...(joined ? R.state.activity.filter((a) => a.t === "review" || a.t === "exam").slice(-3).reverse().map((a) => [me, a.t === "review" ? "reviewed a flashcard" : `finished a practice exam (${a.score}/${a.total})`, Math.max(0, Math.round((Date.now() - new Date(a.at)) / 3600000)), true]) : []), ...(g.custom ? [] : R.content.groupFeed)];
    view.innerHTML = `<div class="subject-hero group-hero"><div><a class="back-link" href="#/app/groups">${icon("arrow-left")}All groups</a><div class="eyebrow">${esc(g.topic)} ${g.custom ? "" : ui.sample()}</div><h1>${esc(g.name)}</h1><div class="hero-stats"><span><b>${R.fmt(g.memberCount + (joined && !g.custom ? 1 : 0))}</b> members</span><span><b>${R.fmt(p.total)}</b> reviews this week</span></div></div>
        <div class="hero-side">${ui.btn(joined ? "Leave group" : "Join group", { tone: joined ? "ghost" : "primary", icon: joined ? "logout" : "plus", attrs: `data-join="${g.id}"` })}</div></div>
      <div class="grid-12">
        ${ui.card(`<div class="mission">${ui.ring((p.total / g.goal) * 100, { size: 120, stroke: 11, label: R.pct((p.total / g.goal) * 100), sub: "complete" })}<div><h3>Complete ${R.fmt(g.goal)} reviews together</h3><p>${R.fmt(p.total)} of ${R.fmt(g.goal)} done. ${joined ? `Your contribution: <b>${R.plural(p.mine, "review")}</b>.` : "Join to contribute your reviews."}</p>${joined ? ui.link("Contribute now", g.subject ? `flashcards?subject=${g.subject}` : "flashcards", { size: "sm", icon: "cards" }) : ""}</div></div>`, { title: "Weekly group mission", icon: "flag", cls: "span-8" })}
        ${ui.card(`<ul class="members">${members.map((m, i) => `<li class="${m.me ? "is-me" : ""}"><span class="rank">${i + 1}</span>${m.me ? ui.avatar(30) : peerAv(m.name)}<span>${esc(m.me ? `${m.name} (you)` : m.name)}</span><b>${R.fmt(m.xp)} XP</b></li>`).join("")}</ul>`, { title: "Members this week", icon: "users", cls: "span-4" })}
        ${ui.card(feed.length ? `<ul class="feed">${feed.map(([n, what, h, mine]) => `<li>${mine ? ui.avatar(30) : peerAv(n)}<p><b>${esc(mine ? "You" : n)}</b> ${esc(what)}<small>${h <= 0 ? "just now" : `${h} h ago`}</small></p></li>`).join("")}</ul>` : `<p class="muted small">No activity yet.</p>`, { title: "Recent activity", icon: "clock", cls: "span-6" })}
        ${ui.card(`<div class="group-ach">${[["flame", "Mission streak", "Complete the weekly mission 3 weeks running", 1, 3], ["users", "Full house", "Reach 25 members", Math.min(25, g.memberCount), 25], ["trophy", "Top group", "Finish a week in the top 10 groups", 0, 1]].map(([ic, n, d, v, t]) => `<div class="ga ${v >= t ? "is-done" : ""}"><span class="ach-mini">${icon(ic)}</span><div><b>${n}</b><small>${d}</small>${ui.progress((v / t) * 100, { size: "thin", tone: "orange", label: n })}</div></div>`).join("")}</div>`, { title: "Group achievements", icon: "award", cls: "span-6", sub: "Sample: needs backend" })}
      </div>`;
    view.addEventListener("click", (e) => { const j = e.target.closest("[data-join]"); if (j) toggleJoin(j.dataset.join, j); });
  }

  /* ======================= CHALLENGES ======================= */
  R.page("challenges", { title: "Challenges", render(view) {
    const list = R.weeklyChallenges();
    const end = R.addDays(R.startOfWeek(), 7), daysLeft = Math.ceil((end - Date.now()) / 86400000);
    view.innerHTML = `${ui.header({ eyebrow: "Community", title: "Weekly challenges", desc: "Bigger goals that reset every Monday. Finish them for bonus XP and gems.", meta: `${ui.pill(`${R.plural(daysLeft, "day")} left this week`, "neutral", "clock")} ${ui.demo("Demo rewards")}` })}
      <div class="challenge-list">${list.map((c) => `<article class="challenge ${c.done ? "is-done" : ""} ${c.claimed ? "is-claimed" : ""}">
          <span class="ch-icon">${icon(c.icon)}</span>
          <div class="ch-body"><h3>${esc(c.title)}</h3>${ui.progress((c.progress / c.target) * 100, { tone: c.done ? "teal" : "orange", label: c.title })}<small>${R.fmt(c.progress)} / ${R.fmt(c.target)}</small></div>
          <div class="ch-reward"><span class="reward-chip">${icon("bolt")}+${c.xp} XP</span><span class="reward-chip gem">${icon("gem")}+${c.gems}</span></div>
          ${c.claimed ? ui.pill("Claimed", "teal", "check") : c.done ? ui.btn("Claim reward", { attrs: `data-claim="${c.id}"` }) : `<span class="muted small">${R.fmt(c.target - c.progress)} to go</span>`}
        </article>`).join("")}</div>
      ${ui.card(`<div class="priority"><span class="rec-icon">${icon("users")}</span><div><h3>Group missions</h3><p>Team up in a study group and contribute your reviews to a shared weekly goal.</p></div>${ui.link("Study groups", "groups", { tone: "soft", size: "sm" })}</div>`)}`;
    view.addEventListener("click", (e) => {
      const c = e.target.closest("[data-claim]");
      if (c) { const res = R.claimChallenge(c.dataset.claim); if (res) { const ch = R.content.challenges.find((x) => x.id === c.dataset.claim); R.burst(c, { count: 24, spread: 110 }); R.celebrate({ eyebrow: "Challenge complete", title: ch.title, subtitle: "A week of real effort, rewarded.", icon: ch.icon, tone: "orange", rewards: `<span class="reward-chip">${icon("bolt")}+${ch.xp} XP</span><span class="reward-chip gem">${icon("gem")}+${ch.gems} gems</span>`, onCta: () => R.refresh() }); } }
    });
  } });

  /* ======================= LEADERBOARDS ======================= */
  R.page("leaderboards", { title: "Leaderboards", render(view, ctx) {
    const tab = ctx.query.tab || "league";
    const { lg, weekly, board, rank } = R.league();
    const leagues = R.content.leagues, li = leagues.findIndex((l) => l.id === lg.id), next = leagues[li + 1], total = R.totalXP();
    const name = (b) => (b.me ? (R.state.settings.leaderboardPrivate ? "You" : `${R.displayName()} (you)`) : b.name);
    let body;
    if (tab === "league") body = `<div class="grid-12">
      ${ui.card(`<ol class="board">${board.map((b, i) => `<li class="${b.me ? "is-me" : ""} ${i < 3 ? "promo" : ""}"><span class="rank r${i + 1}">${i < 3 ? icon("trophy") : i + 1}</span>${b.me ? ui.avatar(32) : peerAv(b.name)}<span class="b-name">${esc(name(b))}</span><b>${R.fmt(b.xp)} XP</b></li>`).join("")}</ol><p class="muted small">${icon("info")} Other learners are sample peers. Real weekly leagues need the backend. Your XP is real.</p>`, { title: `Week of ${R.fmtDate(R.startOfWeek())}`, icon: "trophy", cls: "span-8", sub: "Top 3 are in the promotion zone" })}
      <div class="span-4 stack">
        ${ui.card(`<div class="league-badge league-${lg.id}">${icon("shield")}<b>${lg.name}</b></div><p class="center">${next ? `${R.fmt(next.min - total)} XP to <b>${next.name}</b>` : "Top league reached!"}</p>${next ? ui.progress(((total - lg.min) / (next.min - lg.min)) * 100, { tone: "orange", label: "League progress" }) : ""}
          <ol class="tiers">${leagues.map((l, i) => `<li class="${i < li ? "past" : i === li ? "now" : ""}"><span>${icon(i <= li ? "shield" : "lock")}</span>${l.name}<small>${R.fmt(l.min)}+ XP</small></li>`).join("")}</ol>`, { title: "Your league", icon: "shield" })}
        ${ui.card(`<ul class="mini-list"><li>${icon("arrow-up-right")}<span>Top 3 each week move up a league</span></li><li>${icon("gem")}<span>League rewards are paid in gems</span></li><li>${icon("shield")}<span>Only verified study activity counts</span></li></ul><p class="muted small">Weekly payouts need backend verification.</p>`, { title: "Rewards", icon: "gem" })}
      </div></div>`;
    else body = `<div class="grid-12">${R.subjects().map((s) => {
      const mine = R.sum(R.activitySince(R.startOfWeek()).filter((a) => a.subject === s.id), (a) => a.xp);
      const rows = [...R.content.peers.slice(0, 5).map(([n]) => ({ name: n, xp: R.hash(n + s.id) % 220 })), { name: R.displayName(), xp: mine, me: true }].sort((a, b) => b.xp - a.xp);
      return ui.card(`<ol class="board compact">${rows.map((b, i) => `<li class="${b.me ? "is-me" : ""}"><span class="rank">${i + 1}</span><span class="b-name">${esc(name(b))}</span><b>${R.fmt(b.xp)}</b></li>`).join("")}</ol>`, { title: s.name, icon: "book", cls: "span-4", sub: "XP this week" });
    }).join("")}</div>`;
    view.innerHTML = `${ui.header({ eyebrow: "Community", title: "Leaderboards", desc: "Friendly competition that rewards consistent, meaningful study.", meta: `${ui.pill(`You're #${rank} this week`, "orange", "trophy")} ${ui.pill(`${R.fmt(weekly)} XP this week`, "neutral", "bolt")}` })}
      ${ui.tabs([{ id: "league", label: "Weekly league", route: "leaderboards", icon: "trophy" }, { id: "subjects", label: "By subject", route: "leaderboards?tab=subjects", icon: "book" }], tab, "Leaderboard views")}${body}`;
  } });

  /* ======================= DAILY QUESTS ======================= */
  R.page("quests", { title: "Daily Quests", render(view) {
    const quests = R.todaysQuests(), st = R.streak(), done = quests.filter((q) => q.done).length;
    const midnight = R.addDays(R.startOfDay(), 1);
    const left = () => { const s = Math.max(0, Math.floor((midnight - Date.now()) / 1000)); return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`; };
    view.innerHTML = `${ui.header({ eyebrow: "Rewards", title: "Daily quests", desc: "Three small objectives a day. They track your activity automatically and pay out the moment you finish.", meta: `${ui.pill(`Resets in <span id="qReset">${left()}</span>`, "neutral", "clock")} ${ui.demo("Demo rewards")}` })}
      <div class="grid-12">
        <div class="span-8 stack">
          <div class="quest-list">${quests.map((q) => `<article class="quest ${q.done ? "is-done" : ""}">
            <span class="q-badge">${icon(q.done ? "check" : q.icon)}</span>
            <div class="q-body"><h3>${esc(q.title)}</h3><div class="q-bar">${ui.progress((q.progress / q.target) * 100, { tone: q.done ? "teal" : "orange", label: q.title })}<span>${q.progress}/${q.target}</span></div></div>
            ${q.done ? `<span class="reward-chip done">${icon("check")}+${q.xp} XP</span>` : ui.link("Go", q.route, { tone: "soft", size: "sm", iconRight: "arrow-right" })}
          </article>`).join("")}</div>
          ${ui.card(`${R.state.customQuests.length ? `<ul class="milestones">${R.state.customQuests.map((q) => `<li class="${q.done ? "is-done" : ""}"><button type="button" class="check-btn" data-cq="${q.id}" aria-pressed="${q.done}" aria-label="${q.done ? "Mark not done" : "Mark done"}: ${esc(q.title)}">${q.done ? icon("check") : ""}</button><span>${esc(q.title)}</span><button type="button" class="icon-btn sm" data-delcq="${q.id}" aria-label="Delete ${esc(q.title)}">${icon("trash")}</button></li>`).join("")}</ul>` : `<p class="muted small">Add your own objectives, like “Finish problem set 3”.</p>`}${ui.btn("Add personal quest", { tone: "soft", size: "sm", icon: "plus", attrs: "data-addcq" })}<p class="muted small">Personal quests are self-reported, so they don't award XP.</p>`, { title: "Personal quests", icon: "flag" })}
        </div>
        <div class="span-4 stack">
          ${ui.card(`<div class="center">${ui.ring((done / quests.length) * 100, { size: 140, stroke: 12, tone: "orange", label: `${done}/${quests.length}`, sub: "complete" })}<p class="muted small">${done === quests.length ? "All done today. See you tomorrow!" : "Each quest also gives +5 gems."}</p></div>`, { title: "Today", icon: "check-circle" })}
          ${ui.card(`<div class="streak-mini"><span class="streak-flame ${st.todayDone ? "is-lit" : ""}">${icon("flame")}</span><div><b>${R.plural(st.current, "day")}</b><small>Best: ${R.plural(st.best, "day")}</small></div></div>${ui.link("Weekly challenges", "challenges", { tone: "soft", size: "block", iconRight: "arrow-right" })}`, { title: "Streak", icon: "flame" })}
        </div></div>`;
    const timer = setInterval(() => { const el = R.$("#qReset", view); if (el) el.textContent = left(); }, 30000);
    view.addEventListener("click", (e) => {
      const c = e.target.closest("[data-cq]"); if (c) { const q = R.state.customQuests.find((x) => x.id === c.dataset.cq); q.done = !q.done; R.save(); if (q.done) { R.burst(c, { count: 12, spread: 50 }); R.toast(`Done: ${q.title}`); } R.refresh(); }
      const d = e.target.closest("[data-delcq]"); if (d) { R.update((st) => (st.customQuests = st.customQuests.filter((x) => x.id !== d.dataset.delcq))); R.refresh(); }
      if (e.target.closest("[data-addcq]")) R.formDialog({ title: "Add a personal quest", fields: [{ name: "title", label: "Quest", required: true, maxLength: 80 }], submitLabel: "Add quest", onSubmit: (v) => { R.update((st) => st.customQuests.push({ id: R.uid(), title: v.title.trim(), done: false })); R.refresh(); } });
    });
    return () => clearInterval(timer);
  } });

  /* ======================= ACHIEVEMENTS ======================= */
  R.page("achievements", { title: "Achievements", render(view) {
    const list = R.achievementList(), unlocked = list.filter((a) => a.unlockedAt), lv = R.levelInfo();
    view.innerHTML = `${ui.header({ eyebrow: "Rewards", title: "Achievements", desc: "Milestones that celebrate real effort. Every one is earned through recorded study activity." })}
      <div class="ach-summary">
        <div class="ach-level">${ui.ring(lv.pct, { size: 112, stroke: 10, tone: "orange", label: `${lv.level}`, sub: "level" })}<div><b>Level ${lv.level}</b><p>${R.fmt(lv.into)} / ${R.fmt(lv.needed)} XP to level ${lv.level + 1}</p>${ui.progress(lv.pct, { tone: "orange", label: "Level progress" })}</div></div>
        <div class="ach-count"><b>${unlocked.length}<span>/${list.length}</span></b><small>unlocked</small></div>
        <div class="ach-count"><b>${R.fmt(R.sum(unlocked, (a) => a.gems))}</b><small>gems earned from badges</small></div>
      </div>
      <div class="badge-grid">${list.map((a) => `<button type="button" class="badge ${a.unlockedAt ? "is-unlocked" : ""}" data-ach="${a.id}">
          <span class="badge-art">${icon(a.unlockedAt ? a.icon : "lock")}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>
          ${a.unlockedAt ? `<span class="badge-date">${R.fmtDate(a.unlockedAt)}</span>` : `${ui.progress((a.value / a.target) * 100, { tone: "orange", size: "thin", label: a.name })}<span class="badge-date">${a.value}/${a.target}</span>`}
        </button>`).join("")}</div>`;
    view.addEventListener("click", (e) => {
      const b = e.target.closest("[data-ach]"); if (!b) return;
      const a = list.find((x) => x.id === b.dataset.ach);
      R.dialog({ size: "sm", cls: "celebrate", labelled: false, body: `<div class="celebrate-badge ${a.unlockedAt ? "celebrate-orange" : "is-locked"}">${icon(a.unlockedAt ? a.icon : "lock")}</div><h2 class="celebrate-title">${esc(a.name)}</h2><p class="celebrate-sub">${esc(a.desc)}</p>${a.unlockedAt ? `<p class="muted small center">Unlocked ${R.fmtDate(a.unlockedAt, { month: "long", day: "numeric", year: "numeric" })}</p>` : `${ui.progress((a.value / a.target) * 100, { tone: "orange", label: "Progress" })}<p class="muted small center">${a.value} of ${a.target}</p>`}<div class="celebrate-rewards"><span class="reward-chip gem">${icon("gem")}+${a.gems} gems</span></div>`, actions: [{ label: "Close", tone: "primary" }] });
    });
  } });

  /* ======================= REWARD STORE ======================= */
  R.page("store", { title: "Avatar & Reward Store", render(view, ctx) {
    const kind = ctx.query.kind || "all";
    const items = R.content.store.filter((i) => kind === "all" || i.kind === kind);
    const preview = (i) => i.kind === "frame" ? `<span class="avatar frame-${i.value}" style="--av:64px">${R.state.equipped.avatar ? `<span class="avatar-emoji">${R.state.equipped.avatar}</span>` : esc(R.initials())}</span>` : i.kind === "avatar" ? `<span class="avatar ${R.state.equipped.frame ? "frame-" + R.state.equipped.frame : ""}" style="--av:64px"><span class="avatar-emoji">${i.value}</span></span>` : `<span class="banner-prev banner-${i.value}"></span>`;
    view.innerHTML = `${ui.header({ eyebrow: "Rewards", title: "Avatar & reward store", desc: "Personalise your space with cosmetic rewards earned through learning." })}
      <section class="store-hero"><div class="sh-balance">${icon("gem")}<div><b id="gemBal">${R.fmt(R.state.gems)}</b><span>demo gems</span></div></div><div class="sh-earn"><span>${icon("check-circle")}+5 per daily quest</span><span>${icon("award")}Achievements</span><span>${icon("arrow-up-right")}+15 per level up</span><span>${icon("swords")}Weekly challenges</span></div></section>
      ${ui.tabs([["all", "All"], ["frame", "Frames"], ["avatar", "Avatars"], ["banner", "Banners"]].map(([id, label]) => ({ id, label, route: `store${id === "all" ? "" : `?kind=${id}`}` })), kind, "Item type")}
      <div class="store-grid">${items.map((i) => {
        const owned = R.state.purchases.includes(i.id), equipped = R.state.equipped[i.kind] === i.value, afford = R.state.gems >= i.cost;
        return `<article class="store-item ${equipped ? "is-equipped" : ""}"><div class="si-prev">${preview(i)}</div><h3>${esc(i.name)}</h3><p>${esc(i.desc)}</p>
          ${owned ? ui.btn(equipped ? "Equipped" : "Equip", { tone: equipped ? "soft" : "primary", size: "sm", icon: equipped ? "check" : "", attrs: `data-equip="${i.id}"` }) : `<button type="button" class="btn ${afford ? "btn-gem" : "btn-ghost"} btn-sm" data-buy="${i.id}" ${afford ? "" : `aria-disabled="true" data-tip="You need ${R.fmt(i.cost - R.state.gems)} more gems"`}>${icon("gem")}<span>${R.fmt(i.cost)}</span></button>`}
        </article>`; }).join("")}</div>
      <p class="muted small">${icon("info")} Purchases use demo gems stored only in this browser. No real currency is involved.</p>`;
    view.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-buy]");
      if (b) {
        const i = R.content.store.find((x) => x.id === b.dataset.buy);
        if (R.state.gems < i.cost) { R.toast(`You need ${R.fmt(i.cost - R.state.gems)} more gems for ${i.name}.`, { icon: "gem" }); return; }
        const ok = await R.confirm({ title: `Get ${esc(i.name)}?`, body: `This costs <b>${R.fmt(i.cost)} demo gems</b>. You'll have ${R.fmt(R.state.gems - i.cost)} left.`, confirmLabel: "Buy & equip" });
        if (!ok) return;
        R.update((st) => { st.gems -= i.cost; st.purchases.push(i.id); st.equipped[i.kind] = i.value; });
        R.celebrate({ eyebrow: "New reward", title: i.name, subtitle: "Unlocked and equipped. Check out your new look.", emoji: i.kind === "avatar" ? i.value : null, icon: "bag", tone: "orange", onCta: () => R.refresh() });
      }
      const q = e.target.closest("[data-equip]");
      if (q) { const i = R.content.store.find((x) => x.id === q.dataset.equip); R.update((st) => (st.equipped[i.kind] = st.equipped[i.kind] === i.value ? null : i.value)); R.refresh(); }
    });
  } });

  /* ======================= PROFILE ======================= */
  R.page("profile", { title: "Profile", render(view) {
    const lv = R.levelInfo(), st = R.streak(), stats = R.stats(), ach = R.achievementList().filter((a) => a.unlockedAt).sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));
    const user = window.RecalroAuth?.currentUser() || {};
    view.innerHTML = `<section class="profile-hero banner-${R.state.equipped.banner || "default"}"><div class="ph-inner">${R.ui.avatar(96)}<div><h1>${esc(R.displayName())}</h1><p>${esc(user.email || "Demo account")} · Learning since ${R.fmtDate(R.state.createdAt, { month: "long", year: "numeric" })}</p><div class="ph-pills">${ui.pill(`Level ${lv.level}`, "orange", "award")}${ui.pill(`${R.league().lg.name} league`, "neutral", "shield")}${ui.pill(`${R.plural(st.current, "day")} streak`, "neutral", "flame")}</div></div>
        <div class="ph-actions">${ui.btn("Edit name", { tone: "glass", icon: "edit", attrs: "data-editname" })}${ui.link("Customise", "store", { tone: "glass", icon: "bag" })}</div></div></section>
      <div class="stat-row">${[["Total XP", R.fmt(lv.xp), "bolt"], ["Best streak", R.plural(st.best, "day"), "flame"], ["Cards reviewed", R.fmt(stats.reviews), "cards"], ["Exams taken", R.fmt(stats.exams), "clipboard"]].map(([l, v, ic]) => `<div class="stat"><div class="stat-top"><span>${l}</span><span class="stat-ic">${icon(ic)}</span></div><strong>${v}</strong></div>`).join("")}</div>
      <div class="grid-12">
        ${ui.card(ach.length ? `<div class="showcase">${ach.slice(0, 6).map((a) => `<div class="sc-badge-sm"><span class="badge-art">${icon(a.icon)}</span><b>${esc(a.name)}</b><small>${R.fmtDate(a.unlockedAt)}</small></div>`).join("")}</div>` : `<p class="muted small">Unlocked achievements will be showcased here.</p>`, { title: "Achievement showcase", icon: "award", cls: "span-7", action: ui.link("All", "achievements", { tone: "ghost", size: "sm" }) })}
        ${ui.card(R.chart.hbars(R.subjects().map((s) => ({ label: s.name, value: R.subjectMastery(s.id), color: `var(--s${R.subjectIndex(s.id) % 4})` }))), { title: "Subject mastery", icon: "map", cls: "span-5" })}
        ${ui.card(R.chart.heatmap(16), { title: "Study activity", icon: "calendar", cls: "span-12" })}
      </div>`;
    view.addEventListener("click", (e) => {
      if (e.target.closest("[data-editname]")) R.formDialog({ title: "Edit display name", fields: [{ name: "name", label: "Display name", required: true, maxLength: 40, value: R.displayName() }], onSubmit: (v) => { R.update((st2) => (st2.profile.displayName = v.name.trim().replace(/\s+/g, " "))); R.toast("Display name updated."); R.refresh(); } });
    });
  } });

  /* ======================= SETTINGS ======================= */
  R.page("settings", { title: "Settings", render(view) {
    const s = R.state.settings, theme = R.getTheme(), user = window.RecalroAuth?.currentUser() || {};
    const row = (title, desc, control) => `<div class="set-row"><div><b>${title}</b><small>${desc}</small></div><div class="set-ctl">${control}</div></div>`;
    const toggle = (key, on, label) => `<label class="switch"><input type="checkbox" data-toggle="${key}" ${on ? "checked" : ""} aria-label="${esc(label)}"><span class="switch-ui"></span></label>`;
    view.innerHTML = `${ui.header({ eyebrow: "Account", title: "Settings", desc: "Manage your appearance, learning preferences and data." })}
      <div class="settings">
        ${ui.card(`<div class="set-theme"><div><b>Theme</b><small>Light, dark, or follow your device. Your choice applies everywhere in Recalro.</small></div>${ui.themeSelector(theme)}</div>` + row("Reduce motion", "Turn off celebrations, confetti and transitions.", toggle("reduceMotion", s.reduceMotion, "Reduce motion")), { title: "Appearance", icon: "sun" })}
        ${ui.card(row("Daily study goal", `${s.dailyGoal} minutes per day (estimated from activity)`, ui.btn("Edit", { tone: "soft", size: "sm", attrs: "data-goal" })) + row("Weekly report reminder", "A reminder to review your weekly report every Sunday.", toggle("weeklyReport", s.weeklyReport, "Weekly report reminder")), { title: "Learning", icon: "target" })}
        ${ui.card(row("Private on leaderboards", "Show “You” instead of your name in league rankings.", toggle("leaderboardPrivate", s.leaderboardPrivate, "Private on leaderboards")), { title: "Privacy", icon: "shield" })}
        ${ui.card(row("Export your data", "Download everything this workspace has recorded as JSON.", ui.btn("Export", { tone: "soft", size: "sm", icon: "download", attrs: "data-export" })) + row("Reset demo data", "Clear all progress, XP, gems and saved items on this device.", ui.btn("Reset", { tone: "danger", size: "sm", attrs: "data-reset" })), { title: "Data", icon: "archive" })}
        ${ui.card(`${row("Signed in as", esc(user.email || "Demo account"), ui.btn("Sign out", { tone: "ghost", size: "sm", icon: "logout", attrs: "data-signout" }))}<p class="muted small">${icon("info")} Authentication is a front-end demo. Connect your identity provider before production.</p>`, { title: "Account", icon: "user" })}
        ${ui.card(`<ul class="shortcuts"><li>${ui.kbd(/Mac|iP/.test(navigator.platform) ? "⌘" : "Ctrl")}${ui.kbd("K")}<span>Search & commands</span></li><li>${ui.kbd("/")}<span>Search</span></li><li>${ui.kbd("Space")}<span>Flip flashcard</span></li><li>${ui.kbd("1")}–${ui.kbd("4")}<span>Rate card / pick answer</span></li><li>${ui.kbd("F")}<span>Flag exam question</span></li><li>${ui.kbd("←")}${ui.kbd("→")}<span>Previous / next exam question</span></li></ul>`, { title: "Keyboard shortcuts", icon: "keyboard" })}
      </div>`;
    view.addEventListener("change", (e) => { if (e.target.matches("[data-theme-choice]")) { R.setTheme(e.target.value); R.toast(`Theme: ${e.target.value === "system" ? "System (follows your device)" : e.target.value[0].toUpperCase() + e.target.value.slice(1)}`, { icon: e.target.value === "dark" ? "moon" : "sun" }); } });
    view.addEventListener("click", async (e) => {
      const seg = e.target.closest("[data-seg='theme']"); if (seg) { R.setTheme(seg.dataset.value); R.refresh(); }
      if (e.target.closest("[data-goal]")) R.formDialog({ title: "Daily study goal", description: "Choose a daily target between 5 minutes and 24 hours.", fields: [{ name: "minutes", label: "Minutes per day", type: "number", value: s.dailyGoal, min: 5, max: 1440, step: 5, required: true }], submitLabel: "Save goal", onSubmit: (v) => { R.update((st) => (st.settings.dailyGoal = Math.round(Number(v.minutes)))); R.toast("Daily goal saved."); R.refresh(); } });
      if (e.target.closest("[data-export]")) R.exportData();
      if (e.target.closest("[data-reset]") && (await R.confirm({ title: "Reset all demo data?", body: "This permanently clears your progress, XP, gems, saved items and history on this device. Export first if you want a copy.", confirmLabel: "Reset everything", tone: "danger" }))) { R.resetDemo(); R.toast("Demo data reset."); R.refresh(); }
      if (e.target.closest("[data-signout]")) R.signOut();
    });
    view.addEventListener("change", (e) => { const t = e.target.closest("[data-toggle]"); if (t) { R.update((st) => (st.settings[t.dataset.toggle] = t.checked)); R.toast("Preference saved on this device."); } });
  } });
})();
