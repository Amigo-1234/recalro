/* ==========================================================================
   Recalro app core: helpers, sample course content, local store, spaced
   repetition scheduler, gamification engine and derived learning statistics.

   IMPORTANT: this prototype has no backend. Everything personal (XP, streaks,
   accuracy, mastery, recommendations) is computed from activity recorded in
   this browser's localStorage. Sample course content and sample peers are
   labelled as such in the UI. See README "Integration points".
   ========================================================================== */
(function () {
  "use strict";
  const R = (window.R = window.R || {});

  /* ---------- Small helpers ---------- */
  R.$ = (s, root = document) => root.querySelector(s);
  R.$$ = (s, root = document) => [...root.querySelectorAll(s)];
  R.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  R.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  R.clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  R.sum = (arr, f = (x) => x) => arr.reduce((t, x) => t + (Number(f(x)) || 0), 0);
  R.fmt = (n) => Number(n || 0).toLocaleString();
  R.pct = (n) => (n == null || Number.isNaN(n) ? "—" : `${Math.round(n)}%`);
  R.dayKey = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  R.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  R.startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  R.startOfWeek = (d = new Date()) => { const x = R.startOfDay(d); const dow = (x.getDay() + 6) % 7; return R.addDays(x, -dow); };
  R.dayName = (d, len = "short") => new Date(d).toLocaleDateString(undefined, { weekday: len });
  R.fmtDate = (d, opts = { month: "short", day: "numeric" }) => new Date(d).toLocaleDateString(undefined, opts);
  R.relTime = (iso) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
    const days = Math.round(diff / 86400);
    return days === 1 ? "yesterday" : days < 7 ? `${days} days ago` : R.fmtDate(iso);
  };
  R.inDays = (iso) => {
    const days = Math.round((R.startOfDay(iso) - R.startOfDay()) / 86400000);
    return days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  };
  R.plural = (n, word, many = word + "s") => `${R.fmt(n)} ${n === 1 ? word : many}`;
  R.hash = (str) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  /* ---------- Event bus ---------- */
  const listeners = {};
  R.on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); return () => (listeners[evt] = listeners[evt].filter((f) => f !== fn)); };
  R.emit = (evt, data) => (listeners[evt] || []).slice().forEach((fn) => { try { fn(data); } catch (e) { console.error(`Recalro: "${evt}" listener failed`, e); } });

  /* ---------- Sample course content (clearly labelled "Sample course" in UI) ---------- */
  const C = (R.content = {});
  C.subjects = [
    { id: "thermo", name: "Thermodynamics", field: "Mechanical Engineering", sample: true,
      modules: [{ id: "thermo-1", name: "Foundations & the first law" }, { id: "thermo-2", name: "Second law & entropy" }, { id: "thermo-3", name: "Power cycles" }] },
    { id: "fluids", name: "Fluid Mechanics", field: "Mechanical Engineering", sample: true,
      modules: [{ id: "fluids-1", name: "Fluid properties & statics" }, { id: "fluids-2", name: "Conservation laws" }, { id: "fluids-3", name: "Flow in pipes" }] },
    { id: "maths", name: "Engineering Mathematics", field: "Core course", sample: true,
      modules: [{ id: "maths-1", name: "Complex numbers" }, { id: "maths-2", name: "Calculus" }, { id: "maths-3", name: "Linear algebra" }] },
  ];
  const card = (id, subject, module, front, back) => ({ id, subject, module, front, back, sample: true });
  C.cards = [
    card("th-1", "thermo", "thermo-1", "What does the first law of thermodynamics state?", "Energy cannot be created or destroyed. It can only be transferred or converted from one form to another (ΔU = Q − W)."),
    card("th-2", "thermo", "thermo-1", "How does a closed system differ from an isolated system?", "A closed system exchanges energy but not mass with its surroundings. An isolated system exchanges neither energy nor mass."),
    card("th-3", "thermo", "thermo-1", "What is the SI unit of energy?", "The joule (J), equal to one newton-metre."),
    card("th-4", "thermo", "thermo-2", "Define entropy in thermodynamics.", "A property that measures energy dispersal and the number of microscopic configurations available to a system."),
    card("th-5", "thermo", "thermo-2", "State the Clausius statement of the second law.", "Heat cannot spontaneously flow from a colder body to a hotter body without external work."),
    card("th-6", "thermo", "thermo-2", "What happens to entropy in a reversible adiabatic process?", "It stays constant. A reversible adiabatic process is isentropic."),
    card("th-7", "thermo", "thermo-3", "Which ideal cycle models a gas turbine engine?", "The Brayton cycle: isentropic compression, constant-pressure heat addition, isentropic expansion, constant-pressure heat rejection."),
    card("th-8", "thermo", "thermo-3", "What is the thermal efficiency of an ideal Brayton cycle?", "η = 1 − 1 / rₚ^((γ−1)/γ), where rₚ is the pressure ratio and γ the ratio of specific heats."),
    card("th-9", "thermo", "thermo-3", "What is the Carnot efficiency between two reservoirs?", "η = 1 − T_C / T_H, using absolute temperatures in kelvin."),
    card("fl-1", "fluids", "fluids-1", "What is the hydrostatic pressure at depth h in a liquid?", "p = p₀ + ρgh, where p₀ is the surface pressure, ρ the density and g gravitational acceleration."),
    card("fl-2", "fluids", "fluids-1", "Define dynamic viscosity.", "The ratio of shear stress to velocity gradient in a fluid: τ = μ (du/dy)."),
    card("fl-3", "fluids", "fluids-1", "What is the SI unit of pressure?", "The pascal (Pa), equal to one newton per square metre."),
    card("fl-4", "fluids", "fluids-2", "What is the continuity equation for incompressible flow?", "A₁v₁ = A₂v₂. The volumetric flow rate stays constant along the flow."),
    card("fl-5", "fluids", "fluids-2", "State Bernoulli's equation.", "P + ½ρv² + ρgh = constant along a streamline, for steady, incompressible, inviscid flow."),
    card("fl-6", "fluids", "fluids-2", "Why does a fluid's pressure drop where a pipe narrows?", "Continuity makes velocity rise in the narrow section; by Bernoulli, higher velocity means lower static pressure."),
    card("fl-7", "fluids", "fluids-3", "How is the Reynolds number defined for pipe flow?", "Re = ρvD / μ, the ratio of inertial to viscous forces."),
    card("fl-8", "fluids", "fluids-3", "Below roughly which Reynolds number is pipe flow laminar?", "About 2,300. Above roughly 4,000 flow is usually turbulent; in between it is transitional."),
    card("fl-9", "fluids", "fluids-3", "What does the Darcy–Weisbach equation give?", "Head loss from friction in a pipe: h_f = f (L/D) (v² / 2g)."),
    card("ma-1", "maths", "maths-1", "State Euler's identity.", "e^(iπ) + 1 = 0."),
    card("ma-2", "maths", "maths-1", "What is the modulus of the complex number a + bi?", "|a + bi| = √(a² + b²)."),
    card("ma-3", "maths", "maths-1", "State Euler's formula.", "e^(iθ) = cos θ + i sin θ."),
    card("ma-4", "maths", "maths-2", "What is the derivative of sin x?", "cos x."),
    card("ma-5", "maths", "maths-2", "State the integration by parts formula.", "∫u dv = uv − ∫v du."),
    card("ma-6", "maths", "maths-2", "State the product rule for differentiation.", "(uv)′ = u′v + uv′."),
    card("ma-7", "maths", "maths-3", "What is the determinant of the 2×2 matrix [[a, b], [c, d]]?", "ad − bc."),
    card("ma-8", "maths", "maths-3", "When is a square matrix invertible?", "When its determinant is non-zero."),
    card("ma-9", "maths", "maths-3", "What defines an eigenvalue λ of a matrix A?", "A non-zero vector v exists such that Av = λv."),
  ];
  C.vault = [
    { id: "v-1", title: "Brayton cycle efficiency", subject: "thermo", category: "formula", detail: "η = 1 − 1 / rₚ^((γ−1)/γ)", sample: true },
    { id: "v-2", title: "First law of thermodynamics", subject: "thermo", category: "law", detail: "Energy can neither be created nor destroyed; it changes form. ΔU = Q − W.", sample: true },
    { id: "v-3", title: "Bernoulli's equation", subject: "fluids", category: "formula", detail: "P + ½ρv² + ρgh = constant", sample: true },
    { id: "v-4", title: "Euler's identity", subject: "maths", category: "formula", detail: "e^(iπ) + 1 = 0", sample: true },
    { id: "v-5", title: "Entropy", subject: "thermo", category: "definition", detail: "A measure of energy dispersal and the number of possible microscopic arrangements.", sample: true },
    { id: "v-6", title: "Continuity equation", subject: "fluids", category: "formula", detail: "A₁v₁ = A₂v₂ for incompressible steady flow.", sample: true },
    { id: "v-7", title: "Second law (Clausius)", subject: "thermo", category: "law", detail: "Heat does not flow spontaneously from a colder body to a hotter one.", sample: true },
    { id: "v-8", title: "Reynolds number", subject: "fluids", category: "definition", detail: "Re = ρvD / μ: the ratio of inertial to viscous forces.", sample: true },
    { id: "v-9", title: "Carnot's Reflections published", subject: "thermo", category: "date", detail: "1824: Sadi Carnot publishes Reflections on the Motive Power of Fire, founding thermodynamic cycle analysis.", sample: true },
    { id: "v-10", title: "Bernoulli's Hydrodynamica", subject: "fluids", category: "date", detail: "1738: Daniel Bernoulli publishes Hydrodynamica, relating pressure and velocity in flowing fluids.", sample: true },
  ];
  C.vaultCategories = [
    { id: "formula", label: "Formulas", icon: "sigma" },
    { id: "definition", label: "Definitions", icon: "book" },
    { id: "law", label: "Laws & principles", icon: "scale" },
    { id: "date", label: "Dates", icon: "calendar" },
    { id: "note", label: "Notes", icon: "note" },
  ];
  const q = (id, subject, module, difficulty, prompt, answers, correct, explanation) => ({ id, subject, module, difficulty, prompt, answers, correct, explanation });
  C.questions = [
    q("q1", "thermo", "thermo-1", "easy", "Which statement best describes the first law of thermodynamics?", ["Energy is always lost in a closed system.", "Energy is conserved and can change form.", "Entropy always decreases.", "Heat and work are identical."], 1, "The first law expresses conservation of energy: ΔU = Q − W."),
    q("q2", "fluids", "fluids-2", "easy", "For incompressible steady flow, which relation expresses continuity?", ["A₁v₁ = A₂v₂", "P₁V₁ = P₂V₂", "F = ma", "Q = mcΔT"], 0, "Mass flow rate is conserved; with constant density, area × velocity is constant."),
    q("q3", "thermo", "thermo-2", "medium", "What does entropy describe in a thermodynamic system?", ["The system's total mass", "Energy dispersal and the number of possible microscopic states", "The rate of heat transfer only", "The pressure at equilibrium"], 1, "Entropy relates to energy dispersal and the number of microscopic configurations."),
    q("q4", "thermo", "thermo-2", "medium", "What happens to total entropy during a spontaneous irreversible process?", ["It decreases", "It remains exactly zero", "It increases", "It becomes independent of the surroundings"], 2, "The total entropy of system plus surroundings increases in an irreversible process."),
    q("q5", "thermo", "thermo-1", "easy", "Which equation describes an ideal-gas state?", ["PV = nRT", "A₁v₁ = A₂v₂", "V = IR", "F = ma"], 0, "The ideal gas law relates pressure, volume, amount of gas and temperature."),
    q("q6", "fluids", "fluids-1", "easy", "What is the SI unit of pressure?", ["Joule", "Pascal", "Watt", "Newton"], 1, "Pressure is measured in pascals (Pa), i.e. newtons per square metre."),
    q("q7", "thermo", "thermo-3", "medium", "In a heat engine, what is the purpose of the working fluid?", ["To convert heat interactions into work over a cycle", "To eliminate all heat losses", "To create energy from nothing", "To keep entropy constant in every process"], 0, "The working fluid undergoes a cycle that produces net work while exchanging heat."),
    q("q8", "thermo", "thermo-2", "medium", "For a reversible adiabatic process, which property remains constant?", ["Pressure", "Volume", "Entropy", "Temperature"], 2, "A reversible adiabatic process is isentropic, so entropy stays constant."),
    q("q9", "thermo", "thermo-1", "easy", "What is the SI unit of energy?", ["Pascal", "Joule", "Ampere", "Kelvin"], 1, "Energy is measured in joules (J)."),
    q("q10", "fluids", "fluids-2", "medium", "Bernoulli's equation relates pressure, velocity and what else along a streamline?", ["Elevation", "Electrical resistance", "Entropy generation only", "Mass fraction"], 0, "The ρgh term accounts for elevation (gravitational potential energy)."),
    q("q11", "thermo", "thermo-3", "hard", "Raising the pressure ratio of an ideal Brayton cycle (γ fixed) will…", ["Lower its thermal efficiency", "Raise its thermal efficiency", "Leave efficiency unchanged", "Make efficiency negative"], 1, "η = 1 − 1/rₚ^((γ−1)/γ) increases as rₚ increases."),
    q("q12", "thermo", "thermo-3", "hard", "A Carnot engine runs between 600 K and 300 K. What is its efficiency?", ["25%", "33%", "50%", "100%"], 2, "η = 1 − 300/600 = 0.5, i.e. 50%."),
    q("q13", "fluids", "fluids-3", "medium", "Pipe flow with Re = 1,200 is most likely…", ["Laminar", "Turbulent", "Supersonic", "Compressible"], 0, "Below about 2,300, pipe flow is laminar."),
    q("q14", "fluids", "fluids-1", "hard", "Gauge pressure 10 m below the surface of water (ρ = 1000 kg/m³, g = 9.81 m/s²) is about…", ["9.8 kPa", "98 kPa", "981 kPa", "1 MPa"], 1, "p = ρgh = 1000 × 9.81 × 10 ≈ 98.1 kPa."),
    q("q15", "maths", "maths-1", "easy", "What is |3 + 4i|?", ["5", "7", "1", "25"], 0, "√(3² + 4²) = √25 = 5."),
    q("q16", "maths", "maths-2", "easy", "What is d/dx (x³)?", ["3x²", "x²", "3x³", "x⁴/4"], 0, "Power rule: d/dx xⁿ = n xⁿ⁻¹."),
    q("q17", "maths", "maths-3", "medium", "What is the determinant of [[2, 1], [4, 3]]?", ["2", "10", "−2", "6"], 0, "ad − bc = 2·3 − 1·4 = 2."),
    q("q18", "maths", "maths-2", "medium", "∫ x eˣ dx equals…", ["x eˣ − eˣ + C", "x² eˣ / 2 + C", "eˣ + C", "x eˣ + C"], 0, "Integration by parts with u = x, dv = eˣ dx gives x eˣ − eˣ + C."),
    q("q19", "maths", "maths-3", "hard", "If A v = 3 v for a non-zero vector v, then 3 is…", ["An eigenvalue of A", "The determinant of A", "The trace of A", "The rank of A"], 0, "By definition, λ = 3 is an eigenvalue with eigenvector v."),
    q("q20", "maths", "maths-1", "medium", "Using Euler's formula, e^(iπ/2) equals…", ["i", "−1", "1", "−i"], 0, "cos(π/2) + i sin(π/2) = 0 + i = i."),
  ];
  C.groups = [
    { id: "g-thermo", name: "Thermodynamics Circle", topic: "Mechanical Engineering", subject: "thermo", members: ["Mira K.", "K. Ade", "Jon B.", "Lena O.", "Priya S."], memberCount: 18, goal: 120, baseProgress: 86, icon: "flame" },
    { id: "g-maths", name: "Engineering Maths Lab", topic: "Problem solving", subject: "maths", members: ["Nia T.", "Sam R.", "Ola F.", "Chen W."], memberCount: 32, goal: 200, baseProgress: 131, icon: "sigma" },
    { id: "g-exam", name: "Exam Prep 2026", topic: "Weekly challenges", subject: "fluids", members: ["StudyPilot", "Mira K.", "Ike N.", "Rosa D.", "Tom H."], memberCount: 64, goal: 400, baseProgress: 244, icon: "target" },
  ];
  C.groupFeed = [
    ["Mira K.", "reviewed 30 Thermodynamics cards", 2],
    ["K. Ade", "scored 9/10 on a Fluid Mechanics practice exam", 5],
    ["Nia T.", "saved 4 formulas to the vault", 8],
    ["StudyPilot", "completed a 7-day streak", 20],
  ];
  // Sample peers for league previews. Real leagues need a backend.
  C.peers = [["StudyPilot", 420], ["Mira K.", 360], ["K. Ade", 290], ["Nia T.", 210], ["Jon B.", 150], ["Lena O.", 95], ["Sam R.", 60], ["Ola F.", 25]];
  C.leagues = [
    { id: "bronze", name: "Bronze", min: 0 }, { id: "silver", name: "Silver", min: 300 }, { id: "gold", name: "Gold", min: 900 },
    { id: "sapphire", name: "Sapphire", min: 2000 }, { id: "diamond", name: "Diamond", min: 4000 },
  ];
  C.store = [
    { id: "frame-teal", name: "Teal Focus Frame", kind: "frame", cost: 120, desc: "A teal ring around your avatar.", value: "teal" },
    { id: "frame-sunrise", name: "Sunrise Frame", kind: "frame", cost: 180, desc: "A warm orange gradient ring.", value: "sunrise" },
    { id: "avatar-scholar", name: "Scholar Avatar", kind: "avatar", cost: 240, desc: "A graduation-cap avatar badge.", value: "🎓" },
    { id: "avatar-rocket", name: "Momentum Avatar", kind: "avatar", cost: 90, desc: "For learners who keep moving.", value: "🚀" },
    { id: "avatar-atom", name: "Atom Avatar", kind: "avatar", cost: 150, desc: "For the scientifically curious.", value: "⚛️" },
    { id: "banner-quiet", name: "Quiet Study Banner", kind: "banner", cost: 200, desc: "A calm teal banner for your profile.", value: "quiet" },
  ];
  C.achievements = [
    { id: "first-review", name: "First Recall", desc: "Review your first flashcard.", icon: "cards", gems: 10, metric: (s) => s.reviews, target: 1 },
    { id: "reviews-50", name: "Memory Builder", desc: "Review 50 flashcards.", icon: "brain", gems: 25, metric: (s) => s.reviews, target: 50 },
    { id: "reviews-200", name: "Recall Master", desc: "Review 200 flashcards.", icon: "brain", gems: 60, metric: (s) => s.reviews, target: 200 },
    { id: "first-exam", name: "Under Pressure", desc: "Finish a practice exam.", icon: "clipboard", gems: 15, metric: (s) => s.exams, target: 1 },
    { id: "perfect-exam", name: "Flawless", desc: "Score 100% on a practice exam of 5+ questions.", icon: "star", gems: 40, metric: (s) => s.perfectExams, target: 1 },
    { id: "streak-3", name: "On a Roll", desc: "Study 3 days in a row.", icon: "flame", gems: 15, metric: (s) => s.bestStreak, target: 3 },
    { id: "streak-7", name: "Week Warrior", desc: "Study 7 days in a row.", icon: "flame", gems: 50, metric: (s) => s.bestStreak, target: 7 },
    { id: "level-5", name: "Rising Scholar", desc: "Reach level 5.", icon: "award", gems: 40, metric: (s) => s.level, target: 5 },
    { id: "vault-5", name: "Curator", desc: "Save 5 items to your Knowledge Vault.", icon: "archive", gems: 20, metric: (s) => s.vaultSaved, target: 5 },
    { id: "explainer", name: "Teach It Back", desc: "Explain a concept in your own words.", icon: "quote", gems: 15, metric: (s) => s.explanations, target: 1 },
    { id: "module-master", name: "Module Mastered", desc: "Reach 80% mastery in any module.", icon: "map", gems: 30, metric: (s) => s.modulesMastered, target: 1 },
    { id: "social", name: "Better Together", desc: "Join a study group.", icon: "users", gems: 10, metric: (s) => s.groups, target: 1 },
  ];
  // Daily quest pool: progress is counted from today's recorded activity.
  C.questPool = [
    { id: "review-20", title: "Review 20 flashcards", icon: "cards", target: 20, xp: 20, count: (a) => a.filter((x) => x.t === "review").length, route: "flashcards" },
    { id: "review-10", title: "Review 10 flashcards", icon: "cards", target: 10, xp: 15, count: (a) => a.filter((x) => x.t === "review").length, route: "flashcards" },
    { id: "answer-10", title: "Answer 10 practice questions", icon: "zap", target: 10, xp: 25, count: (a) => a.filter((x) => x.t === "answer").length, route: "practice" },
    { id: "correct-5", title: "Get 5 questions right", icon: "check", target: 5, xp: 20, count: (a) => a.filter((x) => x.t === "answer" && x.correct).length, route: "practice" },
    { id: "vault-1", title: "Save something to your vault", icon: "archive", target: 1, xp: 10, count: (a) => a.filter((x) => x.t === "vault").length, route: "vault" },
    { id: "xp-60", title: "Earn 60 XP from studying", icon: "bolt", target: 60, xp: 15, count: (a) => R.sum(a.filter((x) => x.t !== "quest" && x.t !== "bonus"), (x) => x.xp), route: "flashcards" },
    { id: "explain-1", title: "Explain a concept in your own words", icon: "quote", target: 1, xp: 15, count: (a) => a.filter((x) => x.t === "explain").length, route: "tutor/explain" },
    { id: "subjects-2", title: "Study two different subjects", icon: "book", target: 2, xp: 15, count: (a) => new Set(a.filter((x) => x.subject && x.t !== "quest").map((x) => x.subject)).size, route: "subjects" },
  ];
  C.challenges = [
    { id: "wk-reviews", title: "Review 100 cards this week", icon: "cards", target: 100, xp: 60, gems: 20, count: (a) => a.filter((x) => x.t === "review").length },
    { id: "wk-exams", title: "Finish 3 practice exams", icon: "clipboard", target: 3, xp: 50, gems: 20, count: (a) => a.filter((x) => x.t === "exam").length },
    { id: "wk-days", title: "Study on 5 different days", icon: "calendar", target: 5, xp: 70, gems: 25, count: (a) => new Set(a.map((x) => R.dayKey(x.at))).size },
    { id: "wk-accuracy", title: "Answer 25 questions correctly", icon: "target", target: 25, xp: 50, gems: 20, count: (a) => a.filter((x) => (x.t === "answer" && x.correct) || (x.t === "review" && (x.rating === "Good" || x.rating === "Easy"))).length },
  ];
  // Estimated minutes per activity, used for "est. study time".
  C.minutes = { review: 0.5, answer: 1.5, exam: 0, summary: 3, explain: 5, chat: 1, vault: 1, quest: 0, bonus: 0, material: 0 };
  C.xp = { review: { Again: 4, Hard: 7, Good: 10, Easy: 10 }, answerCorrect: 10, answerWrong: 3, examFinish: 20, summary: 10, explain: 15, chat: 2, vault: 5 };

  /* ---------- Local store ---------- */
  const KEY = "recalro-app-v2", LEGACY_KEY = "recalro-demo-v1";
  const defaults = () => ({
    version: 2, createdAt: new Date().toISOString(),
    activity: [], cards: {}, customCards: [], subjects: [], materials: [],
    favorites: [], savedVault: [], milestones: [], planner: [], deadlines: [], customQuests: [],
    questClaims: {}, challengeClaims: {}, joinedGroups: [], customGroups: [],
    purchases: [], equipped: { frame: null, avatar: null, banner: null }, gems: 340, achievements: {},
    examHistory: [], chats: [], summaries: [], explanations: [], notifications: [],
    profile: { displayName: "" },
    settings: { dailyGoal: 45, weeklyReport: true, leaderboardPrivate: true, reduceMotion: false, sidebarCollapsed: false, navOpen: {} },
  });
  function merge(base, saved) {
    const out = { ...base, ...saved };
    out.settings = { ...base.settings, ...(saved.settings || {}) };
    out.equipped = { ...base.equipped, ...(saved.equipped || {}) };
    out.profile = { ...base.profile, ...(saved.profile || {}) };
    for (const k of Object.keys(base)) if (Array.isArray(base[k]) && !Array.isArray(out[k])) out[k] = [];
    return out;
  }
  // Carry over everything the previous prototype saved (recalro-demo-v1).
  function migrate(v1) {
    const s = defaults();
    const legacyCards = ["th-1", "th-4", "fl-4"];
    (v1.reviews || []).forEach((r) => s.activity.push({ id: R.uid(), t: "review", at: r.at || s.createdAt, cardId: legacyCards[r.card] || "th-1", subject: (legacyCards[r.card] || "th-1").startsWith("fl") ? "fluids" : "thermo", rating: r.rating, xp: 0, migrated: true }));
    (v1.subjects || []).forEach((x) => s.subjects.push({ id: "s-" + R.uid(), name: x.name, field: "Personal subject", modules: [{ id: "m-" + R.uid(), name: "General" }] }));
    (v1.milestones || []).forEach((t) => s.milestones.push({ id: R.uid(), title: t, subject: "thermo", done: false }));
    (v1.plannerTasks || []).forEach((t) => s.planner.push({ id: R.uid(), title: t, date: R.dayKey(), time: "", duration: 30, done: false }));
    (v1.customQuests || []).forEach((t) => s.customQuests.push({ id: R.uid(), title: t, done: !!(v1.questDone || {})[t] }));
    (v1.savedVault || []).forEach((v) => s.savedVault.push({ id: "uv-" + R.uid(), title: v.title, detail: v.detail, category: v.category === "principle" ? "law" : v.category || "note", subject: "" }));
    s.favorites = (v1.favorites || []).map((title) => [...C.vault, ...s.savedVault].find((v) => v.title === title)?.id).filter(Boolean);
    (v1.customGroups || []).forEach((name) => s.customGroups.push({ id: "cg-" + R.uid(), name, topic: "Personal group", goal: 50 }));
    s.joinedGroups = (v1.joinedGroups || []).map((name) => [...C.groups, ...s.customGroups].find((g) => g.name === name)?.id).filter(Boolean);
    s.purchases = (v1.purchases || []).map((name) => C.store.find((i) => i.name === name)?.id).filter(Boolean);
    if (typeof v1.gems === "number") s.gems = v1.gems;
    ["dailyGoal", "weeklyReport", "leaderboardPrivate"].forEach((k) => { if (k in v1) s.settings[k] = v1[k]; });
    (v1.examHistory || []).forEach((e) => s.examHistory.push({ id: R.uid(), subject: "thermo", mode: "exam", score: e.score, total: e.total, at: e.at, questions: [], migrated: true }));
    return s;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const saved = JSON.parse(raw); if (saved && typeof saved === "object") return merge(defaults(), saved); }
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) { const migrated = migrate(JSON.parse(legacy) || {}); R.migrated = true; return migrated; }
    } catch (error) {
      console.error("Recalro: saved learning data could not be loaded. Starting fresh.", error);
      R.loadError = true;
    }
    return defaults();
  }
  R.state = load();
  R.save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(R.state)); }
    catch (error) { console.error("Recalro: could not save learning data.", error); R.emit("save-error", error); }
  };
  if (R.migrated) R.save();
  R.resetDemo = () => { const keep = R.state.settings; R.state = defaults(); R.state.settings = { ...R.state.settings, sidebarCollapsed: keep.sidebarCollapsed, navOpen: keep.navOpen }; R.save(); R.emit("change"); };
  R.update = (fn) => { fn(R.state); R.save(); R.emit("change"); };

  /* ---------- Lookups ---------- */
  R.subjects = () => [...C.subjects, ...R.state.subjects];
  R.subject = (id) => R.subjects().find((s) => s.id === id);
  R.subjectIndex = (id) => Math.max(0, R.subjects().findIndex((s) => s.id === id));
  R.module = (id) => { for (const s of R.subjects()) { const m = (s.modules || []).find((x) => x.id === id); if (m) return { ...m, subject: s }; } return null; };
  R.cards = (subjectId) => [...C.cards, ...R.state.customCards].filter((c) => !subjectId || c.subject === subjectId);
  R.card = (id) => R.cards().find((c) => c.id === id);
  R.vaultItems = () => [...C.vault, ...R.state.savedVault];
  R.groups = () => [...C.groups, ...R.state.customGroups.map((g) => ({ ...g, members: [], memberCount: 1, baseProgress: 0, icon: "users", custom: true }))];
  R.displayName = () => R.state.profile.displayName || window.RecalroAuth?.currentUser()?.name || "Learner";
  R.firstName = () => R.displayName().split(/\s+/)[0];
  R.initials = (name = R.displayName()) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "R";

  /* ---------- Spaced repetition (local SM-2 scheduler) ----------
     Integration point: replace R.schedule with the backend's SM-2 endpoint.
     Ratings map to SM-2 quality: Again 1, Hard 3, Good 4, Easy 5. */
  const QUALITY = { Again: 1, Hard: 3, Good: 4, Easy: 5 };
  R.cardState = (id) => R.state.cards[id] || { ef: 2.5, interval: 0, reps: 0, due: null, last: null, lapses: 0, lastRating: null };
  function nextState(cs, rating, now = new Date()) {
    const qv = QUALITY[rating];
    const s = { ...cs };
    s.ef = Math.max(1.3, +(s.ef + 0.1 - (5 - qv) * (0.08 + (5 - qv) * 0.02)).toFixed(2));
    if (qv < 3) { s.reps = 0; s.interval = 0; s.lapses += 1; s.due = new Date(now.getTime() + 10 * 60000).toISOString(); }
    else {
      s.reps += 1;
      if (s.reps === 1) s.interval = qv === 5 ? 2 : 1;
      else if (s.reps === 2) s.interval = qv === 3 ? 3 : 6;
      else s.interval = Math.max(1, Math.round(s.interval * s.ef * (qv === 3 ? 0.8 : qv === 5 ? 1.3 : 1)));
      s.due = R.addDays(now, s.interval).toISOString();
    }
    s.last = now.toISOString(); s.lastRating = rating;
    return s;
  }
  R.previewInterval = (id, rating) => {
    const s = nextState(R.cardState(id), rating);
    return QUALITY[rating] < 3 ? "10 min" : s.interval === 1 ? "1 day" : `${s.interval} days`;
  };
  R.isDue = (id, now = Date.now()) => { const s = R.state.cards[id]; return !!(s && s.due && new Date(s.due).getTime() <= now); };
  R.isNew = (id) => !R.state.cards[id];
  R.dueCards = (subjectId) => R.cards(subjectId).filter((c) => R.isDue(c.id));
  R.newCards = (subjectId) => R.cards(subjectId).filter((c) => R.isNew(c.id));
  R.retention = (id, at = Date.now()) => {
    const s = R.state.cards[id];
    if (!s || !s.last) return null;
    const stability = Math.max(0.4, s.interval || 0.4) * (s.ef / 2.5);
    const days = Math.max(0, (at - new Date(s.last).getTime()) / 86400000);
    return Math.pow(0.9, days / stability);
  };
  R.cardMastery = (id) => {
    const s = R.state.cards[id];
    if (!s || !s.reps) return s && s.lapses ? 0.1 : 0;
    const base = Math.min(1, s.reps / 3);
    return s.lastRating === "Hard" ? base * 0.7 : base;
  };
  R.mastery = (cards) => (cards.length ? (R.sum(cards, (c) => R.cardMastery(c.id)) / cards.length) * 100 : 0);
  R.subjectMastery = (id) => R.mastery(R.cards(id));
  R.moduleMastery = (id) => R.mastery(R.cards().filter((c) => c.module === id));
  R.moduleStatus = (subject) => {
    let activeSet = false;
    return (subject.modules || []).map((m) => {
      const mastery = R.moduleMastery(m.id), count = R.cards().filter((c) => c.module === m.id).length;
      let status = mastery >= 80 ? "done" : "upcoming";
      if (status !== "done" && !activeSet) { status = "active"; activeSet = true; }
      return { ...m, mastery, count, status };
    });
  };

  /* ---------- Activity, XP and levels ---------- */
  R.levelFor = (xp) => { let L = 1; while (50 * (L + 1) * L <= xp) L++; return L; };
  R.levelInfo = (xp = R.totalXP()) => {
    const level = R.levelFor(xp), start = 50 * level * (level - 1), next = 50 * (level + 1) * level;
    return { level, xp, start, next, into: xp - start, needed: next - start, pct: ((xp - start) / (next - start)) * 100 };
  };
  R.totalXP = () => R.sum(R.state.activity, (a) => a.xp);
  R.activityOn = (day) => R.state.activity.filter((a) => R.dayKey(a.at) === day);
  R.activitySince = (date) => { const t = new Date(date).getTime(); return R.state.activity.filter((a) => new Date(a.at).getTime() >= t); };
  R.minutesFor = (list) => R.sum(list, (a) => C.minutes[a.t] ?? 0);
  R.studyDays = () => new Set(R.state.activity.filter((a) => a.t !== "bonus" && a.t !== "quest").map((a) => R.dayKey(a.at)));
  R.streak = () => {
    const days = R.studyDays();
    const today = R.dayKey(), yesterday = R.dayKey(R.addDays(new Date(), -1));
    let current = 0, cursor = days.has(today) ? new Date() : days.has(yesterday) ? R.addDays(new Date(), -1) : null;
    while (cursor && days.has(R.dayKey(cursor))) { current++; cursor = R.addDays(cursor, -1); }
    let best = 0, run = 0, prev = null;
    [...days].sort().forEach((d) => { run = prev && R.dayKey(R.addDays(prev, 1)) === d ? run + 1 : 1; best = Math.max(best, run); prev = new Date(d + "T12:00:00"); });
    return { current, best: Math.max(best, current), todayDone: days.has(today), atRisk: !days.has(today) && days.has(yesterday) };
  };
  R.series = (n) => Array.from({ length: n }, (_, i) => {
    const day = R.addDays(new Date(), i - n + 1), key = R.dayKey(day), list = R.activityOn(key);
    const answers = list.filter((a) => a.t === "answer"), reviews = list.filter((a) => a.t === "review");
    const correct = answers.filter((a) => a.correct).length + reviews.filter((a) => a.rating === "Good" || a.rating === "Easy").length;
    const attempts = answers.length + reviews.length;
    return { day, key, xp: R.sum(list, (a) => a.xp), minutes: R.minutesFor(list), reviews: reviews.length, answers: answers.length, accuracy: attempts ? (correct / attempts) * 100 : null, attempts };
  });
  R.accuracy = (list = R.state.activity) => {
    const att = list.filter((a) => a.t === "answer" || a.t === "review");
    if (!att.length) return null;
    return (att.filter((a) => (a.t === "answer" && a.correct) || (a.t === "review" && (a.rating === "Good" || a.rating === "Easy"))).length / att.length) * 100;
  };
  R.stats = () => {
    const a = R.state.activity, st = R.streak();
    return {
      reviews: a.filter((x) => x.t === "review").length,
      exams: R.state.examHistory.length,
      perfectExams: R.state.examHistory.filter((e) => e.total >= 5 && e.score === e.total).length,
      bestStreak: st.best, level: R.levelInfo().level,
      vaultSaved: R.state.savedVault.length, explanations: R.state.explanations.length,
      modulesMastered: R.subjects().flatMap((s) => s.modules || []).filter((m) => R.moduleMastery(m.id) >= 80 && R.cards().some((c) => c.module === m.id)).length,
      groups: R.state.joinedGroups.length,
    };
  };

  /* ---------- Notifications ---------- */
  R.notify = (text, icon = "bell", route = null) => {
    R.state.notifications.unshift({ id: R.uid(), text, icon, route, at: new Date().toISOString(), read: false });
    R.state.notifications = R.state.notifications.slice(0, 30);
  };

  /* ---------- Quests, challenges and achievements ---------- */
  R.todaysQuests = () => {
    const day = R.dayKey(), seed = R.hash(day), pool = [...C.questPool];
    const picks = [];
    // Deterministic per-day selection; never two review quests on the same day.
    let i = seed;
    while (picks.length < 3 && pool.length) {
      const item = pool.splice(i % pool.length, 1)[0];
      if (!(item.id.startsWith("review") && picks.some((p) => p.id.startsWith("review")))) picks.push(item);
      i = Math.imul(i, 31) + 7 >>> 0;
    }
    const today = R.activityOn(day), claims = R.state.questClaims[day] || {};
    return picks.map((qd) => { const progress = Math.min(qd.target, qd.count(today)); return { ...qd, progress, done: progress >= qd.target, claimed: !!claims[qd.id] }; });
  };
  R.weekKey = () => R.dayKey(R.startOfWeek());
  R.weeklyChallenges = () => {
    const week = R.activitySince(R.startOfWeek()), claims = R.state.challengeClaims[R.weekKey()] || {};
    return C.challenges.map((c) => { const progress = Math.min(c.target, c.count(week)); return { ...c, progress, done: progress >= c.target, claimed: !!claims[c.id] }; });
  };
  R.achievementList = () => {
    const s = R.stats();
    return C.achievements.map((a) => { const value = a.metric(s); return { ...a, value: Math.min(value, a.target), unlockedAt: R.state.achievements[a.id] || null }; });
  };
  function settleRewards(events) {
    // Daily quests complete automatically once their target is met.
    const day = R.dayKey();
    R.todaysQuests().forEach((qd) => {
      if (qd.done && !qd.claimed) {
        (R.state.questClaims[day] = R.state.questClaims[day] || {})[qd.id] = true;
        R.state.activity.push({ id: R.uid(), t: "quest", at: new Date().toISOString(), xp: qd.xp, questId: qd.id });
        R.state.gems += 5;
        R.notify(`Quest complete: ${qd.title} (+${qd.xp} XP, +5 gems)`, "check", "quests");
        events.quests.push(qd);
      }
    });
    R.achievementList().forEach((a) => {
      if (!a.unlockedAt && a.value >= a.target) {
        R.state.achievements[a.id] = new Date().toISOString();
        R.state.gems += a.gems;
        R.notify(`Achievement unlocked: ${a.name} (+${a.gems} gems)`, a.icon, "achievements");
        events.achievements.push(a);
      }
    });
  }
  /* Record one learning activity (or several at once). Rewards are settled once,
     then "earned" is emitted so the shell can animate XP and celebrate unlocks
     near `anchor` (the element the learner interacted with). */
  R.record = (entries, anchor = null) => {
    const list = (Array.isArray(entries) ? entries : [entries]).map((e) => ({ id: R.uid(), at: new Date().toISOString(), xp: 0, ...e }));
    const before = R.levelInfo(), streakBefore = R.streak().current;
    R.state.activity.push(...list);
    const events = { quests: [], achievements: [] };
    settleRewards(events);
    const after = R.levelInfo(), streakAfter = R.streak().current;
    if (after.level > before.level) { R.state.gems += 15; R.notify(`Level up! You reached level ${after.level} (+15 gems)`, "award", "profile"); }
    R.save();
    const result = { xp: R.sum(list, (x) => x.xp) + R.sum(events.quests, (x) => x.xp), items: list, item: list[0], ...events, anchor, levelUp: after.level > before.level ? after.level : null, streakUp: streakAfter > streakBefore ? streakAfter : null };
    R.emit("change");
    R.emit("earned", result);
    return result;
  };
  /* Rate a flashcard: update its schedule and record the review. */
  R.rateCard = (id, rating, anchor) => {
    const c = R.card(id);
    R.state.cards[id] = nextState(R.cardState(id), rating);
    return R.record({ t: "review", cardId: id, subject: c?.subject, module: c?.module, rating, xp: C.xp.review[rating] }, anchor);
  };
  R.claimChallenge = (id) => {
    const c = R.weeklyChallenges().find((x) => x.id === id);
    if (!c || !c.done || c.claimed) return null;
    (R.state.challengeClaims[R.weekKey()] = R.state.challengeClaims[R.weekKey()] || {})[id] = true;
    R.state.gems += c.gems;
    return R.record({ t: "bonus", xp: c.xp, challengeId: id });
  };

  /* ---------- Insights derived from real activity ---------- */
  R.weakTopics = () => {
    const byModule = {};
    const bump = (moduleId, wrong) => { if (!moduleId) return; const m = (byModule[moduleId] = byModule[moduleId] || { attempts: 0, errors: 0 }); m.attempts++; if (wrong) m.errors++; };
    R.state.activity.forEach((a) => {
      if (a.t === "review") bump(a.module || R.card(a.cardId)?.module, a.rating === "Again" || a.rating === "Hard");
      if (a.t === "answer") bump(a.module, !a.correct);
    });
    return Object.entries(byModule)
      .map(([id, m]) => ({ ...m, id, module: R.module(id), rate: m.errors / m.attempts }))
      .filter((m) => m.module && m.attempts >= 2 && m.errors >= 1 && m.rate >= 0.3)
      .sort((x, y) => y.rate - x.rate || y.errors - x.errors);
  };
  R.strongTopics = () => {
    const out = [];
    R.subjects().forEach((s) => (s.modules || []).forEach((m) => { const v = R.moduleMastery(m.id); if (v >= 60) out.push({ module: { ...m, subject: s }, mastery: v }); }));
    return out.sort((a, b) => b.mastery - a.mastery);
  };
  R.lastStudied = (subjectId) => { const list = R.state.activity.filter((a) => a.subject === subjectId); return list.length ? list[list.length - 1].at : null; };
  R.readiness = (subjectId) => {
    const cards = R.cards(subjectId), seen = cards.filter((c) => !R.isNew(c.id));
    const coverage = cards.length ? (seen.length / cards.length) * 100 : 0;
    const answers = R.state.activity.filter((a) => a.t === "answer" && a.subject === subjectId);
    const practice = answers.length ? (answers.filter((a) => a.correct).length / answers.length) * 100 : null;
    const reviewHealth = seen.length ? ((seen.length - seen.filter((c) => R.isDue(c.id)).length) / seen.length) * 100 : null;
    const days = R.series(14).filter((d) => R.activityOn(d.key).some((a) => a.subject === subjectId)).length;
    const consistency = (days / 14) * 100;
    const parts = [coverage, practice ?? 0, reviewHealth ?? 0, consistency];
    const score = parts[0] * 0.3 + parts[1] * 0.35 + parts[2] * 0.2 + parts[3] * 0.15;
    return { coverage, practice, reviewHealth, consistency, score, enoughData: seen.length >= 3 && answers.length >= 3 };
  };
  /* Recommendations: every item is backed by a concrete signal in recorded activity. */
  R.recommendations = () => {
    const recs = [], due = R.dueCards(), weak = R.weakTopics(), st = R.streak();
    if (st.atRisk && st.current > 0) recs.push({ icon: "flame", tone: "orange", title: `Keep your ${st.current}-day streak alive`, body: "You studied yesterday but not yet today. A five-minute review keeps it going.", action: { label: "Quick review", route: "flashcards" }, reason: "Based on your study days" });
    if (weak[0]) {
      const w = weak[0];
      recs.push({ icon: "target", tone: "orange", title: `Revise ${w.module.name}`, body: `You've missed ${w.errors} of your last ${w.attempts} attempts on ${w.module.name} (${w.module.subject.name}). Spend 10 minutes revising it.`, action: { label: "Revise this topic", route: `flashcards?module=${w.id}` }, reason: "From your review ratings and practice answers" });
    }
    if (due.length) recs.push({ icon: "refresh", tone: "teal", title: `${R.plural(due.length, "card")} ready for review`, body: "These are due now according to your spaced-repetition schedule. Reviewing on time strengthens recall.", action: { label: "Start review", route: "review" }, reason: "From your review schedule" });
    const soon = R.state.deadlines.map((d) => ({ ...d, days: Math.round((R.startOfDay(d.date) - R.startOfDay()) / 86400000) })).filter((d) => d.days >= 0 && d.days <= 14).sort((a, b) => a.days - b.days)[0];
    if (soon) recs.push({ icon: "gauge", tone: "teal", title: `${soon.title} is ${R.inDays(soon.date)}`, body: "Check how prepared you are and what to focus on before then.", action: { label: "Check readiness", route: `readiness?subject=${soon.subject || "thermo"}` }, reason: "From your planner deadlines" });
    if (!R.state.examHistory.length && R.state.activity.length) recs.push({ icon: "clipboard", tone: "teal", title: "Calibrate with a practice exam", body: "You haven't tried a practice exam yet. Five questions show where you stand.", action: { label: "Start practice", route: "practice" }, reason: "No exam attempts recorded" });
    const active = R.subjects().map((s) => ({ s, mod: R.moduleStatus(s).find((m) => m.status === "active") })).find((x) => x.mod && R.lastStudied(x.s.id));
    if (active) recs.push({ icon: "map", tone: "teal", title: `Continue ${active.mod.name}`, body: `You're ${Math.round(active.mod.mastery)}% through this module in ${active.s.name}.`, action: { label: "Continue", route: `flashcards?module=${active.mod.id}` }, reason: "From your roadmap progress" });
    if (!R.state.activity.length) recs.push({ icon: "sparkles", tone: "teal", title: "Start with your first review", body: "Recalro learns from what you do. Review a few sample cards and your insights will start to appear here.", action: { label: "Review sample cards", route: "flashcards" }, reason: "No activity recorded yet" });
    return recs;
  };
})();
