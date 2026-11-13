/* ==========================================================================
   Recalro UI kit: icons, components, dialogs, toasts, charts and motion.
   Animations use the Web Animations API (no library is installed) and are
   skipped when the user prefers reduced motion or turns motion off.
   ========================================================================== */
(function () {
  "use strict";
  const R = window.R;
  const { esc } = R;

  /* ---------- Motion ---------- */
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  R.reducedMotion = () => mq.matches || !!R.state.settings.reduceMotion;
  R.animate = (el, frames, opts) => {
    if (!el || R.reducedMotion() || !el.animate) return { finished: Promise.resolve() };
    // fill "none" by default so finished animations never override CSS state (e.g. card flips).
    return el.animate(frames, { duration: 300, easing: "cubic-bezier(.22,.61,.36,1)", fill: "none", ...opts });
  };

  /* ---------- Icons (24px stroke set) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5V4.5"/><path d="M8 7h8M8 11h6"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/>',
    cards: '<rect x="2" y="6" width="15" height="14" rx="2"/><path d="M7 3h13a2 2 0 0 1 2 2v11"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v5h-5"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V3h6v1"/><path d="m9 13 2 2 4-4"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    gauge: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="m12 14 4-5"/><circle cx="12" cy="14" r="1"/>',
    report: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 16v-3M12 16V9M16 16v-5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/>',
    bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-10-2 1.5-3 3.5-3 6-1-1-1.5-2-1.5-3.5C8 9.5 5 12 5 15c0 4.3 3 7 7 7z"/><path d="M12 22c-1.7 0-3-1.3-3-3 0-1.8 1.5-2.8 3-4.5 1.5 1.7 3 2.7 3 4.5 0 1.7-1.3 3-3 3z"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M12 21 8 9l4-6 4 6z"/>',
    star: '<path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "chevron-right": '<path d="m9 6 6 6-6 6"/>',
    "chevron-left": '<path d="m15 6-6 6 6 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
    paperclip: '<path d="m21 11-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6L16 6.5"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    "bookmark-fill": '<path d="M6 3h12v18l-6-4-6 4z" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    cap: '<path d="M2 9.5 12 5l10 4.5-10 4.5L2 9.5z"/><path d="M6 11.3V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.7"/><path d="M22 9.5V15"/>',
    "arrow-up": '<path d="M12 19V5M5 12l7-7 7 7"/>',
    "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "arrow-up-right": '<path d="M7 17 17 7M8 7h9v9"/>',
    "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    sigma: '<path d="M18 5H6l6 7-6 7h12"/>',
    scale: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="m5 7-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
    note: '<path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5"/>',
    quote: '<path d="M7 7h4v4a5 5 0 0 1-5 5M14 7h4v4a5 5 0 0 1-5 5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    command: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
  };
  R.icon = (name, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name] || P.info}</svg>`;

  /* ---------- Small components ---------- */
  R.ui = {};
  R.ui.btn = (label, { icon, iconRight, tone = "primary", size = "", attrs = "", cls = "" } = {}) =>
    `<button type="button" class="btn btn-${tone} ${size ? "btn-" + size : ""} ${cls}" ${attrs}>${icon ? R.icon(icon) : ""}<span>${label}</span>${iconRight ? R.icon(iconRight) : ""}</button>`;
  R.ui.link = (label, route, { icon, iconRight, tone = "primary", size = "", cls = "" } = {}) =>
    `<a class="btn btn-${tone} ${size ? "btn-" + size : ""} ${cls}" href="#/app/${route}">${icon ? R.icon(icon) : ""}<span>${label}</span>${iconRight ? R.icon(iconRight) : ""}</a>`;
  R.ui.progress = (pct, { tone = "teal", size = "", label = "" } = {}) =>
    `<div class="progress progress-${tone} ${size}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" ${label ? `aria-label="${esc(label)}"` : ""}><i style="--p:${R.clamp(pct, 0, 100)}%"></i></div>`;
  R.ui.ring = (pct, { size = 64, stroke = 7, tone = "teal", label = "", sub = "", aria = "" } = {}) => {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - R.clamp(pct, 0, 100) / 100);
    return `<div class="ring ring-${tone}" style="--size:${size}px" role="img" aria-label="${esc(aria || `${Math.round(pct)}%`)}">
      <svg viewBox="0 0 ${size} ${size}"><circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
      <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="--c:${c};--off:${off}"/></svg>
      ${label ? `<div class="ring-label"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</div>` : ""}</div>`;
  };
  R.ui.pill = (text, tone = "neutral", icon) => `<span class="pill pill-${tone}">${icon ? R.icon(icon) : ""}${text}</span>`;
  R.ui.demo = (text = "Demo data") => `<span class="pill pill-demo" data-tip="Stored only in this browser. Connect the backend for real accounts and sync.">${R.icon("info")}${esc(text)}</span>`;
  R.ui.sample = (text = "Sample") => `<span class="pill pill-sample" data-tip="Sample content for this prototype, not your personal data.">${esc(text)}</span>`;
  R.ui.empty = ({ icon = "sparkles", title, body = "", action = "" }) =>
    `<div class="empty"><div class="empty-icon">${R.icon(icon)}</div><h3>${title}</h3>${body ? `<p>${body}</p>` : ""}${action}</div>`;
  R.ui.header = ({ eyebrow = "", title, desc = "", actions = "", meta = "" }) =>
    `<header class="page-head">
      <div class="page-head-text">${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ""}<h1>${title}</h1>${desc ? `<p>${desc}</p>` : ""}${meta ? `<div class="page-meta">${meta}</div>` : ""}</div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ""}
    </header>`;
  R.ui.tabs = (items, active, label = "Section") =>
    `<nav class="tabs" aria-label="${esc(label)}">${items.map((t) => `<a href="#/app/${t.route}" class="tab ${t.id === active ? "is-active" : ""}" ${t.id === active ? 'aria-current="page"' : ""}>${t.icon ? R.icon(t.icon) : ""}${t.label}${t.count != null ? `<span class="tab-count">${t.count}</span>` : ""}</a>`).join("")}</nav>`;
  R.ui.segmented = (name, options, value) =>
    `<div class="segmented" role="radiogroup">${options.map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === value}" data-seg="${name}" data-value="${esc(v)}" class="${v === value ? "is-on" : ""}">${l}</button>`).join("")}</div>`;
  R.ui.card = (inner, { cls = "", title = "", action = "", icon = "", sub = "" } = {}) =>
    `<section class="card ${cls}">${title ? `<div class="card-head"><div class="card-title">${icon ? `<span class="card-icon">${R.icon(icon)}</span>` : ""}<div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div></div>${action}</div>` : ""}${inner}</section>`;
  R.ui.subjectDot = (id) => `<span class="sdot" style="--sc:var(--s${R.subjectIndex(id) % 4})"></span>`;
  R.ui.avatar = (size = 36) => {
    const { avatar, frame } = R.state.equipped;
    return `<span class="avatar ${frame ? "frame-" + frame : ""}" style="--av:${size}px">${avatar ? `<span class="avatar-emoji">${avatar}</span>` : esc(R.initials())}</span>`;
  };
  R.ui.kbd = (k) => `<kbd>${k}</kbd>`;
  /* ThemeSelector: radio tiles with a miniature preview of each theme. */
  R.ui.themeSelector = (value) => {
    const opt = (v, label, sub) => `<label class="theme-opt"><input type="radio" name="theme-choice" value="${v}" ${v === value ? "checked" : ""} data-theme-choice>
      <span class="theme-card"><span class="theme-prev tp-${v}" aria-hidden="true"><i class="tp-side"></i><i class="tp-head"></i><i class="tp-card"></i><i class="tp-card tp-b"></i><i class="tp-dot"></i></span>
      <span class="theme-meta"><b>${label}</b><small>${sub}</small></span><span class="theme-tick" aria-hidden="true">${R.icon("check")}</span></span></label>`;
    return `<fieldset class="theme-sel"><legend class="sr-only">Theme</legend>${opt("light", "Light", "Bright and clear")}${opt("dark", "Dark", "Easy on the eyes")}${opt("system", "System", "Matches your device")}</fieldset>`;
  };

  /* ---------- Toasts ---------- */
  let toastTimer;
  R.toast = (msg, { icon = "check-circle", tone = "" } = {}) => {
    const t = document.getElementById("toast");
    if (!t) return;
    t.className = `toast ${tone}`;
    t.innerHTML = `${R.icon(icon)}<span>${esc(msg)}</span>`;
    void t.offsetWidth;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  };

  /* ---------- Dialogs (native <dialog>: focus trap, Esc, inert background) ---------- */
  R.dialog = ({ title, body = "", actions = [], size = "", onOpen, onClose, labelled = true, cls = "" }) => {
    const d = document.createElement("dialog");
    d.className = `r-dialog ${size} ${cls}`;
    const id = "dlg-" + R.uid();
    d.innerHTML = `${title ? `<header class="r-dialog-head"><h2 id="${id}">${title}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${R.icon("x")}</button></header>` : ""}
      <div class="r-dialog-body"></div>${actions.length ? `<footer class="r-dialog-actions"></footer>` : ""}`;
    if (title && labelled) d.setAttribute("aria-labelledby", id);
    const bodyEl = d.querySelector(".r-dialog-body");
    if (typeof body === "string") bodyEl.innerHTML = body; else bodyEl.append(body);
    const foot = d.querySelector(".r-dialog-actions");
    actions.forEach((a) => {
      const b = document.createElement("button");
      b.type = a.submit ? "submit" : "button";
      b.className = `btn btn-${a.tone || "ghost"}`;
      b.textContent = a.label;
      if (a.form) b.setAttribute("form", a.form);
      if (!a.submit) b.addEventListener("click", async () => { const keep = a.onClick ? await a.onClick(d) : false; if (keep !== true) close(); });
      foot.append(b);
    });
    let closed = false;
    const close = () => { if (closed) return; closed = true; if (d.open) d.close(); };
    d.addEventListener("close", () => { closed = true; onClose && onClose(); setTimeout(() => d.remove(), 0); });
    d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) close(); });
    document.body.append(d);
    d.showModal();
    R.animate(d, [{ opacity: 0, transform: "translateY(10px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 240 });
    onOpen && onOpen(d, close);
    return { el: d, close };
  };
  R.confirm = ({ title, body, confirmLabel = "Confirm", tone = "primary", cancelLabel = "Cancel" }) => new Promise((resolve) => {
    let result = false;
    R.dialog({ title, body: `<p class="dialog-text">${body}</p>`, size: "sm", onClose: () => resolve(result),
      actions: [{ label: cancelLabel, tone: "ghost" }, { label: confirmLabel, tone, onClick: () => { result = true; } }] });
  });
  /* Form dialog with inline validation. fields: [{name,label,type,required,options,value,min,max,maxLength,placeholder,hint}] */
  R.formDialog = ({ title, description = "", fields, submitLabel = "Save", onSubmit }) => {
    const formId = "f-" + R.uid();
    const html = `${description ? `<p class="dialog-text">${description}</p>` : ""}<form id="${formId}" class="form" novalidate>${fields.map((f) => {
      const id = `${formId}-${f.name}`, common = `id="${id}" name="${f.name}" ${f.required ? "required" : ""} ${f.maxLength ? `maxlength="${f.maxLength}"` : ""} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""}`;
      let control;
      if (f.type === "textarea") control = `<textarea ${common} rows="4">${esc(f.value ?? "")}</textarea>`;
      else if (f.type === "select") control = `<select ${common}>${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(f.value) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
      else control = `<input ${common} type="${f.type || "text"}" value="${esc(f.value ?? "")}" ${f.min != null ? `min="${f.min}"` : ""} ${f.max != null ? `max="${f.max}"` : ""} ${f.step != null ? `step="${f.step}"` : ""}>`;
      return `<div class="field"><label for="${id}">${f.label}</label>${control}${f.hint ? `<small class="hint">${f.hint}</small>` : ""}<p class="field-error" id="${id}-err"></p></div>`;
    }).join("")}</form>`;
    const dlg = R.dialog({ title, body: html, size: "sm", actions: [{ label: "Cancel", tone: "ghost" }, { label: submitLabel, tone: "primary", submit: true, form: formId }],
      onOpen: (d) => {
        const form = d.querySelector("form");
        form.querySelector("input,textarea,select")?.focus();
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          let ok = true;
          fields.forEach((f) => {
            const el = form.elements[f.name], err = form.querySelector(`#${el.id}-err`);
            let msg = "";
            if (f.required && !String(el.value).trim()) msg = `${f.label} is required.`;
            else if (f.type === "number" && el.value !== "" && (Number(el.value) < (f.min ?? -Infinity) || Number(el.value) > (f.max ?? Infinity))) msg = `Enter a value between ${f.min} and ${f.max}.`;
            err.textContent = msg; el.setAttribute("aria-invalid", msg ? "true" : "false");
            if (msg && ok) { ok = false; el.focus(); }
          });
          if (!ok) return;
          const values = Object.fromEntries(fields.map((f) => [f.name, form.elements[f.name].value]));
          dlg.close();
          onSubmit(values);
        });
      } });
    return dlg;
  };

  /* ---------- Tooltips (any [data-tip], hover + keyboard focus) ---------- */
  const tip = document.createElement("div");
  tip.className = "r-tip"; tip.setAttribute("role", "tooltip");
  if (document.body) document.body.append(tip); else document.addEventListener("DOMContentLoaded", () => document.body.append(tip));
  const showTip = (el) => {
    const text = el.getAttribute("data-tip"); if (!text) return;
    tip.innerHTML = text.replace(/\n/g, "<br>");
    tip.classList.add("show");
    const r = el.getBoundingClientRect(), t = tip.getBoundingClientRect();
    let x = r.left + r.width / 2 - t.width / 2, y = r.top - t.height - 8;
    if (y < 8) y = r.bottom + 8;
    x = R.clamp(x, 8, window.innerWidth - t.width - 8);
    tip.style.transform = `translate(${x}px, ${y}px)`;
  };
  const hideTip = () => tip.classList.remove("show");
  document.addEventListener("pointerover", (e) => { const el = e.target.closest?.("[data-tip]"); if (el) showTip(el); else hideTip(); });
  document.addEventListener("focusin", (e) => { const el = e.target.closest?.("[data-tip]"); if (el) showTip(el); else hideTip(); });
  document.addEventListener("scroll", hideTip, true);

  /* ---------- Reward motion ---------- */
  R.countUp = (el, to, { from = Number(el?.dataset.value || 0), dur = 700, fmt = R.fmt } = {}) => {
    if (!el) return;
    el.dataset.value = to;
    if (R.reducedMotion() || from === to) { el.textContent = fmt(to); return; }
    const start = performance.now();
    const step = (now) => { const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(Math.round(from + (to - from) * e)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  R.floatReward = (text, anchor, tone = "xp") => {
    if (!anchor || R.reducedMotion()) return;
    const r = anchor.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = `float-reward float-${tone}`;
    el.innerHTML = `${R.icon(tone === "gem" ? "gem" : "bolt")}${esc(text)}`;
    el.style.left = `${r.left + r.width / 2}px`; el.style.top = `${r.top}px`;
    document.body.append(el);
    R.animate(el, [{ opacity: 0, transform: "translate(-50%, 0) scale(.6)" }, { opacity: 1, transform: "translate(-50%, -18px) scale(1.05)", offset: 0.25 }, { opacity: 1, transform: "translate(-50%, -34px) scale(1)", offset: 0.7 }, { opacity: 0, transform: "translate(-50%, -52px) scale(.95)" }], { duration: 1100, easing: "ease-out" }).finished.then(() => el.remove());
    setTimeout(() => el.remove(), 1400);
  };
  R.burst = (anchor, { count = 18, spread = 90 } = {}) => {
    if (R.reducedMotion()) return;
    const r = anchor ? anchor.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const colors = ["var(--teal)", "var(--orange)", "#FFC56B", "var(--teal-300)"];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("i");
      p.className = "confetti";
      p.style.left = `${cx}px`; p.style.top = `${cy}px`; p.style.background = colors[i % colors.length];
      if (i % 3 === 0) p.style.borderRadius = "50%";
      document.body.append(p);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5, dist = spread * (0.6 + Math.random() * 0.6);
      R.animate(p, [{ transform: "translate(-50%,-50%) scale(1) rotate(0)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist + 40}px)) scale(.6) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.4,1)" }).finished.then(() => p.remove());
      setTimeout(() => p.remove(), 1600);
    }
  };
  /* Big moments: level up, achievement unlocks, session complete. Queued so they never stack. */
  const queue = [];
  let showing = false;
  R.celebrate = (opts) => { queue.push(opts); if (!showing) next(); };
  // Big moments wait while a focused activity (CBT, flashcard review) is running,
  // then appear once it ends, so they never interrupt answering.
  R.flushCelebrations = () => { if (!showing) next(); };
  function next() {
    if (document.body.classList.contains("focus-mode") && queue.length) { showing = false; return; }
    const o = queue.shift();
    if (!o) { showing = false; return; }
    showing = true;
    const badge = `<div class="celebrate-badge celebrate-${o.tone || "teal"}">${o.emoji ? `<span class="celebrate-emoji">${o.emoji}</span>` : R.icon(o.icon || "award")}</div>`;
    R.dialog({ cls: "celebrate", size: "sm", labelled: false,
      body: `${badge}<div class="eyebrow center">${esc(o.eyebrow || "")}</div><h2 class="celebrate-title">${esc(o.title)}</h2><p class="celebrate-sub">${esc(o.subtitle || "")}</p>${o.rewards ? `<div class="celebrate-rewards">${o.rewards}</div>` : ""}${o.extra || ""}`,
      actions: [...(o.secondary ? [{ label: o.secondary.label, tone: "ghost", onClick: o.secondary.onClick }] : []), { label: o.cta || "Continue", tone: "primary", onClick: o.onCta }],
      onOpen: (d) => {
        const b = d.querySelector(".celebrate-badge");
        R.animate(b, [{ transform: "scale(.3) rotate(-25deg)", opacity: 0 }, { transform: "scale(1.12) rotate(6deg)", opacity: 1, offset: 0.6 }, { transform: "scale(1) rotate(0)", opacity: 1 }], { duration: 650, easing: "cubic-bezier(.3,1.4,.5,1)" });
        setTimeout(() => R.burst(b, { count: o.big ? 30 : 18, spread: o.big ? 140 : 100 }), 180);
      },
      onClose: () => setTimeout(next, 150) });
  }
  /* Standard reaction to R.record(): float XP, celebrate unlocks. */
  R.reward = (result, anchor) => {
    if (!result) return;
    if (result.xp > 0) R.floatReward(`+${result.xp} XP`, anchor || document.querySelector("[data-xp-chip]"));
    result.quests.forEach((q) => R.toast(`Quest complete: ${q.title} · +${q.xp} XP, +5 gems`, { icon: "check-circle", tone: "toast-reward" }));
    if (result.streakUp && result.streakUp > 1 && [3, 7, 14, 30, 50, 100].includes(result.streakUp)) R.celebrate({ eyebrow: "Streak milestone", title: `${result.streakUp}-day streak!`, subtitle: "Consistency is what makes knowledge stick. Keep showing up.", icon: "flame", tone: "orange", big: true });
    else if (result.streakUp) R.toast(`Streak extended: ${result.streakUp} ${result.streakUp === 1 ? "day" : "days"}`, { icon: "flame", tone: "toast-reward" });
    result.achievements.forEach((a) => R.celebrate({ eyebrow: "Achievement unlocked", title: a.name, subtitle: a.desc, icon: a.icon, tone: "orange", rewards: `<span class="reward-chip gem">${R.icon("gem")}+${a.gems} gems</span>`, cta: "Nice!", secondary: { label: "View achievements", onClick: () => R.go("achievements") } }));
    if (result.levelUp) R.celebrate({ eyebrow: "Level up", title: `You reached level ${result.levelUp}`, subtitle: "Your effort is compounding. New store items may now be within reach.", icon: "award", tone: "teal", big: true, rewards: `<span class="reward-chip gem">${R.icon("gem")}+15 gems</span>`, cta: "Keep going", secondary: { label: "Visit the store", onClick: () => R.go("store") } });
  };

  /* ---------- Charts (SVG, single axis, hover tooltips, recessive grid) ---------- */
  const niceMax = (v) => { if (v <= 0) return 10; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
  /* Column chart. data: [{label, value, tip, highlight}] */
  R.chart = {};
  R.chart.columns = (data, { height = 180, fmt = R.fmt, aria = "", color = "var(--teal)", hi = "var(--orange)", unit = "" } = {}) => {
    const W = 600, H = height, padL = 34, padB = 26, padT = 10;
    const max = niceMax(Math.max(...data.map((d) => d.value), 0));
    const plotW = W - padL - 6, plotH = H - padB - padT, band = plotW / data.length, bw = Math.min(24, band * 0.6);
    const ticks = [0, max / 2, max];
    return `<figure class="chart" role="img" aria-label="${esc(aria)}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      ${ticks.map((t) => { const y = padT + plotH - (t / max) * plotH; return `<line class="grid" x1="${padL}" x2="${W - 6}" y1="${y}" y2="${y}"/><text class="axis" x="${padL - 6}" y="${y + 3}" text-anchor="end">${fmt(Math.round(t))}</text>`; }).join("")}
      ${data.map((d, i) => {
        const h = max ? (d.value / max) * plotH : 0, x = padL + band * i + (band - bw) / 2, y = padT + plotH - h, r = Math.min(4, h);
        const path = h > 0 ? `M${x},${padT + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${padT + plotH} Z` : "";
        return `<g class="col" tabindex="0" data-tip="${esc(d.tip || `${d.label}: ${fmt(d.value)}${unit}`)}"><rect class="hit" x="${padL + band * i}" y="${padT}" width="${band}" height="${plotH}"/>${path ? `<path class="bar" d="${path}" style="fill:${d.highlight ? hi : color};--i:${i}"/>` : `<rect x="${x}" y="${padT + plotH - 2}" width="${bw}" height="2" class="bar-zero"/>`}<text class="axis" x="${padL + band * i + band / 2}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text></g>`;
      }).join("")}
    </svg></figure>`;
  };
  /* Line chart for one or more series on one axis. series: [{name, color, values:[number|null]}], labels: [] */
  R.chart.line = (labels, series, { height = 200, max = null, fmt = (v) => `${Math.round(v)}`, aria = "", area = true, unit = "" } = {}) => {
    const W = 600, H = height, padL = 34, padB = 26, padT = 12;
    const all = series.flatMap((s) => s.values).filter((v) => v != null);
    const top = max ?? niceMax(Math.max(...all, 1));
    const plotW = W - padL - 14, plotH = H - padB - padT;
    const X = (i) => padL + (labels.length === 1 ? plotW / 2 : (plotW * i) / (labels.length - 1));
    const Y = (v) => padT + plotH - (v / top) * plotH;
    const ticks = [0, top / 2, top];
    const every = Math.ceil(labels.length / 8);
    const paths = series.map((s) => {
      const pts = s.values.map((v, i) => (v == null ? null : [X(i), Y(v)]));
      let d = "", started = false;
      pts.forEach((p) => { if (!p) { started = false; return; } d += `${started ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)} `; started = true; });
      const valid = pts.filter(Boolean);
      const areaD = area && valid.length > 1 ? `M${valid[0][0]},${padT + plotH} ` + valid.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + ` L${valid[valid.length - 1][0]},${padT + plotH} Z` : "";
      const last = valid[valid.length - 1];
      return `${areaD ? `<path class="area" d="${areaD}" style="fill:${s.color}"/>` : ""}<path class="line" pathLength="1" d="${d}" style="stroke:${s.color}"/>${valid.length === 1 ? `<circle class="dot" cx="${valid[0][0]}" cy="${valid[0][1]}" r="4" style="fill:${s.color}"/>` : ""}${last ? `<circle class="dot end" cx="${last[0]}" cy="${last[1]}" r="4.5" style="fill:${s.color}"/>` : ""}`;
    }).join("");
    const hits = labels.map((l, i) => {
      const lines = series.map((s) => `${s.name}: ${s.values[i] == null ? "no data" : fmt(s.values[i]) + unit}`).join("\n");
      const w = plotW / Math.max(1, labels.length - 1);
      return `<g class="hover-col" tabindex="0" data-tip="${esc(`<b>${l}</b>\n${lines}`)}"><rect class="hit" x="${X(i) - w / 2}" y="${padT}" width="${w}" height="${plotH}"/><line class="crosshair" x1="${X(i)}" x2="${X(i)}" y1="${padT}" y2="${padT + plotH}"/></g>`;
    }).join("");
    return `<figure class="chart" role="img" aria-label="${esc(aria)}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      ${ticks.map((t) => `<line class="grid" x1="${padL}" x2="${W - 14}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis" x="${padL - 6}" y="${Y(t) + 3}" text-anchor="end">${fmt(t)}</text>`).join("")}
      ${labels.map((l, i) => (i % every === 0 || i === labels.length - 1 ? `<text class="axis" x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>` : "")).join("")}
      ${paths}${hits}</svg>
      ${series.length > 1 ? `<figcaption class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</figcaption>` : ""}</figure>`;
  };
  /* Horizontal bars, labelled in text (mastery lists). items: [{label, value, color, sub, href}] */
  R.chart.hbars = (items, { fmt = R.pct } = {}) =>
    `<div class="hbars">${items.map((it) => `<div class="hbar" data-tip="${esc(`${it.label}: ${fmt(it.value)}`)}"><div class="hbar-top"><span>${it.color ? `<i class="sw" style="background:${it.color}"></i>` : ""}${esc(it.label)}</span><b>${fmt(it.value)}</b></div><div class="hbar-track"><i style="--p:${R.clamp(it.value, 0, 100)}%;${it.color ? `background:${it.color}` : ""}"></i></div>${it.sub ? `<small>${it.sub}</small>` : ""}</div>`).join("")}</div>`;
  /* Consistency heatmap: last N weeks, one cell per day. Sequential single hue. */
  R.chart.heatmap = (weeks = 12) => {
    const start = R.addDays(R.startOfWeek(), -7 * (weeks - 1));
    const cells = [];
    let max = 1;
    const days = [];
    for (let i = 0; i < weeks * 7; i++) { const d = R.addDays(start, i); const list = R.activityOn(R.dayKey(d)).filter((a) => a.t !== "quest" && a.t !== "bonus"); const xp = R.sum(list, (a) => a.xp); max = Math.max(max, xp); days.push({ d, xp, future: d > new Date() }); }
    days.forEach(({ d, xp, future }) => { const lvl = future ? -1 : xp === 0 ? 0 : Math.ceil((xp / max) * 4); cells.push(`<i class="hm l${lvl}" data-tip="${esc(`${R.fmtDate(d, { weekday: "short", month: "short", day: "numeric" })}: ${future ? "upcoming" : xp ? R.fmt(xp) + " XP" : "no study"}`)}" ${future ? "" : 'tabindex="-1"'}></i>`); });
    return `<div class="heatmap" role="img" aria-label="Study activity heatmap for the last ${weeks} weeks"><div class="hm-days"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span>Sun</span></div><div class="hm-grid" style="--weeks:${weeks}">${cells.join("")}</div></div><div class="hm-legend"><span>Less</span><i class="hm l0"></i><i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><i class="hm l4"></i><span>More</span></div>`;
  };
  /* Accessible data table toggle for any chart. rows: [[...]] */
  R.chart.table = (head, rows, summary = "Show data table") =>
    `<details class="data-details"><summary>${summary}</summary><div class="table-wrap"><table class="table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`;
})();
