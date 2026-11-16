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
  const PROFILE_REWARDS = [
    { id: "first-recall-frame", achievement: "first-review", kind: "frame", value: "recall", name: "Recall Frame", icon: "cards", tone: "teal", rarity: "Starter" },
    { id: "memory-banner", achievement: "reviews-50", kind: "banner", value: "memory", name: "Memory Banner", icon: "brain", tone: "teal", rarity: "Rare" },
    { id: "mastery-frame", achievement: "reviews-200", kind: "frame", value: "mastery", name: "Mastery Frame", icon: "brain", tone: "orange", rarity: "Epic" },
    { id: "exam-accent", achievement: "first-exam", kind: "accent", value: "exam", name: "Exam Focus Accent", icon: "clipboard", tone: "teal", rarity: "Starter" },
    { id: "perfect-frame", achievement: "perfect-exam", kind: "frame", value: "perfect", name: "Flawless Frame", icon: "star", tone: "orange", rarity: "Epic" },
    { id: "momentum-accent", achievement: "streak-3", kind: "accent", value: "momentum", name: "Momentum Accent", icon: "flame", tone: "orange", rarity: "Rare" },
    { id: "week-frame", achievement: "streak-7", kind: "frame", value: "week", name: "Week Laurel Frame", icon: "flame", tone: "orange", rarity: "Epic" },
    { id: "scholar-banner", achievement: "level-5", kind: "banner", value: "scholar", name: "Scholar Banner", icon: "award", tone: "teal", rarity: "Epic" },
    { id: "curator-banner", achievement: "vault-5", kind: "banner", value: "curator", name: "Curator Banner", icon: "archive", tone: "teal", rarity: "Rare" },
    { id: "mentor-accent", achievement: "explainer", kind: "accent", value: "mentor", name: "Mentor Accent", icon: "quote", tone: "teal", rarity: "Starter" },
    { id: "mastery-banner", achievement: "module-master", kind: "banner", value: "mastery", name: "Mastery Banner", icon: "map", tone: "orange", rarity: "Rare" },
    { id: "together-accent", achievement: "social", kind: "accent", value: "together", name: "Together Accent", icon: "users", tone: "teal", rarity: "Starter" },
  ];
  const rewardFor = (achievementId) => PROFILE_REWARDS.find((reward) => reward.achievement === achievementId);
  const rewardMark = (reward, locked = false) => `<span class="profile-reward-mark tone-${reward.tone} kind-${reward.kind} ${locked ? "is-locked" : ""}" aria-hidden="true">${icon(locked ? "lock" : reward.icon)}</span>`;

  async function prepareProfilePhoto(file) {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG or WebP image.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext("2d");
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
      return canvas.toDataURL("image/jpeg", .8);
    } finally { URL.revokeObjectURL(url); }
  }

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
      view.innerHTML = `${ui.header({ eyebrow: "Community", title: "Study groups", desc: "Create a private study space for your own learning goals.", actions: ui.btn("Create group", { icon: "plus", attrs: "data-newgroup" }) })}
        ${groups.length ? `<h2 class="section-h">Your study groups</h2><div class="group-grid">${groups.map(groupCard).join("")}</div>` : ui.empty({ icon: "users", title: "No study groups yet", body: "Create a private group to set a study target and track your own contributions.", action: ui.btn("Create a group", { icon: "plus", attrs: "data-newgroup" }) })}`;
      view.addEventListener("click", (e) => {
        const j = e.target.closest("[data-join]"); if (j) { e.preventDefault(); toggleJoin(j.dataset.join, j); }
        if (e.target.closest("[data-newgroup]")) R.formDialog({ title: "Create a study group", description: "This creates a local group on this device. Inviting others needs the backend.", submitLabel: "Create group", fields: [{ name: "name", label: "Group name", required: true, maxLength: 60 }, { name: "topic", label: "Focus", maxLength: 60, placeholder: "e.g. Finals revision" }, { name: "goal", label: "Weekly review goal", type: "number", value: 50, min: 10, max: 1000, step: 10, required: true }],
          onSubmit: (v) => { const g = { id: "cg-" + R.uid(), name: v.name.trim(), topic: v.topic.trim() || "Personal group", goal: Number(v.goal) }; R.update((st) => { st.customGroups.push(g); st.joinedGroups.push(g.id); }); checkRewards(); R.toast(`${g.name} created.`, { icon: "users" }); R.go(`groups/${g.id}`); } });
      });
    },
  });
  function groupCard(g) {
    const joined = R.state.joinedGroups.includes(g.id), p = groupProgress(g);
    return `<article class="group-card"><a class="group-card-link" href="#/app/groups/${g.id}">
      <div class="gc-top"><span class="gc-icon">${icon(g.icon || "users")}</span>${joined ? ui.pill("Joined", "teal", "check") : ""}</div>
      <h3>${esc(g.name)}</h3><p>${esc(g.topic)} · ${R.plural(g.memberCount + (joined && !g.custom ? 1 : 0), "member")}</p>
      <div class="av-stack">${(g.members || []).slice(0, 4).map(peerAv).join("")}${joined ? ui.avatar(28) : ""}</div>
      <div class="gc-goal"><small>Weekly mission · ${R.fmt(p.total)}/${R.fmt(g.goal)} reviews</small>${ui.progress((p.total / g.goal) * 100, { size: "thin", label: "Group mission" })}</div>
      </a><button type="button" class="btn ${joined ? "btn-ghost" : "btn-soft"} btn-sm" data-join="${g.id}">${joined ? "Leave" : "Join group"}</button></article>`;
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
    view.innerHTML = `<div class="subject-hero group-hero"><div><a class="back-link" href="#/app/groups">${icon("arrow-left")}All groups</a><div class="eyebrow">${esc(g.topic)}</div><h1>${esc(g.name)}</h1><div class="hero-stats"><span><b>${R.fmt(g.memberCount)}</b> members</span><span><b>${R.fmt(p.total)}</b> reviews this week</span></div></div>
        <div class="hero-side">${ui.btn(joined ? "Leave group" : "Join group", { tone: joined ? "ghost" : "primary", icon: joined ? "logout" : "plus", attrs: `data-join="${g.id}"` })}</div></div>
      <div class="grid-12">
        ${ui.card(`<div class="mission">${ui.ring((p.total / g.goal) * 100, { size: 120, stroke: 11, label: R.pct((p.total / g.goal) * 100), sub: "complete" })}<div><h3>Complete ${R.fmt(g.goal)} reviews together</h3><p>${R.fmt(p.total)} of ${R.fmt(g.goal)} done. ${joined ? `Your contribution: <b>${R.plural(p.mine, "review")}</b>.` : "Join to contribute your reviews."}</p>${joined ? ui.link("Contribute now", g.subject ? `flashcards?subject=${g.subject}` : "flashcards", { size: "sm", icon: "cards" }) : ""}</div></div>`, { title: "Weekly group mission", icon: "flag", cls: "span-8" })}
        ${ui.card(`<ul class="members">${members.map((m, i) => `<li class="${m.me ? "is-me" : ""}"><span class="rank">${i + 1}</span>${m.me ? ui.avatar(30) : peerAv(m.name)}<span>${esc(m.me ? `${m.name} (you)` : m.name)}</span><b>${R.fmt(m.xp)} XP</b></li>`).join("")}</ul>`, { title: "Members this week", icon: "users", cls: "span-4" })}
        ${ui.card(feed.length ? `<ul class="feed">${feed.map(([n, what, h, mine]) => `<li>${mine ? ui.avatar(30) : peerAv(n)}<p><b>${esc(mine ? "You" : n)}</b> ${esc(what)}<small>${h <= 0 ? "just now" : `${h} h ago`}</small></p></li>`).join("")}</ul>` : `<p class="muted small">No activity yet.</p>`, { title: "Recent activity", icon: "clock", cls: "span-6" })}
        ${ui.card(`<p class="muted small">Group achievements will appear as you and your members study together.</p>`, { title: "Group achievements", icon: "award", cls: "span-6" })}
      </div>`;
    view.addEventListener("click", (e) => { const j = e.target.closest("[data-join]"); if (j) toggleJoin(j.dataset.join, j); });
  }

  /* ======================= CHALLENGES ======================= */
  R.page("challenges", { title: "Challenges", render(view) {
    const list = R.weeklyChallenges();
    const end = R.addDays(R.startOfWeek(), 7), daysLeft = Math.ceil((end - Date.now()) / 86400000);
    view.innerHTML = `${ui.header({ eyebrow: "Community", title: "Weekly challenges", desc: "Bigger goals that reset every Monday. Finish them for bonus XP and gems.", meta: ui.pill(`${R.plural(daysLeft, "day")} left this week`, "neutral", "clock") })}
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
    const { lg, weekly, board } = R.league(), hasPeers = R.content.peers.length > 0;
    const leagues = R.content.leagues, li = leagues.findIndex((l) => l.id === lg.id), next = leagues[li + 1], total = R.totalXP();
    const name = (b) => (b.me ? (R.state.settings.leaderboardPrivate ? "You" : `${R.displayName()} (you)`) : b.name);
    let body;
    if (tab === "league") body = `<div class="grid-12">
      ${ui.card(hasPeers ? `<ol class="board">${board.map((b, i) => `<li class="${b.me ? "is-me" : ""} ${i < 3 ? "promo" : ""}"><span class="rank r${i + 1}">${i < 3 ? icon("trophy") : i + 1}</span>${b.me ? ui.avatar(32) : peerAv(b.name)}<span class="b-name">${esc(name(b))}</span><b>${R.fmt(b.xp)} XP</b></li>`).join("")}</ol>` : ui.empty({ icon: "trophy", title: "Shared rankings aren't available yet", body: "Your study XP is tracked here. Weekly rankings will appear when community results can be shared." }), { title: `Week of ${R.fmtDate(R.startOfWeek())}`, icon: "trophy", cls: "span-8", sub: hasPeers ? "Top 3 are in the promotion zone" : "Your weekly study activity" })}
      <div class="span-4 stack">
        ${ui.card(`<div class="league-badge league-${lg.id}">${icon("shield")}<b>${lg.name}</b></div><p class="center">${next ? `${R.fmt(next.min - total)} XP to <b>${next.name}</b>` : "Top league reached!"}</p>${next ? ui.progress(((total - lg.min) / (next.min - lg.min)) * 100, { tone: "orange", label: "League progress" }) : ""}
          <ol class="tiers">${leagues.map((l, i) => `<li class="${i < li ? "past" : i === li ? "now" : ""}"><span>${icon(i <= li ? "shield" : "lock")}</span>${l.name}<small>${R.fmt(l.min)}+ XP</small></li>`).join("")}</ol>`, { title: "Your league", icon: "shield" })}
        ${ui.card(`<ul class="mini-list"><li>${icon("arrow-up-right")}<span>Top 3 each week move up a league</span></li><li>${icon("gem")}<span>League rewards are paid in gems</span></li><li>${icon("shield")}<span>Only verified study activity counts</span></li></ul><p class="muted small">Weekly payouts need backend verification.</p>`, { title: "Rewards", icon: "gem" })}
      </div></div>`;
    else body = hasPeers ? `<div class="grid-12">${R.subjects().map((s) => {
      const mine = R.sum(R.activitySince(R.startOfWeek()).filter((a) => a.subject === s.id), (a) => a.xp);
      const rows = [...R.content.peers.slice(0, 5).map(([n]) => ({ name: n, xp: R.hash(n + s.id) % 220 })), { name: R.displayName(), xp: mine, me: true }].sort((a, b) => b.xp - a.xp);
      return ui.card(`<ol class="board compact">${rows.map((b, i) => `<li class="${b.me ? "is-me" : ""}"><span class="rank">${i + 1}</span><span class="b-name">${esc(name(b))}</span><b>${R.fmt(b.xp)}</b></li>`).join("")}</ol>`, { title: s.name, icon: "book", cls: "span-4", sub: "XP this week" });
    }).join("")}</div>` : ui.empty({ icon: "book", title: "Subject rankings aren't available yet", body: "Your subject progress is available in analytics. Shared rankings will appear here when community results can be shared." });
    view.innerHTML = `${ui.header({ eyebrow: "Community", title: "Leaderboards", desc: "Track your study activity and progress through learning tiers.", meta: `${ui.pill(`${lg.name} tier`, "orange", "shield")} ${ui.pill(`${R.fmt(weekly)} XP this week`, "neutral", "bolt")}` })}
      ${ui.tabs([{ id: "league", label: "Weekly league", route: "leaderboards", icon: "trophy" }, { id: "subjects", label: "By subject", route: "leaderboards?tab=subjects", icon: "book" }], tab, "Leaderboard views")}${body}`;
  } });

  /* ======================= DAILY QUESTS ======================= */
  R.page("quests", { title: "Daily Quests", render(view) {
    const quests = R.todaysQuests(), st = R.streak(), done = quests.filter((q) => q.done).length;
    const midnight = R.addDays(R.startOfDay(), 1);
    const left = () => { const s = Math.max(0, Math.floor((midnight - Date.now()) / 1000)); return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`; };
    view.innerHTML = `${ui.header({ eyebrow: "Rewards", title: "Daily quests", desc: "Three small objectives a day. They track your activity automatically and pay out the moment you finish.", meta: ui.pill(`Resets in <span id="qReset">${left()}</span>`, "neutral", "clock") })}
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
  R.page("achievements", { title: "Achievements", render(view, ctx) {
    const list = R.achievementList(), unlocked = list.filter((a) => a.unlockedAt), lv = R.levelInfo();
    let filter = ["all", "in-progress", "unlocked"].includes(ctx.query.filter) ? ctx.query.filter : "all";
    const next = list.filter((a) => !a.unlockedAt).sort((a, b) => (b.value / b.target) - (a.value / a.target))[0];
    const nextReward = next && rewardFor(next.id);
    const earnedDecorations = PROFILE_REWARDS.filter((r) => list.find((a) => a.id === r.achievement)?.unlockedAt).length;
    view.innerHTML = `${ui.header({ eyebrow: "Your study journey", title: "Achievements", desc: "Every milestone comes from real study. Earn gems and profile decorations as you build your learning streak." })}
      <section class="ach-journey">
        <div class="ach-journey-main">
          <div class="ach-journey-copy"><span class="eyebrow">${next ? "Next study reward" : "Journey complete"}</span><h2>${next ? esc(next.name) : "You have earned every achievement"}</h2><p>${next ? esc(next.desc) : "Your full decoration collection is ready to equip on your profile."}</p>
            ${next ? `<div class="ach-next-progress">${ui.progress((next.value / next.target) * 100, { tone: "orange", label: `${next.name} progress` })}<small>${R.fmt(next.value)} of ${R.fmt(next.target)} · ${R.fmt(next.gems)} gems${nextReward ? ` + ${esc(nextReward.name)}` : ""}</small></div>` : ""}
          </div>
          ${nextReward ? `<div class="ach-next-prize">${rewardMark(nextReward)}<span><small>Profile reward</small><b>${esc(nextReward.name)}</b><em>${esc(nextReward.rarity)} · ${esc(nextReward.kind)}</em></span></div>` : `<a class="btn btn-soft" href="#/app/profile?tab=decorations">${icon("user")}View profile decorations</a>`}
        </div>
        <div class="ach-journey-stats"><div><b>${unlocked.length}<small>/${list.length}</small></b><span>milestones earned</span></div><div><b>${earnedDecorations}<small>/${PROFILE_REWARDS.length}</small></b><span>decorations earned</span></div><div><b>${R.fmt(R.sum(unlocked, (a) => a.gems))}</b><span>gems from study</span></div></div>
      </section>
      <nav class="ach-filters" aria-label="Achievement filters">${[["all", "All milestones"], ["in-progress", "In progress"], ["unlocked", "Earned"]].map(([id, label]) => `<button type="button" class="ach-filter ${id === filter ? "is-active" : ""}" data-ach-filter="${id}" aria-pressed="${id === filter}">${label}</button>`).join("")}</nav>
      <div class="badge-grid" data-ach-grid></div>`;
    const grid = R.$("[data-ach-grid]", view);
    const drawAchievements = () => {
      const shown = list.filter((a) => filter === "all" || (filter === "unlocked" ? !!a.unlockedAt : !a.unlockedAt));
      grid.innerHTML = shown.length ? shown.map((a) => {
        const reward = rewardFor(a.id), isUnlocked = !!a.unlockedAt;
        return `<button type="button" class="badge ${isUnlocked ? "is-unlocked" : ""} ${reward ? `rarity-${reward.rarity.toLowerCase()}` : ""}" data-ach="${a.id}" aria-label="${esc(a.name)}. ${isUnlocked ? "Earned" : `${a.value} of ${a.target}`}">
          <span class="badge-art">${icon(isUnlocked ? a.icon : "lock")}</span><span class="badge-rarity">${isUnlocked ? "Earned" : reward?.rarity || "Milestone"}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>
          <span class="badge-progress">${isUnlocked ? `<span class="badge-date">${R.fmtDate(a.unlockedAt)}</span>` : `${ui.progress((a.value / a.target) * 100, { tone: "orange", size: "thin", label: `${a.name} progress` })}<span class="badge-date">${R.fmt(a.value)} / ${R.fmt(a.target)}</span>`}</span>
          ${reward ? `<span class="badge-prize">${rewardMark(reward, !isUnlocked)}<span><small>${isUnlocked ? "Profile reward earned" : "Unlocks"}</small><b>${esc(reward.name)}</b></span></span>` : ""}
        </button>`;
      }).join("") : `<div class="ach-empty">${icon("sparkles")}<b>No milestones in this view yet</b><span>Keep studying and your progress will appear here.</span></div>`;
    };
    drawAchievements();
    view.addEventListener("click", (e) => {
      const filterButton = e.target.closest("[data-ach-filter]");
      if (filterButton) {
        filter = filterButton.dataset.achFilter;
        R.replaceRoute(`achievements?filter=${filter}`);
        R.$$("[data-ach-filter]", view).forEach((button) => { const active = button === filterButton; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
        drawAchievements();
        return;
      }
      const button = e.target.closest("[data-ach]"); if (!button) return;
      const a = list.find((x) => x.id === button.dataset.ach); if (!a) return;
      const reward = rewardFor(a.id);
      R.dialog({ size: "sm", cls: "celebrate ach-detail", labelled: false, body: `<div class="celebrate-badge ${a.unlockedAt ? "celebrate-orange" : "is-locked"}">${icon(a.unlockedAt ? a.icon : "lock")}</div><span class="badge-rarity">${a.unlockedAt ? "Milestone earned" : "Study milestone"}</span><h2 class="celebrate-title">${esc(a.name)}</h2><p class="celebrate-sub">${esc(a.desc)}</p>${a.unlockedAt ? `<p class="muted small center">Earned ${R.fmtDate(a.unlockedAt, { month: "long", day: "numeric", year: "numeric" })}</p>` : `${ui.progress((a.value / a.target) * 100, { tone: "orange", label: "Milestone progress" })}<p class="muted small center">${R.fmt(a.value)} of ${R.fmt(a.target)} completed</p>`}${reward ? `<div class="ach-detail-reward">${rewardMark(reward, !a.unlockedAt)}<span><small>${a.unlockedAt ? "Decoration added to your collection" : "Decoration earned when complete"}</small><b>${esc(reward.name)}</b><em>${esc(reward.rarity)} profile ${esc(reward.kind)}</em></span></div>` : ""}<div class="celebrate-rewards"><span class="reward-chip gem">${icon("gem")}+${a.gems} gems</span></div>`, actions: a.unlockedAt && reward ? [{ label: "Customize profile", tone: "primary", onClick: () => R.go("profile?tab=decorations") }] : [{ label: "Close", tone: "primary" }] });
    });
  } });

  /* ======================= REWARD STORE ======================= */
  R.page("store", { title: "Avatar & Reward Store", render(view, ctx) {
    const kind = ctx.query.kind || "all";
    const items = R.content.store.filter((i) => kind === "all" || i.kind === kind);
    const preview = (i) => i.kind === "frame" ? `<span class="avatar frame-${i.value}" style="--av:64px">${R.state.equipped.avatar ? `<span class="avatar-emoji">${R.state.equipped.avatar}</span>` : esc(R.initials())}</span>` : i.kind === "avatar" ? `<span class="avatar ${R.state.equipped.frame ? "frame-" + R.state.equipped.frame : ""}" style="--av:64px"><span class="avatar-emoji">${i.value}</span></span>` : `<span class="banner-prev banner-${i.value}"></span>`;
    view.innerHTML = `${ui.header({ eyebrow: "Rewards", title: "Avatar & reward store", desc: "Personalise your space with cosmetic rewards earned through learning." })}
      <section class="store-hero"><div class="sh-balance">${icon("gem")}<div><b id="gemBal">${R.fmt(R.state.gems)}</b><span>gems</span></div></div><div class="sh-earn"><span>${icon("check-circle")}+5 per daily quest</span><span>${icon("award")}Achievements</span><span>${icon("arrow-up-right")}+15 per level up</span><span>${icon("swords")}Weekly challenges</span></div></section>
      ${ui.tabs([["all", "All"], ["frame", "Frames"], ["avatar", "Avatars"], ["banner", "Banners"]].map(([id, label]) => ({ id, label, route: `store${id === "all" ? "" : `?kind=${id}`}` })), kind, "Item type")}
      <div class="store-grid">${items.map((i) => {
        const owned = R.state.purchases.includes(i.id), equipped = R.state.equipped[i.kind] === i.value, afford = R.state.gems >= i.cost;
        return `<article class="store-item ${equipped ? "is-equipped" : ""}"><div class="si-prev">${preview(i)}</div><h3>${esc(i.name)}</h3><p>${esc(i.desc)}</p>
          ${owned ? ui.btn(equipped ? "Equipped" : "Equip", { tone: equipped ? "soft" : "primary", size: "sm", icon: equipped ? "check" : "", attrs: `data-equip="${i.id}"` }) : `<button type="button" class="btn ${afford ? "btn-gem" : "btn-ghost"} btn-sm" data-buy="${i.id}" ${afford ? "" : `aria-disabled="true" data-tip="You need ${R.fmt(i.cost - R.state.gems)} more gems"`}>${icon("gem")}<span>${R.fmt(i.cost)}</span></button>`}
        </article>`; }).join("")}</div>
      <p class="muted small">${icon("info")} Gems are in-app study rewards and have no cash value.</p>`;
    view.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-buy]");
      if (b) {
        const i = R.content.store.find((x) => x.id === b.dataset.buy);
        if (R.state.gems < i.cost) { R.toast(`You need ${R.fmt(i.cost - R.state.gems)} more gems for ${i.name}.`, { icon: "gem" }); return; }
        const ok = await R.confirm({ title: `Get ${esc(i.name)}?`, body: `This costs <b>${R.fmt(i.cost)} gems</b>. You'll have ${R.fmt(R.state.gems - i.cost)} left.`, confirmLabel: "Buy & equip" });
        if (!ok) return;
        R.update((st) => { st.gems -= i.cost; st.purchases.push(i.id); st.equipped[i.kind] = i.value; });
        R.celebrate({ eyebrow: "New reward", title: i.name, subtitle: "Unlocked and equipped. Check out your new look.", emoji: i.kind === "avatar" ? i.value : null, icon: "bag", tone: "orange", onCta: () => R.refresh() });
      }
      const q = e.target.closest("[data-equip]");
      if (q) { const i = R.content.store.find((x) => x.id === q.dataset.equip); R.update((st) => (st.equipped[i.kind] = st.equipped[i.kind] === i.value ? null : i.value)); R.refresh(); }
    });
  } });

  /* ======================= PROFILE ======================= */
  R.page("profile", { title: "Profile", render(view, ctx) {
    const lv = R.levelInfo(), streak = R.streak(), stats = R.stats(), list = R.achievementList();
    const unlocked = list.filter((a) => a.unlockedAt).sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));
    const onboarding = R.state.profile.onboarding || {}, details = onboarding.details || {};
    const username = onboarding.username ? `@${onboarding.username}` : "Your learning profile";
    const studyContext = [onboarding.institution || details.school, details.department || details.field || details.proField].filter(Boolean).join(" · ");
    const activeTab = ctx.query.tab === "decorations" ? "decorations" : "overview";
    const activeFilter = ["all", "frame", "banner", "accent"].includes(ctx.query.filter) ? ctx.query.filter : "all";
    const next = list.filter((a) => !a.unlockedAt).sort((a, b) => (b.value / b.target) - (a.value / a.target))[0];
    const activities = [...R.state.activity].slice(-5).reverse();
    const activityTitles = { review: "Reviewed flashcards", answer: "Practised a question", exam: "Completed a practice exam", summary: "Made a study summary", explain: "Explained a concept", chat: "Studied with AI Tutor", vault: "Saved a Knowledge Vault item", material: "Added a study material", quest: "Completed a daily quest", bonus: "Earned a study bonus" };
    const activityIcons = { review: "cards", answer: "zap", exam: "clipboard", summary: "file", explain: "quote", chat: "sparkles", vault: "archive", material: "upload", quest: "check-circle", bonus: "award" };
    const activityMarkup = activities.length ? `<ol class="profile-history">${activities.map((a) => `<li><span class="profile-history-icon">${icon(activityIcons[a.t] || "book")}</span><span><b>${activityTitles[a.t] || "Study session"}</b><small>${esc(R.subject(a.subject)?.name || "Independent study")} · ${R.relTime(a.at)}</small></span>${a.xp ? `<em>+${R.fmt(a.xp)} XP</em>` : ""}</li>`).join("")}</ol>` : `<div class="profile-empty">${icon("book")}<b>Your study history starts with your next session</b><span>Your real study activity will appear here.</span>${ui.link("Start learning", "subjects", { tone: "soft", size: "sm", icon: "arrow-right" })}</div>`;
    const overviewMarkup = () => {
      const showcase = unlocked.slice(0, 4);
      return `<div class="profile-overview-grid">
        <section class="profile-panel profile-next-panel"><div class="profile-panel-head"><div><span class="eyebrow">Your next milestone</span><h2>${next ? esc(next.name) : "Every milestone earned"}</h2></div>${icon(next ? "target" : "award")}</div><p>${next ? esc(next.desc) : "You have completed every current achievement. New study milestones will appear here."}</p>${next ? `<div class="profile-next-progress">${ui.progress((next.value / next.target) * 100, { tone: "orange", label: `${next.name} progress` })}<small>${R.fmt(next.value)} of ${R.fmt(next.target)} · ${R.fmt(next.gems)} gems${rewardFor(next.id) ? ` + ${esc(rewardFor(next.id).name)}` : ""}</small></div>` : ""}<a class="btn btn-soft btn-sm" href="#/app/achievements">${icon("award")}Achievement journey</a></section>
        <section class="profile-panel profile-collection-panel"><div class="profile-panel-head"><div><span class="eyebrow">Earned through study</span><h2>Decoration collection</h2></div><a href="#/app/profile?tab=decorations" class="link-btn">View all ${icon("arrow-right")}</a></div>${showcase.length ? `<div class="profile-showcase">${showcase.map((a) => { const reward = rewardFor(a.id); return `<div class="profile-showcase-item">${reward ? rewardMark(reward) : `<span class="badge-art">${icon(a.icon)}</span>`}<b>${esc(reward?.name || a.name)}</b><small>${esc(a.name)}</small></div>`; }).join("")}</div>` : `<div class="profile-empty profile-empty-inline">${icon("award")}<span>Complete a study milestone to earn your first profile decoration.</span></div>`}</section>
        <section class="profile-panel profile-mastery-panel"><div class="profile-panel-head"><div><span class="eyebrow">Knowledge in progress</span><h2>Subject mastery</h2></div>${icon("map")}</div>${R.subjects().length ? R.chart.hbars(R.subjects().map((s) => ({ label: s.name, value: R.subjectMastery(s.id), color: `var(--s${R.subjectIndex(s.id) % 4})` }))) : `<div class="profile-empty profile-empty-inline">${icon("book")}<span>Add subjects and your mastery will grow here.</span></div>`}</section>
        <section class="profile-panel profile-history-panel"><div class="profile-panel-head"><div><span class="eyebrow">Recent sessions</span><h2>Study history</h2></div>${icon("calendar")}</div>${activityMarkup}</section>
      </div>`;
    };
    const decorationsMarkup = () => {
      const rewards = PROFILE_REWARDS.filter((reward) => activeFilter === "all" || reward.kind === activeFilter);
      const earnedCount = PROFILE_REWARDS.filter((reward) => !!list.find((a) => a.id === reward.achievement)?.unlockedAt).length;
      return `<section class="profile-decoration-section"><div class="profile-decoration-heading"><div><span class="eyebrow">Earned through learning</span><h2>Your profile collection</h2><p>Complete real study milestones to unlock frames, banners and accents. No gems or purchases needed.</p></div><div class="profile-decoration-count"><b>${earnedCount}<small>/${PROFILE_REWARDS.length}</small></b><span>earned</span></div></div>
        <nav class="profile-decoration-filters" aria-label="Filter profile decorations">${[["all", "All"], ["frame", "Frames"], ["banner", "Banners"], ["accent", "Accents"]].map(([id, label]) => `<button type="button" data-profile-filter="${id}" class="${id === activeFilter ? "is-active" : ""}" aria-pressed="${id === activeFilter}">${label}</button>`).join("")}</nav>
        <div class="profile-decoration-grid">${rewards.map((reward) => {
          const achievement = list.find((a) => a.id === reward.achievement), earned = !!achievement?.unlockedAt, equipped = R.state.equipped[reward.kind] === reward.value;
          return `<article class="profile-decoration-card ${earned ? "is-earned" : "is-locked"} ${equipped ? "is-equipped" : ""} tone-${reward.tone}"><div class="profile-decoration-preview">${rewardMark(reward, !earned)}${reward.kind === "banner" ? `<span class="profile-banner-sample banner-${reward.value}" aria-hidden="true"></span>` : ""}</div><div class="profile-decoration-meta"><span class="profile-decoration-kind">${esc(reward.rarity)} · ${esc(reward.kind)}</span><h3>${esc(reward.name)}</h3><p>${earned ? `Earned with ${esc(achievement.name)}.` : `Earn with ${esc(achievement.name)}: ${esc(achievement.desc)}`}</p>${earned ? ui.btn(equipped ? "Equipped" : "Equip", { tone: equipped ? "soft" : "primary", size: "sm", icon: equipped ? "check" : "sparkles", attrs: `data-profile-equip="${reward.id}" aria-pressed="${equipped}"` }) : `<div class="profile-decoration-progress">${ui.progress((achievement.value / achievement.target) * 100, { tone: "orange", size: "thin", label: `${achievement.name} progress` })}<small>${R.fmt(achievement.value)} / ${R.fmt(achievement.target)}</small></div>`}</div></article>`;
        }).join("")}</div></section>`;
    };
    view.innerHTML = `<div class="profile-page profile-accent-${R.state.equipped.accent || "none"}">
      <section class="profile-hero banner-${R.state.equipped.banner || "default"}"><div class="profile-cover-art" aria-hidden="true"><span>${icon(R.state.equipped.banner ? "award" : "sparkles")}</span></div>
        <div class="profile-hero-main"><div class="profile-photo-control"><div class="profile-avatar-frame">${R.ui.avatar(92)}</div><label class="profile-photo-button" for="profilePhotoInput" aria-label="Change profile picture">${icon("image")}</label><input id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload profile photo" hidden></div>
          <div class="profile-identity"><span class="profile-username">${esc(username)}</span><h1>${esc(R.displayName())}</h1><p>${esc(studyContext || "Your personal learning space")}</p><div class="profile-pills">${ui.pill(`Level ${lv.level}`, "orange", "award")}${ui.pill(`${R.league().lg.name} tier`, "neutral", "shield")}${ui.pill(`${R.plural(streak.current, "day")} streak`, "neutral", "flame")}</div><div class="profile-level-progress"><div><span>Progress to level ${lv.level + 1}</span><b>${R.fmt(lv.into)} / ${R.fmt(lv.needed)} XP</b></div>${ui.progress(lv.pct, { tone: "orange", size: "thin", label: "Progress to next level" })}</div></div>
          <div class="profile-hero-actions"><button type="button" class="btn btn-soft" data-editprofile>${icon("edit")}Edit profile</button><button type="button" class="btn btn-primary" data-profile-tab="decorations">${icon("award")}Customize</button>${R.state.profile.photo ? `<button type="button" class="profile-remove-photo" data-removephoto>Remove photo</button>` : ""}</div>
        </div>
      </section>
      <div class="profile-stat-row">${[["Total XP", R.fmt(lv.xp), "bolt"], ["Best streak", R.plural(streak.best, "day"), "flame"], ["Cards reviewed", R.fmt(stats.reviews), "cards"], ["Exams taken", R.fmt(stats.exams), "clipboard"]].map(([label, value, glyph]) => `<div class="profile-stat"><span class="profile-stat-icon">${icon(glyph)}</span><span><small>${label}</small><b>${value}</b></span></div>`).join("")}</div>
      <nav class="profile-tabs" aria-label="Profile sections"><button type="button" class="${activeTab === "overview" ? "is-active" : ""}" data-profile-tab="overview" aria-selected="${activeTab === "overview"}">${icon("user")}Overview</button><button type="button" class="${activeTab === "decorations" ? "is-active" : ""}" data-profile-tab="decorations" aria-selected="${activeTab === "decorations"}">${icon("award")}Decorations <span>${PROFILE_REWARDS.filter((reward) => !!list.find((a) => a.id === reward.achievement)?.unlockedAt).length}</span></button></nav>
      <div class="profile-tab-content">${activeTab === "decorations" ? decorationsMarkup() : overviewMarkup()}</div>
    </div>`;
    const rerender = (tab = activeTab, filter = activeFilter) => { R.replaceRoute(`profile?tab=${tab}${tab === "decorations" ? `&filter=${filter}` : ""}`); R.refresh(); };
    view.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-profile-tab]");
      if (tab) { rerender(tab.dataset.profileTab, "all"); return; }
      const filter = e.target.closest("[data-profile-filter]");
      if (filter) { rerender("decorations", filter.dataset.profileFilter); return; }
      const equip = e.target.closest("[data-profile-equip]");
      if (equip) {
        const reward = PROFILE_REWARDS.find((item) => item.id === equip.dataset.profileEquip), achievement = list.find((a) => a.id === reward?.achievement);
        if (!reward || !achievement?.unlockedAt) return;
        const wasEquipped = R.state.equipped[reward.kind] === reward.value;
        R.update((state) => { state.equipped[reward.kind] = wasEquipped ? null : reward.value; });
        rerender("decorations", activeFilter);
        R.toast(wasEquipped ? `${reward.name} unequipped.` : `${reward.name} equipped on your profile.`, { icon: wasEquipped ? "check" : "award" });
        return;
      }
      if (e.target.closest("[data-removephoto]")) { R.update((state) => { state.profile.photo = ""; }); R.updateChips(); rerender(); R.toast("Profile photo removed."); return; }
      if (e.target.closest("[data-editprofile]")) {
        const pathOptions = [["", "Not set"], ["university", "University"], ["secondary", "Secondary school"], ["postgraduate", "Postgraduate"], ["professional", "Professional study"], ["independent", "Independent learning"]];
        R.formDialog({ title: "Your profile and study details", description: "Add or update your name, username and study information. You can change it again anytime.", submitLabel: "Save profile", fields: [
          { name: "name", label: "Display name", required: true, maxLength: 40, value: R.displayName() },
          { name: "username", label: "Username", maxLength: 24, placeholder: "letters, numbers and underscores", value: onboarding.username || "" },
          { name: "path", label: "Study path", type: "select", options: pathOptions, value: onboarding.path || "" },
          { name: "country", label: "Country", maxLength: 60, placeholder: "Your country", value: onboarding.country || "" },
          { name: "institution", label: "School or institution", maxLength: 120, placeholder: "Your school, college or university", value: onboarding.institution || details.school || "" },
          { name: "field", label: "Course or field", maxLength: 120, placeholder: "Your course, department or field", value: details.department || details.field || details.proField || details.topics || "" },
          { name: "level", label: "Level, class or programme", maxLength: 80, placeholder: "Your current level or class", value: details.level || details.grade || details.programme || details.stage || details.cert || "" },
        ], onSubmit: async (values) => {
          const nextUsername = values.username.trim().toLowerCase();
          if (nextUsername && !/^[a-z][a-z0-9_]{2,23}$/.test(nextUsername)) { R.toast("Use 3–24 characters: start with a letter, then use letters, numbers or underscores.", { icon: "info" }); return; }
          const path = values.path, institution = values.institution.trim(), field = values.field.trim(), level = values.level.trim(), nextDetails = { ...details };
          if (path === "secondary") { nextDetails.school = institution; nextDetails.grade = level; }
          else if (path === "university") { nextDetails.institution = institution; nextDetails.department = field; nextDetails.level = level; }
          else if (path === "postgraduate") { nextDetails.institution = institution; nextDetails.field = field; nextDetails.programme = level; }
          else if (path === "professional") { nextDetails.cert = level; nextDetails.proField = field; }
          else if (path === "independent") nextDetails.topics = field;
          const nextOnboarding = { ...onboarding, path, country: values.country.trim(), institution, username: nextUsername || null, details: nextDetails };
          try {
            const saved = await window.RecalroAuth.updateProfile({ name: values.name.trim().replace(/\s+/g, " "), username: nextUsername, onboarding: nextOnboarding });
            R.update((state) => { state.profile.displayName = saved.display_name; state.profile.onboarding = saved.onboarding || nextOnboarding; });
            R.toast("Profile saved."); rerender();
          } catch (error) { R.toast(error.message || "Could not save your profile. Please try again.", { icon: "info" }); }
        } });
      }
    });
    view.addEventListener("change", async (e) => {
      if (e.target.id !== "profilePhotoInput" || !e.target.files?.[0]) return;
      try {
        const photo = await prepareProfilePhoto(e.target.files[0]);
        R.update((state) => { state.profile.photo = photo; }); R.updateChips(); rerender(); R.toast("Profile photo updated.");
      } catch (error) { R.toast(error.message || "Could not use that image.", { icon: "info" }); }
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
        ${ui.card(row("Daily study goal", `${s.dailyGoal} minutes per day (estimated from activity)`, ui.btn("Edit", { tone: "soft", size: "sm", attrs: "data-goal" })), { title: "Learning", icon: "target" })}
        ${ui.card(row("In-app notifications", "Show updates and reminders in the notification bell.", toggle("notificationsEnabled", s.notificationsEnabled !== false, "In-app notifications")) + row("Review reminders", "Remind me when flashcards are due for review.", toggle("reviewReminders", s.reviewReminders !== false, "Review reminders")) + row("Weekly report", "Remind me on Sunday to check my weekly report.", toggle("weeklyReport", s.weeklyReport, "Weekly report reminder")) + '<p class="muted small">Reminders appear when you open Recalro. Email and device push notifications are not connected yet.</p>', { title: "Notifications", icon: "bell" })}
        ${ui.card(row("Private on leaderboards", "Show “You” instead of your name in league rankings.", toggle("leaderboardPrivate", s.leaderboardPrivate, "Private on leaderboards")), { title: "Privacy", icon: "shield" })}
        ${ui.card(row("Export your data", "Download everything this workspace has recorded as JSON.", ui.btn("Export", { tone: "soft", size: "sm", icon: "download", attrs: "data-export" })) + row("Reset learning data", "Clear progress, XP, gems and saved items from this workspace.", ui.btn("Reset", { tone: "danger", size: "sm", attrs: "data-reset" })), { title: "Data", icon: "archive" })}
        ${ui.card(`${row("Signed in as", esc(user.email), ui.btn("Sign out", { tone: "ghost", size: "sm", icon: "logout", attrs: "data-signout" }))}<p class="muted small">${icon("info")} Your account uses Supabase authentication. Learner state is synced to your account when cloud sync is configured.</p>`, { title: "Account", icon: "user" })}
        ${ui.card(`<ul class="shortcuts"><li>${ui.kbd(/Mac|iP/.test(navigator.platform) ? "⌘" : "Ctrl")}${ui.kbd("K")}<span>Search & commands</span></li><li>${ui.kbd("/")}<span>Search</span></li><li>${ui.kbd("Space")}<span>Flip flashcard</span></li><li>${ui.kbd("1")}–${ui.kbd("4")}<span>Rate card / pick answer</span></li><li>${ui.kbd("F")}<span>Flag exam question</span></li><li>${ui.kbd("←")}${ui.kbd("→")}<span>Previous / next exam question</span></li></ul>`, { title: "Keyboard shortcuts", icon: "keyboard" })}
      </div>`;
    view.addEventListener("change", (e) => { if (e.target.matches("[data-theme-choice]")) { R.setTheme(e.target.value); R.toast(`Theme: ${e.target.value === "system" ? "System (follows your device)" : e.target.value[0].toUpperCase() + e.target.value.slice(1)}`, { icon: e.target.value === "dark" ? "moon" : "sun" }); } });
    view.addEventListener("click", async (e) => {
      const seg = e.target.closest("[data-seg='theme']"); if (seg) { R.setTheme(seg.dataset.value); R.refresh(); }
      if (e.target.closest("[data-goal]")) R.formDialog({ title: "Daily study goal", description: "Choose a daily target between 5 minutes and 24 hours.", fields: [{ name: "minutes", label: "Minutes per day", type: "number", value: s.dailyGoal, min: 5, max: 1440, step: 5, required: true }], submitLabel: "Save goal", onSubmit: (v) => { R.update((st) => (st.settings.dailyGoal = Math.round(Number(v.minutes)))); R.toast("Daily goal saved."); R.refresh(); } });
      if (e.target.closest("[data-export]")) R.exportData();
      if (e.target.closest("[data-reset]") && (await R.confirm({ title: "Reset all learning data?", body: "This permanently clears your progress, XP, gems, saved items and history on this device. Export first if you want a copy.", confirmLabel: "Reset everything", tone: "danger" }))) { R.resetDemo(); R.toast("Learning data reset."); R.refresh(); }
      if (e.target.closest("[data-signout]")) R.signOut();
    });
    view.addEventListener("change", (e) => { const t = e.target.closest("[data-toggle]"); if (t) { R.update((st) => (st.settings[t.dataset.toggle] = t.checked)); if (t.dataset.toggle === "notificationsEnabled" && t.checked) R.checkReminders(); R.toast("Preference saved."); } });
  } });
})();

