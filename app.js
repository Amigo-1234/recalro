/* ==========================================================================
   Recalro marketing page + authentication (demo) + bridge into the app.
   The signed-in application lives in app/*.js (namespace window.R).
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
function updateHeroMotion() {
  if (!heroVideo) return;
  if (heroMotionPreference.matches || marketing.classList.contains("hidden") || document.visibilityState !== "visible") heroVideo.pause();
  else if (heroVideo.paused) heroVideo.play().catch((error) => { if (error.name !== "AbortError") console.error("Unable to play hero video:", error); });
}
updateHeroMotion();
heroMotionPreference.addEventListener("change", updateHeroMotion);
document.addEventListener("visibilitychange", updateHeroMotion);

/* ---------- Screens ---------- */
function openApp(page = "dashboard") {
  marketing.classList.add("hidden"); $("#auth").classList.add("hidden");
  updateHeroMotion();
  window.R.openApp(page);
  window.scrollTo(0, 0);
}
function goLanding() {
  window.R.closeApp();
  app.classList.add("hidden"); $("#auth").classList.add("hidden"); marketing.classList.remove("hidden");
  window.R.applyTheme();
  updateHeroMotion(); window.scrollTo(0, 0);
}

/* ---------- Authentication UI (demo) ----------
   Front-end only: no account service is connected. A signed-in "session" is just the
   person's name and email kept in this browser. Passwords are never stored. */
const SESSION_KEY = "recalro-demo-session";
const authScreen = $("#auth"), authForm = $("#authForm"), authCard = $(".au-card");
const authCopy = {
  login: { title: "Welcome back", subtitle: "Log in to pick up where you left off.", submit: "Log in", switchText: "New to Recalro?", switchLabel: "Create an account", switchTo: "signup" },
  signup: { title: "Create your account", subtitle: "Start learning free. It only takes a minute.", submit: "Create account", switchText: "Already have an account?", switchLabel: "Log in", switchTo: "login" },
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
  const copy = authCopy[mode];
  authScreen.dataset.mode = mode; authForm.dataset.mode = mode;
  $$("[data-modes]", authScreen).forEach((el) => {
    const visible = el.dataset.modes.split(" ").includes(mode);
    el.hidden = !visible;
    $$("input", el).forEach((input) => (input.disabled = !visible)); // hidden fields never block validation
  });
  $$(".au-tabs [role=tab]").forEach((tab) => { const selected = tab.dataset.authMode === mode; tab.setAttribute("aria-selected", String(selected)); tab.tabIndex = selected ? 0 : -1; });
  $("#authTitle").textContent = copy.title;
  $("#authSubtitle").textContent = copy.subtitle;
  $(".au-submit-label", authForm).textContent = copy.submit;
  $("#authSwitch").innerHTML = `${copy.switchText} <button type="button" class="au-link" data-auth-mode="${copy.switchTo}">${copy.switchLabel}</button>`;
  $("#authPassword").autocomplete = mode === "signup" ? "new-password" : "current-password";
  $("#authPassword").placeholder = mode === "signup" ? "Create a password" : "Enter your password";
  $("#authFormView").hidden = false; $("#authResetSent").hidden = true;
  clearAuthErrors(); setAuthBusy(false);
  authCard.classList.remove("is-switching"); void authCard.offsetWidth; authCard.classList.add("is-switching");
}
function openAuth(mode = "login", next = "dashboard") {
  if (readSession()) { openApp(next); return; }
  authScreen.dataset.nextRoute = next;
  if (productDemoDialog.open) productDemoDialog.close();
  marketing.classList.add("hidden"); app.classList.add("hidden"); authScreen.classList.remove("hidden");
  updateHeroMotion(); setAuthMode(mode); window.scrollTo(0, 0);
  $(mode === "signup" ? "#authName" : "#authEmail").focus({ preventScroll: true });
}
function setFieldError(input, message) {
  const error = $("#" + input.id + "Error");
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (error) error.textContent = message || "";
}
function clearAuthErrors() { $$("input", authForm).forEach((input) => setFieldError(input, "")); }
function setAuthBusy(busy) { const submit = $("#authSubmit"); submit.setAttribute("aria-busy", String(busy)); submit.disabled = busy; }
function passwordScore(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 14) score++;
  return Math.max(1, score);
}
function updateStrength() {
  const value = $("#authPassword").value, meter = $(".au-strength"), score = passwordScore(value);
  meter.dataset.score = String(score);
  $("#authStrengthLabel").textContent = value ? `Password strength: ${["", "Weak", "Fair", "Good", "Strong"][score]}` : "Use 8+ characters with a letter and a number.";
}
function validateAuth(mode) {
  clearAuthErrors();
  const name = $("#authName"), email = $("#authEmail"), password = $("#authPassword"), terms = $("#authTerms");
  const invalid = [];
  const fail = (input, message) => { setFieldError(input, message); invalid.push(input); };
  if (mode === "signup" && name.value.trim().length < 2) fail(name, "Enter your full name.");
  const emailValue = email.value.trim();
  if (!emailValue) fail(email, "Enter your email address.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue)) fail(email, "Enter a valid email address, like you@example.com.");
  if (mode === "login" && !password.value) fail(password, "Enter your password.");
  if (mode === "signup") {
    if (password.value.length < 8 || !/[A-Za-z]/.test(password.value) || !/\d/.test(password.value)) fail(password, "Use at least 8 characters, including a letter and a number.");
    if (!terms.checked) fail(terms, "Please accept the terms to continue.");
  }
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
    const name = mode === "signup" ? $("#authName").value.trim().replace(/\s+/g, " ") : nameFromEmail(email);
    writeSession({ name, email }, mode === "signup" || $("#authRemember").checked);
    authForm.reset(); updateStrength();
    openApp(authScreen.dataset.nextRoute || "dashboard");
    const first = (window.R.state.profile.displayName || name).split(" ")[0];
    toast(mode === "signup" ? `Welcome to Recalro, ${first}! This is a demo account.` : `Welcome back, ${first}.`, { icon: "sparkles" });
  } catch (error) {
    console.error("Demo sign-in failed.", error);
    toast("Something went wrong. Please try again.", { icon: "info" });
  } finally {
    setAuthBusy(false);
  }
});
authForm.addEventListener("input", (event) => {
  if (event.target.id === "authPassword" && authForm.dataset.mode === "signup") updateStrength();
  if (event.target.getAttribute("aria-invalid") === "true") setFieldError(event.target, "");
});
authForm.addEventListener("change", (event) => { if (event.target.id === "authTerms" && event.target.checked) setFieldError(event.target, ""); });
authScreen.addEventListener("click", (event) => {
  const modeButton = event.target.closest("[data-auth-mode]");
  if (modeButton) { setAuthMode(modeButton.dataset.authMode); (modeButton.dataset.authMode === "signup" ? $("#authName") : $("#authEmail")).focus(); }
});
$(".au-tabs").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const next = authForm.dataset.mode === "signup" ? "login" : "signup";
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
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !authScreen.classList.contains("hidden") && !$("#authSubmit").disabled) goLanding(); });

