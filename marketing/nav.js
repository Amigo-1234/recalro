/* ==========================================================================
   MarketingNavbar
   One navigation config renders three views:
     - DesktopNavigation  links + animated indicator + scroll-spy
     - FeaturesMegaMenu   grouped feature links (click, hover-intent, keyboard)
     - MobileNavigation   a full-height sheet built on <dialog> (focus trap, Esc)
   Feature links point at the live demos further down the page, so every item
   lands somewhere that actually shows the feature.
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const icon = (name) => window.R.icon(name);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FEATURES = [
    { title: "AI Learning", items: [
      { label: "AI Tutor", desc: "Step-by-step help grounded in your notes.", icon: "sparkles", demo: "tutor" },
      { label: "AI Summaries", desc: "Long chapters condensed to what matters.", icon: "file", href: "#story-2" },
      { label: "Smart Study Materials", desc: "Upload notes and PDFs, get organised topics.", icon: "upload", href: "#story-1" },
    ] },
    { title: "Memory & Revision", items: [
      { label: "Flashcards", desc: "Recall-first cards that flip, rate and adapt.", icon: "cards", demo: "flashcards" },
      { label: "Spaced Repetition", desc: "Reviews timed just before you'd forget.", icon: "refresh", demo: "curve" },
      { label: "Knowledge Vault", desc: "Formulas, laws and definitions, sorted.", icon: "archive", demo: "vault" },
      { label: "Forgetting Curve", desc: "See memory fade and how reviews lift it.", icon: "brain", demo: "curve" },
    ] },
    { title: "Performance", items: [
      { label: "Learning Analytics", desc: "Streaks, accuracy and study time at a glance.", icon: "chart", href: "#platform" },
      { label: "Weakness Detector", desc: "Pinpoints the topics costing you marks.", icon: "target", href: "#story-5" },
      { label: "Exam Readiness", desc: "Timed practice and a readiness score.", icon: "gauge", demo: "exam" },
    ] },
  ];
  const LINKS = [
    { id: "platform", label: "Platform", href: "#platform" },
    { id: "how", label: "How it works", href: "#how" },
    { id: "features", label: "Features", href: "#features", mega: true },
    { id: "stories", label: "Student stories", href: "#stories" },
  ];
  const itemHref = (it) => it.href || `#demo-${it.demo}`;
  const itemAttrs = (it) => `href="${itemHref(it)}" data-nav-target${it.demo ? ` data-demo="${it.demo}"` : ""}`;
  const brand = `<a class="mk-brand" href="#top" data-nav-target aria-label="Recalro home"><img src="assets/recalro-logo.png" width="1254" height="1254" alt=""><span>recal<span class="mk-orange">ro</span></span></a>`;

  /* ---------- Markup ---------- */
  const megaMenu = () => `
    <div class="mk-mega" id="mkMega" role="region" aria-label="Features">
      <div class="mk-mega-groups">
        ${FEATURES.map((g) => `
          <section class="mk-mega-group" aria-labelledby="mega-${g.title.replace(/\W+/g, "")}">
            <h2 id="mega-${g.title.replace(/\W+/g, "")}">${g.title}</h2>
            <ul>${g.items.map((it) => `<li><a class="mk-mega-item" ${itemAttrs(it)}><span class="mk-mega-ic">${icon(it.icon)}</span><span><b>${it.label}</b><small>${it.desc}</small></span></a></li>`).join("")}</ul>
          </section>`).join("")}
      </div>
      <div class="mk-mega-foot">
        <a class="mk-mega-feature" href="#top" data-nav-target data-focus-demo>
          <span class="mk-mega-feature-ic">${icon("play")}</span>
          <span><b>Try a live review</b><small>Flip a card, rate it, earn XP. No account needed.</small></span>
        </a>
        <a class="mk-mega-all" href="#features" data-nav-target>See every feature in action ${icon("arrow-right")}</a>
      </div>
    </div>`;

  const desktop = () => `
    <ul class="mk-dnav" role="list">
      ${LINKS.map((l) => l.mega
        ? `<li class="mk-dnav-item has-mega"><button type="button" class="mk-dnav-link mk-mega-trigger" data-spy="${l.id}" aria-expanded="false" aria-controls="mkMega">${l.label}<span class="mk-chev">${icon("chevron-down")}</span></button>${megaMenu()}</li>`
        : `<li class="mk-dnav-item"><a class="mk-dnav-link" href="${l.href}" data-nav-target data-spy="${l.id}">${l.label}</a></li>`).join("")}
      <li class="mk-dnav-ind" aria-hidden="true"></li>
    </ul>`;

  const mobile = () => `
    <dialog class="mk-mnav" id="mkMobileNav" aria-label="Menu">
      <div class="mk-mnav-head">${brand}<button type="button" class="mk-mnav-close" data-mnav-close aria-label="Close menu" autofocus>${icon("x")}</button></div>
      <nav class="mk-mnav-body" aria-label="Mobile">
        <ul class="mk-mnav-list" role="list">
          ${LINKS.map((l, i) => l.mega
            ? `<li style="--i:${i}"><button type="button" class="mk-mnav-link mk-mnav-acc" aria-expanded="false" aria-controls="mkMnavFeatures"><span>${l.label}</span><span class="mk-chev">${icon("chevron-down")}</span></button>
                <div class="mk-mnav-features" id="mkMnavFeatures" hidden>
                  ${FEATURES.map((g) => `<p class="mk-mnav-group">${g.title}</p><ul role="list">${g.items.map((it) => `<li><a class="mk-mnav-sub" ${itemAttrs(it)}><span class="mk-mega-ic">${icon(it.icon)}</span><span><b>${it.label}</b><small>${it.desc}</small></span></a></li>`).join("")}</ul>`).join("")}
                </div></li>`
            : `<li style="--i:${i}"><a class="mk-mnav-link" href="${l.href}" data-nav-target data-spy="${l.id}"><span>${l.label}</span>${icon("arrow-right")}</a></li>`).join("")}
        </ul>
        <a class="mk-mnav-try" href="#top" data-nav-target data-focus-demo style="--i:4"><span class="mk-mega-feature-ic">${icon("play")}</span><span><b>Try a live review</b><small>Interactive preview, no account needed</small></span></a>
      </nav>
      <div class="mk-mnav-foot">
        <button type="button" class="mk-btn mk-btn-primary mk-btn-lg mk-btn-block" data-nav-action="signup">Get started free <span class="arrow-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M7 17 17 7M8 7h9v9"/></svg></span></button>
        <button type="button" class="mk-btn mk-btn-outline mk-btn-lg mk-btn-block" data-nav-action="login">Log in</button>
        <p>Learn it today. Own it tomorrow.</p>
      </div>
    </dialog>`;

  function MarketingNavbar(root, { onLogin, onSignup, onDemo }) {
    root.innerHTML = `
      <nav class="mk-nav" aria-label="Main navigation">
        ${brand}
        ${desktop()}
        <div class="mk-nav-actions">
          <button class="mk-btn mk-btn-ghost mk-nav-login" type="button" data-nav-action="login">Log in</button>
          <button class="mk-btn mk-btn-primary mk-nav-start" type="button" data-nav-action="signup">Get started <span class="arrow-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M7 17 17 7M8 7h9v9"/></svg></span></button>
          <button class="mk-burger" type="button" aria-label="Open menu" aria-haspopup="dialog" aria-controls="mkMobileNav" aria-expanded="false"><span></span><span></span><span></span></button>
        </div>
      </nav>`;
    root.insertAdjacentHTML("afterend", mobile());

    const nav = $(".mk-nav", root), list = $(".mk-dnav", root), ind = $(".mk-dnav-ind", root);
    const trigger = $(".mk-mega-trigger", root), mega = $("#mkMega", root);
    const sheet = $("#mkMobileNav"), burger = $(".mk-burger", root);

    /* ---------- Navigation actions + smooth anchor scrolling ---------- */
    function go(link) {
      const href = link.getAttribute("href") || "";
      if (link.hasAttribute("data-focus-demo")) { scrollToEl(document.body, 0); onDemo?.(); return; }
      if (href === "#top") { scrollToEl(document.body, 0); return; }
      const target = $(href);
      if (!target) return;
      if (link.dataset.demo) window.RecalroMarketing?.showDemo?.(link.dataset.demo);
      scrollToEl(target);
      // Move keyboard focus to the destination so screen-reader and keyboard users land there too.
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
    function scrollToEl(el, top) {
      const y = top ?? el.getBoundingClientRect().top + window.scrollY - (nav.offsetHeight + 24);
      window.scrollTo({ top: Math.max(0, y), behavior: reduced() ? "auto" : "smooth" });
    }
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-nav-target]");
      if (link && (root.contains(link) || sheet.contains(link))) {
        e.preventDefault();
        closeMega(false);
        if (sheet.open) closeSheet(false);
        // Let the sheet finish closing before scrolling so the page isn't locked.
        requestAnimationFrame(() => go(link));
        return;
      }
      const action = e.target.closest("[data-nav-action]");
      if (action && (root.contains(action) || sheet.contains(action))) {
        if (sheet.open) closeSheet(false);
        closeMega(false);
        (action.dataset.navAction === "login" ? onLogin : onSignup)?.();
      }
    });

    /* ---------- Sticky state ---------- */
    const onScroll = () => root.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ---------- Animated indicator: follows hover, rests on the active section ---------- */
    let active = null;
    function moveIndicator(el) {
      if (!el || getComputedStyle(list).display === "none") { ind.style.opacity = "0"; return; }
      const a = el.getBoundingClientRect(), b = list.getBoundingClientRect();
      ind.style.width = `${a.width}px`;
      ind.style.transform = `translateX(${a.left - b.left}px)`;
      ind.style.opacity = "1";
    }
    const restIndicator = () => moveIndicator(active && $(`[data-spy="${active}"]`, list));
    list.addEventListener("pointerover", (e) => { const l = e.target.closest(".mk-dnav-link"); if (l) moveIndicator(l); });
    list.addEventListener("pointerleave", () => { if (!mega.classList.contains("is-open")) restIndicator(); });
    list.addEventListener("focusin", (e) => { const l = e.target.closest(".mk-dnav-link"); if (l) moveIndicator(l); });
    list.addEventListener("focusout", () => setTimeout(() => { if (!list.contains(document.activeElement)) restIndicator(); }));
    window.addEventListener("resize", restIndicator);
    document.fonts?.ready.then(restIndicator);

    // Scroll-spy: the section nearest the top third of the viewport is "current".
    const sections = LINKS.map((l) => $(l.href)).filter(Boolean);
    function spy() {
      const line = window.innerHeight * 0.35;
      let current = null;
      sections.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= line && r.bottom > line) current = s.id; });
      if (current === active) return;
      active = current;
      $$("[data-spy]", root.parentElement).forEach((l) => {
        if (l.dataset.spy === active) l.setAttribute("aria-current", "location"); else l.removeAttribute("aria-current");
      });
      $$("[data-spy]", sheet).forEach((l) => l.toggleAttribute("data-current", l.dataset.spy === active));
      if (!list.matches(":hover") && !mega.classList.contains("is-open")) restIndicator();
    }
    let ticking = false;
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; spy(); }); } }, { passive: true });
    spy();

    /* ---------- Features mega-menu ---------- */
    const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)");
    let hoverTimer = 0;
    function openMega(focusFirst) {
      clearTimeout(hoverTimer);
      mega.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true");
      moveIndicator(trigger);
      if (focusFirst) $(".mk-mega-item", mega)?.focus();
    }
    function closeMega(returnFocus) {
      clearTimeout(hoverTimer);
      if (!mega.classList.contains("is-open")) return;
      mega.classList.remove("is-open"); trigger.setAttribute("aria-expanded", "false");
      if (returnFocus) trigger.focus();
      restIndicator();
    }
    trigger.addEventListener("click", () => (mega.classList.contains("is-open") ? closeMega(false) : openMega(false)));
    trigger.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); openMega(true); } });
    const megaItem = trigger.parentElement;
    megaItem.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && hoverCapable.matches) { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => openMega(false), 90); } });
    megaItem.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && hoverCapable.matches) { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => closeMega(false), 220); } });
    mega.addEventListener("keydown", (e) => {
      const items = $$("a", mega), i = items.indexOf(document.activeElement);
      if (e.key === "Escape") { e.preventDefault(); closeMega(true); }
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
    });
    trigger.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMega(true); });
    megaItem.addEventListener("focusout", () => setTimeout(() => { if (!megaItem.contains(document.activeElement)) closeMega(false); }));
    document.addEventListener("pointerdown", (e) => { if (!megaItem.contains(e.target)) closeMega(false); });

    /* ---------- Mobile sheet ---------- */
    const html = document.documentElement;
    function openSheet() {
      if (sheet.open) return;
      sheet.showModal(); html.classList.add("mk-locked");
      burger.setAttribute("aria-expanded", "true");
      sheet.classList.remove("is-closing");
    }
    function closeSheet(returnFocus = true) {
      if (!sheet.open) return;
      const done = () => { sheet.classList.remove("is-closing"); sheet.close(); html.classList.remove("mk-locked"); burger.setAttribute("aria-expanded", "false"); if (returnFocus) burger.focus(); };
      if (reduced() || !returnFocus) { done(); return; }
      sheet.classList.add("is-closing");
      setTimeout(done, 220);
    }
    burger.addEventListener("click", openSheet);
    sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest("[data-mnav-close]")) closeSheet(); });
    sheet.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(); });
    const acc = $(".mk-mnav-acc", sheet), accPanel = $("#mkMnavFeatures", sheet);
    acc.addEventListener("click", () => {
      const open = acc.getAttribute("aria-expanded") !== "true";
      acc.setAttribute("aria-expanded", String(open)); accPanel.hidden = !open;
    });
    // Leaving the mobile layout with the sheet open (rotating a tablet) closes it.
    window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => { if (e.matches) closeSheet(false); });

    return { closeMega, closeSheet, refresh: restIndicator };
  }

  window.RecalroMarketing = Object.assign(window.RecalroMarketing || {}, { MarketingNavbar, FEATURES });
})();
