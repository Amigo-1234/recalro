/* ==========================================================================
   Past Questions: institution config + DEMONSTRATION question bank.

   IMPORTANT: no verified EKSU past-question bank exists in this project yet.
   Every question below is an ORIGINAL practice question written for this
   prototype and organised like EKSU 100-level first-semester courses. None is
   an official EKSU past question, and the UI says so wherever they appear.

   Question-bank contract (what the real backend should return):
     Institution { id, name, short, levels[] }
     Collection  { id, institution, faculty, department, level, semester,
                   code, title, session (e.g. "2022/2023") | null,
                   source: { kind: "past" | "practice", verified: boolean, note } }
     Question    { id, collection, topic, difficulty: "easy"|"medium"|"hard",
                   type: "numerical"|"theory", q, options[4], answer (index),
                   explanation: { concept, formula?, given?, steps?[], result?,
                                  why?, wrong?: { [index]: string }, mistake? },
                   source: { kind, verified, year?, paper? } }
   Only collections with source.kind === "past" && verified === true may be
   labelled "past question" in the UI. See README → Past Questions.
   ========================================================================== */
(function () {
  "use strict";
  const PRACTICE = { kind: "practice", verified: false, note: "Original practice question written for Recalro. Not from an EKSU examination paper." };

  const institutions = [{ id: "eksu", name: "Ekiti State University", short: "EKSU", city: "Ado-Ekiti", levels: [100, 200, 300, 400] }];

  const collections = [
    { id: "eksu-mth101", institution: "eksu", faculty: "Science", department: "Mathematics", level: 100, semester: 1, code: "MTH 101", title: "Elementary Mathematics I", session: null, source: PRACTICE },
    { id: "eksu-phy101", institution: "eksu", faculty: "Science", department: "Physics", level: 100, semester: 1, code: "PHY 101", title: "General Physics I (Mechanics)", session: null, source: PRACTICE },
    { id: "eksu-chm101", institution: "eksu", faculty: "Science", department: "Chemistry", level: 100, semester: 1, code: "CHM 101", title: "General Chemistry I", session: null, source: PRACTICE },
    { id: "eksu-gst111", institution: "eksu", faculty: "General Studies", department: "General Studies", level: 100, semester: 1, code: "GST 111", title: "Communication in English", session: null, source: PRACTICE },
  ];

  const q = (collection, id, topic, difficulty, type, text, options, answer, explanation) => ({ id: `${collection}-${id}`, collection, topic, difficulty, type, q: text, options, answer, explanation, source: PRACTICE });
  const M = "eksu-mth101", P = "eksu-phy101", C = "eksu-chm101", G = "eksu-gst111";

  const questions = [
    /* ---------------- MTH 101 ---------------- */
    q(M, 1, "Sets", "easy", "theory", "If A = {1, 2, 3, 4} and B = {3, 4, 5}, what is A ∩ B?", ["{1, 2}", "{3, 4}", "{1, 2, 3, 4, 5}", "{5}"], 1,
      { concept: "The **intersection** A ∩ B contains only the elements that belong to *both* sets.", why: "3 and 4 are the only elements found in A and in B, so A ∩ B = {3, 4}.", wrong: { 0: "{1, 2} is A − B: elements in A but **not** in B.", 2: "{1, 2, 3, 4, 5} is the **union** A ∪ B, not the intersection.", 3: "5 is only in B." }, mistake: "Mixing up ∩ (and: in both) with ∪ (or: in either)." }),
    q(M, 2, "Sets", "medium", "numerical", "In a class, n(A) = 12 students study French, n(B) = 9 study Spanish and n(A ∩ B) = 4 study both. How many study at least one of the two?", ["21", "25", "17", "13"], 2,
      { concept: "Students counted in both sets would be counted twice, so the overlap is subtracted once.", formula: "n(A ∪ B) = n(A) + n(B) − n(A ∩ B)", given: "n(A) = 12, n(B) = 9, n(A ∩ B) = 4", steps: ["n(A ∪ B) = 12 + 9 − 4", "n(A ∪ B) = 17"], result: "17 students", wrong: { 0: "21 adds the two sets without removing the 4 students counted twice." }, mistake: "Forgetting to subtract the intersection." }),
    q(M, 3, "Sets", "easy", "numerical", "How many subsets does a set with 4 elements have?", ["8", "16", "4", "12"], 1,
      { concept: "Each element is either in a subset or not: two choices per element.", formula: "Number of subsets = 2ⁿ", given: "n = 4", steps: ["2⁴ = 2 × 2 × 2 × 2", "= 16"], result: "16 subsets (including ∅ and the set itself)", wrong: { 0: "8 = 2³ is the count for a 3-element set.", 2: "4 counts only the single-element subsets." }, mistake: "Forgetting the empty set and the full set are subsets too." }),
    q(M, 4, "Quadratic equations", "easy", "numerical", "Solve x² − 5x + 6 = 0.", ["x = 2 or x = 3", "x = −2 or x = −3", "x = 1 or x = 6", "x = −1 or x = 6"], 0,
      { concept: "Factorise by finding two numbers whose product is +6 and whose sum is −5.", given: "a = 1, b = −5, c = 6", steps: ["−2 × −3 = 6 and −2 + (−3) = −5", "x² − 5x + 6 = (x − 2)(x − 3) = 0", "x − 2 = 0 or x − 3 = 0"], result: "x = 2 or x = 3", wrong: { 1: "These are the roots of x² + 5x + 6 = 0: the signs are reversed." }, mistake: "Taking the signs of the factors as the roots: (x − 2) gives x = +2." }),
    q(M, 5, "Quadratic equations", "medium", "numerical", "What is the sum of the roots of 2x² − 7x + 3 = 0?", ["7", "−7/2", "3/2", "7/2"], 3,
      { concept: "For ax² + bx + c = 0 the roots α and β satisfy simple relations with the coefficients.", formula: "α + β = −b/a", given: "a = 2, b = −7, c = 3", steps: ["α + β = −(−7)/2", "= 7/2"], result: "7/2", wrong: { 1: "−7/2 forgets the minus sign in −b/a.", 2: "3/2 is the product of the roots, c/a." }, mistake: "Confusing the sum (−b/a) with the product (c/a)." }),
    q(M, 6, "Quadratic equations", "medium", "theory", "What is the nature of the roots of x² + 4x + 5 = 0?", ["Two equal real roots", "Two distinct real roots", "No real roots", "One positive and one negative root"], 2,
      { concept: "The **discriminant** b² − 4ac decides the nature of the roots: positive → two real, zero → equal, negative → no real roots.", formula: "D = b² − 4ac", given: "a = 1, b = 4, c = 5", steps: ["D = 4² − 4(1)(5)", "D = 16 − 20 = −4"], result: "D < 0, so there are no real roots (the roots are complex).", mistake: "Computing 4ac as 4 + a + c, or dropping the square on b." }),
    q(M, 7, "Indices and logarithms", "easy", "numerical", "Evaluate log₂ 32.", ["4", "5", "16", "6"], 1,
      { concept: "log₂ 32 asks: to what power must 2 be raised to give 32?", steps: ["2⁵ = 32", "so log₂ 32 = 5"], result: "5", wrong: { 2: "16 is 32 ÷ 2, not a logarithm." }, mistake: "Dividing instead of finding the power." }),
    q(M, 8, "Indices and logarithms", "medium", "numerical", "Simplify 8^(2/3).", ["4", "16/3", "2", "64"], 0,
      { concept: "A fractional index p/q means take the q-th root, then raise to the power p.", formula: "a^(p/q) = (q√a)^p", given: "a = 8, p = 2, q = 3", steps: ["∛8 = 2", "2² = 4"], result: "4", wrong: { 1: "16/3 multiplies 8 by 2/3; indices are not multiplied by the base." }, mistake: "Multiplying the base by the fraction." }),
    q(M, 9, "Sequences and series", "easy", "numerical", "Find the 10th term of the arithmetic progression 3, 7, 11, …", ["43", "39", "40", "36"], 1,
      { concept: "In an AP each term adds the common difference d.", formula: "Tₙ = a + (n − 1)d", given: "a = 3, d = 4, n = 10", steps: ["T₁₀ = 3 + (10 − 1)(4)", "= 3 + 36 = 39"], result: "39", wrong: { 0: "43 uses n·d instead of (n − 1)d." }, mistake: "Using nd instead of (n − 1)d." }),
    q(M, 10, "Sequences and series", "medium", "numerical", "Find the sum to infinity of the geometric progression 8, 4, 2, …", ["14", "12", "16", "Infinite"], 2,
      { concept: "A GP with |r| < 1 has a finite sum to infinity because the terms shrink towards zero.", formula: "S∞ = a / (1 − r)", given: "a = 8, r = 4/8 = 1/2", steps: ["S∞ = 8 / (1 − 1/2)", "= 8 / (1/2) = 16"], result: "16", wrong: { 3: "The series converges because |r| = 1/2 < 1." }, mistake: "Using 1 + r in the denominator." }),

    /* ---------------- PHY 101 ---------------- */
    q(P, 1, "Units and dimensions", "easy", "theory", "What are the dimensions of force?", ["MLT⁻¹", "MLT⁻²", "ML²T⁻²", "MT⁻²"], 1,
      { concept: "Force = mass × acceleration, and acceleration has dimensions LT⁻².", steps: ["[F] = [m][a]", "= M × LT⁻² = MLT⁻²"], result: "MLT⁻²", wrong: { 0: "MLT⁻¹ is momentum (mass × velocity).", 2: "ML²T⁻² is energy or work." }, mistake: "Confusing force with momentum or energy." }),
    q(P, 2, "Units and dimensions", "easy", "theory", "The SI unit of power is the:", ["joule", "newton", "watt", "pascal"], 2,
      { concept: "Power is the rate of doing work: P = W / t.", why: "1 watt = 1 joule per second (J s⁻¹).", wrong: { 0: "The joule is the unit of energy/work.", 1: "The newton is the unit of force.", 3: "The pascal is the unit of pressure." } }),
    q(P, 3, "Kinematics", "easy", "numerical", "A car starts from rest and accelerates uniformly at 2 m s⁻² for 5 s. What is its final velocity?", ["7 m s⁻¹", "2.5 m s⁻¹", "10 m s⁻¹", "25 m s⁻¹"], 2,
      { concept: "For uniform acceleration, velocity grows by a every second.", formula: "v = u + at", given: "u = 0 (from rest), a = 2 m s⁻², t = 5 s", steps: ["v = 0 + (2)(5)", "v = 10 m s⁻¹"], result: "10 m s⁻¹", wrong: { 3: "25 m is the distance travelled, not the velocity." }, mistake: "Forgetting that 'from rest' means u = 0." }),
    q(P, 4, "Kinematics", "medium", "numerical", "The same car (from rest, a = 2 m s⁻², t = 5 s) travels what distance?", ["10 m", "50 m", "25 m", "20 m"], 2,
      { concept: "With uniform acceleration from rest, distance grows with the square of time.", formula: "s = ut + ½at²", given: "u = 0, a = 2 m s⁻², t = 5 s", steps: ["s = 0 + ½(2)(5²)", "s = ½ × 2 × 25 = 25 m"], result: "25 m", wrong: { 1: "50 m forgets the ½ in ½at²." }, mistake: "Dropping the ½ or squaring a instead of t." }),
    q(P, 5, "Kinematics", "medium", "numerical", "A stone is dropped from rest from a height of 20 m. Taking g = 10 m s⁻², how long does it take to reach the ground?", ["4 s", "2 s", "1 s", "√2 s"], 1,
      { concept: "A dropped object starts with u = 0 and accelerates at g.", formula: "h = ½gt²  ⇒  t = √(2h/g)", given: "h = 20 m, g = 10 m s⁻²", steps: ["t = √(2 × 20 / 10)", "t = √4 = 2 s"], result: "2 s", wrong: { 0: "4 s is t², before taking the square root." }, mistake: "Forgetting to take the square root." }),
    q(P, 6, "Newton's laws", "easy", "numerical", "What net force gives a 5 kg mass an acceleration of 3 m s⁻²?", ["1.67 N", "8 N", "15 N", "0.6 N"], 2,
      { concept: "Newton's second law: net force equals mass times acceleration.", formula: "F = ma", given: "m = 5 kg, a = 3 m s⁻²", steps: ["F = 5 × 3", "F = 15 N"], result: "15 N", wrong: { 0: "1.67 divides m by a.", 1: "8 adds m and a." } }),
    q(P, 7, "Newton's laws", "medium", "theory", "Newton's third law states that action and reaction forces:", ["act on the same body and cancel out", "are equal, opposite and act on different bodies", "are equal only when the bodies are at rest", "act in the same direction"], 1,
      { concept: "Forces always come in pairs between two interacting bodies.", why: "If A pushes B, B pushes A with an equal force in the opposite direction. Because they act on **different** bodies, they never cancel each other.", wrong: { 0: "They act on different bodies, so they cannot cancel each other." }, mistake: "Thinking third-law pairs cancel. Only forces on the same body can cancel." }),
    q(P, 8, "Newton's laws", "easy", "theory", "The inertia of a body depends on its:", ["velocity", "mass", "volume", "weight in water"], 1,
      { concept: "**Inertia** is a body's resistance to a change in its state of motion.", why: "Mass is the measure of inertia: the larger the mass, the harder it is to start, stop or turn it.", wrong: { 0: "A fast and a slow body of the same mass have the same inertia." } }),
    q(P, 9, "Work and energy", "easy", "numerical", "What is the kinetic energy of a 2 kg ball moving at 3 m s⁻¹?", ["6 J", "9 J", "18 J", "3 J"], 1,
      { concept: "Kinetic energy depends on mass and on the square of speed.", formula: "KE = ½mv²", given: "m = 2 kg, v = 3 m s⁻¹", steps: ["KE = ½ × 2 × 3²", "KE = 1 × 9 = 9 J"], result: "9 J", wrong: { 0: "6 J uses v instead of v².", 2: "18 J forgets the ½." }, mistake: "Forgetting to square the velocity." }),
    q(P, 10, "Work and energy", "easy", "numerical", "A 4 kg box is raised through 5 m. Taking g = 10 m s⁻², what potential energy does it gain?", ["20 J", "200 J", "9 J", "50 J"], 1,
      { concept: "Gravitational potential energy is gained when a mass is lifted against gravity.", formula: "PE = mgh", given: "m = 4 kg, g = 10 m s⁻², h = 5 m", steps: ["PE = 4 × 10 × 5", "PE = 200 J"], result: "200 J", wrong: { 0: "20 J leaves out g." } }),

    /* ---------------- CHM 101 ---------------- */
    q(C, 1, "Atomic structure", "easy", "numerical", "How many neutrons are in an atom of sodium, ²³₁₁Na?", ["11", "23", "12", "34"], 2,
      { concept: "Mass number A counts protons + neutrons; atomic number Z counts protons.", formula: "Neutrons = A − Z", given: "A = 23, Z = 11", steps: ["Neutrons = 23 − 11", "= 12"], result: "12 neutrons", wrong: { 0: "11 is the number of protons.", 3: "34 adds A and Z." } }),
    q(C, 2, "Atomic structure", "medium", "theory", "What is the electronic configuration of magnesium (Z = 12)?", ["1s² 2s² 2p⁶ 3s²", "1s² 2s² 2p⁸", "1s² 2s² 2p⁶ 3p²", "1s² 2s⁶ 2p⁴"], 0,
      { concept: "Electrons fill orbitals in order of energy: 1s, 2s, 2p, 3s, … An s orbital holds 2 electrons, a p subshell holds 6.", steps: ["1s² (2) → 2s² (4) → 2p⁶ (10) → 3s² (12)"], result: "1s² 2s² 2p⁶ 3s²", wrong: { 1: "A p subshell can hold at most 6 electrons.", 2: "3s fills before 3p." } }),
    q(C, 3, "Atomic structure", "easy", "theory", "Isotopes of an element differ in their number of:", ["protons", "electrons", "neutrons", "valence electrons"], 2,
      { concept: "Isotopes are atoms of the **same element** (same Z) with different mass numbers.", why: "Same element means the same number of protons. A different mass number must therefore come from a different number of neutrons.", wrong: { 0: "A different number of protons would make a different element." } }),
    q(C, 4, "Mole concept", "easy", "numerical", "How many moles are in 18 g of water (M = 18 g mol⁻¹)?", ["18 mol", "1 mol", "0.5 mol", "2 mol"], 1,
      { concept: "The mole links mass to the number of particles.", formula: "n = m / M", given: "m = 18 g, M = 18 g mol⁻¹", steps: ["n = 18 / 18", "n = 1 mol"], result: "1 mol" }),
    q(C, 5, "Mole concept", "medium", "numerical", "How many molecules are in 0.5 mol of a gas? (Lₐ = 6.02 × 10²³ mol⁻¹)", ["6.02 × 10²³", "3.01 × 10²³", "1.20 × 10²⁴", "3.01 × 10²²"], 1,
      { concept: "One mole contains Avogadro's number of particles.", formula: "N = n × Lₐ", given: "n = 0.5 mol, Lₐ = 6.02 × 10²³ mol⁻¹", steps: ["N = 0.5 × 6.02 × 10²³", "N = 3.01 × 10²³"], result: "3.01 × 10²³ molecules", wrong: { 2: "1.20 × 10²⁴ multiplies by 2 instead of 0.5." }, mistake: "Dividing by n instead of multiplying." }),
    q(C, 6, "Mole concept", "easy", "numerical", "What is the mass of 2 mol of carbon dioxide (M = 44 g mol⁻¹)?", ["22 g", "44 g", "88 g", "46 g"], 2,
      { concept: "Rearrange n = m/M to find mass.", formula: "m = n × M", given: "n = 2 mol, M = 44 g mol⁻¹", steps: ["m = 2 × 44", "m = 88 g"], result: "88 g", wrong: { 0: "22 g divides M by n." } }),
    q(C, 7, "Periodic table", "medium", "theory", "Moving from left to right across a period, atomic radius generally:", ["increases", "decreases", "stays the same", "first decreases then increases sharply"], 1,
      { concept: "Across a period, electrons enter the same shell while the nuclear charge increases.", why: "The growing positive charge pulls the electrons in the same shell closer, so atoms get smaller.", wrong: { 0: "Radius increases **down a group**, where new shells are added." }, mistake: "Applying the down-a-group trend to a period." }),
    q(C, 8, "Periodic table", "easy", "theory", "Group 1 elements are known as the:", ["halogens", "noble gases", "alkali metals", "alkaline earth metals"], 2,
      { concept: "Group 1 (Li, Na, K, …) elements have one valence electron and form alkaline hydroxides.", wrong: { 0: "Halogens are Group 17.", 1: "Noble gases are Group 18.", 3: "Alkaline earth metals are Group 2." } }),
    q(C, 9, "Chemical bonding", "easy", "theory", "The bond in sodium chloride (NaCl) is best described as:", ["covalent", "ionic", "metallic", "hydrogen bonding"], 1,
      { concept: "Ionic bonds form when electrons are **transferred** from a metal to a non-metal.", why: "Na gives its one valence electron to Cl, forming Na⁺ and Cl⁻ ions held together by electrostatic attraction.", wrong: { 0: "Covalent bonds share electrons, typically between non-metals." } }),
    q(C, 10, "Chemical bonding", "medium", "theory", "The O–H bonds in a water molecule are:", ["ionic", "non-polar covalent", "polar covalent", "metallic"], 2,
      { concept: "When atoms with different electronegativities share electrons, the sharing is unequal.", why: "Oxygen is more electronegative than hydrogen, so the shared electrons sit closer to O, giving O a partial negative charge (δ−) and H a partial positive charge (δ+).", wrong: { 1: "Non-polar bonds form between atoms of (nearly) equal electronegativity, such as H–H." } }),

    /* ---------------- GST 111 ---------------- */
    q(G, 1, "Parts of speech", "easy", "theory", "Identify the adverb in the sentence: “She sang beautifully at the event.”", ["sang", "beautifully", "event", "at"], 1,
      { concept: "An **adverb** modifies a verb, adjective or another adverb. It often answers *how?*", why: "“Beautifully” tells us *how* she sang, so it modifies the verb “sang”.", wrong: { 0: "“Sang” is the verb.", 2: "“Event” is a noun.", 3: "“At” is a preposition." } }),
    q(G, 2, "Parts of speech", "easy", "theory", "In “Happiness is contagious”, the word “happiness” is a:", ["verb", "adjective", "noun", "adverb"], 2,
      { concept: "Abstract nouns name ideas, feelings or qualities. Suffixes like *-ness* often turn adjectives into nouns.", why: "“Happiness” is the subject of the sentence and names a feeling: an abstract noun.", wrong: { 1: "“Happy” is the adjective; “happiness” is its noun form." } }),
    q(G, 3, "Concord", "medium", "theory", "Choose the correct option: “Neither the students nor the teacher ___ present.”", ["were", "are", "was", "have been"], 2,
      { concept: "With *either … or* / *neither … nor*, the verb agrees with the subject **closest** to it (principle of proximity).", why: "The nearer subject, “the teacher”, is singular, so the verb is singular: “was”.", wrong: { 0: "“Were” would agree with “students”, which is the farther subject." } }),
    q(G, 4, "Concord", "easy", "theory", "Choose the correct option: “Each of the boys ___ a textbook.”", ["have", "has", "are having", "were having"], 1,
      { concept: "“Each”, “every”, “either” and “neither” are singular, even when followed by *of* + a plural noun.", why: "The true subject is “each” (singular), not “boys”, so the verb is “has”.", mistake: "Letting the nearby plural noun “boys” control the verb." }),
    q(G, 5, "Concord", "medium", "theory", "Choose the correct option: “Bread and butter ___ my favourite breakfast.”", ["are", "were", "is", "have been"], 2,
      { concept: "Two nouns joined by *and* usually take a plural verb, **unless** they form a single idea or unit.", why: "“Bread and butter” is treated as one dish, so it takes a singular verb: “is”." }),
    q(G, 6, "Punctuation", "easy", "theory", "Choose the correct option: “The dog wagged ___ tail.”", ["it's", "its", "its'", "it is"], 1,
      { concept: "**its** is the possessive form; **it's** is the contraction of *it is* or *it has*.", why: "The tail belongs to the dog, so the possessive “its” is needed.", wrong: { 0: "“It's tail” would mean “it is tail”.", 2: "“Its'” is never correct." } }),
    q(G, 7, "Punctuation", "medium", "theory", "Which sentence is correctly punctuated?", ["I wanted to go, however it rained.", "I wanted to go; however, it rained.", "I wanted to go however, it rained.", "I wanted to go: however it rained."], 1,
      { concept: "“However” used to join two independent clauses is a conjunctive adverb. It needs a **semicolon** before it and a comma after it.", why: "Option B separates the clauses correctly with a semicolon and sets off “however” with a comma.", wrong: { 0: "Option A is a comma splice: two sentences joined by only a comma." } }),
    q(G, 8, "Vocabulary", "medium", "theory", "Choose the word closest in meaning to “ubiquitous”.", ["rare", "omnipresent", "ancient", "noisy"], 1,
      { concept: "Ubiquitous means found everywhere.", why: "“Omnipresent” (present everywhere) has the same meaning.", wrong: { 0: "“Rare” is the opposite." } }),
    q(G, 9, "Vocabulary", "easy", "theory", "Choose the word opposite in meaning to “benevolent”.", ["kind", "generous", "malevolent", "charitable"], 2,
      { concept: "The prefix *bene-* means good; *male-* means bad.", why: "Benevolent means wishing good to others; malevolent means wishing harm.", wrong: { 0: "Kind, generous and charitable are synonyms, not antonyms." } }),
    q(G, 10, "Sentence types", "easy", "theory", "“Close the door.” is an example of a(n):", ["declarative sentence", "interrogative sentence", "imperative sentence", "exclamatory sentence"], 2,
      { concept: "An **imperative** sentence gives a command or makes a request. Its subject (“you”) is usually understood.", wrong: { 0: "Declarative sentences make statements.", 1: "Interrogative sentences ask questions." } }),
  ];

  window.RecalroPastQ = { institutions, collections, questions, PRACTICE };
})();
