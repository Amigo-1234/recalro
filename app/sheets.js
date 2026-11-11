/* ==========================================================================
   Sheets and pickers: the app's replacement for dropdown menus.
     R.sheet()    bottom sheet on phones, side panel on larger screens,
                  or a full-screen hub (variant "full"). Native <dialog>, so
                  focus is trapped, Esc closes and the page behind is inert.
     R.picker()   searchable selection screen built on a sheet.
     R.enhanceSelect()  swaps a native <select> for a button that opens a
                  picker. The <select> stays in the DOM as the source of
                  truth, so existing forms and change listeners keep working.
   ========================================================================== */
(function () {
  "use strict";
  const R = window.R, esc = R.esc, icon = R.icon;
  const phone = () => window.matchMedia("(max-width: 767px)").matches;

  /* ---------- Sheet ---------- */
  R.sheet = ({ title = "", body = "", variant = "auto", cls = "", onOpen, onClose, head = true } = {}) => {
    const d = document.createElement("dialog");
    const id = "sh-" + R.uid();
    const kind = variant === "full" ? "full" : phone() ? "bottom" : "side";
    d.className = `r-sheet r-sheet-${kind} ${cls}`;
    if (title) d.setAttribute("aria-labelledby", id);
    d.innerHTML = `${kind === "bottom" ? `<div class="sheet-grab" aria-hidden="true"><i></i></div>` : ""}
      ${head ? `<header class="sheet-head"><h2 id="${id}">${title}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon("x")}</button></header>` : ""}
      <div class="sheet-body"></div>`;
    const bodyEl = d.querySelector(".sheet-body");
    if (typeof body === "string") bodyEl.innerHTML = body; else bodyEl.append(body);
    let closing = false;
    const close = () => {
      if (closing || !d.open) return;
      closing = true;
      if (R.reducedMotion()) { d.close(); return; }
      d.classList.add("is-closing");
      setTimeout(() => d.close(), 200);
    };
    d.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    d.addEventListener("close", () => { document.documentElement.classList.remove("sheet-lock"); onClose?.(); setTimeout(() => d.remove(), 0); });
    d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) close(); });

    // Drag the grab handle down to dismiss a bottom sheet.
    const grab = d.querySelector(".sheet-grab");
    if (grab) {
      let y0 = null, dy = 0;
      grab.addEventListener("pointerdown", (e) => { y0 = e.clientY; dy = 0; grab.setPointerCapture(e.pointerId); d.style.transition = "none"; });
      grab.addEventListener("pointermove", (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); d.style.transform = `translateY(${dy}px)`; });
      const end = () => { if (y0 == null) return; y0 = null; d.style.transition = ""; d.style.transform = ""; if (dy > 90) close(); };
      grab.addEventListener("pointerup", end); grab.addEventListener("pointercancel", end);
    }
    document.body.append(d);
    d.showModal();
    document.documentElement.classList.add("sheet-lock");
    // Start focus on the sheet itself (no keyboard popping up on phones); onOpen may move it.
    d.tabIndex = -1; d.focus({ preventScroll: true });
    onOpen?.(d, close);
    return { el: d, close };
  };

  /* ---------- Picker: searchable selection screen ---------- */
  // options: [{ value, label, sub?, group?, dot? (subject id), icon? }]
  R.picker = ({ title, options, value, onSelect, searchable = options.length > 7, placeholder = "Search" }) => {
    const groups = [...new Set(options.map((o) => o.group || ""))];
    const row = (o, i) => `<button type="button" class="pick-opt" role="radio" aria-checked="${String(o.value) === String(value)}" data-i="${i}">
        ${o.dot ? R.ui.subjectDot(o.dot) : o.icon ? icon(o.icon) : ""}
        <span><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ""}</span>
        <span class="pick-check" aria-hidden="true">${icon("check")}</span></button>`;
    const body = `${searchable ? `<div class="pick-search">${icon("search")}<input type="search" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" autocomplete="off"></div>` : ""}
      <div class="pick-list" role="radiogroup" aria-label="${esc(title)}">${groups.map((g) => `${g ? `<p class="pick-group">${esc(g)}</p>` : ""}${options.map((o, i) => ((o.group || "") === g ? row(o, i) : "")).join("")}`).join("")}</div>
      <p class="pick-empty" hidden>No matches.</p>`;
    return R.sheet({ title, body, cls: "pick-sheet", onOpen(d, close) {
      const opts = [...d.querySelectorAll(".pick-opt")], input = d.querySelector(".pick-search input");
      const visible = () => opts.filter((o) => !o.hidden);
      d.querySelector(".pick-list").addEventListener("click", (e) => {
        const b = e.target.closest(".pick-opt"); if (!b) return;
        opts.forEach((o) => o.setAttribute("aria-checked", String(o === b)));
        const chosen = options[Number(b.dataset.i)];
        R.animate(b, [{ transform: "scale(1)" }, { transform: "scale(.97)" }, { transform: "scale(1)" }], { duration: 180 });
        setTimeout(() => { close(); onSelect(chosen.value, chosen); }, R.reducedMotion() ? 0 : 120);
      });
      d.addEventListener("keydown", (e) => {
        if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
        const list = visible(); if (!list.length) return;
        e.preventDefault();
        const i = list.indexOf(document.activeElement);
        list[e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length].focus();
      });
      input?.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        opts.forEach((o) => (o.hidden = !!q && !o.textContent.toLowerCase().includes(q)));
        d.querySelectorAll(".pick-group").forEach((g) => { let n = g.nextElementSibling, any = false; while (n && !n.classList.contains("pick-group")) { if (!n.hidden) any = true; n = n.nextElementSibling; } g.hidden = !any; });
        d.querySelector(".pick-empty").hidden = visible().length > 0;
      });
      (input && !phone() ? input : d.querySelector('.pick-opt[aria-checked="true"]') || opts[0])?.focus();
    } });
  };

  /* ---------- Native <select> → picker button ---------- */
  R.enhanceSelect = (sel) => {
    if (sel.dataset.enhanced || sel.dataset.native != null || sel.multiple) return;
    sel.dataset.enhanced = "1";
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "pick-btn";
    btn.id = (sel.id || "sel-" + R.uid()) + "-pick";
    btn.setAttribute("aria-haspopup", "dialog");
    const label = sel.id && document.querySelector(`label[for="${CSS.escape(sel.id)}"]`);
    const labelText = (label?.textContent || sel.getAttribute("aria-label") || sel.closest("label")?.textContent || "Choose an option").trim();
    if (label) label.htmlFor = btn.id;
    const sync = () => {
      const o = sel.options[sel.selectedIndex];
      btn.innerHTML = `<span>${esc(o ? o.textContent : "Choose…")}</span>${icon("chevron-down")}`;
      btn.setAttribute("aria-label", `${labelText}: ${o ? o.textContent : "none selected"}`);
    };
    sel.classList.add("is-enhanced"); sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");
    sel.after(btn); sync();
    sel.addEventListener("change", sync);
    btn.addEventListener("click", () => {
      const options = [...sel.options].filter((o) => !o.disabled).map((o) => ({ value: o.value, label: o.textContent, group: o.parentElement.tagName === "OPTGROUP" ? o.parentElement.label : "" }));
      R.picker({ title: labelText, options, value: sel.value, onSelect(v) {
        if (sel.value !== v) { sel.value = v; sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true })); }
        sync(); btn.focus();
      } });
    });
  };
  // Enhance selects wherever the app or its dialogs render them. Only <select>
  // elements are touched, so the observer can never re-trigger itself.
  const scan = (root) => root.querySelectorAll?.("select:not([data-enhanced])").forEach((s) => { if (s.closest("#app, .r-dialog")) R.enhanceSelect(s); });
  new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches("select")) scan(n.parentElement); else scan(n); } }))).observe(document.documentElement, { childList: true, subtree: true });
})();
