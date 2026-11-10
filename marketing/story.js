/* ==========================================================================
   ScrollStory: "How Recalro works" as a connected journey.
   - Each step owns a scene (works on its own on small screens and without JS).
   - On wide screens the scenes are mirrored into one sticky stage, and the step
     nearest the middle of the viewport becomes active.
   - Normal scrolling is never intercepted: we only observe position.
   ========================================================================== */
(function () {
  "use strict";

  function ScrollStory(section) {
    if (!section) return;
    const steps = [...section.querySelectorAll(".mk-story-step")];
    const list = section.querySelector(".mk-story-steps");
    const stage = section.querySelector(".mk-story-scenes");
    if (!steps.length || !stage) return;
    section.classList.add("mk-story-js");

    // Mirror each inline scene into the sticky stage (decorative copy, hidden from AT).
    const mirrored = steps.map((step) => {
      const clone = step.querySelector(".mk-scene").cloneNode(true);
      stage.append(clone);
      return clone;
    });

    let active = -1;
    function setActive(i) {
      if (i === active) return;
      active = i;
      steps.forEach((s, n) => {
        s.classList.toggle("is-active", n === i);
        s.classList.toggle("is-past", n < i);
        s.querySelector(".mk-scene").classList.toggle("is-active", n === i);
      });
      mirrored.forEach((m, n) => { m.classList.toggle("is-active", n === i); m.classList.toggle("is-past", n < i); });
      section.style.setProperty("--story-step", i);
    }

    // Active step = the one crossing the viewport's middle band.
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(steps.indexOf(e.target)); }), { rootMargin: "-45% 0px -45% 0px" });
      steps.forEach((s) => io.observe(s));
    } else steps.forEach((s) => s.classList.add("is-active"));

    // The rail between steps fills with reading progress.
    let ticking = false;
    function progress() {
      ticking = false;
      const r = list.getBoundingClientRect(), mid = window.innerHeight * 0.5;
      const p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
      list.style.setProperty("--story-progress", p.toFixed(3));
    }
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
    window.addEventListener("resize", progress);
    progress();
    // Start the first scene as the journey scrolls into view, not before.
    if ("IntersectionObserver" in window) {
      const enter = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting) && active < 0) { setActive(0); enter.disconnect(); } }, { threshold: 0.15 });
      enter.observe(list);
    }
  }

  window.RecalroMarketing = Object.assign(window.RecalroMarketing || {}, { ScrollStory });
})();
