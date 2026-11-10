/* ==========================================================================
   Marketing motion primitives (no animation library is installed, so these use
   CSS transitions and the Web Animations API). Every primitive checks
   prefers-reduced-motion and jumps straight to its end state when it's set.
     AnimatedHeadline  word-by-word masked reveal, keeps <br>/<em> markup
     RevealOnScroll    .mk-reveal elements fade up once when they enter view
     StaggerContainer  [data-stagger] gives each child an index (--i) for delays
     AnimatedCounter   [data-count] numbers count up the first time they're seen
     AnimatedProgress  width/ring values animate to a target
   ========================================================================== */
(function () {
  "use strict";
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => mq.matches;

  /* Splits text nodes into words wrapped in masks; elements like <em> are kept and
     their words split too. The accessible name stays the original sentence. */
  function AnimatedHeadline(el) {
    if (!el || el.dataset.split) return;
    el.dataset.split = "1";
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    let i = 0;
    const split = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.nodeValue.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(document.createTextNode(" ")); return; }
            const mask = document.createElement("span");
            mask.className = "mk-w"; mask.setAttribute("aria-hidden", "true");
            const inner = document.createElement("span");
            inner.textContent = part; inner.style.setProperty("--i", i++);
            mask.append(inner); frag.append(mask);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") split(child);
      });
    };
    split(el);
    el.style.setProperty("--words", i);
    if (reduced()) { el.classList.add("is-in"); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));
  }

  function StaggerContainer(root = document) {
    root.querySelectorAll("[data-stagger]").forEach((group) => [...group.children].forEach((c, i) => c.style.setProperty("--i", i)));
  }

  function AnimatedCounter(el, { to = Number(el.dataset.count), dur = 1100, suffix = el.dataset.suffix || "", from = 0 } = {}) {
    if (!el || Number.isNaN(to)) return;
    if (reduced()) { el.textContent = `${to}${suffix}`; return; }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = `${Math.round(from + (to - from) * e)}${suffix}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function AnimatedProgress(el, value, { prop = "width" } = {}) {
    if (!el) return;
    if (prop === "ring") el.style.setProperty("--p", value);
    else el.style.width = `${value}%`;
  }

  /* One observer for reveals and counters. Elements reveal once and are released. */
  function RevealOnScroll(root) {
    const reveals = [...root.querySelectorAll(".mk-reveal")];
    const counters = [...root.querySelectorAll("[data-count]")];
    if (!("IntersectionObserver" in window) || reduced()) {
      reveals.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    root.classList.add("mk-js");
    counters.forEach((c) => (c.textContent = `0${c.dataset.suffix || ""}`));
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.matches(".mk-reveal")) el.classList.add("is-visible");
      if (el.matches("[data-count]")) AnimatedCounter(el);
      io.unobserve(el);
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
    counters.forEach((el) => io.observe(el));
  }

  /* Small helpers shared by the story and the feature demos. */
  const wait = (ms, token) => new Promise((resolve) => {
    if (reduced()) return resolve(!token?.cancelled);
    setTimeout(() => resolve(!token?.cancelled), ms);
  });
  const animate = (el, frames, opts) => (!el || reduced() || !el.animate) ? { finished: Promise.resolve() } : el.animate(frames, { duration: 320, easing: "cubic-bezier(.22,.61,.36,1)", fill: "none", ...opts });

  window.RecalroMotion = { reduced, AnimatedHeadline, StaggerContainer, AnimatedCounter, AnimatedProgress, RevealOnScroll, wait, animate };
})();
