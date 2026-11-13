/* ==========================================================================
   Recalro marketing page + authentication (demo) + bridge into the app.
   The signed-in application lives in app/*.js (namespace window.R).
   Marketing components: marketing/*.js · Signup wizard: auth/*.js
   ========================================================================== */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const marketing = $("#marketing"), app = $("#app");
const toast = (msg, opts) => window.R.toast(msg, opts);

/* Replace arrow glyphs in marketing copy with crisp inline SVG icons. */
function decorateArrows(root) {
  // Only touch text that actually contains an arrow (rewriting arrow-free text
  // nodes previously re-triggered an observer forever and froze the page).
  const hasArrow = (node) => /[↗→↑↓⌄]/.test(node.nodeValue) && !node.parentElement?.closest(".arrow-icon,input,textarea,script,style");
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) if (hasArrow(walker.currentNode)) nodes.push(walker.currentNode);
  const paths = { "↗": "M7 17 17 7M8 7h9v9", "→": "M4 10h12M11 5l5 5-5 5", "↑": "M10 16V4M5 9l5-5 5 5", "↓": "M10 4v12M5 11l5 5 5-5", "⌄": "m5 7 5 5 5-5" };
  nodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    node.nodeValue.split(/([↗→↑↓⌄])/).forEach((part) => {
      if (!part) return;
      if (paths[part]) {
        const icon = document.createElement("span");
        icon.className = "arrow-icon"; icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = `<svg viewBox="0 0 20 20"><path d="${paths[part]}"/></svg>`;
        fragment.append(icon);
      } else fragment.append(document.createTextNode(part));
    });
    node.replaceWith(fragment);
  });
}
decorateArrows(marketing);

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

/* ---------- Hero video: pause when hidden, off-screen tab, or reduced motion ---------- */
const heroVideo = $(".mk-hero-video"), heroMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
// The video (≈3.5 MB) and its poster load only on tablets and larger. Phones keep the CSS background.
const heroVideoMq = window.matchMedia("(min-width: 768px)");
function loadHeroVideo() {
  if (!heroVideo || heroVideo.src || !heroVideoMq.matches) return;
  heroVideo.poster = heroVideo.dataset.poster;
  heroVideo.src = heroVideo.dataset.src;
  heroVideo.preload = "metadata";
}
loadHeroVideo();
heroVideoMq.addEventListener("change", () => { loadHeroVideo(); updateHeroMotion(); });
function updateHeroMotion() {
  if (!heroVideo || !heroVideo.src) return;
  if (heroMotionPreference.matches || marketing.classList.contains("hidden") || document.visibilityState !== "visible") heroVideo.pause();
  else if (heroVideo.paused) heroVideo.play().catch((error) => { if (error.name !== "AbortError") console.error("Unable to play hero video:", error); });
}
updateHeroMotion();
heroMotionPreference.addEventListener("change", updateHeroMotion);
document.addEventListener("visibilitychange", updateHeroMotion);

/* ---------- Page canvas ----------
   The root background shows during iOS rubber-band scrolling and before content paints.
   Keep it matched to what's on screen: the hero colour near the top of the marketing page,
   the footer colour near the bottom, and the active screen's background elsewhere. */
const themeMeta = document.querySelector('meta[name="theme-color"]');
let canvasColor = "";
function setCanvas(color) {
  if (!color || color === canvasColor) return;
  canvasColor = color;
  document.documentElement.style.backgroundColor = color;
  themeMeta?.setAttribute("content", color);
}
function syncCanvas() {
  if (!marketing.classList.contains("hidden")) {
    const past = window.scrollY > (document.documentElement.scrollHeight - window.innerHeight) / 2;
    setCanvas(past ? getComputedStyle($(".mk-footer")).backgroundColor : "#0F1619");
  } else {
    const screen = !$("#auth").classList.contains("hidden") ? $("#auth") : document.body;
    setCanvas(getComputedStyle(screen).backgroundColor);
  }
}
let canvasTick = false;
window.addEventListener("scroll", () => { if (!canvasTick) { canvasTick = true; requestAnimationFrame(() => { canvasTick = false; syncCanvas(); }); } }, { passive: true });
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => setTimeout(syncCanvas, 50));
window.R.on?.("theme", () => setTimeout(syncCanvas, 50));

/* ---------- Screens ---------- */
function openApp(page = "dashboard") {
  marketing.classList.add("hidden"); $("#auth").classList.add("hidden");
  updateHeroMotion();
  window.R.openApp(page);
  window.scrollTo(0, 0);
  syncCanvas();
}
function goLanding() {
  window.R.closeApp();
  app.classList.add("hidden"); $("#auth").classList.add("hidden"); marketing.classList.remove("hidden");
  window.R.applyTheme();
  updateHeroMotion(); window.scrollTo(0, 0);
  nav?.refresh(); syncCanvas();
}

