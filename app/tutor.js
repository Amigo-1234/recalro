/* ==========================================================================
   AI Tutor workspace.
   Components: TutorWorkspace · ConversationHistory · ConversationHeader ·
   ChatMessage / AIResponse (Markdown + maths) · MessageActions ·
   MessageComposer + AttachmentPreview · SubjectSelector · SuggestedPrompts ·
   ExplainItWorkspace.

   Availability: no AI provider is connected in this prototype. Answers are
   assembled locally from the student's own flashcards, vault and review
   history, and every answer says so. To connect a provider, replace
   `composeAnswer()` and feed streamed Markdown into `revealAnswer()`.
   ========================================================================== */
(function () {
  "use strict";
  const R = window.R, ui = R.ui, esc = R.esc, icon = R.icon;
  const phone = () => window.matchMedia("(max-width: 767px)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, R.reducedMotion() ? 0 : ms));

  /* ======================= Markdown + maths (AIResponse) ======================= */
  const SYM = { Delta: "Δ", delta: "δ", eta: "η", rho: "ρ", theta: "θ", pi: "π", alpha: "α", beta: "β", gamma: "γ", omega: "ω", Omega: "Ω", sigma: "σ", Sigma: "Σ", mu: "μ", lambda: "λ", epsilon: "ε", phi: "φ", tau: "τ", geq: "≥", ge: "≥", leq: "≤", le: "≤", neq: "≠", approx: "≈", times: "×", cdot: "·", pm: "±", to: "→", rightarrow: "→", infty: "∞", sum: "∑", int: "∫", partial: "∂", nabla: "∇", degree: "°" };
  // A small LaTeX subset rendered with plain HTML: fractions, roots, sub/superscripts, Greek and operators.
  function mathHTML(src) {
    let s = esc(src);
    const group = "\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}";
    for (let i = 0; i < 3; i++) s = s.replace(new RegExp(`\\\\frac${group}${group}`, "g"), (_, a, b) => `<span class="m-frac"><span>${a}</span><span>${b}</span></span>`);
    s = s.replace(new RegExp(`\\\\sqrt${group}`, "g"), (_, a) => `√<span class="m-root">${a}</span>`);
    s = s.replace(/\\([A-Za-z]+)/g, (m, name) => SYM[name] || (name === "text" ? "" : m));
    s = s.replace(new RegExp(`\\^${group}`, "g"), "<sup>$1</sup>").replace(/\^([A-Za-z0-9+\-]+?)(?=[^A-Za-z0-9]|$)/g, "<sup>$1</sup>");
    s = s.replace(new RegExp(`_${group}`, "g"), "<sub>$1</sub>").replace(/_([A-Za-z0-9]+)/g, "<sub>$1</sub>");
    return s.replace(/[{}]/g, "");
  }
  function inline(t) {
    const slots = [];
    const keep = (html) => `\u0000${slots.push(html) - 1}\u0000`;
    t = t.replace(/`([^`]+)`/g, (_, c) => keep(`<code>${esc(c)}</code>`));
    t = t.replace(/\$([^$\n]+)\$/g, (_, m) => keep(`<span class="m-inline">${mathHTML(m)}</span>`));
    t = esc(t);
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>").replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,;:!?)])/g, "$1<em>$2</em>");
    t = t.replace(/\[([^\]]+)\]\((#\/app\/[^)\s]+|https?:\/\/[^)\s]+)\)/g, (_, label, href) => `<a href="${href}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`);
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[i]);
  }
  R.md = (src) => {
    const lines = String(src || "").replace(/\r/g, "").split("\n"), out = [];
    let i = 0;
    const isTable = (l) => /^\s*\|.*\|\s*$/.test(l);
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      let m;
      if ((m = line.match(/^```(\w*)/))) {
        const lang = m[1], code = []; i++;
        while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
        i++;
        out.push(`<div class="md-code"><div class="md-code-head"><span>${esc(lang || "code")}</span><button type="button" class="md-copy" data-copy-code>${icon("copy")}Copy</button></div><pre><code>${esc(code.join("\n"))}</code></pre></div>`);
        continue;
      }
      if (line.trim().startsWith("$$")) {
        const buf = [line.trim().replace(/^\$\$/, "")];
        if (!/\$\$\s*$/.test(line.trim().slice(2))) { i++; while (i < lines.length && !lines[i].includes("$$")) buf.push(lines[i++]); buf.push((lines[i] || "").replace("$$", "")); }
        else buf[0] = buf[0].replace(/\$\$\s*$/, "");
        i++;
        out.push(`<div class="md-math" role="math">${mathHTML(buf.join(" ").trim())}</div>`);
        continue;
      }
      if ((m = line.match(/^(#{1,4})\s+(.*)/))) { const lvl = Math.max(2, Math.min(4, m[1].length)); out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`); i++; continue; }
      if (isTable(line) && isTable(lines[i + 1] || "") && /^[\s|:-]+$/.test(lines[i + 1])) {
        const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        const headRow = cells(line); i += 2; const rows = [];
        while (i < lines.length && isTable(lines[i])) rows.push(cells(lines[i++]));
        out.push(`<div class="md-table"><table><thead><tr>${headRow.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }
      if (line.startsWith(">!")) { // reveal-on-tap answer (used by quizzes)
        out.push(`<details class="md-reveal"><summary>Show answer</summary><div>${inline(line.slice(2).trim())}</div></details>`); i++; continue;
      }
      if (line.startsWith(">")) {
        const buf = []; while (i < lines.length && lines[i].startsWith(">") && !lines[i].startsWith(">!")) buf.push(lines[i++].replace(/^>\s?/, ""));
        out.push(`<aside class="md-callout">${icon("bulb")}<div>${buf.map((b) => `<p>${inline(b)}</p>`).join("")}</div></aside>`);
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        const ordered = /^\s*\d+\./.test(line), items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          let item = lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""), extra = "";
          while (i < lines.length && lines[i].startsWith(">!")) { extra += `<details class="md-reveal"><summary>Show answer</summary><div>${inline(lines[i].slice(2).trim())}</div></details>`; i++; }
          items.push(`<li>${inline(item)}${extra}</li>`);
        }
        out.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
        continue;
      }
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\$\$|\s*([-*]|\d+\.)\s)/.test(lines[i]) && !isTable(lines[i])) para.push(lines[i++]);
      out.push(`<p>${inline(para.join(" "))}</p>`);
    }
    return out.join("");
  };

  /* ======================= Local answer engine ======================= */
  const STOP = new Set("the a an and or of to in on for is are was were be by with as at it this that from what why how when which who does do can could would should about into your you me my i we our their there than then so if not no yes give explain quiz summarize summarise example worked help understand mistakes wrong keep getting simply topic".split(" "));
  const words = (t) => (t.toLowerCase().match(/[a-zα-ω₀-₉²³⁰-⁹]+/gi) || []).filter((w) => w.length > 2 && !STOP.has(w));
  const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  function activeModule(subjectId) { const s = R.subject(subjectId); return R.moduleStatus(s).find((m) => m.status === "active") || s.modules?.[0]; }
  function resolveTopic(prompt, subjectId) {
    const p = prompt.toLowerCase();
    const mods = R.subjects().flatMap((s) => (s.modules || []).map((m) => ({ ...m, subject: s.id })));
    const hit = mods.filter((m) => m.subject === subjectId).concat(mods).find((m) => p.includes(m.name.toLowerCase()) || words(m.name).some((w) => w.length > 5 && p.includes(w)));
    const mod = hit || activeModule(subjectId);
    return { mod, name: mod?.name || R.subject(subjectId).name };
  }
  const intentOf = (p) => /\b(quiz|test me|question me)\b/i.test(p) ? "quiz" : /summar|key points|recap|overview/i.test(p) ? "summary" : /mistake|wrong|weak|struggl/i.test(p) ? "mistakes" : /example/i.test(p) ? "example" : "explain";
  const NOTICE = "> **AI provider not connected.** I can't write new explanations yet, so this answer is built from your own flashcards and vault.";
  function composeAnswer(prompt, subjectId) {
    const intent = intentOf(prompt), { mod, name } = resolveTopic(prompt, subjectId), subj = R.subject(subjectId);
    const modCards = R.cards().filter((c) => c.module === mod?.id);
    const found = R.searchKnowledge(prompt, subjectId);
    const follow = [`Quiz me on ${name}`, `Summarize ${name}`, `What do I keep getting wrong in ${subj.name}?`];
    if (intent === "quiz") {
      const pick = shuffle(modCards.length ? modCards : R.cards(subjectId)).slice(0, 3);
      if (!pick.length) return { md: `I couldn't find any flashcards for **${name}** yet. [Add some cards](#/app/subjects/${subjectId}) and I'll quiz you on them.`, follow };
      return { kind: "quiz", follow: [`Quiz me on ${name}`, `Summarize ${name}`, `Explain ${name}`],
        md: `### Quick quiz · ${name}\nTry to answer each one from memory before you reveal it. Retrieval is what makes it stick.\n\n${pick.map((c) => `1. ${c.front}\n>!${c.back}`).join("\n")}\n\nWant these scheduled properly? [Review ${name}](#/app/flashcards?module=${mod.id}) and rate each card.\n\n_Built from your flashcards, no AI needed._` };
    }
    if (intent === "summary") {
      if (!modCards.length) return { md: `${NOTICE}\n\nThere are no cards for **${name}** to summarise yet.`, follow };
      const vault = R.vaultItems().filter((v) => v.subject === subjectId);
      return { kind: "summary", follow,
        md: `### ${name} in ${modCards.length} points\n${modCards.map((c) => `- **${c.front.replace(/\?$/, "")}**: ${c.back}`).join("\n")}\n${vault.length ? `\n#### Saved in your vault\n| Item | Detail |\n|---|---|\n${vault.map((v) => `| ${v.title} | ${v.detail.replace(/\|/g, "/")} |`).join("\n")}\n` : ""}\nMastery so far: **${R.pct(R.moduleMastery(mod.id))}**.\n\n_Built from your flashcards and vault, no AI needed._` };
    }
    if (intent === "mistakes") {
      const weak = R.weakTopics().filter((w) => w.module.subject.id === subjectId).slice(0, 3);
      if (!weak.length) return { md: `### No pattern of mistakes yet\nI look at your review ratings and practice answers in **${subj.name}**. There isn't enough history to spot a weak topic. Do a [review session](#/app/flashcards?subject=${subjectId}) or a [practice quiz](#/app/practice) and ask me again.`, follow };
      return { kind: "mistakes", follow: weak.map((w) => `Quiz me on ${w.module.name}`).concat(`Summarize ${weak[0].module.name}`),
        md: `### Where you're losing marks in ${subj.name}\n| Topic | Missed | Attempts |\n|---|---|---|\n${weak.map((w) => `| ${w.module.name} | ${w.errors} | ${w.attempts} |`).join("\n")}\n\n**Start with ${weak[0].module.name}.** Short, frequent reviews on it will pay off faster than anything else right now.\n\n- [Review ${weak[0].module.name}](#/app/flashcards?module=${weak[0].module.id})\n- [Open the Weakness Detector](#/app/weakness)\n\n_From your review ratings and practice answers._` };
    }
    // explain / worked example: honest about the missing provider, then show the student's own material.
    const pool = found.length ? found : modCards.slice(0, 3).map((c) => ({ kind: "Flashcard", title: c.front, body: c.back }));
    if (!pool.length) return { md: `${NOTICE}\n\nI couldn't find anything about that in your flashcards or vault. Try different keywords, or save what you learn to your [Knowledge Vault](#/app/vault).`, follow };
    return { kind: "sources", follow,
      md: `${NOTICE}\n\n### What your materials say about ${found.length ? "this" : name}\n${pool.map((d) => `- **${d.title}**\n  ${d.body}`).join("\n").replace(/\n  /g, " ")}\n\n${intent === "example" ? "Worked examples need the AI provider. Meanwhile, try the practice questions for this topic." : "Try explaining it back in your own words. That's the fastest way to find gaps."}\n\n- [Explain it back to me](#/app/tutor/explain?topic=${encodeURIComponent(name)})\n- [Practise ${name}](#/app/practice)` };
  }

  /* ======================= TutorWorkspace ======================= */
  const HISTORY_KEY = "recalro-tutor-history";
  const historyOpen = () => { try { return localStorage.getItem(HISTORY_KEY) !== "closed"; } catch { return true; } };
  const setHistoryOpen = (v) => { try { localStorage.setItem(HISTORY_KEY, v ? "open" : "closed"); } catch { /* storage unavailable */ } };

  R.page("tutor", {
    title: "AI Tutor",
    crumb: (ctx) => (ctx.sub[0] === "explain" ? "Explain it to me" : null),
    render(view, ctx) { view.classList.add("view-tutor"); return TutorWorkspace(view, ctx); },
  });

  function TutorWorkspace(view, ctx) {
    const st = R.state, mode = ctx.sub[0] === "explain" ? "explain" : "chat";
    let chat = mode === "chat" && !ctx.query.new ? st.chats.find((c) => c.id === ctx.query.chat) || null : null;
    let subject = ctx.query.subject || chat?.subject || R.subjects()[0].id;
    if (!R.subject(subject)) subject = R.subjects()[0].id;
    let streaming = null, attachment = null;

    view.innerHTML = `
      <div class="tw ${historyOpen() ? "" : "is-history-closed"}" data-mode="${mode}">
        <aside class="tw-history" aria-label="Conversation history"></aside>
        <section class="tw-main">
          <header class="tw-head">
            <button type="button" class="icon-btn tw-hist-btn" data-history aria-label="Conversation history" data-tip="History">${icon("sidebar")}</button>
            <div class="tw-modes" role="tablist" aria-label="Tutor mode">
              <a role="tab" href="#/app/tutor${chat ? `?chat=${chat.id}` : ""}" aria-selected="${mode === "chat"}" class="${mode === "chat" ? "is-on" : ""}">${icon("sparkles")}<span>Chat</span></a>
              <a role="tab" href="#/app/tutor/explain" aria-selected="${mode === "explain"}" class="${mode === "explain" ? "is-on" : ""}">${icon("quote")}<span>Explain it</span></a>
            </div>
            <button type="button" class="tw-subject" data-subject aria-haspopup="dialog"></button>
            <span class="tw-status" data-tip="No AI provider is connected in this prototype. Answers come from your own flashcards, vault and review history.">${icon("info")}<span>Local mode</span></span>
            <button type="button" class="icon-btn" data-newchat aria-label="New chat" data-tip="New chat">${icon("edit")}</button>
          </header>
          <div class="tw-body"></div>
        </section>
      </div>`;
    const root = R.$(".tw", view), body = R.$(".tw-body", view);
    const drawSubject = () => { const s = R.subject(subject); R.$("[data-subject]", view).innerHTML = `${ui.subjectDot(subject)}<span>${esc(s.name)}</span>${icon("chevron-down")}`; R.$("[data-subject]", view).setAttribute("aria-label", `Subject: ${s.name}. Change subject`); };
    drawSubject();

    /* ---------- SubjectSelector ---------- */
    const chooseSubject = () => R.picker({ title: "Which subject are we studying?", value: subject,
      options: R.subjects().map((s) => ({ value: s.id, label: s.name, dot: s.id, sub: `${(s.modules || []).length} modules · ${R.cards(s.id).length} cards · ${R.pct(R.subjectMastery(s.id))} mastered` })),
      onSelect(v) { subject = v; if (chat) { chat.subject = v; R.save(); } drawSubject(); if (mode === "chat") { if (!chat?.messages.length) drawThread(); composer?.setPlaceholder(); } else explainWs?.reset(); R.$("[data-subject]", view).focus(); } });

    /* ---------- ConversationHistory ---------- */
    const bucket = (iso) => { const d = (R.startOfDay() - R.startOfDay(new Date(iso))) / 86400000; return d <= 0 ? "Today" : d <= 7 ? "Previous 7 days" : "Older"; };
    function historyMarkup(q = "") {
      const list = [...st.chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).filter((c) => !q || `${c.title} ${c.messages.map((m) => m.text || "").join(" ")}`.toLowerCase().includes(q.toLowerCase()));
      let last = "";
      return list.length ? list.map((c) => { const b = bucket(c.updatedAt), h = b !== last ? `<p class="tw-hgroup">${b}</p>` : ""; last = b;
        return `${h}<div class="tw-hrow ${chat && c.id === chat.id ? "is-active" : ""}"><a href="#/app/tutor?chat=${c.id}" ${chat && c.id === chat.id ? 'aria-current="page"' : ""}>${ui.subjectDot(c.subject)}<span>${esc(c.title)}</span></a><button type="button" class="icon-btn sm" data-delchat="${c.id}" aria-label="Delete “${esc(c.title)}”">${icon("trash")}</button></div>`; }).join("")
        : `<p class="tw-hempty">${q ? "No conversations match." : "Your conversations will appear here."}</p>`;
    }
    const historyPanel = () => `<div class="tw-hhead"><button type="button" class="btn btn-soft btn-block" data-newchat>${icon("plus")}<span>New chat</span></button><div class="tw-hsearch">${icon("search")}<input type="search" placeholder="Search chats" aria-label="Search conversations" data-hsearch></div></div><nav class="tw-hlist" aria-label="Conversations">${historyMarkup()}</nav>`;
    const drawHistory = () => { const h = R.$(".tw-history", view); const q = h.querySelector("[data-hsearch]")?.value || ""; if (!h.firstChild) h.innerHTML = historyPanel(); h.querySelector(".tw-hlist").innerHTML = historyMarkup(q); };
    async function deleteChat(id, anchor) {
      const c = st.chats.find((x) => x.id === id); if (!c) return;
      const ok = await R.confirm({ title: "Delete this conversation?", body: `“${esc(c.title)}” will be removed from this browser.`, confirmLabel: "Delete", tone: "danger" });
      if (!ok) { anchor?.focus(); return; }
      st.chats = st.chats.filter((x) => x.id !== id); R.save();
      if (chat?.id === id) { chat = null; R.replaceRoute("tutor?new=1"); if (mode === "chat") drawThread(); }
      drawHistory(); R.toast("Conversation deleted.", { icon: "trash" });
    }
    const openHistorySheet = () => R.sheet({ title: "Chats", variant: "full", body: historyPanel(), cls: "tw-history-sheet", onOpen(d, close) {
      d.addEventListener("input", (e) => { if (e.target.matches("[data-hsearch]")) d.querySelector(".tw-hlist").innerHTML = historyMarkup(e.target.value); });
      d.addEventListener("click", (e) => {
        if (e.target.closest("a")) close();
        if (e.target.closest("[data-newchat]")) { close(); newChat(); }
        const del = e.target.closest("[data-delchat]"); if (del) deleteChat(del.dataset.delchat).then(() => (d.querySelector(".tw-hlist").innerHTML = historyMarkup()));
      });
    } });

    /* ---------- Shared head actions ---------- */
    function newChat() {
      if (mode !== "chat") { R.go(`tutor?new=1&subject=${subject}`); return; }
      stopStream(); chat = null; R.replaceRoute("tutor?new=1"); drawHistory(); drawThread(); composer.focus();
    }
    view.addEventListener("click", (e) => {
      if (e.target.closest("[data-subject]")) chooseSubject();
      if (e.target.closest("[data-newchat]")) newChat();
      if (e.target.closest("[data-history]")) {
        if (phone()) openHistorySheet();
        else { const closed = root.classList.toggle("is-history-closed"); setHistoryOpen(!closed); }
      }
      const del = e.target.closest(".tw-history [data-delchat]"); if (del) deleteChat(del.dataset.delchat, del);
    });
    view.addEventListener("input", (e) => { if (e.target.matches(".tw-history [data-hsearch]")) drawHistory(); });
    drawHistory();

    if (mode === "explain") { explainWs = ExplainItWorkspace(body, { getSubject: () => subject, topic: ctx.query.topic }); return () => {}; }

    /* ---------- Conversation ---------- */
    body.innerHTML = `<div class="tw-scroll" id="twScroll"><div class="tw-thread" id="twThread" aria-live="polite"></div></div><div class="tw-dock"><div class="tw-follow" id="twFollow"></div><div class="tw-composer" id="twComposer"></div></div>`;
    const scroller = R.$("#twScroll", view), thread = R.$("#twThread", view), follow = R.$("#twFollow", view);
    const nearBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
    const toBottom = (force) => { if (force || nearBottom()) scroller.scrollTop = scroller.scrollHeight; };

    /* SuggestedPrompts (empty state) */
    function emptyState() {
      const s = R.subject(subject), mod = activeModule(subject), topic = mod?.name || s.name;
      const weak = R.weakTopics().find((w) => w.module.subject.id === subject);
      const starters = [
        { ic: "bulb", t: "Explain a difficult concept", p: `Explain ${weak ? weak.module.name : topic}`, sub: weak ? `You've missed ${weak.module.name} ${R.plural(weak.errors, "time")}` : topic },
        { ic: "sigma", t: "Give me a worked example", p: `Give me a worked example on ${topic}`, sub: topic },
        { ic: "zap", t: "Quiz me on this subject", p: `Quiz me on ${topic}`, sub: `${R.cards().filter((c) => c.module === mod?.id).length} cards available` },
        { ic: "file", t: "Summarize a topic", p: `Summarize ${topic}`, sub: topic },
        { ic: "target", t: "Help me understand my mistakes", p: `What do I keep getting wrong in ${s.name}?`, sub: "From your review history" },
      ];
      return `<div class="tw-empty">
        <div class="tw-orb" aria-hidden="true">${icon("sparkles")}</div>
        <h1>Hi ${esc(R.firstName())}! What are we learning today?</h1>
        <p>Studying <b>${esc(s.name)}</b>${mod ? ` · currently on <b>${esc(mod.name)}</b>` : ""}</p>
        <div class="tw-starters">${starters.map((x, i) => `<button type="button" class="tw-starter" data-send="${esc(x.p)}" style="--i:${i}"><span class="tw-st-ic">${icon(x.ic)}</span><span><b>${x.t}</b><small>${esc(x.sub)}</small></span></button>`).join("")}</div>
        <p class="tw-local">${icon("info")}No AI provider is connected. Quizzes, summaries and mistake reviews are built from your own data; explanations show what your materials say.</p>
      </div>`;
    }

    /* ChatMessage + MessageActions */
    function messageHTML(m, idx, isLast) {
      if (m.role === "user") return `<div class="tw-msg tw-user" data-idx="${idx}"><div class="tw-bubble">${m.image ? `<img src="${m.image}" alt="Attached image" class="tw-img">` : m.imageName ? `<span class="pill pill-neutral">${icon("image")}${esc(m.imageName)}</span>` : ""}${m.text ? `<p>${esc(m.text).replace(/\n/g, "<br>")}</p>` : ""}</div></div>`;
      if (m.error) return `<div class="tw-msg tw-ai is-error" data-idx="${idx}"><span class="tw-av">${icon("info")}</span><div class="tw-ai-body"><p>That answer didn't come through.</p><button type="button" class="btn btn-soft btn-sm" data-retry>${icon("refresh")}<span>Retry</span></button></div></div>`;
      const content = m.md != null ? (m.stopped != null ? stoppedHTML(m) : R.md(m.md)) : m.html || esc(m.text || "");
      return `<div class="tw-msg tw-ai" data-idx="${idx}"><span class="tw-av" aria-hidden="true">${icon("sparkles")}</span><div class="tw-ai-body"><div class="tw-md">${content}</div>
        ${m.stopped ? `<p class="tw-stopped">${icon("stop")}Response stopped. <button type="button" class="link-btn" data-continue>Continue</button></p>` : ""}
        <div class="tw-actions" role="group" aria-label="Response actions">
          <button type="button" class="tw-act" data-copy aria-label="Copy response" data-tip="Copy">${icon("copy")}</button>
          ${isLast ? `<button type="button" class="tw-act" data-regen aria-label="Regenerate response" data-tip="Regenerate">${icon("refresh")}</button>` : ""}
          <button type="button" class="tw-act ${m.feedback === "up" ? "is-on" : ""}" data-fb="up" aria-pressed="${m.feedback === "up"}" aria-label="Helpful" data-tip="Helpful">${thumb(true)}</button>
          <button type="button" class="tw-act ${m.feedback === "down" ? "is-on" : ""}" data-fb="down" aria-pressed="${m.feedback === "down"}" aria-label="Not helpful" data-tip="Not helpful">${thumb(false)}</button>
        </div></div></div>`;
    }
    const thumb = (up) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" style="${up ? "" : "transform:rotate(180deg)"}"><path d="M7 10v11H4V10h3zm0 0 4-7c1.7 0 2.6 1.3 2.2 3L12.5 10H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 21H7"/></svg>`;
    function drawThread() {
      const msgs = chat?.messages || [];
      const lastAi = msgs.map((m) => m.role).lastIndexOf("assistant");
      thread.innerHTML = msgs.length ? msgs.map((m, i) => messageHTML(m, i, i === lastAi)).join("") : emptyState();
      root.classList.toggle("is-empty", !msgs.length);
      drawFollow(); toBottom(true);
    }
    function drawFollow() {
      const last = chat?.messages[chat.messages.length - 1];
      follow.innerHTML = last?.role === "assistant" && last.follow?.length && !streaming ? last.follow.slice(0, 3).map((f) => `<button type="button" class="tw-chip" data-send="${esc(f)}">${icon("arrow-up-right")}${esc(f)}</button>`).join("") : "";
    }

    /* Streaming: reveal the rendered answer block by block (provider output would stream the same way). */
    async function revealAnswer(el, m) {
      const md = el.querySelector(".tw-md"), blocks = [...md.children];
      md.innerHTML = "";
      const token = (streaming = { stop: false, msg: m });
      composer.setStreaming(true);
      for (let i = 0; i < blocks.length; i++) {
        if (token.stop) { m.stopped = i; break; }
        md.append(blocks[i]);
        R.animate(blocks[i], [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 240 });
        toBottom();
        await wait(blocks[i].textContent.length > 120 ? 420 : 260);
      }
      if (m.stopped != null) R.save();
      streaming = null; composer.setStreaming(false);
      el.outerHTML = messageHTML(m, chat.messages.indexOf(m), true);
      drawFollow(); toBottom();
    }
    // A stopped answer keeps only the blocks that had arrived; "Continue" shows the rest.
    const stoppedHTML = (m) => { const tmp = document.createElement("div"); tmp.innerHTML = R.md(m.md); return [...tmp.children].slice(0, m.stopped).map((n) => n.outerHTML).join(""); };
    function stopStream() { if (streaming) streaming.stop = true; }

    async function respond(prompt, replaceIdx) {
      const typing = document.createElement("div");
      typing.className = "tw-msg tw-ai is-typing";
      typing.innerHTML = `<span class="tw-av" aria-hidden="true">${icon("sparkles")}</span><div class="tw-ai-body"><span class="tw-thinking"><i></i><i></i><i></i><span>Searching your materials…</span></span></div>`;
      if (replaceIdx != null) thread.querySelector(`[data-idx="${replaceIdx}"]`)?.replaceWith(typing); else thread.append(typing);
      toBottom(true);
      composer.setStreaming(true);
      await wait(700);
      let m;
      try { const a = composeAnswer(prompt, subject); m = { role: "assistant", md: a.md, follow: a.follow, kind: a.kind, at: new Date().toISOString() }; }
      catch (err) { console.error("Recalro tutor: could not build an answer", err); m = { role: "assistant", error: true, prompt }; }
      if (replaceIdx != null) chat.messages[replaceIdx] = m; else chat.messages.push(m);
      chat.updatedAt = new Date().toISOString(); R.save();
      const idx = chat.messages.indexOf(m);
      // Earlier answers lose their Regenerate button.
      thread.querySelectorAll(".tw-ai [data-regen]").forEach((b) => b.remove());
      const holder = document.createElement("div"); holder.innerHTML = messageHTML(m, idx, true);
      const el = holder.firstElementChild; typing.replaceWith(el);
      if (m.error) { composer.setStreaming(false); return; }
      // Answer content is rendered (unsanitised HTML never enters: R.md escapes everything).
      el.querySelector(".tw-actions").hidden = true;
      await revealAnswer(el, m);
      drawHistory();
    }
    async function send(text) {
      text = (text || "").trim();
      if ((!text && !attachment) || streaming) return;
      if (!chat) { chat = { id: R.uid(), title: (text || "Image question").slice(0, 60), subject, messages: [], updatedAt: new Date().toISOString() }; st.chats.push(chat); R.replaceRoute(`tutor?chat=${chat.id}`); }
      if (!chat.messages.length) thread.innerHTML = "";
      root.classList.remove("is-empty");
      const msg = { role: "user", text, at: new Date().toISOString(), ...(attachment ? (attachment.data ? { image: attachment.data } : { imageName: attachment.name }) : {}) };
      chat.messages.push(msg); chat.subject = subject; chat.updatedAt = msg.at; R.save();
      attachment = null; composer.clear(); follow.innerHTML = "";
      thread.insertAdjacentHTML("beforeend", messageHTML(msg, chat.messages.length - 1));
      R.animate(thread.lastElementChild, [{ opacity: 0, transform: "translateY(10px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 240 });
      R.record({ t: "chat", subject, xp: R.content.xp.chat });
      drawHistory();
      await respond(text || "image");
    }

    /* MessageComposer + AttachmentPreview */
    const composer = MessageComposer(R.$("#twComposer", view), {
      placeholder: () => `Ask about ${R.subject(subject).name}…`,
      onSend: (t) => send(t), onStop: stopStream,
      onAttach: (a) => { attachment = a; }, onUnattach: () => { attachment = null; },
    });

    thread.addEventListener("click", async (e) => {
      const s = e.target.closest("[data-send]"); if (s) { send(s.dataset.send); return; }
      const msgEl = e.target.closest(".tw-msg"), idx = msgEl ? Number(msgEl.dataset.idx) : -1, m = chat?.messages[idx];
      if (e.target.closest("[data-copy-code]")) { copy(e.target.closest(".md-code").querySelector("code").textContent, e.target.closest("button")); return; }
      if (!m) return;
      if (e.target.closest("[data-copy]")) copy(m.md ?? msgEl.querySelector(".tw-md").innerText, e.target.closest("button"));
      const fb = e.target.closest("[data-fb]");
      if (fb) {
        m.feedback = m.feedback === fb.dataset.fb ? null : fb.dataset.fb; R.save();
        msgEl.querySelectorAll("[data-fb]").forEach((b) => { const on = b.dataset.fb === m.feedback; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
        if (m.feedback) { R.animate(fb, [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 320, easing: "cubic-bezier(.3,1.6,.5,1)" }); R.toast("Thanks. Feedback is kept in this browser until a provider is connected.", { icon: "check-circle" }); }
      }
      if (e.target.closest("[data-regen]") || e.target.closest("[data-retry]")) {
        if (streaming) return;
        const prompt = [...chat.messages.slice(0, idx)].reverse().find((x) => x.role === "user")?.text || m.prompt || "";
        await respond(prompt, idx);
      }
      if (e.target.closest("[data-continue]")) { delete m.stopped; R.save(); msgEl.outerHTML = messageHTML(m, idx, true); drawFollow(); }
    });
    follow.addEventListener("click", (e) => { const s = e.target.closest("[data-send]"); if (s) send(s.dataset.send); });
    const copy = async (text, btn) => {
      try { await navigator.clipboard.writeText(text); }
      catch { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
      if (btn) { const prev = btn.innerHTML; btn.innerHTML = icon("check"); btn.classList.add("is-done"); setTimeout(() => { btn.innerHTML = prev; btn.classList.remove("is-done"); }, 1400); }
      R.toast("Copied to clipboard.", { icon: "copy" });
    };
    const onKey = (e) => {
      if (!view.isConnected) return;
      if (e.key === "Escape" && streaming) { e.preventDefault(); stopStream(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); newChat(); }
    };
    document.addEventListener("keydown", onKey);

    drawThread();
    if (ctx.query.topic) composer.setValue(`Help me understand ${ctx.query.topic}`);
    if (!phone()) composer.focus();
    return () => { stopStream(); document.removeEventListener("keydown", onKey); };
  }
  let explainWs = null;

  /* ======================= MessageComposer ======================= */
  function MessageComposer(el, { placeholder, onSend, onStop, onAttach, onUnattach }) {
    el.innerHTML = `<form class="tw-form" novalidate>
        <div class="tw-attach" hidden></div>
        <div class="tw-input">
          <label class="tw-tool" data-tip="Attach an image"><input type="file" accept="image/*" class="sr-only" aria-label="Attach an image">${icon("paperclip")}</label>
          <textarea rows="1" aria-label="Message the tutor" enterkeyhint="send"></textarea>
          <button type="submit" class="tw-send" aria-label="Send message" disabled>${icon("arrow-up")}</button>
        </div>
        <p class="tw-hint"><span>${ui.kbd("Enter")} send · ${ui.kbd("Shift")}+${ui.kbd("Enter")} new line · ${ui.kbd("Esc")} stop</span><span>Answers come from your materials</span></p>
      </form>`;
    const form = el.querySelector("form"), ta = el.querySelector("textarea"), sendBtn = el.querySelector(".tw-send"), file = el.querySelector("input[type=file]"), prev = el.querySelector(".tw-attach");
    let streaming = false, hasAttachment = false;
    const grow = () => { ta.style.height = "auto"; ta.style.height = `${Math.min(phone() ? 140 : 220, ta.scrollHeight)}px`; };
    const sync = () => { if (!streaming) sendBtn.disabled = !ta.value.trim() && !hasAttachment; };
    const api = {
      setPlaceholder() { ta.placeholder = placeholder(); },
      focus() { ta.focus(); },
      setValue(v) { ta.value = v; grow(); sync(); },
      clear() { ta.value = ""; grow(); prev.hidden = true; prev.innerHTML = ""; hasAttachment = false; sync(); },
      setStreaming(on) {
        streaming = on;
        sendBtn.classList.toggle("is-stop", on); sendBtn.disabled = false;
        sendBtn.type = on ? "button" : "submit";
        sendBtn.setAttribute("aria-label", on ? "Stop generating" : "Send message");
        sendBtn.innerHTML = icon(on ? "stop" : "arrow-up");
        if (!on) sync();
      },
    };
    api.setPlaceholder();
    ta.addEventListener("input", () => { grow(); sync(); });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !(phone() && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });
    // On phones, keep the newest message in view when the keyboard opens.
    ta.addEventListener("focus", () => setTimeout(() => { const s = el.closest(".tw-main")?.querySelector(".tw-scroll"); if (s) s.scrollTop = s.scrollHeight; }, 300));
    form.addEventListener("submit", (e) => { e.preventDefault(); if (streaming) return; onSend(ta.value); });
    sendBtn.addEventListener("click", (e) => { if (streaming) { e.preventDefault(); onStop(); } });
    file.addEventListener("change", () => {
      const f = file.files[0]; if (!f) return;
      const done = (data) => {
        hasAttachment = true; onAttach({ name: f.name, data }); prev.hidden = false;
        prev.innerHTML = `<div class="tw-attach-item">${data ? `<img src="${data}" alt="">` : `<span class="tw-attach-ic">${icon("image")}</span>`}<span><b>${esc(f.name)}</b><small>${data ? "Image attached" : "Attached by name only"}</small></span><button type="button" class="icon-btn sm" data-unattach aria-label="Remove attachment">${icon("x")}</button></div>`;
        R.animate(prev.firstElementChild, [{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: "cubic-bezier(.3,1.4,.5,1)" });
        sync(); ta.focus();
      };
      if (f.size > 400 * 1024) { done(null); R.toast("Large images are attached by name only. Image analysis needs the AI provider.", { icon: "info" }); }
      else { const r = new FileReader(); r.onload = () => done(r.result); r.readAsDataURL(f); }
      file.value = "";
    });
    prev.addEventListener("click", (e) => { if (e.target.closest("[data-unattach]")) { hasAttachment = false; prev.hidden = true; prev.innerHTML = ""; onUnattach(); sync(); ta.focus(); } });
    return api;
  }

  /* ======================= ExplainItWorkspace ======================= */
  const VAGUE = /\b(basically|stuff|things?|kind of|sort of|somehow|etc)\b/gi;
  function ExplainItWorkspace(el, { getSubject, topic: initialTopic }) {
    let step = initialTopic ? 2 : 1, topic = initialTopic || "", text = "", prevPassed = null, delta = null;
    const termsFor = (tp) => {
      const pool = R.searchKnowledge(tp, getSubject());
      const modCards = R.cards().filter((c) => c.module === R.subjects().flatMap((s) => s.modules || []).find((m) => m.name === tp)?.id);
      const src = pool.length ? pool : modCards.map((c) => ({ title: c.front, body: c.back }));
      const map = new Map();
      src.forEach((d) => words(`${d.title} ${d.body}`).filter((w) => w.length > 4).forEach((w) => { if (!map.has(w)) map.set(w, d); }));
      return [...map.entries()].slice(0, 8).map(([w, d]) => ({ w, from: d }));
    };
    const analyse = (t, tp) => {
      const wc = (t.match(/\S+/g) || []).length, tw = new Set(words(t)), terms = termsFor(tp);
      const hit = terms.filter((x) => tw.has(x.w)), miss = terms.filter((x) => !tw.has(x.w));
      const checks = [
        { id: "def", ok: /\b(is|are|means|refers to|defined as)\b/i.test(t), label: "Defines it", tip: "Start with a one-sentence definition." },
        { id: "why", ok: /\b(because|so that|therefore|which means|due to|this causes)\b/i.test(t), label: "Explains why", tip: "Add a “because…” to explain the mechanism." },
        { id: "ex", ok: /\b(for example|e\.g\.|such as|for instance|imagine|like when)\b/i.test(t), label: "Gives an example", tip: "Add a concrete example." },
        { id: "len", ok: wc >= 40, label: `${wc} words`, tip: "Aim for at least 40 words." },
        { id: "terms", ok: terms.length ? hit.length >= Math.ceil(terms.length / 3) : null, label: terms.length ? `Key terms ${hit.length}/${terms.length}` : "Key terms", tip: "Use the key terms from your materials." },
      ];
      const vague = [...new Set((t.match(VAGUE) || []).map((v) => v.toLowerCase()))];
      const scored = checks.filter((c) => c.ok !== null), passed = scored.filter((c) => c.ok).length;
      return { wc, checks, hit, miss, vague, passed, total: scored.length, terms };
    };
    function stepper() {
      const s = ["Pick a topic", "Explain it", "Get feedback"];
      return `<ol class="ex-steps" aria-label="Progress">${s.map((l, i) => `<li class="${i + 1 < step ? "is-done" : i + 1 === step ? "is-current" : ""}" ${i + 1 === step ? 'aria-current="step"' : ""}><span>${i + 1 < step ? icon("check") : i + 1}</span>${l}</li>`).join("")}</ol>`;
    }
    function draw() {
      const subj = R.subject(getSubject());
      let inner = "";
      if (step === 1) {
        const mods = R.moduleStatus(subj);
        const past = R.state.explanations.slice(-4).reverse();
        inner = `<h2 class="ex-h">What will you teach back?</h2><p class="ex-sub">Explaining an idea in your own words is one of the quickest ways to find gaps. Pick a topic from <b>${esc(subj.name)}</b> or type your own.</p>
          <div class="ex-topics">${mods.map((m, i) => `<button type="button" class="ex-topic" data-topic="${esc(m.name)}" style="--i:${i}"><span class="ex-topic-ring">${ui.ring(m.mastery, { size: 40, stroke: 4, aria: `${Math.round(m.mastery)}% mastered` })}</span><span><b>${esc(m.name)}</b><small>${m.status === "active" ? "In progress" : m.status === "done" ? "Mastered" : m.status === "locked" ? "Not started" : R.pct(m.mastery) + " mastered"}</small></span>${icon("arrow-right")}</button>`).join("")}</div>
          <form class="ex-custom" data-custom><label for="exCustom" class="sr-only">Your own topic</label><input id="exCustom" placeholder="Or type a topic, e.g. Bernoulli's principle" maxlength="120" value="${esc(topic)}"><button type="submit" class="btn btn-primary">${icon("arrow-right")}<span>Start</span></button></form>
          ${past.length ? `<p class="ex-label">Recent</p><div class="ex-recent">${past.map((p) => `<button type="button" class="tw-chip" data-topic="${esc(p.topic)}">${icon("quote")}${esc(p.topic)}<small>${p.score}/5</small></button>`).join("")}</div>` : ""}`;
      } else if (step === 2) {
        const a = analyse(text, topic);
        inner = `<div class="ex-topic-bar"><span>${icon("quote")}Explaining</span><b>${esc(topic)}</b><button type="button" class="link-btn" data-back1>Change</button></div>
          <label for="exText" class="sr-only">Your explanation of ${esc(topic)}</label>
          <textarea id="exText" class="ex-text" placeholder="Explain it as if you were teaching a classmate. Say what it is, why it works and give an example…">${esc(text)}</textarea>
          <div class="ex-live" aria-live="polite">${liveChecks(a)}</div>
          <div class="ex-actions"><button type="button" class="btn btn-ghost" data-back1>${icon("arrow-left")}<span>Topics</span></button><button type="button" class="btn btn-primary" data-check ${text.trim() ? "" : "disabled"}>${icon("sparkles")}<span>Check my explanation</span></button></div>`;
      } else {
        const a = analyse(text, topic), pct = (a.passed / Math.max(1, a.total)) * 100;
        inner = `<div class="ex-result">
          <div class="ex-score">${ui.ring(pct, { size: 112, stroke: 10, tone: pct >= 80 ? "teal" : "orange", label: `${a.passed}/${a.total}`, aria: `${a.passed} of ${a.total} checks met` })}
            <div><h2>${a.passed === a.total ? "Excellent explanation" : a.passed >= a.total - 2 ? "Solid. A few gaps left" : "A good first draft"}</h2><p>${esc(topic)}</p>${delta != null ? `<span class="ex-delta ${delta > 0 ? "up" : ""}">${delta > 0 ? `+${delta} since your last try` : delta === 0 ? "Same as your last try" : `${delta} since your last try`}</span>` : ""}</div></div>
          <section class="ex-block ex-good"><h3>${icon("check-circle")}What you covered</h3><ul>${a.checks.filter((c) => c.ok).map((c) => `<li>${c.label}</li>`).join("") || "<li>Nothing yet. Start with a definition.</li>"}${a.hit.length ? `<li>Key terms: ${a.hit.map((h) => `<b>${esc(h.w)}</b>`).join(", ")}</li>` : ""}</ul></section>
          <section class="ex-block ex-miss"><h3>${icon("target")}Missing concepts</h3>${a.miss.length ? `<ul>${a.miss.slice(0, 5).map((m) => `<li><b>${esc(m.w)}</b><small>From “${esc(m.from.title)}”: ${esc(m.from.body)}</small></li>`).join("")}</ul>` : `<p>${a.terms.length ? "You used every key term from your materials." : "No matching cards or vault items to compare against yet."}</p>`}
            ${a.checks.filter((c) => c.ok === false).map((c) => `<p class="ex-tip">${icon("arrow-right")}${c.tip}</p>`).join("")}</section>
          <section class="ex-block ex-warn"><h3>${icon("info")}Possible misconceptions</h3>${a.vague.length ? `<p>Vague wording can hide a misunderstanding: ${a.vague.map((v) => `<b>“${esc(v)}”</b>`).join(", ")}. Replace it with the precise idea.</p>` : `<p>No vague wording found.</p>`}<p class="ex-na">Checking the science itself for misconceptions needs the AI provider. Compare with your course notes.</p></section>
          <div class="ex-actions"><button type="button" class="btn btn-ghost" data-back1>${icon("book")}<span>New topic</span></button><button type="button" class="btn btn-primary" data-again>${icon("refresh")}<span>Try again</span></button></div>
          <p class="ex-note">${icon("info")}Local text check against your own materials, not an AI or accuracy assessment.</p></div>`;
      }
      el.innerHTML = `<div class="ex">${stepper()}<div class="ex-panel">${inner}</div></div>`;
      R.animate(el.querySelector(".ex-panel"), [{ opacity: 0, transform: "translateX(16px)" }, { opacity: 1, transform: "none" }], { duration: 300 });
      if (step === 2) { const ta = el.querySelector("#exText"); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
      if (step === 3) { const a = analyse(text, topic); R.$$(".ex-block", el).forEach((b, i) => R.animate(b, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 320, delay: 120 + i * 90 })); if (a.passed === a.total) setTimeout(() => R.burst(el.querySelector(".ring"), { count: 22, spread: 110 }), 300); }
    }
    const liveChecks = (a) => a.checks.map((c) => `<span class="ex-check ${c.ok ? "ok" : c.ok === null ? "na" : ""}">${icon(c.ok ? "check" : "plus")}${c.label}</span>`).join("");
    el.addEventListener("click", (e) => {
      const t = e.target.closest("[data-topic]"); if (t) { topic = t.dataset.topic; text = ""; prevPassed = null; delta = null; step = 2; draw(); return; }
      if (e.target.closest("[data-back1]")) { step = 1; draw(); return; }
      if (e.target.closest("[data-check]")) {
        if (!text.trim()) return;
        const a = analyse(text, topic);
        delta = prevPassed == null ? null : a.passed - prevPassed;
        prevPassed = a.passed;
        R.state.explanations.push({ topic, text, at: new Date().toISOString(), score: a.passed });
        R.record({ t: "explain", xp: R.content.xp.explain, topic }, e.target.closest("button"));
        step = 3; draw();
        return;
      }
      if (e.target.closest("[data-again]")) { step = 2; draw(); }
    });
    el.addEventListener("submit", (e) => { if (e.target.matches("[data-custom]")) { e.preventDefault(); const v = el.querySelector("#exCustom").value.trim(); if (!v) { el.querySelector("#exCustom").focus(); return; } topic = v; text = ""; prevPassed = null; delta = null; step = 2; draw(); } });
    el.addEventListener("input", (e) => {
      if (!e.target.matches("#exText")) return;
      text = e.target.value;
      el.querySelector(".ex-live").innerHTML = liveChecks(analyse(text, topic));
      el.querySelector("[data-check]").disabled = !text.trim();
    });
    draw();
    return { reset() { if (step === 1) draw(); } };
  }
})();