/* ---------- Marketing page ---------- */
["navStart", "heroStart", "storyStart"].forEach((id) => $("#" + id)?.addEventListener("click", () => openAuth("signup")));
const productDemoDialog = $("#productDemoDialog");
$(".mk-dialog-close").addEventListener("click", () => productDemoDialog.close());
$("#heroTour")?.addEventListener("click", () => productDemoDialog.showModal());
productDemoDialog.addEventListener("click", (event) => { if (event.target === productDemoDialog) productDemoDialog.close(); });
$("#productDemoStart").addEventListener("click", () => { productDemoDialog.close(); openAuth("signup"); });
$("#navLogin")?.addEventListener("click", () => openAuth("login"));
const roadmapShortcut = $(".mk-roadmap-card");
if (roadmapShortcut) { roadmapShortcut.setAttribute("role", "button"); roadmapShortcut.setAttribute("tabindex", "0"); roadmapShortcut.setAttribute("aria-label", "Continue to the Thermodynamics learning roadmap"); }
marketing.addEventListener("click", (event) => {
  const appLink = event.target.closest("[data-open-app]");
  if (appLink) { openAuth("login", appLink.dataset.page || "dashboard"); return; }
  if (event.target.closest(".mk-roadmap-card")) { openAuth("login", "roadmap"); return; }
  if (event.target.closest(".mk-links a")) { $("#mobileNavPanel").classList.remove("open"); $("#mobileMenu").setAttribute("aria-expanded", "false"); }
});
marketing.addEventListener("keydown", (event) => { if ((event.key === "Enter" || event.key === " ") && event.target.closest(".mk-roadmap-card")) { event.preventDefault(); openAuth("login", "roadmap"); } });
document.addEventListener("click", (event) => { if (!event.target.closest(".mk-nav")) { $("#mobileNavPanel").classList.remove("open"); $("#mobileMenu").setAttribute("aria-expanded", "false"); } });
$("#mobileMenu").addEventListener("click", (event) => {
  const open = $("#mobileNavPanel").classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
  event.currentTarget.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});
const footerGroups = $$(".mk-footer-group"), footerBreakpoint = window.matchMedia("(max-width: 600px)");
function setFooterGroupState(event) { footerGroups.forEach((group) => { group.open = !event.matches; }); }
setFooterGroupState(footerBreakpoint);
footerBreakpoint.addEventListener("change", setFooterGroupState);
footerGroups.forEach((group) => group.querySelector("summary").addEventListener("click", (event) => { if (!footerBreakpoint.matches) event.preventDefault(); }));
const mkNavWrap = $("#mkNavWrap");
function updateNavState() { mkNavWrap?.classList.toggle("is-scrolled", window.scrollY > 8); }
updateNavState();
window.addEventListener("scroll", updateNavState, { passive: true });
if ("IntersectionObserver" in window && !heroMotionPreference.matches) {
  marketing.classList.add("mk-js");
  const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add("is-visible"); revealObserver.unobserve(entry.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  $$(".mk-reveal", marketing).forEach((el) => revealObserver.observe(el));
} else $$(".mk-reveal", marketing).forEach((el) => el.classList.add("is-visible"));
$("#newsletterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = $("#newsletterEmail"), status = $("#newsletterStatus");
  status.textContent = "";
  email.setAttribute("aria-invalid", "false");
  if (!email.checkValidity()) { email.setAttribute("aria-invalid", "true"); status.textContent = "Enter a valid email address."; email.reportValidity(); return; }
  status.textContent = "Newsletter sign-up is unavailable because no subscription service is connected. Your email has not been sent or saved.";
});

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
