/* Static options for the signup wizard. */
(function () {
  "use strict";
  const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", "United States", "Canada", "India", "Other"];

  const INSTITUTIONS = {};

  const PATHS = [
    { id: "secondary", title: "Secondary School Student", desc: "Junior or senior secondary, preparing for school exams.", img: "assets/notebook-3d.webp" },
    { id: "university", title: "University / Undergraduate", desc: "Working through a degree, course by course.", img: "assets/computer-3d.webp" },
    { id: "postgraduate", title: "Postgraduate Student", desc: "Master's, MPhil or doctoral study and research.", img: "assets/target-3d.webp" },
    { id: "professional", title: "Professional / Certification", desc: "Preparing for ICAN, ACCA, PMP, IELTS and more.", img: "assets/trophy-3d.webp" },
    { id: "independent", title: "Independent Learner", desc: "Learning new skills on your own terms.", img: "assets/roadmap-3d.webp" },
  ];

  const NG_LEVELS = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "600 Level", "Other"];
  const YEAR_LEVELS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5+", "Other"];
  const levelsFor = (country) => (country === "Nigeria" ? NG_LEVELS : YEAR_LEVELS);

  const CLASSES = {
    Nigeria: ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"],
    Ghana: ["JHS 1", "JHS 2", "JHS 3", "SHS 1", "SHS 2", "SHS 3"],
    "United Kingdom": ["Year 9", "Year 10", "Year 11", "Year 12", "Year 13"],
    default: ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
  };
  const classesFor = (country) => CLASSES[country] || CLASSES.default;
  const EXAMS = {
    Nigeria: ["WAEC (WASSCE)", "NECO", "JAMB (UTME)", "Post-UTME", "BECE", "IGCSE", "SAT", "Other"],
    Ghana: ["WASSCE", "BECE", "IGCSE", "SAT", "Other"],
    "United Kingdom": ["GCSE", "A-Levels", "IB Diploma", "Other"],
    default: ["IGCSE", "A-Levels", "SAT", "IB Diploma", "National exams", "Other"],
  };
  const examsFor = (country) => EXAMS[country] || EXAMS.default;

  const PROGRAMMES = ["Postgraduate Diploma", "Master's (taught)", "Master's (research)", "MPhil", "PhD / Doctorate", "Other"];
  const PG_STAGES = ["Coursework", "Research proposal", "Data collection & analysis", "Writing up", "Preparing for defence"];
  const CERTS = ["ICAN", "ACCA", "CFA", "PMP", "IELTS", "TOEFL", "COREN (Engineering)", "CIPM", "Other"];
  const SKILLS = ["Programming", "Data analysis", "Writing", "Public speaking", "Design", "A new language", "Personal finance", "Productivity"];

  const INTERESTS = [
    { id: "engineering", label: "Engineering", icon: "zap" },
    { id: "medicine", label: "Medicine and Health Sciences", icon: "shield" },
    { id: "cs", label: "Computer Science", icon: "command" },
    { id: "maths", label: "Mathematics", icon: "sigma" },
    { id: "business", label: "Business and Finance", icon: "chart" },
    { id: "law", label: "Law", icon: "scale" },
    { id: "sciences", label: "Natural Sciences", icon: "bulb" },
    { id: "humanities", label: "Humanities", icon: "book" },
    { id: "languages", label: "Languages", icon: "quote" },
    { id: "prodev", label: "Professional Development", icon: "target" },
    { id: "other", label: "Other", icon: "plus" },
  ];
  const GOALS = [
    { id: "exams", label: "Preparing for examinations", icon: "clipboard" },
    { id: "grades", label: "Improving academic performance", icon: "chart" },
    { id: "difficult", label: "Mastering difficult subjects", icon: "brain" },
    { id: "retain", label: "Remembering information for longer", icon: "refresh" },
    { id: "cert", label: "Preparing for professional certification", icon: "award" },
    { id: "skills", label: "Learning new skills", icon: "bulb" },
    { id: "habits", label: "Building consistent study habits", icon: "flame" },
  ];
  const MINUTES = [{ v: 15, label: "15 min" }, { v: 30, label: "30 min" }, { v: 45, label: "45 min" }, { v: 60, label: "1 hour" }, { v: 90, label: "More than 1 hour" }];

  window.RecalroSignupData = { COUNTRIES, INSTITUTIONS, PATHS, levelsFor, classesFor, examsFor, PROGRAMMES, PG_STAGES, CERTS, SKILLS, INTERESTS, GOALS, MINUTES };
})();
