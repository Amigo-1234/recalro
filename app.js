/* ==========================================================================
   Recalro marketing page + Supabase authentication + bridge into the app.
   The signed-in application lives in app/*.js (namespace window.R).
   Marketing components: marketing/*.js · Signup wizard: auth/*.js
   ========================================================================== */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const marketing = $("#marketing"), app = $("#app");
const workspaceBoot = $("#workspaceBoot");
function clearWorkspaceBoot() {
  document.documentElement.classList.remove("workspace-booting");
  workspaceBoot?.remove();
}
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

/* ---------- Hero background video: pause when hidden or reduced motion ---------- */
const heroVideo = $(".mk-hero-video"), heroMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
function loadHeroVideo() {
  if (!heroVideo || heroVideo.src) return;
  heroVideo.poster = heroVideo.dataset.poster;
  heroVideo.src = heroVideo.dataset.src;
  heroVideo.preload = "metadata";
}
loadHeroVideo();
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
  clearWorkspaceBoot();
  window.scrollTo(0, 0);
  syncCanvas();
}
function goLanding() {
  window.R.closeApp();
  app.classList.add("hidden"); $("#auth").classList.add("hidden"); marketing.classList.remove("hidden");
  clearWorkspaceBoot();
  window.R.applyTheme();
  updateHeroMotion(); window.scrollTo(0, 0);
  nav?.refresh(); syncCanvas();
}