/* ---------- Authentication UI (demo) ----------
   Front-end only: no account service is connected. A signed-in "session" is just the
   person's name and email kept in this browser. Passwords are never stored.
   Log in and password reset use the form below; sign up is the SignupWizard. */
const SESSION_KEY = "recalro-demo-session";
const authScreen = $("#auth"), authForm = $("#authForm"), authCard = $(".au-card"), wizardEl = $("#signupWizard");
const authCopy = {
  login: { title: "Welcome back", subtitle: "Log in to pick up where you left off.", submit: "Log in", switchText: "New to Recalro?", switchLabel: "Create an account", switchTo: "signup" },
  forgot: { title: "Reset your password", subtitle: "Enter the email you signed up with and we'll send you a reset link.", submit: "Send reset link", switchText: "Remembered it?", switchLabel: "Back to log in", switchTo: "login" },
};
function readSession() {
  for (const store of [localStorage, sessionStorage]) {
    try { const raw = store.getItem(SESSION_KEY); if (raw) { const user = JSON.parse(raw); if (user && user.name) return user; } }
    catch (error) { console.error("Could not read the demo session.", error); }
  }
  return null;
}
function writeSession(user, remember) {
  clearSession();
  try { (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(user)); }
  catch (error) { console.error("Could not save the demo session.", error); }
}
function clearSession() { [localStorage, sessionStorage].forEach((store) => { try { store.removeItem(SESSION_KEY); } catch (error) { console.error("Could not clear the demo session.", error); } }); }
function nameFromEmail(email) { return email.split("@")[0].split(/[._-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ") || "Learner"; }
function signOut() { clearSession(); goLanding(); toast("You've been signed out.", { icon: "logout" }); }
// Used by the app shell for the user's name, email and sign-out.
window.RecalroAuth = { currentUser: readSession, signOut };

function setAuthMode(mode) {
  authScreen.dataset.mode = mode;
  $$(".au-tabs [role=tab]").forEach((tab) => { const selected = tab.dataset.authMode === mode; tab.setAttribute("aria-selected", String(selected)); tab.tabIndex = selected ? 0 : -1; });
  const signup = mode === "signup";
  $(".au-head").hidden = signup; $("#authFormView").hidden = signup; $("#authResetSent").hidden = true;
  wizardEl.hidden = !signup;
  authCard.classList.toggle("au-card-wide", signup);
  authCard.classList.remove("is-switching"); void authCard.offsetWidth; authCard.classList.add("is-switching");
  if (signup) { window.RecalroSignup.show(); return; }
  delete authScreen.dataset.wizardStep;
  const copy = authCopy[mode];
  authForm.dataset.mode = mode;
  $$("[data-modes]", authScreen).forEach((el) => {
    const visible = el.dataset.modes.split(" ").includes(mode);
    el.hidden = !visible;
    $$("input", el).forEach((input) => (input.disabled = !visible)); // hidden fields never block validation
  });
  $("#authTitle").textContent = copy.title;
  $("#authSubtitle").textContent = copy.subtitle;
  $(".au-submit-label", authForm).textContent = copy.submit;
  $("#authSwitch").innerHTML = `${copy.switchText} <button type="button" class="au-link" data-auth-mode="${copy.switchTo}">${copy.switchLabel}</button>`;
  clearAuthErrors(); setAuthBusy(false);
}
function openAuth(mode = "login", next = "dashboard") {
  if (readSession()) { openApp(next); return; }
  authScreen.dataset.nextRoute = next;
  if (productDemoDialog.open) productDemoDialog.close();
  marketing.classList.add("hidden"); app.classList.add("hidden"); authScreen.classList.remove("hidden");
  updateHeroMotion(); window.scrollTo(0, 0); setAuthMode(mode); syncCanvas();
  if (mode !== "signup") $("#authEmail").focus({ preventScroll: true });
}
function setFieldError(input, message) {
  const error = $("#" + input.id + "Error");
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (error) error.textContent = message || "";
}
function clearAuthErrors() { $$("input", authForm).forEach((input) => setFieldError(input, "")); }
function setAuthBusy(busy) { const submit = $("#authSubmit"); submit.setAttribute("aria-busy", String(busy)); submit.disabled = busy; }
function validateAuth(mode) {
  clearAuthErrors();
  const email = $("#authEmail"), password = $("#authPassword"), invalid = [];
  const fail = (input, message) => { setFieldError(input, message); invalid.push(input); };
  const emailValue = email.value.trim();
  if (!emailValue) fail(email, "Enter your email address.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue)) fail(email, "Enter a valid email address, like you@example.com.");
  if (mode === "login" && !password.value) fail(password, "Enter your password.");
  if (invalid.length) invalid[0].focus();
  return !invalid.length;
}
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const mode = authForm.dataset.mode;
  if ($("#authSubmit").getAttribute("aria-busy") === "true" || !validateAuth(mode)) return;
  setAuthBusy(true);
  try {
    await new Promise((resolve) => setTimeout(resolve, 700)); // stand-in for a network request
    const email = $("#authEmail").value.trim();
    if (mode === "forgot") {
      $("#authResetMessage").textContent = `If an account exists for ${email}, a reset link would be sent there. This demo doesn't send email yet.`;
      $("#authFormView").hidden = true; $("#authResetSent").hidden = false; $("#authResetSent").focus();
      return;
    }
    const name = nameFromEmail(email);
    writeSession({ name, email }, $("#authRemember").checked);
    authForm.reset();
    openApp(authScreen.dataset.nextRoute || "dashboard");
    const first = (window.R.state.profile.displayName || name).split(" ")[0];
    toast(`Welcome back, ${first}.`, { icon: "sparkles" });
  } catch (error) {
    console.error("Demo sign-in failed.", error);
    toast("Something went wrong. Please try again.", { icon: "info" });
  } finally {
    setAuthBusy(false);
  }
});
authForm.addEventListener("input", (event) => { if (event.target.getAttribute("aria-invalid") === "true") setFieldError(event.target, ""); });
authScreen.addEventListener("click", (event) => {
  const modeButton = event.target.closest("[data-auth-mode]");
  if (!modeButton) return;
  setAuthMode(modeButton.dataset.authMode);
  if (modeButton.dataset.authMode !== "signup") $("#authEmail").focus();
});
$(".au-tabs").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const next = authScreen.dataset.mode === "signup" ? "login" : "signup";
  setAuthMode(next); $(`.au-tabs [data-auth-mode="${next}"]`).focus();
});
$("#authTogglePassword").addEventListener("click", (event) => {
  const input = $("#authPassword"), show = input.type === "password";
  input.type = show ? "text" : "password";
  event.currentTarget.setAttribute("aria-pressed", String(show));
  event.currentTarget.setAttribute("aria-label", show ? "Hide password" : "Show password");
});
$("#authGoogle").addEventListener("click", () => toast("Google sign-in isn't connected in this prototype yet. Use email instead.", { icon: "info" }));
$("#authBack").addEventListener("click", goLanding);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented || authScreen.classList.contains("hidden")) return;
  if (document.querySelector("dialog[open]") || $("#authSubmit").disabled) return;
  // Never throw away a signup in progress; "Back to home" keeps it for this session anyway.
  if (authScreen.dataset.mode === "signup" && window.RecalroSignup.dirty) return;
  goLanding();
});

