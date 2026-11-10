/* ==========================================================================
   My Learning: Subjects (+ subject detail & materials), Learning Roadmap,
   Study Planner, Knowledge Vault.
   ========================================================================== */
(function () {
  "use strict";
  const R = window.R, ui = R.ui, { esc, icon } = { esc: R.esc, icon: R.icon };
  const sc = (id) => `var(--s${R.subjectIndex(id) % 4})`;

  function addSubjectDialog() {
    R.formDialog({ title: "Add a subject", description: "Create a subject for your own course. It's saved in this browser.", submitLabel: "Create subject",
      fields: [{ name: "name", label: "Subject name", required: true, maxLength: 60, placeholder: "e.g. Heat Transfer" }, { name: "field", label: "Course or field", maxLength: 60, placeholder: "e.g. Mechanical Engineering" }, { name: "modules", label: "Modules (one per line, optional)", type: "textarea", placeholder: "Conduction\nConvection\nRadiation" }],
      onSubmit: (v) => {
        const mods = v.modules.split("\n").map((m) => m.trim()).filter(Boolean).slice(0, 12);
        const s = { id: "s-" + R.uid(), name: v.name.trim(), field: v.field.trim() || "Personal subject", modules: (mods.length ? mods : ["General"]).map((name) => ({ id: "m-" + R.uid(), name })) };
        R.update((st) => st.subjects.push(s));
        R.toast(`${s.name} added.`); R.go(`subjects/${s.id}`);
      } });
  }
  function addCardDialog(subjectId) {
    const subject = R.subject(subjectId) || R.subjects()[0];
    R.formDialog({ title: "Create a flashcard", submitLabel: "Add card",
      fields: [{ name: "subject", label: "Subject", type: "select", options: R.subjects().map((s) => [s.id, s.name]), value: subject.id },
        { name: "module", label: "Module", type: "select", options: R.subjects().flatMap((s) => (s.modules || []).map((m) => [m.id, `${s.name} · ${m.name}`])), value: subject.modules?.[0]?.id },
        { name: "front", label: "Question", type: "textarea", required: true, maxLength: 300 }, { name: "back", label: "Answer", type: "textarea", required: true, maxLength: 600 }],
      onSubmit: (v) => {
        const mod = R.module(v.module), subj = mod && mod.subject.id === v.subject ? v.module : R.subject(v.subject)?.modules?.[0]?.id;
        R.update((st) => st.customCards.push({ id: "uc-" + R.uid(), subject: v.subject, module: subj, front: v.front.trim(), back: v.back.trim() }));
        R.toast("Flashcard added to your deck."); R.refresh();
      } });
  }
  R.addCardDialog = addCardDialog;

  /* ======================= SUBJECTS ======================= */
  R.page("subjects", {
    title: "My Subjects",
    crumb: (ctx) => (ctx.sub[0] ? R.subject(ctx.sub[0])?.name || "Subject" : null),
    render(view, ctx) {
      if (ctx.sub[0]) return subjectDetail(view, ctx);
      const filter = ctx.query.filter || "all", q = (ctx.query.q || "").toLowerCase();
      let list = R.subjects();
      if (filter === "progress") list = list.filter((s) => R.subjectMastery(s.id) > 0 && R.subjectMastery(s.id) < 100);
      if (filter === "new") list = list.filter((s) => !R.lastStudied(s.id));
      if (filter === "mine") list = list.filter((s) => !s.sample);
      if (q) list = list.filter((s) => `${s.name} ${s.field} ${(s.modules || []).map((m) => m.name).join(" ")}`.toLowerCase().includes(q));
      view.innerHTML = `${ui.header({ eyebrow: "My learning", title: "My subjects", desc: "Your courses, modules and study materials in one place.", actions: ui.btn("Add subject", { icon: "plus", attrs: "data-add" }) })}
        <div class="toolbar"><label class="search">${icon("search")}<input type="search" id="subjSearch" placeholder="Search subjects and modules" value="${esc(ctx.query.q || "")}" aria-label="Search subjects"></label>${ui.segmented("sfilter", [["all", "All"], ["progress", "In progress"], ["new", "Not started"], ["mine", "My subjects"]], filter)}</div>
        ${list.length ? `<div class="subject-grid">${list.map((s) => {
          const m = R.subjectMastery(s.id), due = R.dueCards(s.id).length, n = R.cards(s.id).length, last = R.lastStudied(s.id), mats = R.state.materials.filter((x) => x.subject === s.id).length;
          return `<a class="subject-card" href="#/app/subjects/${s.id}" style="--sc:${sc(s.id)}">
            <div class="sc-band"></div>
            <div class="sc-top"><span class="sc-icon">${icon("book")}</span>${ui.ring(m, { size: 54, stroke: 6, tone: "subject", label: R.pct(m), aria: `${Math.round(m)}% mastery` })}</div>
            <h3>${esc(s.name)}</h3><p>${esc(s.field || "")}</p>
            <div class="sc-meta"><span>${icon("map")}${R.plural((s.modules || []).length, "module")}</span><span>${icon("cards")}${R.plural(n, "card")}</span>${mats ? `<span>${icon("file")}${mats}</span>` : ""}</div>
            <div class="sc-foot">${due ? ui.pill(`${due} due`, "teal", "refresh") : ""}${s.sample ? ui.sample() : ui.pill("Yours", "neutral")}<small>${last ? `Studied ${R.relTime(last)}` : "Not started"}</small></div>
          </a>`; }).join("")}
          <button type="button" class="subject-card add-card" data-add>${icon("plus")}<b>Add a subject</b><small>Organise your next learning goal</small></button></div>`
        : ui.empty({ icon: "search", title: "No subjects match", body: "Try a different search or filter.", action: ui.btn("Clear filters", { tone: "soft", attrs: "data-clear" }) })}`;
      const search = R.$("#subjSearch", view);
      let t;
      search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { history.replaceState(null, "", `#/app/subjects?filter=${filter}&q=${encodeURIComponent(search.value)}`); R.renderRouteQuiet(); }, 250); });
      view.addEventListener("click", (e) => {
        if (e.target.closest("[data-add]")) addSubjectDialog();
        if (e.target.closest("[data-clear]")) R.go("subjects");
        const seg = e.target.closest("[data-seg='sfilter']"); if (seg) R.go(`subjects?filter=${seg.dataset.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`);
      });
      if (ctx.query.new) setTimeout(addSubjectDialog, 50);
    },
  });
  // Re-render after a replaceState (keeps search input focus).
  R.renderRouteQuiet = () => {
    const ctx = R.parseRoute(), active = document.activeElement?.id, pos = document.activeElement?.selectionStart;
    R.refreshWith(ctx);
    if (active) { const el = document.getElementById(active); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch {} } }
  };

  function subjectDetail(view, ctx) {
    const s = R.subject(ctx.sub[0]);
    if (!s) { view.innerHTML = ui.empty({ icon: "book", title: "Subject not found", action: ui.link("All subjects", "subjects") }); return; }
    const tab = ctx.sub[1] || "overview", mods = R.moduleStatus(s), m = R.subjectMastery(s.id), cards = R.cards(s.id), due = R.dueCards(s.id).length;
    const mats = R.state.materials.filter((x) => x.subject === s.id);
    const tabs = [{ id: "overview", label: "Overview", route: `subjects/${s.id}`, icon: "map" }, { id: "materials", label: "Materials", route: `subjects/${s.id}/materials`, icon: "file", count: mats.length || null }, { id: "cards", label: "Cards", route: `subjects/${s.id}/cards`, icon: "cards", count: cards.length }];
    let body = "";
    if (tab === "overview") body = `<div class="grid-12">
        ${ui.card(`<ol class="module-list">${mods.map((md, i) => `<li class="module ${md.status}"><span class="module-node">${md.status === "done" ? icon("check") : i + 1}</span><div><b>${esc(md.name)}</b><small>${R.plural(md.count, "card")} · ${R.pct(md.mastery)} mastery</small>${ui.progress(md.mastery, { size: "thin", label: md.name })}</div>${md.count ? ui.link(md.status === "done" ? "Review" : "Study", `flashcards?module=${md.id}`, { tone: md.status === "active" ? "primary" : "soft", size: "sm" }) : ui.btn("Add cards", { tone: "soft", size: "sm", attrs: `data-addcard` })}</li>`).join("")}</ol>${s.sample ? "" : ui.btn("Add module", { tone: "ghost", size: "sm", icon: "plus", attrs: "data-addmod" })}`, { title: "Modules", icon: "map", cls: "span-8" })}
        ${ui.card(`<div class="subject-actions">
            <a href="#/app/flashcards?subject=${s.id}" class="action-tile">${icon("cards")}<b>Study flashcards</b><small>${due ? `${due} due · ` : ""}${R.newCards(s.id).length} new</small></a>
            <a href="#/app/practice?subject=${s.id}" class="action-tile">${icon("zap")}<b>Quick practice</b><small>${R.content.questions.filter((q) => q.subject === s.id).length} questions</small></a>
            <a href="#/app/exam?subject=${s.id}" class="action-tile">${icon("clipboard")}<b>Exam simulator</b><small>Timed conditions</small></a>
            <a href="#/app/tutor?subject=${s.id}" class="action-tile">${icon("sparkles")}<b>Ask the tutor</b><small>Subject context</small></a>
            <a href="#/app/readiness?subject=${s.id}" class="action-tile">${icon("gauge")}<b>Readiness</b><small>${R.pct(R.readiness(s.id).score)} estimated</small></a>
            <a href="#/app/roadmap?subject=${s.id}" class="action-tile">${icon("map")}<b>Roadmap</b><small>See your path</small></a></div>`, { title: "Study this subject", icon: "zap", cls: "span-4" })}</div>`;
    if (tab === "materials") body = `${ui.card(`<label class="dropzone" id="drop"><input type="file" id="fileIn" multiple accept=".pdf,.doc,.docx,.txt,.md,.ppt,.pptx,image/*" class="sr-only">${icon("upload")}<b>Drop files here or <u>browse</u></b><small>PDF, Word, PowerPoint, images, or plain-text notes</small></label>
        <p class="note-info">${icon("info")}<span>Plain-text and Markdown files are read here in your browser so you can summarise them right away. PDFs, Word documents and images need the document-processing service, which isn't connected in this prototype.</span></p>
        ${mats.length ? `<ul class="materials">${mats.map((f) => `<li><span class="file-ic">${icon(f.text ? "note" : "file")}</span><div><b>${esc(f.name)}</b><small>${(f.size / 1024).toFixed(0)} KB · added ${R.relTime(f.addedAt)}</small></div>
          ${f.text ? ui.pill("Text extracted", "teal", "check") : ui.pill("Awaiting processing service", "neutral", "clock")}
          <div class="row-actions">${f.text ? ui.btn("Summarise", { tone: "soft", size: "sm", attrs: `data-summarize="${f.id}"` }) : ""}${ui.btn("", { tone: "ghost", size: "sm", icon: "trash", attrs: `data-delfile="${f.id}" aria-label="Remove ${esc(f.name)}"` })}</div></li>`).join("")}</ul>` : ""}`, { title: "Study materials", icon: "file" })}`;
    if (tab === "cards") body = ui.card(`<ul class="card-table">${cards.map((c) => { const st = R.state.cards[c.id]; return `<li><div><b>${esc(c.front)}</b><small>${esc(c.back)}</small></div><span class="ct-meta">${R.module(c.module)?.name ? `<small>${esc(R.module(c.module).name)}</small>` : ""}${st ? ui.pill(R.isDue(c.id) ? "Due" : `Next ${R.inDays(st.due)}`, R.isDue(c.id) ? "teal" : "neutral") : ui.pill("New", "orange")}</span></li>`; }).join("")}</ul>`, { title: `${R.plural(cards.length, "card")}`, icon: "cards", action: ui.btn("Add card", { size: "sm", icon: "plus", attrs: "data-addcard" }) });

    view.innerHTML = `<div class="subject-hero" style="--sc:${sc(s.id)}"><div><a class="back-link" href="#/app/subjects">${icon("arrow-left")}All subjects</a><div class="eyebrow">${esc(s.field || "Subject")} ${s.sample ? ui.sample("Sample course") : ""}</div><h1>${esc(s.name)}</h1>
        <div class="hero-stats"><span><b>${R.pct(m)}</b> mastery</span><span><b>${cards.length}</b> cards</span><span><b>${due}</b> due</span><span><b>${(s.modules || []).length}</b> modules</span></div></div>
        ${ui.ring(m, { size: 104, stroke: 10, tone: "subject", label: R.pct(m), sub: "mastery" })}</div>
      ${ui.tabs(tabs, tab, "Subject sections")}${body}`;

    view.addEventListener("click", (e) => {
      if (e.target.closest("[data-addcard]")) addCardDialog(s.id);
      if (e.target.closest("[data-addmod]")) R.formDialog({ title: "Add a module", fields: [{ name: "name", label: "Module name", required: true, maxLength: 60 }], submitLabel: "Add module", onSubmit: (v) => { R.update(() => s.modules.push({ id: "m-" + R.uid(), name: v.name.trim() })); R.refresh(); } });
      const del = e.target.closest("[data-delfile]"); if (del) { R.update((st) => (st.materials = st.materials.filter((f) => f.id !== del.dataset.delfile))); R.refresh(); }
      const sum = e.target.closest("[data-summarize]"); if (sum) { const f = R.state.materials.find((x) => x.id === sum.dataset.summarize); sessionStorage.setItem("recalro-summary-source", JSON.stringify({ title: f.name.replace(/\.[^.]+$/, ""), text: f.text, subject: s.id })); R.go("summaries?from=material"); }
    });
    const fileIn = R.$("#fileIn", view), drop = R.$("#drop", view);
    if (fileIn) {
      const handle = async (files) => {
        for (const file of files) {
          const rec = { id: R.uid(), subject: s.id, name: file.name, size: file.size, type: file.type, addedAt: new Date().toISOString(), text: null };
          if (/\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/")) {
            if (file.size > 300 * 1024) R.toast(`${file.name} is over 300 KB; only the first part was kept.`, { icon: "info" });
            rec.text = (await file.text()).slice(0, 300 * 1024);
          }
          R.state.materials.push(rec);
        }
        R.save(); R.emit("change"); R.toast(`${R.plural(files.length, "file")} added to ${s.name}.`, { icon: "upload" }); R.refresh();
      };
      fileIn.addEventListener("change", () => handle([...fileIn.files]));
      ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
      ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
      drop.addEventListener("drop", (e) => handle([...e.dataTransfer.files]));
    }
  }

  /* ======================= ROADMAP ======================= */
  R.page("roadmap", { title: "Learning Roadmap", render(view, ctx) {
    const sid = ctx.query.subject && R.subject(ctx.query.subject) ? ctx.query.subject : R.subjects()[0].id;
    const s = R.subject(sid), mods = R.moduleStatus(s), active = mods.find((m) => m.status === "active");
    const done = mods.filter((m) => m.status === "done").length, overall = R.subjectMastery(sid);
    const milestones = R.state.milestones.filter((m) => m.subject === sid);
    view.innerHTML = `${ui.header({ eyebrow: "My learning", title: "Learning roadmap", desc: "Your path through each subject, from foundations to mastery.", actions: `<label class="select-inline"><span class="sr-only">Subject</span><select id="rmSubject">${R.subjects().map((x) => `<option value="${x.id}" ${x.id === sid ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>` })}
      <div class="grid-12">
        ${ui.card(`<div class="rm-summary"><div><b>${done} of ${mods.length}</b> modules complete</div>${ui.progress(overall, { label: "Subject mastery" })}<span>${R.pct(overall)}</span></div>
          <ol class="path" style="--sc:${sc(sid)}">${mods.map((m, i) => `<li class="path-node ${m.status}">
            <div class="pn-marker">${m.status === "done" ? icon("check") : m.status === "active" ? icon("play") : icon("lock")}</div>
            <div class="pn-card"><div class="pn-top"><span class="eyebrow">Module ${i + 1}</span>${ui.pill(m.status === "done" ? "Completed" : m.status === "active" ? "In progress" : "Upcoming", m.status === "active" ? "orange" : m.status === "done" ? "teal" : "neutral")}</div>
              <h3>${esc(m.name)}</h3><p>${R.plural(m.count, "card")} · ${R.pct(m.mastery)} mastered</p>${ui.progress(m.mastery, { size: "thin", label: m.name })}
              ${m.count ? `<div class="pn-actions">${ui.link(m.status === "done" ? "Review module" : m.status === "active" ? "Continue" : "Preview", `flashcards?module=${m.id}`, { tone: m.status === "active" ? "primary" : "soft", size: "sm" })}</div>` : `<p class="muted small">No cards yet. ${ui.link("Add cards", `subjects/${sid}/cards`, { tone: "link" })}</p>`}</div></li>`).join("")}
            <li class="path-node goal ${done === mods.length && mods.length ? "done" : ""}"><div class="pn-marker">${icon("trophy")}</div><div class="pn-card"><h3>Subject mastered</h3><p>Reach 80% mastery in every module.</p></div></li></ol>`, { title: s.name, icon: "map", cls: "span-8", sub: s.sample ? "Sample course structure" : "Your course" })}
        <div class="span-4 stack">
          ${ui.card(active ? `<div class="next-step"><span class="rec-icon">${icon("arrow-right")}</span><h3>${esc(active.name)}</h3><p>${active.mastery ? `You're ${R.pct(active.mastery)} through this module.` : "Your next module. Start with its flashcards."} Modules complete at 80% mastery.</p>${ui.link("Continue learning", `flashcards?module=${active.id}`, { size: "block", icon: "play" })}</div>` : `<p class="muted small">Every module here is complete. Review periodically to keep it fresh.</p>`, { title: "Recommended next step", icon: "bulb" })}
          ${ui.card(`${milestones.length ? `<ul class="milestones">${milestones.map((m) => `<li class="${m.done ? "is-done" : ""}"><button type="button" class="check-btn" data-ms="${m.id}" aria-pressed="${m.done}" aria-label="${m.done ? "Mark not done" : "Mark done"}: ${esc(m.title)}">${m.done ? icon("check") : ""}</button><span>${esc(m.title)}</span>${m.target ? `<small>${R.fmtDate(m.target)}</small>` : ""}</li>`).join("")}</ul>` : `<p class="muted small">Set personal milestones like “Finish power cycles by 30 Nov”.</p>`}${ui.btn("Add milestone", { tone: "soft", size: "sm", icon: "plus", attrs: "data-addms" })}`, { title: "Your milestones", icon: "flag" })}
        </div>
      </div>`;
    R.$("#rmSubject", view).addEventListener("change", (e) => R.go(`roadmap?subject=${e.target.value}`));
    view.addEventListener("click", (e) => {
      const ms = e.target.closest("[data-ms]");
      if (ms) { const m = R.state.milestones.find((x) => x.id === ms.dataset.ms); m.done = !m.done; R.save(); if (m.done) { R.burst(ms, { count: 14, spread: 60 }); R.toast(`Milestone reached: ${m.title}`, { icon: "flag", tone: "toast-reward" }); } R.refresh(); }
      if (e.target.closest("[data-addms]")) R.formDialog({ title: "Add a milestone", fields: [{ name: "title", label: "Milestone", required: true, maxLength: 80 }, { name: "target", label: "Target date (optional)", type: "date" }], submitLabel: "Add milestone", onSubmit: (v) => { R.update((st) => st.milestones.push({ id: R.uid(), title: v.title.trim(), target: v.target || null, subject: sid, done: false })); R.refresh(); } });
    });
  } });

  /* ======================= STUDY PLANNER ======================= */
  R.page("planner", { title: "Study Planner", render(view, ctx) {
    const today = R.dayKey(), sel = ctx.query.day || today;
    const monthStart = new Date((ctx.query.month || sel.slice(0, 7)) + "-01T12:00:00");
    const first = R.startOfWeek(monthStart), cells = Array.from({ length: 42 }, (_, i) => R.addDays(first, i));
    const items = (k) => ({ blocks: R.state.planner.filter((p) => p.date === k), deadlines: R.state.deadlines.filter((d) => d.date === k), studied: R.activityOn(k).length > 0 });
    const dayItems = items(sel);
    const upcoming = R.state.deadlines.filter((d) => d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const monthKey = (d) => R.dayKey(d).slice(0, 7);
    const prevM = new Date(monthStart); prevM.setMonth(prevM.getMonth() - 1);
    const nextM = new Date(monthStart); nextM.setMonth(nextM.getMonth() + 1);
    view.innerHTML = `${ui.header({ eyebrow: "My learning", title: "Study planner", desc: "Make space for focused learning and keep deadlines in view.", actions: `${ui.btn("Add deadline", { tone: "soft", icon: "flag", attrs: "data-adddl" })}${ui.btn("Plan study block", { icon: "plus", attrs: "data-addblock" })}` })}
      <div class="grid-12">
        ${ui.card(`<div class="cal-head"><h2>${monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><div>${ui.link("", `planner?month=${monthKey(prevM)}&day=${sel}`, { tone: "ghost", size: "sm", icon: "chevron-left", cls: "icon-only" })}${ui.link("Today", `planner?day=${today}`, { tone: "ghost", size: "sm" })}${ui.link("", `planner?month=${monthKey(nextM)}&day=${sel}`, { tone: "ghost", size: "sm", icon: "chevron-right", cls: "icon-only" })}</div></div>
          <div class="cal" role="grid" aria-label="Calendar"><div class="cal-row cal-dow" role="row">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<span role="columnheader">${d}</span>`).join("")}</div>
          <div class="cal-grid">${cells.map((d) => { const k = R.dayKey(d), it = items(k); return `<a role="gridcell" href="#/app/planner?month=${monthKey(monthStart)}&day=${k}" class="cal-cell ${d.getMonth() !== monthStart.getMonth() ? "is-out" : ""} ${k === today ? "is-today" : ""} ${k === sel ? "is-sel" : ""}" aria-label="${R.fmtDate(d, { weekday: "long", month: "long", day: "numeric" })}${it.blocks.length ? `, ${it.blocks.length} study blocks` : ""}${it.deadlines.length ? `, ${it.deadlines.length} deadlines` : ""}"><span class="cal-num">${d.getDate()}</span><span class="cal-marks">${it.studied ? '<i class="mk-study"></i>' : ""}${it.blocks.length ? '<i class="mk-block"></i>' : ""}${it.deadlines.length ? '<i class="mk-dl"></i>' : ""}</span></a>`; }).join("")}</div></div>
          <div class="cal-legend"><span><i class="mk-study"></i>Studied</span><span><i class="mk-block"></i>Study block</span><span><i class="mk-dl"></i>Deadline</span></div>`, { cls: "span-8" })}
        <div class="span-4 stack">
          ${ui.card(`${dayItems.deadlines.map((d) => `<div class="dl-row">${icon("flag")}<div><b>${esc(d.title)}</b><small>Deadline${d.subject ? ` · ${esc(R.subject(d.subject)?.name || "")}` : ""}</small></div></div>`).join("")}
            ${dayItems.blocks.length ? `<ul class="blocks">${dayItems.blocks.map((p) => `<li class="${p.done ? "is-done" : ""}"><button type="button" class="check-btn" data-block="${p.id}" aria-pressed="${p.done}" aria-label="${p.done ? "Mark not done" : "Mark done"}: ${esc(p.title)}">${p.done ? icon("check") : ""}</button><div><b>${esc(p.title)}</b><small>${p.time ? esc(p.time) + " · " : ""}${p.duration} min${p.subject ? ` · ${esc(R.subject(p.subject)?.name || "")}` : ""}</small></div><button type="button" class="icon-btn sm" data-delblock="${p.id}" aria-label="Delete ${esc(p.title)}">${icon("trash")}</button></li>`).join("")}</ul>` : `<p class="muted small">Nothing planned${sel === today ? " today" : ""}.</p>`}
            ${ui.btn("Add study block", { tone: "soft", size: "sm", icon: "plus", attrs: "data-addblock" })}`, { title: sel === today ? "Today" : R.fmtDate(sel + "T12:00", { weekday: "long", month: "long", day: "numeric" }), icon: "calendar" })}
          ${ui.card(upcoming.length ? `<ul class="deadlines">${upcoming.slice(0, 6).map((d) => { const days = Math.round((R.startOfDay(d.date + "T12:00") - R.startOfDay()) / 86400000); return `<li><span class="dl-count ${days <= 7 ? "soon" : ""}"><b>${days}</b><small>${days === 1 ? "day" : "days"}</small></span><div><b>${esc(d.title)}</b><small>${R.fmtDate(d.date + "T12:00", { weekday: "short", month: "short", day: "numeric" })}</small></div><button type="button" class="icon-btn sm" data-deldl="${d.id}" aria-label="Delete ${esc(d.title)}">${icon("trash")}</button></li>`; }).join("")}</ul>` : `<p class="muted small">Add exams and assignment due dates to see a countdown.</p>`, { title: "Upcoming deadlines", icon: "flag" })}
        </div></div>`;
    const subjOpts = [["", "None"], ...R.subjects().map((s) => [s.id, s.name])];
    view.addEventListener("click", (e) => {
      if (e.target.closest("[data-addblock]")) R.formDialog({ title: "Plan a study block", submitLabel: "Add to planner", fields: [{ name: "title", label: "What will you study?", required: true, maxLength: 80, placeholder: "e.g. Entropy problems" }, { name: "subject", label: "Subject", type: "select", options: subjOpts }, { name: "date", label: "Date", type: "date", value: sel, required: true }, { name: "time", label: "Start time (optional)", type: "time" }, { name: "duration", label: "Duration (minutes)", type: "number", value: 30, min: 5, max: 480, step: 5, required: true }],
        onSubmit: (v) => { R.update((st) => st.planner.push({ id: R.uid(), title: v.title.trim(), subject: v.subject, date: v.date, time: v.time, duration: Number(v.duration), done: false })); R.toast("Study block planned."); R.go(`planner?day=${v.date}`); } });
      if (e.target.closest("[data-adddl]")) R.formDialog({ title: "Add a deadline", submitLabel: "Add deadline", fields: [{ name: "title", label: "Exam or assignment", required: true, maxLength: 80, placeholder: "e.g. Thermodynamics mid-semester test" }, { name: "subject", label: "Subject", type: "select", options: subjOpts }, { name: "date", label: "Date", type: "date", value: sel, required: true }],
        onSubmit: (v) => { R.update((st) => st.deadlines.push({ id: R.uid(), title: v.title.trim(), subject: v.subject, date: v.date })); R.toast("Deadline added."); R.refresh(); } });
      const b = e.target.closest("[data-block]"); if (b) { const p = R.state.planner.find((x) => x.id === b.dataset.block); p.done = !p.done; R.save(); if (p.done) { R.burst(b, { count: 12, spread: 50 }); R.toast(`Done: ${p.title}`); } R.refresh(); }
      const db = e.target.closest("[data-delblock]"); if (db) { R.update((st) => (st.planner = st.planner.filter((x) => x.id !== db.dataset.delblock))); R.refresh(); }
      const dd = e.target.closest("[data-deldl]"); if (dd) { R.update((st) => (st.deadlines = st.deadlines.filter((x) => x.id !== dd.dataset.deldl))); R.refresh(); }
    });
  } });

  /* ======================= KNOWLEDGE VAULT ======================= */
  R.page("vault", { title: "Knowledge Vault", render(view, ctx) {
    let cat = ctx.query.cat || "all", subj = ctx.query.subject || "", q = ctx.query.q || "", recall = ctx.query.recall === "1";
    const draw = () => {
      const items = R.vaultItems().filter((v) => (cat === "all" || (cat === "fav" ? R.state.favorites.includes(v.id) : v.category === cat)) && (!subj || v.subject === subj) && (!q || `${v.title} ${v.detail} ${v.category}`.toLowerCase().includes(q.toLowerCase())));
      R.$("#vaultCount", view).textContent = `${R.plural(items.length, "item")}`;
      R.$$("[data-cat]", view).forEach((c) => { c.classList.toggle("is-on", c.dataset.cat === cat); c.setAttribute("aria-pressed", String(c.dataset.cat === cat)); });
      R.$("#vaultGrid", view).innerHTML = items.length ? items.map((v) => {
        const c = R.content.vaultCategories.find((x) => x.id === v.category) || R.content.vaultCategories[4], fav = R.state.favorites.includes(v.id);
        return `<article class="vault-card cat-${v.category} ${recall ? "is-recall" : ""}">
          <div class="vc-top"><span class="vc-cat">${icon(c.icon)}${c.label.replace(/s$/, "").replace("Laws & principle", "Law / principle")}</span><button type="button" class="icon-btn sm fav ${fav ? "is-on" : ""}" data-fav="${v.id}" aria-pressed="${fav}" aria-label="${fav ? "Remove from" : "Add to"} favourites: ${esc(v.title)}">${icon(fav ? "bookmark-fill" : "bookmark")}</button></div>
          <h3>${esc(v.title)}</h3>
          <div class="vc-detail ${v.category === "formula" ? "is-formula" : ""}" id="vd-${v.id}">${esc(v.detail)}</div>
          <div class="vc-foot">${v.subject ? `<span>${ui.subjectDot(v.subject)}${esc(R.subject(v.subject)?.name || "")}</span>` : "<span></span>"}<div>${v.sample ? "" : `<button type="button" class="icon-btn sm" data-delv="${v.id}" aria-label="Delete ${esc(v.title)}">${icon("trash")}</button>`}<button type="button" class="btn btn-soft btn-sm" data-recall="${v.id}" aria-controls="vd-${v.id}" aria-expanded="${!recall}">${recall ? "Reveal" : "Quick recall"}</button></div></div>
        </article>`; }).join("") : ui.empty({ icon: "archive", title: q ? `Nothing matches “${esc(q)}”` : "Nothing here yet", body: "Save formulas, laws, definitions and dates you want to keep within reach.", action: ui.btn("Save knowledge", { icon: "plus", attrs: "data-addv" }) });
    };
    const counts = { all: R.vaultItems().length, fav: R.state.favorites.length };
    R.content.vaultCategories.forEach((c) => (counts[c.id] = R.vaultItems().filter((v) => v.category === c.id).length));
    view.innerHTML = `${ui.header({ eyebrow: "My learning", title: "Knowledge vault", desc: "Your personal library of formulas, laws, definitions and dates worth keeping.", actions: `${ui.btn(recall ? "Exit recall mode" : "Recall mode", { tone: recall ? "primary" : "soft", icon: "brain", attrs: "data-recallmode" })}${ui.btn("Save knowledge", { icon: "plus", attrs: "data-addv" })}` })}
      <div class="toolbar"><label class="search grow">${icon("search")}<input type="search" id="vaultSearch" placeholder="Search formulas, definitions, laws, dates and notes" value="${esc(q)}" aria-label="Search the vault"></label>
        <label class="select-inline"><span class="sr-only">Subject</span><select id="vaultSubject"><option value="">All subjects</option>${R.subjects().map((s) => `<option value="${s.id}" ${s.id === subj ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label></div>
      <div class="chips" role="group" aria-label="Category">${[["all", "All", "grid"], ...R.content.vaultCategories.map((c) => [c.id, c.label, c.icon]), ["fav", "Favourites", "bookmark"]].map(([id, l, ic]) => `<button type="button" class="chip-btn" data-cat="${id}" aria-pressed="false">${icon(ic)}${l}<span>${counts[id]}</span></button>`).join("")}</div>
      ${recall ? `<p class="note-info">${icon("brain")}<span>Recall mode: try to remember each item before revealing it.</span></p>` : ""}
      <div class="vault-meta"><span id="vaultCount"></span></div>
      <div class="vault-grid" id="vaultGrid"></div>`;
    draw();
    R.$("#vaultSearch", view).addEventListener("input", (e) => { q = e.target.value.trim(); draw(); });
    R.$("#vaultSubject", view).addEventListener("change", (e) => { subj = e.target.value; draw(); });
    view.addEventListener("click", (e) => {
      const c = e.target.closest("[data-cat]"); if (c) { cat = c.dataset.cat; draw(); }
      const f = e.target.closest("[data-fav]"); if (f) { const id = f.dataset.fav; R.state.favorites = R.state.favorites.includes(id) ? R.state.favorites.filter((x) => x !== id) : [...R.state.favorites, id]; R.save(); R.animate(f, [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 300 }); draw(); }
      const r = e.target.closest("[data-recall]"); if (r) { const card = r.closest(".vault-card"), open = card.classList.toggle("is-recall") === false; r.textContent = open ? "Hide" : "Reveal"; r.setAttribute("aria-expanded", String(open)); if (open) R.animate(card.querySelector(".vc-detail"), [{ opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0)" }], { duration: 320 }); }
      if (e.target.closest("[data-recallmode]")) R.go(`vault?recall=${recall ? 0 : 1}`);
      const d = e.target.closest("[data-delv]"); if (d) R.confirm({ title: "Delete this item?", body: "It will be removed from your vault on this device.", confirmLabel: "Delete", tone: "danger" }).then((ok) => { if (ok) { R.update((st) => { st.savedVault = st.savedVault.filter((x) => x.id !== d.dataset.delv); st.favorites = st.favorites.filter((x) => x !== d.dataset.delv); }); R.refresh(); } });
      if (e.target.closest("[data-addv]")) addVault();
    });
    const addVault = () => R.formDialog({ title: "Save knowledge", submitLabel: "Save to vault",
      fields: [{ name: "title", label: "Name", required: true, maxLength: 100, placeholder: "e.g. Fourier's law" }, { name: "category", label: "Type", type: "select", options: R.content.vaultCategories.map((c) => [c.id, c.label.replace(/s$/, "")]), value: cat !== "all" && cat !== "fav" ? cat : "formula" }, { name: "detail", label: "Formula, definition, date or note", type: "textarea", required: true, maxLength: 1000 }, { name: "subject", label: "Subject", type: "select", options: [["", "None"], ...R.subjects().map((s) => [s.id, s.name])], value: subj }],
      onSubmit: (v) => {
        R.state.savedVault.push({ id: "uv-" + R.uid(), title: v.title.trim(), detail: v.detail.trim(), category: v.category, subject: v.subject });
        R.record({ t: "vault", xp: R.content.xp.vault, subject: v.subject || undefined }, R.$("[data-addv]", view));
        R.toast(`${v.title.trim()} saved to your vault.`, { icon: "bookmark" }); R.refresh();
      } });
    if (ctx.query.new) setTimeout(addVault, 50);
  } });
})();