/* ---------- Supabase authentication ---------- */
const authScreen = $("#auth"), authForm = $("#authForm"), authCard = $(".au-card"), wizardEl = $("#signupWizard");
const authCopy = {
  login: { title: "Welcome back", subtitle: "Log in to pick up where you left off.", submit: "Log in", switchText: "New to Recalro?", switchLabel: "Create an account", switchTo: "signup" },
  forgot: { title: "Reset your password", subtitle: "Enter your email and we'll send you a reset link.", submit: "Send reset link", switchText: "Remembered it?", switchLabel: "Back to log in", switchTo: "login" },
  recover: { title: "Choose a new password", subtitle: "Set a new password for your Recalro account.", submit: "Save new password", switchText: "Changed your mind?", switchLabel: "Back to log in", switchTo: "login" },
};
let supabaseClient = null, supabaseSession = null, authInitError = null;
function nameFromEmail(email) { return email.split("@")[0].split(/[._-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ") || "Learner"; }
const authReady = (async () => {
  const client = await window.RecalroSupabase?.ready;
  if (!client) return null;
  supabaseClient = client;
  client.auth.onAuthStateChange((_event, session) => { supabaseSession = session; });
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  supabaseSession = data.session;
  return supabaseSession;
})().catch((error) => { authInitError = error; console.error("Recalro: Supabase could not initialize.", error); return null; });
async function authClient() {
  await authReady;
  if (supabaseClient) return supabaseClient;
  throw authInitError || new Error("Supabase authentication is unavailable. Check the project settings and reload.");
}
function authUser() {
  const user = supabaseSession?.user;
  if (!user) return null;
  return { id:user.id, email:user.email || "", name:user.user_metadata?.full_name || user.user_metadata?.name || nameFromEmail(user.email || ""), raw:user };
}
async function ensureProfile() {
  const client = await authClient(), user = authUser();
  if (!user?.id) return null;
  const { data, error } = await client.from("profiles").select("id, display_name, username, onboarding").eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (data) {
    const onboarding = { ...(data.onboarding || {}), username:data.username || data.onboarding?.username || null };
    if (String(data.display_name || "").trim()) return { ...data, onboarding };
    return saveProfile({ name:user.name, username:data.username || null, email:user.email, onboarding });
  }
  const meta = user.raw.user_metadata || {};
  return saveProfile({ name:meta.full_name || user.name, username:meta.username || null, email:user.email, onboarding:meta.onboarding || {} });
}
async function saveProfile(profile) {
  const client = await authClient(), user = authUser();
  if (!user?.id) throw new Error("Verify your email and sign in before saving your profile.");
  const { data, error } = await client.from("profiles").upsert({
    id:user.id, display_name:profile.name, username:profile.username || null, onboarding:profile.onboarding || {}, updated_at:new Date().toISOString(),
  }, { onConflict:"id" }).select("id, display_name, username, onboarding").single();
  if (error) throw error;
  return data;
}
const RecalroAuth = {
  ready:authReady,
  configured:() => !!window.RecalroSupabase?.configured,
  currentUser:() => { const user = authUser(); return user ? { id:user.id, name:user.name, email:user.email } : null; },
  accessToken:() => supabaseSession?.access_token || null,
  async signIn(email, password) {
    const client = await authClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    supabaseSession = data.session;
    return { user:data.user, session:data.session };
  },
  async signUp(profile, password) {
    const client = await authClient();
    const username = String(profile.username || "").trim().toLowerCase();
    if (username) {
      const { data: available, error: availabilityError } = await client.rpc("username_available", { candidate:username });
      if (availabilityError) throw availabilityError;
      if (!available) throw new Error("That username is already taken. Please choose another.");
    }
    const redirectTo = `${location.origin}${location.pathname}?auth=confirm`;
    const { data, error } = await client.auth.signUp({
      email:profile.email, password,
      options:{ emailRedirectTo:redirectTo, data:{ full_name:profile.name || "", username:username || null, onboarding:profile.onboarding } },
    });
    if (error) throw error;
    supabaseSession = data.session;
    return { configured:true, user:data.user, session:data.session, confirmationPending:!data.session };
  },
  async resendConfirmation(email) {
    const client = await authClient();
    const emailRedirectTo = `${location.origin}${location.pathname}?auth=confirm`;
    const { error } = await client.auth.resend({ type:"signup", email, options:{ emailRedirectTo } });
    if (error) throw error;
    return true;
  },
  async resetPassword(email) {
    const client = await authClient();
    const redirectTo = `${location.origin}${location.pathname}?auth=recovery`;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return true;
  },
  async updatePassword(password) {
    const client = await authClient();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  },
  async updateProfile(profile) {
    const user = authUser();
    if (!user?.id) throw new Error("Sign in before updating your profile.");
    const username = String(profile.username || "").trim().toLowerCase();
    const currentUsername = String(window.R?.state?.profile?.onboarding?.username || user.raw.user_metadata?.username || "").trim().toLowerCase();
    if (username && username !== currentUsername) {
      const client = await authClient();
      const { data: available, error } = await client.rpc("username_available", { candidate:username });
      if (error) throw error;
      if (!available) throw new Error("That username is already taken. Please choose another.");
    }
    const onboarding = { ...(profile.onboarding || {}), username:username || null };
    return saveProfile({ ...profile, username:username || null, onboarding });
  },
  ensureProfile,
  saveProfile,
  async signOut() {
    try {
      const client = await authClient();
      await window.RecalroCloudSync?.deactivate();
      const { error } = await client.auth.signOut();
      if (error) throw error;
      supabaseSession = null;
      goLanding(); toast("You've been signed out.", { icon:"logout" });
    } catch (error) { toast(error.message || "Could not sign out. Please try again.", { icon:"info" }); }
  },
};
window.RecalroAuth = RecalroAuth;
function readSession() { return RecalroAuth.currentUser(); }
function signOut() { return RecalroAuth.signOut(); }
function setAuthMode(mode) {
  authScreen.dataset.mode = mode;
  const selectedMode = mode === "signup" ? "signup" : "login";
  $$(".au-tabs [role=tab]").forEach((tab) => { const selected = tab.dataset.authMode === selectedMode; tab.setAttribute("aria-selected", String(selected)); tab.tabIndex = selected ? 0 : -1; });
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
  $("#authPassword").autocomplete = mode === "recover" ? "new-password" : "current-password";
  $(".au-submit-label", authForm).textContent = copy.submit;
  $("#authSwitch").innerHTML = `${copy.switchText} <button type="button" class="au-link" data-auth-mode="${copy.switchTo}">${copy.switchLabel}</button>`;
  clearAuthErrors(); setAuthBusy(false);
}
function openAuth(mode = "login", next = "dashboard") {
  if (mode !== "recover" && readSession()) { openApp(next); return; }
  authScreen.dataset.nextRoute = next;
  marketing.classList.add("hidden"); app.classList.add("hidden"); authScreen.classList.remove("hidden");
  clearWorkspaceBoot();
  updateHeroMotion(); window.scrollTo(0, 0); setAuthMode(mode); syncCanvas();
  if (mode === "recover") $("#authPassword").focus({ preventScroll: true });
  else if (mode !== "signup") $("#authEmail").focus({ preventScroll: true });
}
function setFieldError(input, message) {
  const error = $("#" + input.id + "Error");
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (error) error.textContent = message || "";
}
function clearAuthErrors() { $$("input", authForm).forEach((input) => setFieldError(input, "")); }
function setAuthBusy(busy) { const submit = $("#authSubmit"); submit.setAttribute("aria-busy", String(busy)); submit.disabled = busy; $("#authResendConfirmation").disabled = busy; }
function validateAuth(mode) {
  clearAuthErrors();
  const email = $("#authEmail"), password = $("#authPassword"), invalid = [];
  const fail = (input, message) => { setFieldError(input, message); invalid.push(input); };
  const emailValue = email.value.trim();
  if (!emailValue) fail(email, "Enter your email address.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue)) fail(email, "Enter a valid email address, like you@example.com.");
  if (mode === "login" && !password.value) fail(password, "Enter your password.");
  if (mode === "recover" && password.value.length < 8) fail(password, "Use at least 8 characters for your new password.");
  if (invalid.length) invalid[0].focus();
  return !invalid.length;
}
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const mode = authForm.dataset.mode;
  if ($("#authSubmit").getAttribute("aria-busy") === "true" || !validateAuth(mode)) return;
  setAuthBusy(true);
  try {
    const email = $("#authEmail").value.trim().toLowerCase();
    if (mode === "forgot") {
      await RecalroAuth.resetPassword(email);
      $("#authResetMessage").textContent = `If an account exists for ${email}, a password reset link has been sent. Check your inbox.`;
      $("#authFormView").hidden = true; $("#authResetSent").hidden = false; $("#authResetSent").focus();
      return;
    }
    if (mode === "recover") {
      await RecalroAuth.updatePassword($("#authPassword").value);
      authForm.reset();
      openApp(authScreen.dataset.nextRoute || "dashboard");
      toast("Your password has been updated.", { icon:"check" });
      return;
    }

    await RecalroAuth.signIn(email, $("#authPassword").value);
    const user = RecalroAuth.currentUser();
    if (user?.id) {
      try {
        const profile = await RecalroAuth.ensureProfile();
        await window.RecalroCloudSync?.activate(user.id);
        if (profile) window.R.update((st) => { st.profile.displayName = profile.display_name; st.profile.onboarding = profile.onboarding || {}; });
      } catch (error) {
        console.error("Recalro: could not load the Supabase profile or learning state.", error);
        toast("You are signed in, but cloud data isn't ready. Apply the Supabase migration and try again.", { icon:"info" });
      }
    }
    authForm.reset();
    openApp(authScreen.dataset.nextRoute || "dashboard");
    const first = (window.R.state.profile.displayName || user?.name || nameFromEmail(email)).split(" ")[0];
    toast(`Welcome back, ${first}.`, { icon:"sparkles" });
  } catch (error) {
    console.error("Recalro sign-in failed.", error);
    toast(error.message || "Something went wrong. Please try again.", { icon:"info" });
  } finally {
    setAuthBusy(false);
  }
});
authForm.addEventListener("input", (event) => { if (event.target.getAttribute("aria-invalid") === "true") setFieldError(event.target, ""); });
$("#authResendConfirmation").addEventListener("click", async () => {
  if ($("#authSubmit").getAttribute("aria-busy") === "true" || !validateAuth("forgot")) return;
  setAuthBusy(true);
  try {
    await RecalroAuth.resendConfirmation($("#authEmail").value.trim().toLowerCase());
    toast("If that address has a pending signup, a confirmation link has been sent.", { icon:"mail" });
  } catch (error) {
    console.error("Recalro confirmation email resend failed.", error);
    toast(error.message || "Could not resend the confirmation link. Please try again.", { icon:"info" });
  } finally { setAuthBusy(false); }
});
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
$("#authGoogle").addEventListener("click", () => toast("Google sign-in isn't connected. Use email instead.", { icon: "info" }));
$("#authBack").addEventListener("click", goLanding);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented || authScreen.classList.contains("hidden")) return;
  if (document.querySelector("dialog[open]") || $("#authSubmit").disabled) return;
  // Never throw away a signup in progress; "Back to home" keeps it for this session anyway.
  if (authScreen.dataset.mode === "signup" && window.RecalroSignup.dirty) return;
  goLanding();
});