/* SignupWizard: completing it signs the visitor in (demo session) and applies their choices. */
window.RecalroSignup.init(wizardEl, {
  journey: $("#authJourney"),
  onStep: (n) => { authScreen.dataset.wizardStep = String(n); },
  onComplete(profile) {
    writeSession({ name: profile.name, email: profile.email }, true);
    openApp(authScreen.dataset.nextRoute || "dashboard");
    window.R.update((st) => {
      st.profile.displayName = profile.name;
      st.profile.onboarding = profile.onboarding;
      if (profile.onboarding.minutes) st.settings.dailyGoal = profile.onboarding.minutes;
    });
    toast(`Welcome to Recalro, ${profile.name.split(" ")[0]}! This is a demo account.`, { icon: "sparkles" });
  },
});

/* ---------- Marketing page ---------- */
const productDemoDialog = $("#productDemoDialog");
const M = window.RecalroMotion, MK = window.RecalroMarketing;
const nav = MK.MarketingNavbar($("#mkNavWrap"), {
  onLogin: () => openAuth("login"),
  onSignup: () => openAuth("signup"),
  onDemo: () => setTimeout(() => $("#heroCard")?.focus({ preventScroll: true }), M.reduced() ? 0 : 500),
});
M.AnimatedHeadline($("[data-animate-headline]"));
M.StaggerContainer(marketing);
M.RevealOnScroll(marketing);
MK.ScrollStory($("#how"));
MK.FeatureTheatre($("#featureTheatre"));

