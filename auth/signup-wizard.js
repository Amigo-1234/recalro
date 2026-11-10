/* ==========================================================================
   SignupWizard: an 8-step academic onboarding journey (frontend prototype).
   - State lives in memory for this page session only. Passwords are never
     stored anywhere, nothing is sent to a server, no email is delivered.
   - Steps: AccountDetails · EmailVerification · AcademicPath ·
     AcademicInformation (conditional per path) · LearningInterests ·
     LearningGoals · ProfileReview · Welcome
   - Each step is { label, render(), mount(el), validate() -> [[fieldId, msg]], beforeNext() }.
     validate() reads state only, so the review step can check any step.
   ========================================================================== */
(function () {
  "use strict";
  const D = window.RecalroSignupData, UI = window.RecalroSignupUI;
  const esc = (s) => window.R.esc(s), icon = (n) => window.R.icon(n);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const TOTAL = 8, REVIEW = 6, RESEND_SECONDS = 30;

  const blank = () => ({
    step: 0, furthest: 0, returnTo: null,
    account: { name: "", email: "", password: "", confirm: "", terms: false },
    verify: { code: "", email: "", verified: false, resendAt: 0, entered: "" },
    path: "",
    academic: { secondary: { exams: [] }, university: {}, postgraduate: {}, professional: {}, independent: { skills: [] } },
    interests: [], interestsOther: "", goals: [], minutes: null,
  });
  let S = blank();

  /* ---------- State helpers ---------- */
  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), S);
  function set(path, value) {
    const keys = path.split("."), last = keys.pop();
    const obj = keys.reduce((o, k) => (o[k] ??= {}), S);
    obj[last] = value;
  }
  const A = () => S.academic[S.path] || {};
  const pathMeta = () => D.PATHS.find((p) => p.id === S.path);
  const allInstitutions = () => [...new Set(Object.values(D.INSTITUTIONS).flat())].sort();
  const institutionsFor = (country) => (country && D.INSTITUTIONS[country]) || allInstitutions();
  const newCode = () => String(Math.floor(100000 + Math.random() * 900000));
  const firstName = () => (S.account.name.trim().split(/\s+/)[0] || "there");

  /* ---------- Shared bits of markup ---------- */
  const head = (kicker, title, desc) => `<header class="sw-head"><span class="sw-kicker">${kicker}</span><h1 id="sw-title-${S.step}" tabindex="-1">${title}</h1>${desc ? `<p>${desc}</p>` : ""}</header>`;
  const pathPill = () => pathMeta() ? `<div class="sw-pathpill"><img src="${pathMeta().img}" alt="" width="200" height="200"><span><small>Academic path</small><b>${esc(pathMeta().title)}</b></span><button type="button" class="sw-link" data-go="2">Change</button></div>` : "";
  function institutionField(key, label = "Institution") {
    const a = S.academic[key];
    return `<div class="sw-field sw-combo" data-field="sw-inst">
        <label for="sw-inst">${label}</label>
        <span class="sw-combo-wrap">${icon("search")}<input id="sw-inst" type="text" value="${esc(a.institution || "")}" placeholder="Start typing to search" autocomplete="off" spellcheck="false" aria-describedby="sw-inst-hint sw-inst-err"><ul class="sw-combo-list" id="sw-inst-list"></ul></span>
        <p class="sw-hint" id="sw-inst-hint">Sample list for this prototype. Not there? Choose “My institution isn't listed”.</p>
        <p class="sw-err" id="sw-inst-err"></p>
      </div>
      <div class="sw-reveal" data-reveal="inst" ${a.notListed ? "" : "hidden"}>${UI.FormField({ id: "sw-inst-custom", label: "Institution name", bind: `academic.${key}.institutionCustom`, value: a.institutionCustom || "", placeholder: "Type the full name of your institution", autocomplete: "organization" })}</div>`;
  }
  function validInstitution(a) {
    if (a.notListed) return (a.institutionCustom || "").trim().length >= 2 ? null : ["sw-inst-custom", "Enter the name of your institution."];
    const list = institutionsFor(a.country);
    const match = list.find((o) => o.toLowerCase() === (a.institution || "").trim().toLowerCase());
    if (match) { a.institution = match; return null; }
    return ["sw-inst", a.institution ? "Choose an institution from the list, or pick “My institution isn't listed”." : "Search for your institution."];
  }
  const chips = (type, name, bind, options, value) => options.map((o) => UI.Chip({ type, name, value: o, label: o, bind, checked: type === "checkbox" ? (value || []).includes(o) : value === o })).join("");

  /* ======================================================================
     Steps
     ====================================================================== */
  const AccountDetailsStep = {
    label: "Account",
    render: () => `
      ${head("Create your account", "Let's get you started.", "Create your Recalro account and start building a smarter learning routine.")}
      <button type="button" class="sw-google" data-google>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"/></svg>
        Continue with Google
      </button>
      <p class="sw-note" data-google-note role="status" hidden>${icon("info")}<span>Google sign-in is a visual prototype, so nothing connects to Google yet. Continue with email to try the full journey.</span></p>
      <div class="sw-divider"><span>or sign up with email</span></div>
      <div class="sw-form">
        ${UI.FormField({ id: "sw-name", label: "Full name", bind: "account.name", value: S.account.name, placeholder: "Ada Okafor", autocomplete: "name" })}
        ${UI.FormField({ id: "sw-email", label: "Email address", bind: "account.email", value: S.account.email, type: "email", placeholder: "you@example.com", autocomplete: "email", inputmode: "email", hint: "We'll send a 6-digit code to confirm it's yours." })}
        <div class="sw-row">
          ${UI.PasswordField({ id: "sw-password", label: "Password", bind: "account.password", value: S.account.password, placeholder: "Create a password", strength: true })}
          <div class="sw-field" data-field="sw-confirm">
            <label for="sw-confirm">Confirm password</label>
            <span class="sw-password">
              <input id="sw-confirm" type="password" value="${esc(S.account.confirm)}" placeholder="Type it again" autocomplete="new-password" data-bind="account.confirm" aria-describedby="sw-confirm-match sw-confirm-err">
              <button type="button" class="sw-eye" data-eye="sw-confirm" aria-label="Show password" aria-pressed="false">${icon("eye")}</button>
            </span>
            <p class="sw-match" id="sw-confirm-match" aria-live="polite"></p>
            <p class="sw-err" id="sw-confirm-err"></p>
          </div>
        </div>
        <div class="sw-field" data-field="sw-terms">
          <label class="sw-check"><input type="checkbox" id="sw-terms" data-bind="account.terms" ${S.account.terms ? "checked" : ""} aria-describedby="sw-terms-err"><span>I agree to the <button type="button" class="sw-link" data-legal="terms">Terms of Service</button> and <button type="button" class="sw-link" data-legal="privacy">Privacy Policy</button>.</span></label>
          <p class="sw-err" id="sw-terms-err"></p>
        </div>
      </div>
      <p class="sw-switch">Already have an account? <button type="button" class="sw-link" data-auth-mode="login">Log in</button></p>`,
    mount(el) { updateMatch(el); },
    validate() {
      const a = S.account, e = [];
      if (a.name.trim().length < 2) e.push(["sw-name", "Enter your full name."]);
      if (!a.email.trim()) e.push(["sw-email", "Enter your email address."]);
      else if (!EMAIL.test(a.email.trim())) e.push(["sw-email", "Enter a valid email address, like you@example.com."]);
      if (!UI.passwordValid(a.password)) e.push(["sw-password", "Use at least 8 characters, including a letter and a number."]);
      if (!a.confirm) e.push(["sw-confirm", "Confirm your password."]);
      else if (a.confirm !== a.password) e.push(["sw-confirm", "The passwords don't match."]);
      if (!a.terms) e.push(["sw-terms", "Please accept the Terms of Service and Privacy Policy to continue."]);
      return e;
    },
    async beforeNext() {
      const email = S.account.email.trim().toLowerCase();
      S.account.email = email;
      if (S.verify.email === email && S.verify.code) return {};
      // New (or changed) email: "send" a fresh code. Stand-in for the email service.
      await busy("Sending code…", 700);
      S.verify = { code: newCode(), email, verified: false, resendAt: Date.now() + RESEND_SECONDS * 1000, entered: "" };
      return { to: 1 };
    },
  };

  let otp = null;
  const EmailVerificationStep = {
    label: "Verify email",
    render: () => `
      ${head("Email verification", "Let's verify it's really you.", `Enter the 6-digit code we sent to <b class="sw-break">${esc(S.verify.email)}</b>. <button type="button" class="sw-link" data-go="0">Change email</button>`)}
      <div class="sw-inbox" role="note">
        <span class="sw-inbox-ic">${icon("bell")}</span>
        <div><b>Prototype inbox</b><span>No email is sent in this prototype. Your code is <code class="sw-code">${S.verify.code.slice(0, 3)} ${S.verify.code.slice(3)}</code></span></div>
        <button type="button" class="sw-mini" data-autofill ${S.verify.verified ? "hidden" : ""}>Paste it for me</button>
      </div>
      <div class="sw-field sw-otp-field" data-field="sw-otp">
        <p class="sw-label" id="sw-otp-label">Verification code</p>
        <div class="sw-otp" id="sw-otp" role="group" aria-labelledby="sw-otp-label" aria-describedby="sw-otp-err sw-otp-status"></div>
        <p class="sw-err" id="sw-otp-err"></p>
        <p class="sw-otp-status" id="sw-otp-status" aria-live="polite"></p>
      </div>
      <p class="sw-resend" aria-live="polite"><span data-countdown></span><button type="button" class="sw-link" data-resend hidden>Resend code</button></p>`,
    mount(el) {
      otp = UI.OTPInput(el.querySelector("#sw-otp"), {
        value: S.verify.verified ? S.verify.code : S.verify.entered,
        onChange: (v) => { S.verify.entered = v; if (v.length < 6) clearError("sw-otp"); },
        onComplete: (v) => checkCode(v),
      });
      if (S.verify.verified) markVerified(el, false);
      const tick = () => {
        const left = Math.max(0, Math.ceil((S.verify.resendAt - Date.now()) / 1000));
        const cd = el.querySelector("[data-countdown]"), btn = el.querySelector("[data-resend]");
        if (!cd) return;
        if (S.verify.verified) { cd.textContent = ""; btn.hidden = true; return; }
        cd.textContent = left ? `Didn't get it? You can resend in 0:${String(left).padStart(2, "0")}` : "Didn't get it?";
        btn.hidden = left > 0;
      };
      tick();
      const timer = setInterval(tick, 1000);
      onLeave(() => clearInterval(timer));
      if (!S.verify.verified) setTimeout(() => otp?.focus(), reduced() ? 0 : 460);
    },
    validate() {
      if (S.verify.verified) return [];
      return [["sw-otp", S.verify.entered.length < 6 ? "Enter all 6 digits of the code." : "That code doesn't match. Check it and try again."]];
    },
    async beforeNext() {
      if (S.verify.verified) return {};
      return checkCode(S.verify.entered) ? {} : { stop: true };
    },
  };
  function checkCode(v) {
    const el = stepEl();
    if (v === S.verify.code) {
      S.verify.verified = true;
      markVerified(el, true);
      return true;
    }
    otp?.setState("error");
    showErrors([["sw-otp", "That code doesn't match. Check it and try again."]], false);
    return false;
  }
  function markVerified(el, fresh) {
    otp?.setState("success");
    clearError("sw-otp");
    el.querySelector("#sw-otp-status").innerHTML = `${icon("check-circle")} Email verified`;
    el.querySelector("#sw-otp-status").classList.add("is-ok");
    el.querySelector("[data-autofill]")?.setAttribute("hidden", "");
    updateChrome();
    if (fresh) setTimeout(() => { if (S.step === 1 && S.verify.verified) next(); }, reduced() ? 300 : 950);
  }

  const AcademicPathStep = {
    label: "Academic path",
    render: () => `
      ${head("Your academic path", "What are you currently studying?", "Help us personalize your Recalro experience.")}
      ${UI.ChoiceGroup({ id: "sw-path", legend: "Academic path", cls: "sw-group-tiles sw-legend-hidden", content: D.PATHS.map((p) => UI.SelectionCard({ name: "sw-path", value: p.id, checked: S.path === p.id, title: p.title, desc: p.desc, img: p.img, bind: "path" })).join("") })}`,
    validate: () => (S.path ? [] : [["sw-path", "Choose the option that fits you best."]]),
  };

  const ACADEMIC_COPY = {
    university: ["Tell us about your degree.", "We'll shape your subjects, roadmap and exam practice around your course."],
    secondary: ["Tell us about your school.", "We'll line up practice for the exams you're preparing for."],
    postgraduate: ["Tell us about your programme.", "We'll organise your reading, research notes and revision around it."],
    professional: ["Tell us about your certification.", "We'll build a revision plan towards your exam."],
    independent: ["What do you want to learn?", "Tell us what you're curious about and we'll suggest where to start."],
  };
  const AcademicInformationStep = {
    label: "Academic details",
    render() {
      const a = A(), k = S.path, b = (f) => `academic.${k}.${f}`;
      const [title, desc] = ACADEMIC_COPY[k] || ["Tell us about your studies.", ""];
      let body = "";
      if (k === "university") {
        const levels = D.levelsFor(a.country);
        body = `
          ${UI.SelectField({ id: "sw-country", label: "Country", bind: b("country"), value: a.country || "", options: D.COUNTRIES, placeholder: "Select your country" })}
          ${institutionField(k)}
          <div class="sw-row">
            ${UI.FormField({ id: "sw-faculty", label: "Faculty or school", bind: b("faculty"), value: a.faculty || "", placeholder: "e.g. Faculty of Engineering" })}
            ${UI.FormField({ id: "sw-dept", label: "Department / course of study", bind: b("department"), value: a.department || "", placeholder: "e.g. Mechanical Engineering" })}
          </div>
          ${UI.ChoiceGroup({ id: "sw-level", legend: "Current academic level", hint: a.country === "Nigeria" ? "" : !a.country ? "Choose your country to see the right levels." : "", content: chips("radio", "sw-level", b("level"), levels, a.level) })}
          <div class="sw-reveal" data-reveal="level" ${a.level === "Other" ? "" : "hidden"}>${UI.FormField({ id: "sw-level-other", label: "Your level", bind: b("levelOther"), value: a.levelOther || "", placeholder: "e.g. Direct entry, Foundation year" })}</div>`;
      } else if (k === "secondary") {
        body = `
          ${UI.SelectField({ id: "sw-country", label: "Country", bind: b("country"), value: a.country || "", options: D.COUNTRIES, placeholder: "Select your country" })}
          ${UI.FormField({ id: "sw-school", label: "School name", bind: b("school"), value: a.school || "", placeholder: "e.g. Queen's College, Lagos", optional: true, autocomplete: "organization" })}
          ${UI.ChoiceGroup({ id: "sw-grade", legend: "Current class or grade", content: chips("radio", "sw-grade", b("grade"), D.classesFor(a.country), a.grade) })}
          ${UI.ChoiceGroup({ id: "sw-exams", legend: "Examinations you're preparing for", optional: true, hint: "Choose all that apply.", content: chips("checkbox", "sw-exams", b("exams"), D.examsFor(a.country), a.exams) })}`;
      } else if (k === "postgraduate") {
        body = `
          ${UI.SelectField({ id: "sw-country", label: "Country", bind: b("country"), value: a.country || "", options: D.COUNTRIES, placeholder: "Select your country", optional: true, hint: "Narrows the institution search." })}
          ${institutionField(k)}
          ${UI.FormField({ id: "sw-field", label: "Field of study", bind: b("field"), value: a.field || "", placeholder: "e.g. Structural Engineering" })}
          ${UI.SelectField({ id: "sw-programme", label: "Programme", bind: b("programme"), value: a.programme || "", options: D.PROGRAMMES, placeholder: "Select your programme" })}
          ${UI.ChoiceGroup({ id: "sw-stage", legend: "Current study stage", content: chips("radio", "sw-stage", b("stage"), D.PG_STAGES, a.stage) })}`;
      } else if (k === "professional") {
        body = `
          ${UI.SelectField({ id: "sw-country", label: "Country", bind: b("country"), value: a.country || "", options: D.COUNTRIES, placeholder: "Select your country" })}
          ${UI.ChoiceGroup({ id: "sw-cert", legend: "Certification or examination", content: chips("radio", "sw-cert", b("cert"), D.CERTS, a.cert) })}
          <div class="sw-reveal" data-reveal="cert" ${a.cert === "Other" ? "" : "hidden"}>${UI.FormField({ id: "sw-cert-other", label: "Which certification?", bind: b("certOther"), value: a.certOther || "", placeholder: "e.g. CIMA, CompTIA Security+" })}</div>
          <div class="sw-row">
            ${UI.FormField({ id: "sw-profield", label: "Professional field", bind: b("proField"), value: a.proField || "", placeholder: "e.g. Accounting, Project management" })}
            ${UI.FormField({ id: "sw-examdate", label: "Examination date", bind: b("examDate"), value: a.examDate || "", type: "date", optional: true, attrs: `min="${new Date().toISOString().slice(0, 10)}"` })}
          </div>`;
      } else if (k === "independent") {
        body = `
          ${UI.FormField({ id: "sw-topics", label: "Learning interests", bind: b("topics"), value: a.topics || "", placeholder: "e.g. Python for data analysis, conversational French", hint: "A few words is enough." })}
          ${UI.ChoiceGroup({ id: "sw-skills", legend: "Skills you want to develop", optional: true, hint: "Choose any that apply.", content: chips("checkbox", "sw-skills", b("skills"), D.SKILLS, a.skills) })}
          ${UI.FormField({ id: "sw-skills-other", label: "Anything else?", bind: b("skillsOther"), value: a.skillsOther || "", placeholder: "e.g. Photography", optional: true })}`;
      }
      return `${head("Academic details", title, desc)}${pathPill()}<div class="sw-form">${body}</div>`;
    },
    mount(el) {
      const input = el.querySelector("#sw-inst");
      if (!input) return;
      const a = A();
      UI.InstitutionSearch(input, el.querySelector("#sw-inst-list"), {
        getOptions: () => institutionsFor(A().country),
        onSelect: ({ notListed, value, typing }) => {
          clearError("sw-inst");
          if (typing) { a.institution = value; return; }
          a.notListed = !!notListed;
          const reveal = el.querySelector('[data-reveal="inst"]');
          reveal.hidden = !notListed;
          if (notListed) {
            a.institution = "";
            input.value = "";
            if (!a.institutionCustom && value) { a.institutionCustom = value; el.querySelector("#sw-inst-custom").value = value; }
            el.querySelector("#sw-inst-custom").focus();
          } else a.institution = value;
        },
      });
    },
    validate() {
      const a = A(), k = S.path, e = [];
      const need = (v, id, msg) => { if (!String(v ?? "").trim()) e.push([id, msg]); };
      if (k === "university") {
        need(a.country, "sw-country", "Select your country.");
        const inst = validInstitution(a); if (inst) e.push(inst);
        need(a.faculty, "sw-faculty", "Enter your faculty or school.");
        need(a.department, "sw-dept", "Enter your department or course.");
        need(a.level, "sw-level", "Choose your current level.");
        if (a.level === "Other") need(a.levelOther, "sw-level-other", "Tell us your level.");
      } else if (k === "secondary") {
        need(a.country, "sw-country", "Select your country.");
        need(a.grade, "sw-grade", "Choose your class or grade.");
      } else if (k === "postgraduate") {
        const inst = validInstitution(a); if (inst) e.push(inst);
        need(a.field, "sw-field", "Enter your field of study.");
        need(a.programme, "sw-programme", "Select your programme.");
        need(a.stage, "sw-stage", "Choose your current stage.");
      } else if (k === "professional") {
        need(a.country, "sw-country", "Select your country.");
        need(a.cert, "sw-cert", "Choose your certification or examination.");
        if (a.cert === "Other") need(a.certOther, "sw-cert-other", "Tell us which certification.");
        need(a.proField, "sw-profield", "Enter your professional field.");
      } else if (k === "independent") {
        need(a.topics, "sw-topics", "Tell us what you'd like to learn.");
      } else e.push(["sw-title-3", "Choose an academic path first."]);
      return e;
    },
  };

  const LearningInterestsStep = {
    label: "Interests",
    render: () => `
      ${head("Learning interests", "What would you like to learn?", "Pick as many as you like. We'll suggest subjects and starter decks to match.")}
      <div class="sw-search">${icon("search")}<label class="sr-only" for="sw-isearch">Search subjects</label><input id="sw-isearch" type="search" placeholder="Search subjects" autocomplete="off"><span class="sw-count" aria-live="polite">${countLabel()}</span></div>
      ${UI.ChoiceGroup({ id: "sw-interests", legend: "Subjects", cls: "sw-group-grid sw-legend-hidden", content: D.INTERESTS.map((i) => UI.SelectionCard({ type: "checkbox", name: "sw-interests", value: i.id, checked: S.interests.includes(i.id), title: i.label, ic: i.icon, bind: "interests", compact: true })).join("") })}
      <p class="sw-empty" hidden>No subjects match. Choose “Other” and tell us.</p>
      <div class="sw-reveal" data-reveal="interests-other" ${S.interests.includes("other") ? "" : "hidden"}>${UI.FormField({ id: "sw-interests-other", label: "What else?", bind: "interestsOther", value: S.interestsOther, placeholder: "e.g. Architecture, Music theory" })}</div>`,
    mount(el) {
      const search = el.querySelector("#sw-isearch");
      search.addEventListener("input", () => {
        const q = search.value.trim().toLowerCase(); let shown = 0;
        el.querySelectorAll("#sw-interests .sw-tile").forEach((t) => { const hit = !q || t.textContent.toLowerCase().includes(q) || t.dataset.value === "other"; t.hidden = !hit; if (hit && t.dataset.value !== "other") shown++; });
        el.querySelector(".sw-empty").hidden = shown > 0;
      });
    },
    validate() {
      const e = [];
      if (!S.interests.length) e.push(["sw-interests", "Choose at least one subject."]);
      if (S.interests.includes("other") && !S.interestsOther.trim()) e.push(["sw-interests-other", "Tell us what else you'd like to learn."]);
      return e;
    },
  };
  const countLabel = () => (S.interests.length ? `${S.interests.length} selected` : "");

  const LearningGoalsStep = {
    label: "Goals",
    render: () => `
      ${head("Learning goals", "What are you working towards?", "Choose any that apply. Both questions are optional and you can change them later.")}
      ${UI.ChoiceGroup({ id: "sw-goals", legend: "Your goals", optional: true, cls: "sw-group-grid", content: D.GOALS.map((g) => UI.SelectionCard({ type: "checkbox", name: "sw-goals", value: g.id, checked: S.goals.includes(g.id), title: g.label, ic: g.icon, bind: "goals", compact: true })).join("") })}
      ${UI.ChoiceGroup({ id: "sw-minutes", legend: "How much time do you want to study each day?", optional: true, content: D.MINUTES.map((m) => UI.Chip({ name: "sw-minutes", value: String(m.v), label: m.label, bind: "minutes", checked: S.minutes === m.v })).join("") })}`,
    validate: () => [],
  };

  const pathDetails = () => {
    const a = A(), rows = [];
    const add = (k, v) => { if (v && (!Array.isArray(v) || v.length)) rows.push([k, Array.isArray(v) ? v.join(", ") : v]); };
    const inst = a.notListed ? a.institutionCustom : a.institution;
    if (S.path === "university") { add("Country", a.country); add("Institution", inst); add("Faculty or school", a.faculty); add("Department / course", a.department); add("Level", a.level === "Other" ? a.levelOther : a.level); }
    if (S.path === "secondary") { add("Country", a.country); add("School", a.school); add("Class or grade", a.grade); add("Exams", a.exams); }
    if (S.path === "postgraduate") { add("Institution", inst); add("Field of study", a.field); add("Programme", a.programme); add("Stage", a.stage); }
    if (S.path === "professional") { add("Country", a.country); add("Certification", a.cert === "Other" ? a.certOther : a.cert); add("Professional field", a.proField); add("Exam date", a.examDate && new Date(a.examDate + "T00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })); }
    if (S.path === "independent") { add("Interests", a.topics); add("Skills", [...(a.skills || []), ...(a.skillsOther ? [a.skillsOther] : [])]); }
    return rows;
  };
  const ProfileReviewStep = {
    label: "Review",
    render() {
      const section = (title, step, content) => `<section class="sw-rv"><header><h2>${title}</h2><button type="button" class="sw-edit" data-edit="${step}" aria-label="Edit ${title.toLowerCase()}">${icon("edit")}Edit</button></header>${content}</section>`;
      const dl = (rows) => `<dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
      const tagList = (items) => items.length ? `<ul class="sw-tags">${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : `<p class="sw-none">Not set. You can add these later.</p>`;
      const interests = S.interests.map((id) => (id === "other" ? S.interestsOther : D.INTERESTS.find((i) => i.id === id)?.label)).filter(Boolean);
      const goals = S.goals.map((id) => D.GOALS.find((g) => g.id === id)?.label).filter(Boolean);
      const mins = D.MINUTES.find((m) => m.v === S.minutes);
      return `
        ${head("Review", "Your learning space is almost ready.", "Check your details. You can edit any section before you finish.")}
        <div class="sw-review">
          <div class="sw-rv-hero"><span class="sw-avatar">${esc(firstName()[0]?.toUpperCase() || "R")}</span><span><b>${esc(S.account.name.trim())}</b><small>${esc(S.account.email)} <span class="sw-verified">${icon("check-circle")}Verified</span></small></span><button type="button" class="sw-edit" data-edit="0" aria-label="Edit account details">${icon("edit")}Edit</button></div>
          ${section("Academic path", 2, `<p class="sw-rv-path"><img src="${pathMeta()?.img}" alt="" width="200" height="200">${esc(pathMeta()?.title || "")}</p>`)}
          ${section("Academic details", 3, dl(pathDetails()))}
          ${section("Learning interests", 4, tagList(interests))}
          ${section("Learning goals", 5, tagList(goals) + (mins ? `<p class="sw-rv-time">${icon("clock")}Daily study time: <b>${mins.label}</b></p>` : ""))}
        </div>`;
    },
    validate: () => [],
  };

  const WelcomeStep = {
    label: "Welcome",
    render() {
      const a = A(), inst = a.notListed ? a.institutionCustom : a.institution;
      const where = {
        university: [a.department, inst].filter(Boolean).join(" at "),
        secondary: [a.grade, a.school].filter(Boolean).join(" at "),
        postgraduate: [a.programme, a.field].filter(Boolean).join(" in "),
        professional: a.cert === "Other" ? a.certOther : a.cert ? `${a.cert} preparation` : "",
        independent: a.topics,
      }[S.path];
      const mins = D.MINUTES.find((m) => m.v === S.minutes);
      return `
        <div class="sw-welcome">
          <div class="sw-welcome-mark" aria-hidden="true"><span class="sw-orbit"></span><span class="sw-orbit sw-orbit-2"></span><img src="assets/recalro-logo.png" alt="" width="1254" height="1254"></div>
          <span class="sw-kicker">Welcome to Recalro</span>
          <h1 id="sw-title-7" tabindex="-1">Your next chapter starts here.</h1>
          <p class="sw-greet">Welcome, <b>${esc(firstName())}</b>. ${where ? `Your learning space for <b>${esc(where)}</b> is ready.` : "Your learning space is ready."}${mins ? ` We'll aim for <b>${esc(mins.label)}</b> a day.` : ""}</p>
          <ul class="sw-first">
            <li style="--i:0"><span>${icon("upload")}</span><b>Add your first notes</b><small>Upload a PDF or paste text.</small></li>
            <li style="--i:1"><span>${icon("cards")}</span><b>Try a 5-minute review</b><small>Starter cards are waiting.</small></li>
            <li style="--i:2"><span>${icon("sparkles")}</span><b>Meet your AI tutor</b><small>Ask about any topic.</small></li>
          </ul>
          <p class="sw-proto">${icon("info")}Prototype: no account was created. Your name and email stay in this browser only.</p>
        </div>`;
    },
    mount(el) {
      if (!reduced()) setTimeout(() => window.R.burst?.(el.querySelector(".sw-welcome-mark"), { count: 28, spread: 140 }), 420);
    },
    validate: () => [],
  };

  const STEPS = [AccountDetailsStep, EmailVerificationStep, AcademicPathStep, AcademicInformationStep, LearningInterestsStep, LearningGoalsStep, ProfileReviewStep, WelcomeStep];

  /* ======================================================================
     SignupWizard shell: progress, navigation, transitions, errors
     ====================================================================== */
  let root, viewport, btnBack, btnNext, live, journey, opts = {}, leaveFns = [];
  const stepEl = () => viewport.querySelector(".sw-step:not(.is-leaving)");
  const onLeave = (fn) => leaveFns.push(fn);

  function init(container, options) {
    opts = options || {};
    root = container; journey = opts.journey;
    root.innerHTML = `
      <div class="sw-progress">
        <div class="sw-progress-top"><span class="sw-progress-count"></span><span class="sw-progress-name"></span></div>
        <ol class="sw-segs" aria-label="Signup progress">${STEPS.map((s, i) => `<li><button type="button" class="sw-seg" data-seg="${i}" aria-label="Step ${i + 1}: ${s.label}"><i></i></button></li>`).join("")}</ol>
      </div>
      <div class="sw-viewport"></div>
      <div class="sw-nav">
        <button type="button" class="sw-back" data-back>${icon("arrow-left")}<span>Back</span></button>
        <button type="button" class="sw-next" data-next><span class="sw-spinner" aria-hidden="true"></span><span class="sw-next-label">Continue</span>${icon("arrow-right")}</button>
      </div>
      <p class="sr-only" aria-live="polite" data-live></p>
      <dialog class="sw-dialog" aria-labelledby="sw-dialog-title"><h2 id="sw-dialog-title"></h2><p></p><button type="button" class="sw-next" data-close-dialog><span class="sw-next-label">Got it</span></button></dialog>`;
    viewport = root.querySelector(".sw-viewport"); btnBack = root.querySelector("[data-back]"); btnNext = root.querySelector("[data-next]"); live = root.querySelector("[data-live]");

    btnNext.addEventListener("click", next);
    btnBack.addEventListener("click", () => go(S.step - 1, -1));
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    root.addEventListener("change", onInput);
    // Enter in a text field moves forward, like submitting a form.
    root.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.matches("input:not([type=checkbox]):not([type=radio]):not(.sw-otp-cell):not([role=combobox])") && !e.isComposing) { e.preventDefault(); next(); }
    });
    root.querySelector(".sw-dialog").addEventListener("click", (e) => { if (e.target.matches("dialog, [data-close-dialog], [data-close-dialog] *")) e.currentTarget.close(); });
  }

  function show() { render(0); focusStep(true); }

  function onClick(e) {
    const t = e.target;
    const eye = t.closest("[data-eye]");
    if (eye) {
      const input = root.querySelector("#" + eye.dataset.eye), showIt = input.type === "password";
      input.type = showIt ? "text" : "password";
      eye.setAttribute("aria-pressed", String(showIt)); eye.setAttribute("aria-label", showIt ? "Hide password" : "Show password");
      return;
    }
    if (t.closest("[data-google]")) { const n = root.querySelector("[data-google-note]"); n.hidden = false; window.RecalroMotion?.animate(n, [{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], { duration: 250 }); return; }
    const legal = t.closest("[data-legal]");
    if (legal) {
      const dlg = root.querySelector(".sw-dialog"), terms = legal.dataset.legal === "terms";
      dlg.querySelector("h2").textContent = terms ? "Terms of Service" : "Privacy Policy";
      dlg.querySelector("p").textContent = `Recalro's ${terms ? "Terms of Service" : "Privacy Policy"} will be published before launch. In this prototype nothing you enter leaves your browser, passwords are never saved and no account is created.`;
      dlg.showModal(); return;
    }
    if (t.closest("[data-autofill]")) { otpFill(); return; }
    if (t.closest("[data-resend]")) {
      S.verify.code = newCode(); S.verify.resendAt = Date.now() + RESEND_SECONDS * 1000; S.verify.entered = "";
      render(0); announce("A new code was sent. Check the prototype inbox.");
      return;
    }
    const goBtn = t.closest("[data-go]");
    if (goBtn) { go(Number(goBtn.dataset.go), -1); return; }
    const edit = t.closest("[data-edit]");
    if (edit) { S.returnTo = REVIEW; go(Number(edit.dataset.edit), -1); return; }
    const seg = t.closest("[data-seg]");
    if (seg && !seg.disabled) { const n = Number(seg.dataset.seg); if (n < S.step) go(n, -1); }
  }
  function otpFill() {
    const cells = root.querySelectorAll(".sw-otp-cell");
    if (!cells.length) return;
    // Simulates a paste so the same code path as a real paste is exercised.
    const dt = new DataTransfer(); dt.setData("text", S.verify.code);
    cells[0].dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    if (S.verify.entered !== S.verify.code) { [...cells].forEach((c, i) => (c.value = S.verify.code[i])); S.verify.entered = S.verify.code; checkCode(S.verify.code); }
  }

  function onInput(e) {
    const el = e.target, bind = el.dataset?.bind;
    if (!bind) return;
    if (el.type === "checkbox" && el.name) {
      const arr = new Set(get(bind) || []);
      el.checked ? arr.add(el.value) : arr.delete(el.value);
      set(bind, [...arr]);
    } else if (el.type === "checkbox") set(bind, el.checked);
    else if (el.type === "radio") { if (!el.checked) return; set(bind, bind === "minutes" ? Number(el.value) : el.value); }
    else set(bind, el.value);
    const field = el.closest("[data-field]"); if (field) clearError(field.dataset.field);

    if (el.dataset.strength) UI.updateStrength(root, el.dataset.strength, el.value);
    if (bind.startsWith("account.password") || bind === "account.confirm") updateMatch(root);
    if (bind === "interests") { root.querySelector('[data-reveal="interests-other"]').hidden = !S.interests.includes("other"); root.querySelector(".sw-count").textContent = countLabel(); }
    if (/\.level$/.test(bind)) root.querySelector('[data-reveal="level"]').hidden = el.value !== "Other";
    if (/\.cert$/.test(bind)) root.querySelector('[data-reveal="cert"]').hidden = el.value !== "Other";
    // Country drives which levels, classes, exams and institutions are offered.
    if (/\.country$/.test(bind) && e.type === "change") {
      const a = A();
      if (a.level && !D.levelsFor(a.country).includes(a.level)) a.level = "";
      if (a.grade && !D.classesFor(a.country).includes(a.grade)) a.grade = "";
      if (a.exams) a.exams = a.exams.filter((x) => D.examsFor(a.country).includes(x));
      if (a.institution && !institutionsFor(a.country).includes(a.institution)) a.institution = "";
      render(0); root.querySelector("#sw-country")?.focus();
    }
    updateChrome();
  }
  function updateMatch(scope) {
    const m = scope.querySelector("#sw-confirm-match"); if (!m) return;
    const { password, confirm } = S.account;
    m.className = "sw-match" + (confirm ? (confirm === password ? " ok" : " no") : "");
    m.innerHTML = !confirm ? "" : confirm === password ? `${icon("check")}Passwords match` : password.startsWith(confirm) ? "" : "Passwords don't match yet";
  }

  /* ---------- Errors ---------- */
  function clearError(id) {
    const err = root.querySelector(`#${id}-err`); if (err) err.textContent = "";
    root.querySelector(`[data-field="${id}"]`)?.classList.remove("has-error");
    root.querySelectorAll(`#${id}, #${id} input`).forEach((i) => i.removeAttribute("aria-invalid"));
  }
  function showErrors(errors, focus = true) {
    errors.forEach(([id, msg]) => {
      const err = root.querySelector(`#${id}-err`); if (err) err.textContent = msg;
      root.querySelector(`[data-field="${id}"]`)?.classList.add("has-error");
      const target = root.querySelector(`#${id}`);
      if (target?.matches("input, select")) target.setAttribute("aria-invalid", "true");
    });
    if (!focus || !errors.length) return;
    const first = root.querySelector(`#${errors[0][0]}`);
    const focusable = first?.matches("input, select, textarea, [tabindex]") ? first : first?.querySelector("input:not([type=hidden])");
    focusable?.focus();
    focusable?.closest(".sw-field, .sw-group")?.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
    window.RecalroMotion?.animate(btnNext, [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 300 });
  }

  /* ---------- Navigation ---------- */
  async function next() {
    if (btnNext.getAttribute("aria-busy") === "true") return;
    const step = STEPS[S.step];
    if (S.step === STEPS.length - 1) { complete(); return; }
    const errors = step.validate();
    // On the code step, a full 6-digit entry is checked by beforeNext instead.
    if (errors.length && !(S.step === 1 && S.verify.entered.length === 6)) { if (S.step === 1) otp?.setState("error"); showErrors(errors); return; }
    const res = (await step.beforeNext?.()) || {};
    if (res.stop) return;
    let to = res.to ?? S.step + 1;
    // Editing from the review: return to it, unless the change means a later step needs attention.
    if (S.returnTo != null && res.to == null) {
      to = S.returnTo;
      for (let n = S.step + 1; n < REVIEW; n++) if (STEPS[n].validate().length) { to = n; break; }
      if (to === REVIEW) S.returnTo = null;
    }
    go(to, 1);
  }
  function go(n, dir) {
    if (n < 0 || n >= STEPS.length || n === S.step) return;
    S.step = n; S.furthest = Math.max(S.furthest, n);
    render(dir);
    focusStep(false);
    announce(`Step ${n + 1} of ${TOTAL}: ${STEPS[n].label}`);
  }
  function busy(label, ms) {
    btnNext.setAttribute("aria-busy", "true"); btnNext.disabled = true;
    root.querySelector(".sw-next-label").textContent = label;
    return new Promise((r) => setTimeout(() => { btnNext.removeAttribute("aria-busy"); btnNext.disabled = false; r(); }, ms));
  }
  function announce(msg) { live.textContent = ""; setTimeout(() => (live.textContent = msg), 60); }

  function render(dir) {
    leaveFns.forEach((fn) => fn()); leaveFns = [];
    const step = STEPS[S.step], old = stepEl();
    const el = document.createElement("section");
    el.className = "sw-step"; el.dataset.step = String(S.step);
    el.setAttribute("aria-labelledby", `sw-title-${S.step}`);
    el.innerHTML = step.render();
    const animateIt = old && dir && !reduced() && el.animate;
    if (animateIt) {
      const h1 = viewport.offsetHeight;
      old.classList.add("is-leaving"); old.inert = true; old.setAttribute("aria-hidden", "true");
      Object.assign(old.style, { position: "absolute", left: "0", right: "0", top: "0" });
      viewport.append(el);
      const h2 = el.offsetHeight;
      viewport.animate([{ height: `${h1}px` }, { height: `${h2}px` }], { duration: 420, easing: "cubic-bezier(.22,.61,.36,1)" });
      old.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-dir * 48}px)` }], { duration: 220, easing: "ease-in", fill: "forwards" }).finished.then(() => old.remove());
      el.animate([{ opacity: 0, transform: `translateX(${dir * 64}px)` }, { opacity: 1, transform: "none" }], { duration: 460, delay: 90, easing: "cubic-bezier(.2,.9,.3,1.05)", fill: "backwards" });
    } else { viewport.querySelectorAll(".sw-step").forEach((s) => s.remove()); viewport.append(el); }
    step.mount?.(el);
    updateChrome();
  }
  function focusStep(initial) {
    const el = stepEl(); if (!el) return;
    // First visit: put the cursor in the first field. After navigating: land on the heading.
    const target = initial && S.step === 0 ? el.querySelector("#sw-name") : el.querySelector("h1");
    target?.focus({ preventScroll: true });
    const top = root.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + top - 16, behavior: reduced() ? "auto" : "smooth" });
  }

  function updateChrome() {
    const n = S.step, last = n === STEPS.length - 1;
    root.dataset.step = String(n);
    opts.onStep?.(n);
    root.querySelector(".sw-progress-count").textContent = `Step ${n + 1} of ${TOTAL}`;
    root.querySelector(".sw-progress-name").textContent = STEPS[n].label;
    root.querySelectorAll(".sw-seg").forEach((b, i) => {
      b.classList.toggle("is-done", i < n); b.classList.toggle("is-current", i === n);
      b.disabled = i >= n || last;
      if (i === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    btnBack.style.visibility = n === 0 || last ? "hidden" : "visible";
    btnBack.setAttribute("aria-hidden", String(n === 0 || last));
    btnBack.tabIndex = n === 0 || last ? -1 : 0;
    let label = "Continue";
    if (n === 0) label = "Create account";
    if (n === 1) label = S.verify.verified ? "Continue" : "Verify email";
    if (n === 5 && !S.goals.length && !S.minutes) label = "Skip for now";
    if (S.returnTo != null && n < REVIEW && n !== 1) label = "Save and review";
    if (n === REVIEW) label = "Create my learning space";
    if (last) label = "Continue to dashboard";
    if (btnNext.getAttribute("aria-busy") !== "true") root.querySelector(".sw-next-label").textContent = label;
    btnNext.classList.toggle("is-final", n >= REVIEW);
    if (journey) journey.innerHTML = STEPS.slice(0, REVIEW + 1).map((s, i) => `<li class="${i < n ? "is-done" : i === n ? "is-current" : ""}"><span>${i < n ? icon("check") : i + 1}</span>${s.label}</li>`).join("");
  }

  function complete() {
    const a = A(), inst = a.notListed ? a.institutionCustom : a.institution;
    const profile = {
      name: S.account.name.trim().replace(/\s+/g, " "), email: S.account.email,
      onboarding: { path: S.path, institution: inst || "", details: Object.fromEntries(pathDetails()), interests: S.interests.map((id) => (id === "other" ? S.interestsOther : D.INTERESTS.find((i) => i.id === id)?.label)), goals: S.goals.map((id) => D.GOALS.find((g) => g.id === id)?.label), minutes: S.minutes, completedAt: new Date().toISOString() },
    };
    opts.onComplete?.(profile);
    reset();
  }
  function reset() { leaveFns.forEach((fn) => fn()); leaveFns = []; S = blank(); if (viewport) viewport.innerHTML = ""; }

  window.RecalroSignup = {
    init, show, reset,
    get step() { return S.step; },
    // True once the visitor has typed anything, so the shell can avoid discarding it on Esc.
    get dirty() { return S.step > 0 || !!(S.account.name || S.account.email || S.account.password); },
  };
})();