/* SignupWizard: create the Supabase account at review, then persist profile and progress. */
window.RecalroSignup.init(wizardEl, {
  journey: $("#authJourney"),
  onStep: (n) => { authScreen.dataset.wizardStep = String(n); },
  async onCreateAccount({ profile, password }) {
    const result = await RecalroAuth.signUp(profile, password);
    if (result.session && result.user?.id) {
      await RecalroAuth.saveProfile(profile);
      await window.RecalroCloudSync?.activate(result.user.id);
    }
    return result;
  },
  async onComplete(profile) {
    if (profile.confirmationPending) {
      authForm.reset();
      $("#authEmail").value = profile.email;
      openAuth("login", authScreen.dataset.nextRoute || "dashboard");
      toast(`Check ${profile.email} for your confirmation link, then sign in.`, { icon:"mail" });
      return;
    }

    let user = RecalroAuth.currentUser();
    if (!user?.id) throw new Error("Your account is not signed in. Please log in to continue.");
    const displayName = profile.name.trim() || user.name || nameFromEmail(profile.email);
    const completedProfile = { ...profile, name:displayName };
    window.R.update((st) => {
      st.profile.displayName = displayName;
      st.profile.onboarding = completedProfile.onboarding;
      if (profile.onboarding.minutes) st.settings.dailyGoal = profile.onboarding.minutes;
    });
    user = RecalroAuth.currentUser();
    if (user?.id) {
      await RecalroAuth.saveProfile(completedProfile);
      await window.RecalroCloudSync?.activate(user.id);
      await window.RecalroCloudSync?.flush();
    }
    openApp(authScreen.dataset.nextRoute || "dashboard");
    toast(`Welcome to Recalro, ${displayName.split(" ")[0]}!`, { icon:"sparkles" });
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

$("#heroStart")?.addEventListener("click", () => openAuth("signup"));
$(".mk-dialog-close").addEventListener("click", () => productDemoDialog.close());
$("#heroTour")?.addEventListener("click", () => productDemoDialog.showModal());
productDemoDialog.addEventListener("click", (event) => { if (event.target === productDemoDialog) productDemoDialog.close(); });
$("#productDemoStart").addEventListener("click", () => { productDemoDialog.close(); openAuth("signup"); });
const roadmapShortcut = $(".mk-roadmap-card");
if (roadmapShortcut) { roadmapShortcut.setAttribute("role", "button"); roadmapShortcut.setAttribute("tabindex", "0"); roadmapShortcut.setAttribute("aria-label", "Explore the learning roadmap"); }
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
   Uses a simple history example. Nothing here is saved. */
(function heroLiveDemo() {
  const card = $("#heroCard"), actions = $("#heroActions");
  if (!card || !window.R) return;
  const deck = [
    { front: "When did the Berlin Wall open?", back: "On 9 November 1989." },
    { front: "What were the Silk Roads?", back: "A network of trade routes linking communities across Asia, Europe and Africa." },
    { front: "When did Apollo 11 land on the Moon?", back: "On 20 July 1969." },
  ];
  const XP = { Again: 4, Hard: 7, Good: 10, Easy: 10 };
  const NEXT = { Again: "10 min", Hard: "1 day", Good: "1 day", Easy: "2 days" };
  const TUTOR = {
    Again: () => "No worries. Want a quick timeline of the key events? This card will come back in 10 minutes.",
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
    const c = deck[index];
    flipped = false; card.classList.remove("is-flipped"); card.hidden = false;
    $("#heroDeck").textContent = "History";
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
  if (!ctx) { clearWorkspaceBoot(); return; }
  const target = ctx.path + (location.hash.includes("?") ? "?" + location.hash.split("?")[1] : "");
  if (readSession()) { if (app.classList.contains("hidden")) openApp(target); }
  else openAuth("login", target);
}
window.addEventListener("hashchange", () => { if (app.classList.contains("hidden")) routeFromHash(); });
async function bootstrapAuth() {
  await RecalroAuth.ready;
  const user = readSession();
  if (user?.id) {
    try {
      const profile = await RecalroAuth.ensureProfile();
      await window.RecalroCloudSync?.activate(user.id);
      if (profile) window.R.update((st) => { st.profile.displayName = profile.display_name; st.profile.onboarding = profile.onboarding || {}; });
    } catch (error) {
      console.error("Recalro: could not restore Supabase data.", error);
      toast("You are signed in, but cloud data isn't ready. Apply the Supabase migration.", { icon:"info" });
    }
  }
  const authReturn = new URLSearchParams(location.search).get("auth");
  if (authReturn === "confirm" && user?.id) {
    history.replaceState(null, "", location.pathname);
    openApp("dashboard");
    toast("Your email is verified. Your learning space is ready.", { icon:"check" });
  } else if (authReturn === "recovery" && user?.id) {
    $("#authEmail").value = user.email;
    openAuth("recover");
  } else routeFromHash();
  syncCanvas();
}
void bootstrapAuth();