["heroStart", "storyStart"].forEach((id) => $("#" + id)?.addEventListener("click", () => openAuth("signup")));
$(".mk-dialog-close").addEventListener("click", () => productDemoDialog.close());
$("#heroTour")?.addEventListener("click", () => productDemoDialog.showModal());
productDemoDialog.addEventListener("click", (event) => { if (event.target === productDemoDialog) productDemoDialog.close(); });
$("#productDemoStart").addEventListener("click", () => { productDemoDialog.close(); openAuth("signup"); });
const roadmapShortcut = $(".mk-roadmap-card");
if (roadmapShortcut) { roadmapShortcut.setAttribute("role", "button"); roadmapShortcut.setAttribute("tabindex", "0"); roadmapShortcut.setAttribute("aria-label", "Continue to the Thermodynamics learning roadmap"); }
marketing.addEventListener("click", (event) => {
  const appLink = event.target.closest("[data-open-app]");
  if (appLink) { openAuth("login", appLink.dataset.page || "dashboard"); return; }
  if (event.target.closest(".mk-roadmap-card")) { openAuth("login", "roadmap"); return; }
  // In-page anchors outside the navbar (footer, scroll cue, skip link) scroll smoothly too.
  const anchor = event.target.closest('a[href^="#"]:not([data-nav-target])');
  if (anchor && anchor.getAttribute("href").length > 1 && !anchor.getAttribute("href").startsWith("#/")) {
    const target = $(anchor.getAttribute("href"));
    if (target) {
      event.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: M.reduced() ? "auto" : "smooth" });
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }
});
marketing.addEventListener("keydown", (event) => { if ((event.key === "Enter" || event.key === " ") && event.target.closest(".mk-roadmap-card")) { event.preventDefault(); openAuth("login", "roadmap"); } });
const footerGroups = $$(".mk-footer-group"), footerBreakpoint = window.matchMedia("(max-width: 600px)");
function setFooterGroupState(event) { footerGroups.forEach((group) => { group.open = !event.matches; }); }
setFooterGroupState(footerBreakpoint);
footerBreakpoint.addEventListener("change", setFooterGroupState);
footerGroups.forEach((group) => group.querySelector("summary").addEventListener("click", (event) => { if (!footerBreakpoint.matches) event.preventDefault(); }));
$("#newsletterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = $("#newsletterEmail"), status = $("#newsletterStatus");
  status.textContent = "";
  email.setAttribute("aria-invalid", "false");
  if (!email.checkValidity()) { email.setAttribute("aria-invalid", "true"); status.textContent = "Enter a valid email address."; email.reportValidity(); return; }
  status.textContent = "Newsletter sign-up is unavailable because no subscription service is connected. Your email has not been sent or saved.";
});

/* ---------- InteractiveFlashcardPreview (hero): a playable 3-card review ----------
   Question → flip → answer → rating → XP reward → progress → AI tutor feedback.
   Uses real sample cards from the app. Nothing here is saved. */
(function heroLiveDemo() {
  const card = $("#heroCard"), actions = $("#heroActions");
  if (!card || !window.R) return;
  const deck = ["th-8", "fl-5", "ma-1"].map((id) => window.R.content.cards.find((c) => c.id === id)).filter(Boolean);
  const XP = { Again: 4, Hard: 7, Good: 10, Easy: 10 };
  const NEXT = { Again: "10 min", Hard: "1 day", Good: "1 day", Easy: "2 days" };
  const TUTOR = {
    Again: (c) => `No worries. Want a worked example on ${c.module.includes("thermo") ? "Brayton cycles" : c.subject === "fluids" ? "Bernoulli's equation" : "complex numbers"}? It'll come back in 10 minutes.`,
    Hard: () => "That took effort, which is exactly what makes it stick. I'll bring it back sooner.",
    Good: () => "Nice recall! I'll schedule that one for tomorrow.",
    Easy: () => "Too easy? I'll wait longer before showing it again.",
  };
  const esc = window.R.esc;
  let index = 0, flipped = false, xp = 240, earned = 0, tutorTimer = 0;
  const xpEl = $("#heroXp"), barEl = $("#heroXpBar"), streakEl = $("#heroStreak"), tutor = $("#heroTutorText");
  const setXp = (from) => { from == null ? (xpEl.textContent = xp) : M.AnimatedCounter(xpEl, { from, to: xp, dur: 600 }); barEl.style.width = `${Math.min(100, ((xp - 100) / 200) * 100)}%`; };
  const bump = (el) => { const chip = el.closest(".mk-hud-chip"); chip.classList.remove("is-bump"); void chip.offsetWidth; chip.classList.add("is-bump"); };
  // The tutor "types" briefly before replying, so feedback reads as a response to the rating.
  const say = (text) => {
    clearTimeout(tutorTimer);
    if (M.reduced()) { tutor.textContent = text; return; }
    tutor.innerHTML = `<span class="mk-tutor-typing" aria-hidden="true"><i></i><i></i><i></i></span>`;
    tutorTimer = setTimeout(() => { tutor.textContent = text; }, 650);
  };
  const show = () => {
    const c = deck[index], subject = window.R.content.subjects.find((s) => s.id === c.subject);
    flipped = false; card.classList.remove("is-flipped"); card.hidden = false;
    $("#heroDeck").textContent = subject.name;
    $("#heroCount").textContent = `Card ${index + 1} of ${deck.length}`;
    $("#heroProgress").style.width = `${(index / deck.length) * 100}%`;
    card.querySelector(".mk-hcard-front").innerHTML = `<small>Question</small><b>${esc(c.front)}</b><em>Tap the card or press Reveal</em>`;
    card.querySelector(".mk-hcard-back").innerHTML = `<small>Answer</small><b>${esc(c.back)}</b><em>How well did you remember it?</em>`;
    card.setAttribute("aria-label", `Flashcard question: ${c.front}. Activate to reveal the answer.`);
    actions.innerHTML = `<button type="button" class="mk-reveal-btn" data-hero="reveal">Reveal answer</button>`;
  };
  const reveal = () => {
    if (flipped) return;
    flipped = true; card.classList.add("is-flipped");
    card.setAttribute("aria-label", `Answer: ${deck[index].back}`);
    actions.innerHTML = `<div class="mk-rate-row" role="group" aria-label="Rate your recall">${["Again", "Hard", "Good", "Easy"].map((r) => `<button type="button" class="mk-rate mk-rate-${r.toLowerCase()}" data-hero="rate" data-rate="${r}">${r}<small>${NEXT[r]}</small></button>`).join("")}</div>`;
    actions.querySelector(".mk-rate")?.focus({ preventScroll: true });
  };
  const rate = (rating) => {
    const c = deck[index], gain = XP[rating], before = xp;
    xp += gain; earned += gain; setXp(before); bump(xpEl);
    const float = document.createElement("span");
    float.className = "mk-xp-float"; float.textContent = `+${gain} XP`;
    $(".mk-live-window").append(float); setTimeout(() => float.remove(), 1200);
    say(TUTOR[rating](c));
    index++;
    if (index < deck.length) { show(); card.focus({ preventScroll: true }); return; }
    // Session complete: the streak ticks up and the visitor is invited to keep going.
    $("#heroProgress").style.width = "100%";
    $("#heroCount").textContent = "Session complete";
    streakEl.textContent = Number(streakEl.textContent) + 1; bump(streakEl);
    card.hidden = true;
    actions.innerHTML = `<div class="mk-live-done"><span class="mk-done-badge" aria-hidden="true">✓</span><h3>+${earned} XP · streak extended</h3><p>That's how every session feels in Recalro. Create a free account to keep your progress.</p><button type="button" class="mk-btn mk-btn-primary" data-hero="signup">Keep my progress <span>↗</span></button><button type="button" class="mk-replay" data-hero="replay">Play again</button></div>`;
    decorateArrows(actions);
    actions.querySelector("[data-hero=signup]").focus({ preventScroll: true });
    say("Great session. Tomorrow I'll show you exactly what's due.");
  };
  card.addEventListener("click", () => (flipped ? (card.classList.toggle("is-flipped")) : reveal()));
  actions.addEventListener("click", (event) => {
    const b = event.target.closest("[data-hero]"); if (!b) return;
    if (b.dataset.hero === "reveal") reveal();
    if (b.dataset.hero === "rate") rate(b.dataset.rate);
    if (b.dataset.hero === "signup") openAuth("signup");
    if (b.dataset.hero === "replay") { index = 0; earned = 0; xp = 240; streakEl.textContent = "4"; setXp(); clearTimeout(tutorTimer); tutor.textContent = "Stuck? I can walk you through it step by step."; show(); card.focus(); }
  });
  setXp(); show();
})();

/* ---------- Deep links: #/app/... opens the app (or asks to log in first) ---------- */
function routeFromHash() {
  const ctx = window.R.parseRoute();
  if (!ctx) return;
  const target = ctx.path + (location.hash.includes("?") ? "?" + location.hash.split("?")[1] : "");
  if (readSession()) { if (app.classList.contains("hidden")) openApp(target); }
  else openAuth("login", target);
}
window.addEventListener("hashchange", () => { if (app.classList.contains("hidden")) routeFromHash(); });
routeFromHash();
syncCanvas();
