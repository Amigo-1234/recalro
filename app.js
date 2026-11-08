const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const marketing=$("#marketing"), app=$("#app"), pageContainer=$("#pageContainer");
let currentPage="Dashboard", cardIndex=0, flipped=false, toastTimer;
const heroVideo=$(".hero-video"), heroMotionPreference=window.matchMedia("(prefers-reduced-motion: reduce)");
function updateHeroMotion(){
  if(!heroVideo)return;
  if(heroMotionPreference.matches||marketing.classList.contains("hidden")||document.visibilityState!=="visible")heroVideo.pause();
  else if(heroVideo.paused)heroVideo.play().catch(error=>{if(error.name!=="AbortError")console.error("Unable to play hero video:",error)});
}
updateHeroMotion();
heroMotionPreference.addEventListener("change",updateHeroMotion);
document.addEventListener("visibilitychange",updateHeroMotion);
const pages=["Dashboard","Subjects","Roadmap","Flashcards","Memory Center","Knowledge Vault","AI Tutor","Exam Simulator","Summaries","Read Aloud","Weakness Detector","Study Planner","Exam Readiness","Daily Quests","Leaderboards","Study Groups","Rewards Store","Explain It to Me","Weekly Reports","Settings"];
const icons={"Subjects":"▤","Roadmap":"⌁","Flashcards":"▣","Memory Center":"◷","Knowledge Vault":"▥","AI Tutor":"✳","Exam Simulator":"◉","Summaries":"≡","Read Aloud":"◖","Weakness Detector":"⌖","Study Planner":"▦","Exam Readiness":"◔","Daily Quests":"✧","Leaderboards":"♜","Study Groups":"♧","Rewards Store":"◇","Explain It to Me":"❝","Weekly Reports":"▧","Settings":"⚙"};
const subjects=[{name:"Thermodynamics",sub:"Mechanical Engineering",progress:68,cards:42,icon:"◉"},{name:"Fluid Mechanics",sub:"Mechanical Engineering",progress:42,cards:28,icon:"≈"},{name:"Engineering Mathematics",sub:"Core course",progress:81,cards:56,icon:"∑"}];
const vaultItems=[["Brayton cycle efficiency","THERMODYNAMICS","η = 1 − (1 / rₚ^((γ−1)/γ))","Formula"],["First law of thermodynamics","THERMODYNAMICS","Energy can neither be created nor destroyed; it changes form.","Principle"],["Bernoulli's equation","FLUID MECHANICS","P + ½ρv² + ρgh = constant","Equation"],["Euler's identity","MATHEMATICS","e^(iπ) + 1 = 0","Identity"],["Entropy","THERMODYNAMICS","A measure of energy dispersal and the number of possible microscopic arrangements.","Definition"],["Continuity equation","FLUID MECHANICS","A₁v₁ = A₂v₂ for incompressible steady flow.","Equation"]];
const cards=[["What does the first law of thermodynamics state?","Energy cannot be created or destroyed. It can only be transferred or transformed from one form to another."],["Define entropy in thermodynamics.","A thermodynamic property that measures energy dispersal and the number of microscopic configurations available to a system."],["What is the continuity equation for incompressible flow?","A₁v₁ = A₂v₂. The volumetric flow rate remains constant along a streamline."]];
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2500)}
function openApp(page="Dashboard"){marketing.classList.add("hidden");app.classList.remove("hidden");updateHeroMotion();render(page);window.scrollTo(0,0)}
function goLanding(){
  if(examTimer){clearInterval(examTimer);examTimer=null;examSession=null}
  if("speechSynthesis"in window)speechSynthesis.cancel();
  app.classList.add("hidden");marketing.classList.remove("hidden");updateHeroMotion();window.scrollTo(0,0);
}
["navStart","heroStart","storyStart"].forEach(id=>$("#"+id)?.addEventListener("click",()=>openApp("Dashboard")));
const productDemoDialog=$("#productDemoDialog");

$(".product-demo-close").addEventListener("click",()=>productDemoDialog.close());
productDemoDialog.addEventListener("click",event=>{if(event.target===productDemoDialog)productDemoDialog.close()});
productDemoDialog.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();productDemoDialog.close()}});
$("#productDemoStart").addEventListener("click",()=>{productDemoDialog.close();openApp("Dashboard")});
$("#navLogin")?.addEventListener("click",()=>{openApp("Dashboard");toast("This is a demo workspace; account sign-in is not connected.")});
$("#brandHome").addEventListener("click",e=>{e.preventDefault();render("Dashboard")});
const roadmapShortcut=$(".roadmap-mini");
if(roadmapShortcut){roadmapShortcut.setAttribute("role","button");roadmapShortcut.setAttribute("tabindex","0");roadmapShortcut.setAttribute("aria-label","Continue to the Thermodynamics learning roadmap")}
$("#marketing").addEventListener("click",event=>{
  const appLink=event.target.closest("[data-open-app]");
  if(appLink){openApp(appLink.dataset.page||"Dashboard");return}
  if(event.target.closest(".roadmap-mini")){openApp("Roadmap");return}
  if(event.target.closest(".site-links a")){
    $("#mobileNavPanel").classList.remove("open");
    $("#mobileMenu").setAttribute("aria-expanded","false");
  }
});
$("#marketing").addEventListener("keydown",event=>{if((event.key==="Enter"||event.key===" ")&&event.target.closest(".roadmap-mini")){event.preventDefault();openApp("Roadmap")}});
document.addEventListener("click",event=>{
  if(!event.target.closest(".site-nav")){
    $("#mobileNavPanel").classList.remove("open");
    $("#mobileMenu").setAttribute("aria-expanded","false");
  }
});
$("#mobileMenu").addEventListener("click",event=>{
  const menu=$("#mobileNavPanel"),open=menu.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded",String(open));
  event.currentTarget.setAttribute("aria-label",open?"Close menu":"Open menu");
});
const footerGroups=$$(".footer-group"),footerBreakpoint=window.matchMedia("(max-width: 600px)");
function setFooterGroupState(event){footerGroups.forEach(group=>{group.open=!event.matches})}
setFooterGroupState(footerBreakpoint);
footerBreakpoint.addEventListener("change",setFooterGroupState);
$("#newsletterForm").addEventListener("submit",event=>{
  event.preventDefault();
  const email=$("#newsletterEmail"),status=$("#newsletterStatus");
  status.textContent="";
  email.setAttribute("aria-invalid","false");
  if(!email.checkValidity()){
    email.setAttribute("aria-invalid","true");
    status.textContent="Enter a valid email address.";
    email.reportValidity();
    return;
  }
  status.textContent="Newsletter sign-up is unavailable because no subscription service is connected. Your email has not been sent or saved.";
});
$("#appMenu").addEventListener("click",event=>{
  const open=$("#sidebar").classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded",String(open));
});
$("#themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");try{localStorage.setItem("recalro-theme",document.body.classList.contains("dark")?"dark":"light");toast("Appearance updated")}catch(error){console.error("Could not save the appearance preference.",error);toast("Appearance changed, but this browser could not save the preference.")}});
try{if(localStorage.getItem("recalro-theme")==="dark")document.body.classList.add("dark")}
catch(error){console.error("Could not load the saved appearance preference.",error);toast("Saved appearance could not be loaded in this browser.")}
$("#upgradeBtn").addEventListener("click",()=>render("Exam Readiness"));
$("#sidebar").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)render(b.dataset.page)});
function setActive(page){$$(".side-link[data-page]").forEach(b=>{const active=b.dataset.page===page;b.classList.toggle("active",active);if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});$("#crumb").textContent=page==="Dashboard"?"Overview":page;$("#sidebar").classList.remove("open");$("#appMenu").setAttribute("aria-expanded","false")}
function head(title,desc,actions='<button class="btn btn-outline btn-small" data-action="export">Export ↧</button><button class="btn btn-primary btn-small" data-action="new">＋ New</button>'){return `<div class="page-head"><div><div class="page-eyebrow">YOUR LEARNING WORKSPACE</div><h1>${title}</h1><p>${desc}</p></div><div class="head-actions">${actions}</div></div>`}
function panel(title,content,action=""){return `<section class="panel"><div class="panel-head"><h3>${title}</h3>${action?`<button data-action="${action}">View all ↗</button>`:""}</div>${content}</section>`}
function stat(label,value,sub,icon,trend=""){return `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><strong>${value}</strong><small class="${trend?'trend':''}">${sub}</small></div>`}
function chart(){return `<div class="activity-chart">${[42,67,48,79,57,94,70].map((v,i)=>`<div><i style="height:${v*.65}%"></i><i class="${i===5?'orange-bar':''}" style="height:${v}%"></i></div>`).join("")}</div><div class="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>`}
function task(title,meta,xp,done=false){return `<div class="task-row"><button class="task-check ${done?'checked':''}" data-action="check">${done?'✓':''}</button><div class="task-info"><b>${title}</b><small>${meta}</small></div><span class="task-xp">+${xp} XP</span></div>`}
function dashboard(){return `${head("Good morning, Alex 👋","You're building a strong learning rhythm. Here's your progress at a glance.",'<button class="btn btn-outline btn-small" data-page="Weekly Reports">Weekly report ↗</button><button class="btn btn-primary btn-small" data-page="Flashcards">Start a review →</button>')}
<div class="welcome-banner"><div class="welcome-text"><small>MONDAY, NOVEMBER 9 · YOUR DAILY MOMENTUM</small><h2>Make today a little more understood.</h2><p>You have 24 cards waiting and one recommended topic to tackle.</p></div><div class="welcome-mark">✳</div><button class="btn btn-primary btn-small" data-page="Flashcards">Review 24 cards ↗</button></div>
<div class="stats-grid">${stat("Study streak","12 days","You're on a roll","♨","true")}${stat("Cards due","24","Across 3 subjects","▣")}${stat("Weekly accuracy","86%","↑ 8% from last week","◎","true")}${stat("Total study time","8.4h","This week","◷")}</div>
<div class="dashboard-grid"><div><section class="panel"><div class="panel-head"><h3>Learning activity</h3><button data-page="Weekly Reports">Full analytics ↗</button></div>${chart()}</section>${panel("Continue learning",`<div class="subject-list">${subjects.map(s=>`<article class="subject-card"><div class="subject-icon">${s.icon}</div><h4>${s.name}</h4><p>${s.sub}</p><div class="mini-progress"><i style="width:${s.progress}%"></i></div><div class="subject-meta"><span>${s.progress}% mastered</span><span>${s.cards} cards</span></div></article>`).join("")}</div>`,"Subjects")}</div>
<div class="right-stack"><section class="panel streak-card"><div class="panel-head"><h3>Your streak</h3><span>🔥</span></div><strong>12 days</strong><p>One focused session today keeps your momentum alive.</p><div class="week-dots">${["M","T","W","T","F","S","S"].map((d,i)=>`<span class="${i<5?'done':''}">${d}</span>`).join("")}</div></section>${panel("Today's quests",task("Review 15 flashcards","11 of 15 completed",20,true)+task("Complete a practice quiz","10 questions · 5 min",30)+task("Revise one weak concept","Brayton cycle",15))}${panel("Your next best step",`<div class="roadmap-item"><span class="roadmap-node">↗</span><div><b>Brayton Cycle: Pressure Ratio</b><small>Recommended based on recent practice</small></div><span class="status-tag orange">Focus</span></div><button class="btn btn-primary btn-small" style="width:100%;margin-top:14px" data-page="Weakness Detector">View learning insights ↗</button>`)}</div></div>`}
function subjectCards(){return `<div class="subject-list">${subjects.map(s=>`<article class="subject-card"><div class="subject-icon">${s.icon}</div><h4>${s.name}</h4><p>${s.sub}</p><div class="mini-progress"><i style="width:${s.progress}%"></i></div><div class="subject-meta"><span>${s.progress}% progress</span><span>${s.cards} cards</span></div><button class="btn btn-outline btn-small" style="width:100%;margin-top:13px" data-action="subject">Open subject →</button></article>`).join("")}<article class="subject-card" style="border-style:dashed;display:grid;place-items:center;text-align:center;min-height:160px"><div><div class="subject-icon" style="margin:auto auto 12px">＋</div><h4>Add a subject</h4><p>Organize your next learning goal</p><button class="btn btn-teal btn-small" style="margin-top:12px" data-action="new">Create subject</button></div></article></div>`}
function roadmap(){return `${head("Learning roadmap","A structured path through your subjects, modules and milestones.",'<button class="btn btn-outline btn-small" data-action="filter">All subjects⌄</button><button class="btn btn-primary btn-small" data-action="new">＋ Add milestone</button>')}<div class="two-col"><div>${panel("Thermodynamics · 68% complete",`<div class="progress-track"><i style="width:68%"></i></div><div class="roadmap-list" style="margin-top:15px">${[["Foundations of thermodynamics","4 concepts · completed","✓","Completed"],["First law & energy systems","6 concepts · completed","✓","Completed"],["Second law & entropy","5 concepts · active","●","In progress"],["Power cycles & applications","7 concepts · upcoming","4","Upcoming"],["Advanced cycle analysis","4 concepts · upcoming","5","Upcoming"]].map((x,i)=>`<div class="roadmap-item"><span class="roadmap-node ${i>2?'locked':''}">${x[2]}</span><div><b>${x[0]}</b><small>${x[1]}</small></div><span class="status-tag ${i===2?'orange':''}">${x[3]}</span></div>`).join("")}</div>`)}${panel("Next recommended lesson",`<h3 style="font:800 16px Manrope;margin:0 0 8px">Entropy and irreversibility</h3><p class="muted" style="font-size:10px;line-height:1.7">Build on your completed second-law concepts with a focused 18-minute lesson.</p><button class="btn btn-primary btn-small" data-page="AI Tutor">Explore this concept ↗</button>`)}</div><div>${panel("Your milestones",`<div class="roadmap-item"><span class="roadmap-node">✦</span><div><b>First 100 cards reviewed</b><small>Achievement unlocked</small></div><span class="status-tag">Done</span></div><div class="roadmap-item"><span class="roadmap-node">◎</span><div><b>Complete 3 core modules</b><small>2 of 3 modules</small></div><span class="status-tag orange">67%</span></div><div class="roadmap-item"><span class="roadmap-node locked">◇</span><div><b>Finish subject pathway</b><small>Target: 30 November</small></div><span class="status-tag">Next</span></div>`)}${panel("Topic connections",`<div class="empty-note">Concept dependencies connect foundational knowledge to advanced applications. Complete the active module to unlock the next pathway.</div>`)}</div></div>`}
function vault(){return `${head("Knowledge Vault","Your personal library for the formulas, facts and ideas worth keeping.",'<button class="btn btn-outline btn-small" data-action="export">Export vault ↧</button><button class="btn btn-primary btn-small" data-action="new">＋ Save knowledge</button>')}<input class="search-field" id="vaultSearch" placeholder="⌕  Search formulas, definitions, laws and notes..."><div class="filter-row">${["All items","Formulas","Definitions","Principles","Favorites"].map((x,i)=>`<button class="filter-chip ${i===0?'active':''}" data-filter="${x}">${x}</button>`).join("")}</div><div class="vault-list" id="vaultList">${vaultItems.map((v,i)=>`<article class="vault-item" data-vault="${v.join(" ").toLowerCase()}"><small>${v[1]} · ${v[3]}</small><h4>${v[0]}</h4><p>${v[2]}</p><button data-action="recall">Quick recall ↗</button></article>`).join("")}</div>`}
function flashcards(){let c=cards[cardIndex%cards.length];return `${head("Flashcard review","Bring important ideas back to mind. Rate how well you recalled each answer.",'<span class="status-tag">SESSION 01</span>')}<div class="flashcard-stage"><div style="display:flex;justify-content:space-between;font-size:9px;color:#84928e;margin-bottom:9px"><span>THERMODYNAMICS</span><span>${cardIndex+1} OF 24</span></div><div class="progress-track"><i style="width:${Math.min(100,(cardIndex+1)/24*100)}%"></i></div><div class="flashcard ${flipped?'flipped':''}" id="flashcard"><div><small>${flipped?'ANSWER':'QUESTION'} · TAP TO ${flipped?'RETURN':'REVEAL'}</small><h2>${flipped?c[1]:c[0]}</h2><p>${flipped?'Think about the principle, not just the wording.':'Try to recall the answer before revealing it.'}</p></div></div><div class="review-actions">${flipped?`<button class="rating-btn" data-rate="Again">Again</button><button class="rating-btn" data-rate="Hard">Hard</button><button class="rating-btn" data-rate="Good">Good</button><button class="rating-btn orange" data-rate="Easy">Easy</button>`:`<button class="btn btn-primary" id="revealCard">Reveal answer ↗</button>`}</div><p style="text-align:center;color:#97a39f;font-size:9px;margin-top:18px">Your review ratings are shown in this prototype. Existing SM-2 scheduling should be connected before production use.</p></div>`}
function chat(){return `${head("AI Tutor","A subject-aware study partner for questions, explanations and deeper understanding.",'<button class="btn btn-outline btn-small" data-action="new">＋ New chat</button>')}<div class="chat-window"><div class="chat-messages" id="chatMessages"><div class="chat-msg">Hi Alex! I'm ready to help you work through Thermodynamics. What concept are you exploring today?</div><div class="chat-msg user">Can you explain why entropy increases in an irreversible process?</div><div class="chat-msg">In an irreversible process, the total entropy of the system and its surroundings increases. Think of friction: useful mechanical energy becomes dispersed as thermal energy, and that energy is less available to do work. The key idea is that real processes move toward a more probable, dispersed energy state.<br><br>Would you like a practical example using a piston or a heat engine?</div></div><div class="chat-input"><input id="chatInput" placeholder="Ask a question about your subject..."><button id="sendChat">Send ↑</button></div></div><div class="filter-row" style="margin-top:13px"><button class="filter-chip" data-prompt="Explain this like I'm new to the topic">Explain simply</button><button class="filter-chip" data-prompt="Give me a worked engineering example">Worked example</button><button class="filter-chip" data-prompt="Quiz me on this concept">Quiz me</button></div>`}
function generic(page){const map={
"Memory Center":["Memory Center","See what is due, what is becoming familiar and what deserves another review.","Review schedule","Your upcoming recall plan",`<div class="stats-grid">${stat("Due today","24","Across 3 subjects","◷")}${stat("At risk","8","Prioritize these","!")}${stat("Recall accuracy","86%","Recent sessions","◎")}${stat("Reviewed this week","142","Cards revisited","▣")}</div><div class="two-col">${panel("Upcoming reviews",["Today · 24 cards","Tomorrow · 18 cards","Wednesday · 31 cards","Thursday · 12 cards"].map(x=>`<div class="roadmap-item"><span class="roadmap-node">◷</span><div><b>${x}</b><small>Estimated 12–20 minutes</small></div><span class="status-tag">Scheduled</span></div>`).join(""))}${panel("Retention estimate",`<div class="readiness-score"><strong>82%</strong><small>ESTIMATED</small></div><p class="muted" style="font-size:10px;text-align:center;line-height:1.7">An indicative learning estimate based on review activity, not a direct measurement of memory.</p>`)}</div>`],
"Weakness Detector":["Weakness Detector","Turn repeated mistakes into clear, actionable revision priorities.","Your learning signals","Suggested actions",`<div class="two-col">${panel("Concepts to revisit",`<div class="roadmap-item"><span class="roadmap-node" style="background:var(--orange-soft);color:var(--orange)">!</span><div><b>Brayton cycle · Pressure ratios</b><small>Repeated errors in recent practice questions</small></div><span class="status-tag orange">High focus</span></div><div class="roadmap-item"><span class="roadmap-node" style="background:var(--orange-soft);color:var(--orange)">!</span><div><b>Entropy · Irreversibility</b><small>Inconsistent explanation quality</small></div><span class="status-tag orange">Review</span></div><div class="roadmap-item"><span class="roadmap-node">◎</span><div><b>Bernoulli applications</b><small>Accuracy varies by question type</small></div><span class="status-tag">Monitor</span></div>`)}${panel("Recommended next action",`<h3 style="font:800 15px Manrope">Targeted 12-minute revision</h3><p class="muted" style="font-size:10px;line-height:1.7">Review pressure ratio relationships, then complete a short set of applied questions.</p><button class="btn btn-primary btn-small" data-page="AI Tutor">Revise with AI tutor ↗</button>`)}</div><p class="muted" style="font-size:9px">Prototype insight examples. Real diagnoses require connected and sufficient learner activity.</p>`],
"Study Planner":["Study Planner","Make space for focused learning and keep your upcoming priorities visible.","This week","Schedule a study block",`<div class="two-col">${panel("November 2026",`<div class="calendar-grid">${["M","T","W","T","F","S","S",...Array.from({length:35},(_,i)=>String(i+1))].map((x,i)=>`<span class="${i===11?'today':[9,13,16,19,23].includes(i)?'event':''}">${x}</span>`).join("")}</div>`)}${panel("Today's plan",task("Thermodynamics · Entropy","09:00 · 25 minutes",20)+task("Flashcard review","12:30 · 15 minutes",15)+task("Engineering maths practice","17:00 · 30 minutes",30))}</div><div class="panel"><div class="panel-head"><h3>Upcoming deadlines</h3><button data-action="new">＋ Add deadline</button></div><div class="roadmap-item"><span class="roadmap-node">!</span><div><b>Thermodynamics mid-semester test</b><small>18 November · 10 days remaining</small></div><span class="status-tag orange">Upcoming</span></div></div>`],
"Exam Readiness":["Exam Readiness","A transparent snapshot of your preparation—not a promise of an exam outcome.","Thermodynamics · Mid-semester","View practice exam",`<div class="two-col"><div class="panel" style="text-align:center"><div class="page-eyebrow">ESTIMATED READINESS</div><div class="readiness-score"><strong>78%</strong><small>PREPARED</small></div><span class="status-tag">Building confidence</span><p class="muted" style="font-size:10px;line-height:1.7">Estimate combines topic coverage, recent practice performance and outstanding reviews.</p></div><div>${panel("Readiness components",["Topic coverage|84%","Practice accuracy|79%","Review completion|68%","Study consistency|82%"].map(x=>{let [a,b]=x.split("|");return `<div style="margin:13px 0"><div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:7px"><b>${a}</b><span>${b}</span></div><div class="progress-track"><i style="width:${b}"></i></div></div>`}).join(""))}${panel("Priority before exam",`<p class="muted" style="font-size:10px;line-height:1.7">Complete the remaining entropy reviews and attempt one timed practice set before your next readiness check.</p>`)}</div></div>`],
"Daily Quests":["Daily Quests","Small, meaningful challenges that make consistent learning feel rewarding.","Daily objectives","Quest collection",`<div class="stats-grid">${stat("Quest XP","65","Earned today","✧")}${stat("Completed","2 / 4","Daily objectives","✓")}${stat("Weekly quests","4 / 6","You're progressing","▦")}${stat("Current streak","12 days","Keep it steady","♨")}</div>${panel("Today's quests",task("Review 15 flashcards","15 cards · 10 minutes",20,true)+task("Complete a practice quiz","10 questions",30,true)+task("Revise one weak concept","Brayton cycle",15)+task("Add 3 items to your vault","Save useful knowledge",15))}<p class="muted" style="font-size:9px">XP and rewards are illustrative in this standalone prototype.</p>`],
"Leaderboards":["Leaderboards","Friendly competition that celebrates real learning progress.","Weekly rankings","Your league",`${panel("Your current league",`<div class="welcome-banner"><div class="welcome-text"><small>WEEK 46 · SILVER LEAGUE</small><h2>You're building momentum.</h2><p>Earn XP through meaningful study sessions and verified reviews.</p></div><div class="welcome-mark">♜</div></div>`)}${panel("Weekly leaderboard",`<table class="data-table"><thead><tr><th>RANK</th><th>LEARNER</th><th>XP THIS WEEK</th><th>CHANGE</th></tr></thead><tbody>${[["01","StudyPilot","1,420","↑ 2"],["02","Mira K.","1,280","↑ 1"],["03","Alex Carter","1,145","↑ 4"],["04","K. Ade","1,020","—"],["05","Nia T.","980","↓ 1"]].map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td class="trend">${x[3]}</td></tr>`).join("")}</tbody></table>`)}`],
"Study Groups":["Study Groups","Learn alongside people working toward similar academic goals.","Your communities","Find a study group",`<div class="tool-grid">${[["Thermodynamics Circle","18 members · Mechanical Engineering","♧"],["Engineering Maths Lab","32 members · Problem solving","∑"],["Exam Prep 2026","64 members · Weekly challenges","◎"]].map(x=>`<article class="tool-card"><div class="tool-symbol">${x[2]}</div><h3>${x[0]}</h3><p>${x[1]}</p><button class="btn btn-outline btn-small" style="margin-top:15px" data-action="join">View group ↗</button></article>`).join("")}</div><div class="panel" style="margin-top:16px"><div class="panel-head"><h3>Group weekly mission</h3><span class="status-tag orange">In progress</span></div><b style="font:800 14px Manrope">Complete 120 collective reviews</b><p class="muted" style="font-size:10px">86 of 120 reviews completed by your group.</p><div class="progress-track"><i style="width:72%"></i></div></div>`],
"Rewards Store":["Rewards Store","Personalize your learning space with cosmetic rewards earned through progress.","Your balance","Featured rewards",`<div class="welcome-banner"><div class="welcome-text"><small>YOUR REWARD BALANCE</small><h2>💎 340 gems</h2><p>Earn gems through meaningful learning milestones.</p></div></div><div class="tool-grid" style="margin-top:16px">${[["Teal Focus Frame","120 gems","◇"],["Sunrise Profile Theme","180 gems","◐"],["Momentum Badge","90 gems","✦"],["Scholar Avatar","240 gems","♙"],["Orange Accent Pack","150 gems","◈"],["Quiet Study Background","200 gems","▧"]].map(x=>`<article class="tool-card"><div class="tool-symbol">${x[2]}</div><h3>${x[0]}</h3><p>Cosmetic profile customization</p><button class="btn btn-outline btn-small" style="margin-top:15px" data-action="buy">Preview · ${x[1]}</button></article>`).join("")}</div><p class="muted" style="font-size:9px;margin-top:12px">Store purchases are preview-only. No currency is deducted in this prototype.</p>`],
"Explain It to Me":["Explain It to Me","Strengthen understanding by explaining a concept in your own words.","Choose a topic","Your explanation",`<div class="panel"><label class="page-eyebrow">TOPIC TO EXPLAIN</label><div class="form-row"><input id="explainTopic" value="The second law of thermodynamics" aria-label="Topic"><button class="btn btn-primary btn-small" id="startExplain">Start explanation</button></div><textarea id="explainText" placeholder="Explain the concept as if you were teaching a classmate..." style="width:100%;min-height:170px;margin-top:14px;border:1px solid var(--line);border-radius:9px;padding:14px;font:11px 'DM Sans'"></textarea><button class="btn btn-primary btn-small" id="evaluateExplain" style="margin-top:12px">Review my explanation ↗</button></div><div id="explainFeedback"></div>`],
"Weekly Reports":["Weekly Reports","Reflect on what improved and choose your next priorities.","Week of 2–8 November","Download report",`<div class="stats-grid">${stat("Study time","8.4h","↑ 1.2h vs last week","◷","true")}${stat("Cards reviewed","142","↑ 18% vs last week","▣","true")}${stat("Accuracy","86%","↑ 8 points","◎","true")}${stat("Sessions","16","Across 5 days","▦")}</div><div class="two-col">${panel("Your weekly activity",chart())}${panel("What moved forward",`<div class="roadmap-item"><span class="roadmap-node">✓</span><div><b>Fluid Mechanics</b><small>Accuracy improved by 11%</small></div></div><div class="roadmap-item"><span class="roadmap-node">✓</span><div><b>Review consistency</b><small>4 consecutive active days</small></div></div><div class="roadmap-item"><span class="roadmap-node" style="background:var(--orange-soft);color:var(--orange)">!</span><div><b>Brayton cycle calculations</b><small>Priority for next week</small></div></div>`)}</div>`],
"Exam Simulator":["Exam Simulator","Practice under exam conditions, then learn from every answer.","Create a practice session","Recent examinations",`<div class="panel"><h3 style="font:800 15px Manrope;margin:0 0 15px">Configure your exam</h3><div class="form-row"><select id="examSubject"><option>Thermodynamics</option><option>Fluid Mechanics</option><option>Engineering Mathematics</option></select><select id="examDifficulty"><option>Mixed difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select><select id="examCount"><option>10 questions</option><option>20 questions</option></select></div><div class="form-row" style="margin-top:12px"><label style="font-size:10px;display:flex;gap:7px;align-items:center"><input type="checkbox" id="timedExam" checked> Timed session · 20 minutes</label></div><button class="btn btn-primary btn-small" id="beginExam" style="margin-top:17px">Start practice exam ↗</button><p class="muted" style="font-size:9px;margin-top:12px">Standalone demo questions only. Existing backend question limits and pass thresholds must be verified before production integration.</p></div><div id="examArea"></div>`],
"Summaries":["AI Summaries","Turn dense learning material into clear, structured revision notes.","Create a summary","Saved summaries",`<div class="panel"><div class="form-row"><input id="summaryTopic" placeholder="Enter a topic or paste your text..."><button class="btn btn-primary btn-small" id="makeSummary">Generate summary ↗</button></div><div id="summaryResult" class="empty-note" style="margin-top:14px">Your generated summary will appear here. AI generation requires a connected provider.</div></div><div class="tool-grid"><article class="tool-card"><div class="tool-symbol">≡</div><h3>Thermodynamics · Laws</h3><p>Key principles, equations and applications.</p></article><article class="tool-card"><div class="tool-symbol">∑</div><h3>Engineering Mathematics</h3><p>Core identities and worked concepts.</p></article></div>`],
"Read Aloud":["Read Aloud","Listen to your learning materials with controls that fit your study rhythm.","Audio reader","Playback settings",`<div class="panel"><textarea id="readText" placeholder="Paste or type the text you want to listen to..." style="width:100%;min-height:170px;border:1px solid var(--line);border-radius:9px;padding:14px;font:11px 'DM Sans'">The second law of thermodynamics states that the total entropy of an isolated system can never decrease over time. In natural processes, energy tends to spread out and become less available to perform useful work.</textarea><div class="form-row" style="margin-top:12px"><select id="voiceSelect"><option>Default system voice</option></select><select id="voiceSpeed"><option value="1">1× speed</option><option value=".8">0.8× speed</option><option value="1.2">1.2× speed</option><option value="1.5">1.5× speed</option></select><button class="btn btn-primary btn-small" id="speakBtn">▶ Play audio</button><button class="btn btn-outline btn-small" id="stopSpeak">Stop</button></div><p class="muted" style="font-size:9px;margin-top:12px">Uses browser speech synthesis where available. Voice options depend on your device.</p></div>`],
"Settings":["Settings","Manage your profile, appearance and learning preferences.","Preferences","Account settings",`<div class="two-col">${panel("Appearance",`<div class="roadmap-item"><div><b>Dark appearance</b><small>Switch between light and dark workspace</small></div><button class="btn btn-outline btn-small" id="settingsTheme">Toggle</button></div>`)}${panel("Learning preferences",`<div class="roadmap-item"><div><b>Daily study goal</b><small>45 minutes per day</small></div><button class="btn btn-outline btn-small" data-action="edit">Edit</button></div><div class="roadmap-item"><div><b>Weekly report</b><small>Every Sunday</small></div><span class="status-tag">Enabled</span></div><div class="roadmap-item"><div><b>Competition visibility</b><small>Show pseudonym on leaderboards</small></div><span class="status-tag">Private</span></div>`)}</div><div class="panel"><h3 style="font:800 13px Manrope">Account</h3><p class="muted" style="font-size:10px">Alex Carter · alex@example.com</p><button class="btn btn-outline btn-small" data-action="signout">Sign out</button></div>`]
};
let item=map[page]||[page,`Your ${page.toLowerCase()} workspace. Explore the tools and keep your learning moving.`,page,"Explore",`<div class="tool-grid">${[["Overview","A focused view of your learning progress","⌂"],["Recommendations","Suggested next steps based on your goals","✦"],["History","Review your recent activity and milestones","◷"]].map(x=>`<article class="tool-card"><div class="tool-symbol">${x[2]}</div><h3>${x[0]}</h3><p>${x[1]}</p><button class="btn btn-outline btn-small" style="margin-top:14px" data-action="open">Open workspace →</button></article>`).join("")}</div>`];
return `${head(item[0],item[1],'<button class="btn btn-outline btn-small" data-action="export">Export ↧</button><button class="btn btn-primary btn-small" data-action="new">＋ New</button>')}${item[4]}`;
}
function render(page){
  if(page!==currentPage&&examTimer){clearInterval(examTimer);examTimer=null;examSession=null;toast("Timed exam ended when you left the exam page.")}
  if(page!=="Read Aloud"&&currentPage==="Read Aloud"&&"speechSynthesis"in window)speechSynthesis.cancel();
  currentPage=page;setActive(page);
  if(currentPage==="Knowledge Vault"){activeVaultFilter="all items";activeVaultSearch=""}
  pageContainer.innerHTML=page==="Dashboard"?dashboard():page==="Subjects"?`${head("My subjects","Your learning, organized by subject.",'<button class="btn btn-primary btn-small" data-action="new">＋ Add subject</button>')}${subjectCards()}`:page==="Roadmap"?roadmap():page==="Knowledge Vault"?vault():page==="Flashcards"?flashcards():page==="AI Tutor"?chat():generic(page);
  bindPageActions();
}
function sendChat(){let input=$("#chatInput"),v=input.value.trim();if(!v)return;let box=$("#chatMessages");box.insertAdjacentHTML("beforeend",`<div class="chat-msg user">${escapeHtml(v)}</div><div class="chat-msg">This is a UI prototype. Connect your Groq/OpenAI tutor endpoint to receive subject-aware answers. I can still help you explore the learning workflow here.</div>`);input.value="";box.scrollTop=box.scrollHeight}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

const STORAGE_KEY="recalro-demo-v1";
const defaultState={questDone:{},completedQuests:[],reviews:[],currentCard:0,savedVault:[],favorites:[],subjects:[],milestones:[],plannerTasks:[],customQuests:[],customGroups:[],joinedGroups:[],purchases:[],customItems:[],gems:340,dailyGoal:45,weeklyReport:true,leaderboardPrivate:true,examHistory:[]};
function loadDemoState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
    if(!saved||typeof saved!=="object"||Array.isArray(saved))throw new Error("Saved learning data has an invalid format.");
    return {...defaultState,...saved,questDone:saved.questDone||{},completedQuests:saved.completedQuests||[],reviews:saved.reviews||[],savedVault:saved.savedVault||[],favorites:saved.favorites||[],subjects:saved.subjects||[],milestones:saved.milestones||[],plannerTasks:saved.plannerTasks||[],customQuests:saved.customQuests||[],customGroups:saved.customGroups||[],joinedGroups:saved.joinedGroups||[],purchases:saved.purchases||[],customItems:saved.customItems||[],examHistory:saved.examHistory||[]};
  }catch(error){
    console.error("Could not load saved Recalro demo data.",error);
    toast("Saved demo data could not be loaded. Starting with a fresh workspace.");
    return {...defaultState};
  }
}
const demoState=loadDemoState();
let activeVaultFilter="all items",activeVaultSearch="",examSession=null,examTimer=null;
if(Number.isInteger(demoState.currentCard)&&demoState.currentCard>=0)cardIndex=demoState.currentCard%cards.length;
function saveDemoState(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(demoState))}
  catch(error){console.error("Could not save Recalro demo data.",error);toast("Your browser could not save this change. Check its storage settings.")}
}
function panel(title,content,action=""){
  const control=action
    ?(pages.includes(action)?`<button data-page="${escapeHtml(action)}">View all ↗</button>`:`<button data-action="${escapeHtml(action)}">View all ↗</button>`)
    :"";
  return `<section class="panel"><div class="panel-head"><h3>${title}</h3>${control}</div>${content}</section>`;
}
function task(title,meta,xp,done=false){
  const completed=Object.prototype.hasOwnProperty.call(demoState.questDone,title)?demoState.questDone[title]:done;
  return `<div class="task-row"><button class="task-check ${completed?'checked':''}" data-action="check" data-quest="${escapeHtml(title)}" data-xp="${xp}" aria-pressed="${completed}">${completed?'✓':''}</button><div class="task-info"><b>${escapeHtml(title)}</b><small>${escapeHtml(meta)}</small></div><span class="task-xp">+${xp} XP</span></div>`;
}
let roadmapSubject="Thermodynamics";
function roadmap(){
  const allSubjects=[...subjects,...demoState.subjects.map(item=>({name:item.name,sub:"Personal study subject",progress:0,cards:0,icon:"＋"}))];
  const subject=allSubjects.find(item=>item.name===roadmapSubject)||subjects[0];
  const topics=[
    [`${subject.name} foundations`,"4 concepts · completed","✓","Completed"],
    ["Core principles and definitions","6 concepts · completed","✓","Completed"],
    ["Key applications and problem solving","5 concepts · active","●","In progress"],
    ["Practice and worked examples","7 concepts · upcoming","4","Upcoming"],
    ["Advanced topic review","4 concepts · upcoming","5","Upcoming"]
  ];
  return `${head("Learning roadmap","A structured path through your subjects, modules and milestones.",`<button class="btn btn-outline btn-small" data-action="filter">${escapeHtml(roadmapSubject)}⌄</button><button class="btn btn-primary btn-small" data-action="new">＋ Add milestone</button>`)}
  <div class="two-col"><div>${panel(`${escapeHtml(subject.name)} · ${subject.progress}% complete`,`<div class="progress-track"><i style="width:${subject.progress}%"></i></div><div class="roadmap-list" style="margin-top:15px">${topics.map((item,index)=>`<div class="roadmap-item"><span class="roadmap-node ${index>2?'locked':''}">${item[2]}</span><div><b>${escapeHtml(item[0])}</b><small>${item[1]}</small></div><span class="status-tag ${index===2?'orange':''}">${item[3]}</span></div>`).join("")}</div>`)}${panel("Next recommended lesson",`<h3 style="font:800 16px Manrope;margin:0 0 8px">${escapeHtml(subject.name)} · focused review</h3><p class="muted" style="font-size:10px;line-height:1.7">Continue with a focused practice session on the next topic in this learning path.</p><button class="btn btn-primary btn-small" data-page="AI Tutor">Explore this concept ↗</button>`)}</div><div>${panel("Your milestones",`<div class="roadmap-item"><span class="roadmap-node">✦</span><div><b>First 100 cards reviewed</b><small>Achievement unlocked</small></div><span class="status-tag">Done</span></div><div class="roadmap-item"><span class="roadmap-node">◎</span><div><b>Complete 3 core modules</b><small>2 of 3 modules</small></div><span class="status-tag orange">67%</span></div><div class="roadmap-item"><span class="roadmap-node locked">◇</span><div><b>Finish subject pathway</b><small>Target: 30 November</small></div><span class="status-tag">Next</span></div>`)}${panel("Topic connections",`<div class="empty-note">Concept dependencies connect foundational knowledge to advanced applications. Complete the active module to unlock the next pathway.</div>`)}</div></div>`;
}
function bindPageActions(){
  enhancePage();
  if(pageContainer.dataset.interactionsBound)return;
  pageContainer.dataset.interactionsBound="true";
  pageContainer.addEventListener("click",handlePageClick);
  pageContainer.addEventListener("input",handlePageInput);
  pageContainer.addEventListener("keydown",handlePageKeydown);
  $(".notification-btn").addEventListener("click",()=>toast(demoState.reviews.length?`You have reviewed ${demoState.reviews.length} demo cards.`:"You're all caught up. Start a study session to see activity here."));
  $(".profile-mini button").addEventListener("click",()=>render("Settings"));
  const profileAvatar=$(".top-avatar");
  profileAvatar.setAttribute("role","button");profileAvatar.setAttribute("tabindex","0");profileAvatar.setAttribute("aria-label","Open profile settings");
  profileAvatar.addEventListener("click",()=>render("Settings"));
  profileAvatar.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();render("Settings")}});
  if("speechSynthesis"in window)speechSynthesis.addEventListener("voiceschanged",populateVoiceOptions);
}
function enhancePage(){
  if(currentPage==="Summaries"){
    const field=$("#summaryTopic");
    if(field&&field.tagName==="INPUT"){
      const area=document.createElement("textarea");
      area.id=field.id;area.className=field.className;area.placeholder="Paste notes or source text to create a local study summary...";
      area.setAttribute("aria-label","Notes or source text to summarize");area.style.cssText="width:100%;min-height:100px;border:1px solid var(--line);border-radius:9px;padding:12px;font:11px 'DM Sans'";
      field.replaceWith(area);
    }
  }
  if(currentPage==="Knowledge Vault"){
    const list=$("#vaultList");
    demoState.savedVault.forEach((item,index)=>{
      if(list.querySelector(`[data-saved-index="${index}"]`))return;
      const article=document.createElement("article");article.className="vault-item";article.dataset.savedIndex=index;
      article.dataset.vault=`${item.title} ${item.category} ${item.detail}`.toLowerCase();
      const label=document.createElement("small");label.textContent=`${item.category.toUpperCase()} · SAVED`;
      const title=document.createElement("h4");title.textContent=item.title;
      const detail=document.createElement("p");detail.textContent=item.detail;
      const recall=document.createElement("button");recall.dataset.action="recall";recall.textContent="Quick recall ↗";
      article.append(label,title,detail,recall);list.append(article);
    });
    $$(".vault-item").forEach(article=>{
      const title=article.querySelector("h4")?.textContent||"";
      let button=article.querySelector("[data-action='favorite']");
      if(!button){button=document.createElement("button");button.dataset.action="favorite";button.className="favorite-toggle";article.append(button)}
      const favorite=demoState.favorites.includes(title);
      button.textContent=favorite?"★ Saved":"☆ Save";
      button.setAttribute("aria-pressed",String(favorite));
    });
    const search=$("#vaultSearch");
    if(search)search.value=activeVaultSearch;
    $$("[data-filter]").forEach(button=>button.classList.toggle("active",button.dataset.filter.toLowerCase()===activeVaultFilter));
    applyVaultFilters();
  }
  if(currentPage==="Summaries"){
    pageContainer.querySelectorAll(".tool-card").forEach(card=>{
      card.dataset.summary=card.querySelector("h3")?.textContent||"Study notes";
      card.setAttribute("role","button");card.setAttribute("tabindex","0");
    });
  }
  if(currentPage==="Subjects"){
    const list=$(".subject-list");
    demoState.subjects.forEach((subject,index)=>{
      if(list.querySelector(`[data-custom-subject="${index}"]`))return;
      const article=document.createElement("article");article.className="subject-card";article.dataset.customSubject=index;
      article.innerHTML=`<div class="subject-icon">＋</div><h4></h4><p>Personal study subject</p><div class="mini-progress"><i style="width:0%"></i></div><div class="subject-meta"><span>0% progress</span><span>0 cards</span></div><button class="btn btn-outline btn-small" style="width:100%;margin-top:13px" data-action="subject">Open subject →</button>`;
      article.querySelector("h4").textContent=subject.name;list.append(article);
    });
  }
  if(currentPage==="Roadmap"&&demoState.milestones.length){
    const milestonePanel=[...pageContainer.querySelectorAll(".panel")].find(panel=>panel.querySelector(".panel-head h3")?.textContent==="Your milestones");
    demoState.milestones.forEach((title,index)=>{
      if(milestonePanel.querySelector(`[data-milestone="${index}"]`))return;
      const row=document.createElement("div");row.className="roadmap-item";row.dataset.milestone=index;
      row.innerHTML='<span class="roadmap-node">＋</span><div><b></b><small>Personal milestone · not started</small></div><span class="status-tag">New</span>';
      row.querySelector("b").textContent=title;milestonePanel.append(row);
    });
  }
  if(currentPage==="Study Planner"&&demoState.plannerTasks.length){
    const panel=[...pageContainer.querySelectorAll(".panel")].find(item=>item.querySelector(".panel-head h3")?.textContent==="Today's plan");
    demoState.plannerTasks.forEach((title,index)=>{
      if(panel.querySelector(`[data-planner-task="${index}"]`))return;
      const row=document.createElement("div");row.dataset.plannerTask=index;
      row.innerHTML=task(title,"Personal study block",15);panel.append(row);
    });
  }
  if(currentPage==="Daily Quests"&&demoState.customQuests.length){
    const questPanel=[...pageContainer.querySelectorAll(".panel")].find(item=>item.querySelector(".panel-head h3")?.textContent==="Today's quests");
    demoState.customQuests.forEach((title,index)=>{
      if(questPanel.querySelector(`[data-custom-quest="${index}"]`))return;
      const row=document.createElement("div");row.dataset.customQuest=index;row.innerHTML=task(title,"Personal demo quest",10);questPanel.append(row);
    });
  }
  if(currentPage==="Study Groups"&&demoState.customGroups.length){
    const grid=pageContainer.querySelector(".tool-grid");
    demoState.customGroups.forEach((group,index)=>{
      if(grid.querySelector(`[data-custom-group="${index}"]`))return;
      const card=document.createElement("article");card.className="tool-card";card.dataset.customGroup=index;
      card.innerHTML='<div class="tool-symbol">＋</div><h3></h3><p>Personal local demo group</p><button class="btn btn-outline btn-small" style="margin-top:15px" data-action="join">View group ↗</button>';
      card.querySelector("h3").textContent=group;grid.append(card);
    });
  }
  demoState.customItems.filter(item=>item.page===currentPage).forEach((item,index)=>{
    const section=document.createElement("article");section.className="tool-card";
    const icon=document.createElement("div");icon.className="tool-symbol";icon.textContent="✦";
    const heading=document.createElement("h3");heading.textContent=item.title;
    const description=document.createElement("p");description.textContent="Saved in this browser's demo workspace.";
    section.append(icon,heading,description);pageContainer.append(section);
  });
  if(currentPage==="Rewards Store"){
    const note=pageContainer.querySelector(".tool-grid + .muted");
    if(note)note.textContent="Purchases use demo gems stored only in this browser. No real currency is involved.";
  }
  if(currentPage==="Flashcards"){
    const flashcard=$("#flashcard");
    if(flashcard){flashcard.setAttribute("role","button");flashcard.setAttribute("tabindex","0");flashcard.setAttribute("aria-label",flipped?"Show question":"Reveal answer")}
    const count=$(".flashcard-stage>div:first-child span:last-child");
    if(count)count.textContent=`${cardIndex+1} OF ${cards.length}`;
    const progress=$(".flashcard-stage .progress-track i");
    if(progress)progress.style.width=`${Math.min(100,(cardIndex+1)/cards.length*100)}%`;
  }
  const badge=$(".nav-count");
  if(badge)badge.textContent=String(cards.length);
  if(currentPage==="Dashboard"){
    const due=pageContainer.querySelector(".stats-grid .stat-card:nth-child(2) strong");
    if(due)due.textContent=String(cards.length);
    const welcome=pageContainer.querySelector(".welcome-banner .welcome-text p");
    if(welcome)welcome.textContent=`You have ${cards.length} sample cards available and one recommended topic to tackle.`;
    const reviewButton=pageContainer.querySelector(".welcome-banner [data-page='Flashcards']");
    if(reviewButton)reviewButton.textContent=`Review ${cards.length} cards ↗`;
  }
  if(currentPage==="Rewards Store"){
    const balance=pageContainer.querySelector(".welcome-text h2");
    if(balance)balance.textContent=`💎 ${demoState.gems} gems`;
    pageContainer.querySelectorAll(".tool-card").forEach(card=>{
      const button=card.querySelector("[data-action='buy']");
      if(!button)return;
      button.dataset.item=card.querySelector("h3")?.textContent||"Reward";
      const purchased=demoState.purchases.includes(button.dataset.item);
      if(purchased){button.textContent="Owned ✓";button.disabled=true}
    });
  }
  if(currentPage==="Study Groups"){
    pageContainer.querySelectorAll("[data-action='join']").forEach(button=>{
      const group=button.closest(".tool-card")?.querySelector("h3")?.textContent||"Study group";
      button.dataset.group=group;
      button.textContent=demoState.joinedGroups.includes(group)?"Joined ✓":"View group ↗";
      button.setAttribute("aria-pressed",String(demoState.joinedGroups.includes(group)));
    });
  }
  if(currentPage==="Settings"){
    const goal=[...pageContainer.querySelectorAll(".roadmap-item")].find(row=>row.querySelector("b")?.textContent==="Daily study goal");
    if(goal)goal.querySelector("small").textContent=`${demoState.dailyGoal} minutes per day`;
    const weekly=[...pageContainer.querySelectorAll(".roadmap-item")].find(row=>row.querySelector("b")?.textContent==="Weekly report");
    const privacy=[...pageContainer.querySelectorAll(".roadmap-item")].find(row=>row.querySelector("b")?.textContent==="Competition visibility");
    [[weekly,"weeklyReport",demoState.weeklyReport?"Enabled":"Paused"],[privacy,"leaderboardPrivate",demoState.leaderboardPrivate?"Private":"Visible"]].forEach(([row,key,label])=>{
      if(!row)return;
      const current=row.querySelector(".status-tag");
      const button=document.createElement("button");button.className="btn btn-outline btn-small";button.dataset.setting=key;button.setAttribute("aria-pressed",String(Boolean(demoState[key])));button.textContent=label;
      if(current)current.replaceWith(button);
    });
  }
  if(currentPage==="Memory Center"){
    const firstStat=pageContainer.querySelector(".stats-grid .stat-card strong");
    if(firstStat)firstStat.textContent=String(Math.max(0,cards.length-demoState.reviews.length));
    const reviewed=pageContainer.querySelector(".stats-grid .stat-card:nth-child(4) strong");
    if(reviewed)reviewed.textContent=String(demoState.reviews.length);
  }
  populateVoiceOptions();
}
function populateVoiceOptions(){
  const select=$("#voiceSelect");
  if(!select||!("speechSynthesis"in window))return;
  const selected=select.value;
  const voices=speechSynthesis.getVoices();
  select.replaceChildren(new Option("Default system voice",""));
  voices.forEach((voice,index)=>select.add(new Option(`${voice.name} (${voice.lang})`,String(index))));
  if(selected&&[...select.options].some(option=>option.value===selected))select.value=selected;
}
function applyVaultFilters(){
  $$("#vaultList .vault-item").forEach(item=>{
    const text=item.dataset.vault||"";
    const typeMatch=activeVaultFilter==="all items"||activeVaultFilter==="favorites"
      ?activeVaultFilter!=="favorites"||demoState.favorites.includes(item.querySelector("h4")?.textContent||"")
      :text.includes(activeVaultFilter.slice(0,-1).replace("principle","principle"));
    item.hidden=!(typeMatch&&text.includes(activeVaultSearch));
  });
}
function handlePageInput(event){
  if(event.target.id==="vaultSearch"){activeVaultSearch=event.target.value.trim().toLowerCase();applyVaultFilters()}
}
function handlePageKeydown(event){
  if(event.key==="Enter"&&event.target.id==="chatInput"){event.preventDefault();sendChat()}
  if((event.key==="Enter"||event.key===" ")&&event.target.id==="flashcard"){event.preventDefault();flipped=!flipped;render("Flashcards")}
  if((event.key==="Enter"||event.key===" ")&&event.target.closest("[data-summary]")){event.preventDefault();openSavedSummary(event.target.closest("[data-summary]"))}
}
function handlePageClick(event){
  const savedSummary=event.target.closest("[data-summary]");
  if(savedSummary){openSavedSummary(savedSummary);return}
  const pageButton=event.target.closest("[data-page]");
  if(pageButton){render(pageButton.dataset.page);return}
  const settingButton=event.target.closest("[data-setting]");
  if(settingButton){const key=settingButton.dataset.setting;demoState[key]=!demoState[key];saveDemoState();render("Settings");toast("Preference saved on this device.");return}
  const promptButton=event.target.closest("[data-prompt]");
  if(promptButton){$("#chatInput").value=promptButton.dataset.prompt;$("#chatInput").focus();return}
  const filterButton=event.target.closest("[data-filter]");
  if(filterButton){
    activeVaultFilter=filterButton.dataset.filter.toLowerCase();
    $$("[data-filter]").forEach(button=>button.classList.toggle("active",button===filterButton));
    applyVaultFilters();return;
  }
  const rateButton=event.target.closest("[data-rate]");
  if(rateButton){
    demoState.reviews.push({card:cardIndex,rating:rateButton.dataset.rate,at:new Date().toISOString()});
    cardIndex=(cardIndex+1)%cards.length;demoState.currentCard=cardIndex;flipped=false;saveDemoState();render("Flashcards");
    toast(`Rated ${rateButton.dataset.rate}. Review progress saved on this device.`);return;
  }
  if(event.target.closest("#flashcard")){flipped=!flipped;render("Flashcards");return}
  if(event.target.closest("#revealCard")){flipped=true;render("Flashcards");return}
  const actionButton=event.target.closest("[data-action]");
  if(actionButton){runPageAction(actionButton);return}
  if(event.target.closest("#beginExam")){startDemoExam();return}
  if(event.target.closest("#submitDemo")){submitDemoAnswer();return}
  if(event.target.closest("#makeSummary")){makeLocalSummary();return}
  if(event.target.closest("#sendChat")){sendChat();return}
  if(event.target.closest("#startExplain")){$("#explainText").focus();toast("Write what you understand, then review your explanation.");return}
  if(event.target.closest("#evaluateExplain")){reviewExplanation();return}
  if(event.target.closest("#speakBtn")){speakText();return}
  if(event.target.closest("#stopSpeak")){stopSpeaking();return}
  if(event.target.closest("#settingsTheme")){$("#themeToggle").click();return}
}
function runPageAction(button){
  const action=button.dataset.action;
  if(action==="check"){
    const key=button.dataset.quest;
    const wasDone=Object.prototype.hasOwnProperty.call(demoState.questDone,key)
      ?demoState.questDone[key]===true
      :button.getAttribute("aria-pressed")==="true";
    demoState.questDone[key]=!wasDone;
    if(!wasDone&&!demoState.completedQuests.includes(key)){demoState.completedQuests.push(key);toast("Quest completed. Progress saved on this device.")}
    else toast(wasDone?"Quest marked incomplete.":"Quest progress updated.");
    saveDemoState();render(currentPage);return;
  }
  if(action==="new"){
    if(currentPage==="AI Tutor"){
      $("#chatMessages").replaceChildren();
      const greeting=document.createElement("div");greeting.className="chat-msg";greeting.textContent="New demo chat started. Ask a question to try the tutor interface; connected AI answers are not available in this prototype.";
      $("#chatMessages").append(greeting);$("#chatInput").value="";return;
    }
    if(currentPage==="Memory Center"){render("Flashcards");return}
    if(currentPage==="Exam Simulator"){startDemoExam();return}
    if(currentPage==="Summaries"){$("#summaryTopic").value="";$("#summaryResult").textContent="Add source text to create a local summary draft.";return}
    if(currentPage==="Read Aloud"){stopSpeaking();$("#readText").value="";return}
    if(currentPage==="Explain It to Me"){$("#explainText").value="";$("#explainFeedback").replaceChildren();$("#explainText").focus();return}
    if(currentPage==="Weekly Reports"){exportWorkspace();return}
    if(currentPage==="Exam Readiness"){render("Exam Simulator");return}
    if(currentPage==="Rewards Store"){render("Daily Quests");return}
    if(currentPage==="Settings"){toast("Edit your learning preferences or appearance below.");return}
    if(currentPage==="Leaderboards"){render("Daily Quests");return}
    if(currentPage==="Weakness Detector"){render("Flashcards");return}
    if(currentPage==="Daily Quests"){
      openDemoDialog({title:"Add a study quest",description:"Create a small objective for your demo workspace.",fields:[{name:"title",label:"Quest name",required:true,maxLength:80}],onSubmit:values=>{demoState.customQuests.push(values.title.trim());saveDemoState();render(currentPage);toast("Your local demo quest was added.")}});return;
    }
    if(currentPage==="Study Groups"){
      openDemoDialog({title:"Create a study group",description:"This creates a local demo group; it is not shared with other learners.",fields:[{name:"title",label:"Group name",required:true,maxLength:80}],onSubmit:values=>{demoState.customGroups.push(values.title.trim());saveDemoState();render(currentPage);toast("Your local demo group was created.")}});return;
    }
    const fields=currentPage==="Knowledge Vault"
      ?[{name:"title",label:"Name",required:true,maxLength:100},{name:"detail",label:"Definition, formula, or note",type:"textarea",required:true,maxLength:1000},{name:"category",label:"Category",type:"select",options:[["formula","Formula"],["definition","Definition"],["principle","Principle"],["note","Note"]]}]
      :[{name:"title",label:currentPage==="Subjects"?"Subject name":currentPage==="Roadmap"?"Milestone name":currentPage==="Study Planner"?"Study block name":"Name",required:true,maxLength:100}];
    openDemoDialog({title:currentPage==="Knowledge Vault"?"Save knowledge":`Add to ${currentPage}`,description:"This item is saved only in your browser's demo workspace.",fields,onSubmit:values=>{
      const name=values.title.trim();
      if(currentPage==="Subjects")demoState.subjects.push({name});
      else if(currentPage==="Roadmap")demoState.milestones.push(name);
      else if(currentPage==="Study Planner")demoState.plannerTasks.push(name);
      else if(currentPage==="Knowledge Vault")demoState.savedVault.push({title:name,detail:values.detail.trim(),category:values.category});
      else demoState.customItems.push({page:currentPage,title:name});
      saveDemoState();render(currentPage);toast(`${name} added to this device's demo workspace.`);
    }});return;
  }
  if(action==="export"){exportWorkspace();return}
  if(action==="subject"){
    const name=button.closest(".subject-card")?.querySelector("h4")?.textContent||"Thermodynamics";
    roadmapSubject=name;render("Roadmap");return;
  }
  if(action==="filter"){
    const allSubjects=[...subjects,...demoState.subjects.map(item=>({name:item.name}))];
    openDemoDialog({title:"Filter roadmap",description:"Choose which subject pathway to view.",fields:[{name:"subject",label:"Subject",type:"select",options:allSubjects.map(item=>[item.name,item.name]),value:roadmapSubject}],submitLabel:"Show roadmap",onSubmit:values=>{roadmapSubject=values.subject;render("Roadmap")}});return;
  }
  if(action==="favorite"){
    const title=button.closest(".vault-item")?.querySelector("h4")?.textContent||"";
    demoState.favorites=demoState.favorites.includes(title)?demoState.favorites.filter(item=>item!==title):[...demoState.favorites,title];
    saveDemoState();enhancePage();return;
  }
  if(action==="recall"){
    const item=button.closest(".vault-item"),detail=item?.querySelector("p")?.textContent||"";
    let answer=item.querySelector(".recall-answer");
    if(answer){answer.remove();button.textContent="Quick recall ↗"}
    else{answer=document.createElement("p");answer.className="recall-answer";answer.textContent=detail;button.before(answer);button.textContent="Hide answer"}
    return;
  }
  if(action==="buy"){
    const cost=Number(button.textContent.match(/(\d+)\s*gems/i)?.[1]||0),name=button.dataset.item;
    if(cost>demoState.gems){toast("Not enough demo gems for this reward.");return}
    openDemoDialog({title:`Get ${name}?`,description:`Spend ${cost} demo gems? This only affects your local prototype; no real currency is used.`,fields:[],submitLabel:"Confirm purchase",onSubmit:()=>{demoState.gems-=cost;demoState.purchases.push(name);saveDemoState();render(currentPage);toast(`${name} added to your demo collection.`)}});return;
  }
  if(action==="join"){
    const group=button.dataset.group;
    const joined=demoState.joinedGroups.includes(group);
    demoState.joinedGroups=joined?demoState.joinedGroups.filter(item=>item!==group):[...demoState.joinedGroups,group];
    saveDemoState();render(currentPage);toast(joined?`You left ${group} in this local demo.`:`You joined ${group} in this local demo.`);return;
  }
  if(action==="edit"){
    openDemoDialog({title:"Daily study goal",description:"Choose a daily target between 5 minutes and 24 hours.",fields:[{name:"minutes",label:"Minutes per day",type:"number",value:demoState.dailyGoal,min:5,max:1440,step:5,required:true}],submitLabel:"Save goal",onSubmit:values=>{const minutes=Number(values.minutes);if(!Number.isInteger(minutes)||minutes<5||minutes>1440){toast("Enter a whole number between 5 and 1,440 minutes.");return}demoState.dailyGoal=minutes;saveDemoState();render("Settings");toast("Daily study goal saved on this device.")}});return;
  }
  if(action==="signout"){goLanding();return}
  if(action==="open"){
    const label=button.closest(".tool-card")?.querySelector("h3")?.textContent;
    render(label==="Recommendations"?"Weakness Detector":label==="History"?"Weekly Reports":"Dashboard");return;
  }
}
function openDemoDialog({title,description,fields,submitLabel="Save",onSubmit}){
  const overlay=document.createElement("div");overlay.className="demo-dialog-backdrop";
  const dialog=document.createElement("section");dialog.className="demo-dialog-card";dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-labelledby","demo-dialog-title");dialog.setAttribute("aria-describedby","demo-dialog-description");
  const heading=document.createElement("h2");heading.id="demo-dialog-title";heading.className="demo-dialog-title";heading.textContent=title;
  const help=document.createElement("p");help.id="demo-dialog-description";help.className="demo-dialog-description";help.textContent=description;
  const form=document.createElement("form");form.className="demo-dialog-form";
  const controls={};
  fields.forEach(field=>{
    const label=document.createElement("label");label.className="demo-dialog-label";label.textContent=field.label;
    let control;
    if(field.type==="textarea")control=document.createElement("textarea");
    else if(field.type==="select"){
      control=document.createElement("select");
      field.options.forEach(([value,text])=>control.add(new Option(text,value)));
    }else control=document.createElement("input");
    control.name=field.name;control.required=Boolean(field.required);
    if(field.type&&field.type!=="textarea"&&field.type!=="select")control.type=field.type;
    if(field.value!==undefined)control.value=String(field.value);
    if(field.placeholder)control.placeholder=field.placeholder;
    if(field.maxLength)control.maxLength=field.maxLength;
    if(field.min!==undefined)control.min=String(field.min);
    if(field.max!==undefined)control.max=String(field.max);
    if(field.step!==undefined)control.step=String(field.step);
    control.className="demo-dialog-control";label.append(control);form.append(label);controls[field.name]=control;
  });
  const actions=document.createElement("div");actions.className="demo-dialog-actions";
  const cancel=document.createElement("button");cancel.type="button";cancel.className="btn btn-outline btn-small";cancel.textContent="Cancel";
  const submit=document.createElement("button");submit.type="submit";submit.className="btn btn-primary btn-small";submit.textContent=submitLabel;
  actions.append(cancel,submit);form.append(actions);dialog.append(heading,help,form);overlay.append(dialog);document.body.append(overlay);
  const close=()=>overlay.remove();
  cancel.addEventListener("click",close);
  overlay.addEventListener("click",event=>{if(event.target===overlay)close()});
  dialog.addEventListener("keydown",event=>{if(event.key==="Escape")close()});
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const values=Object.fromEntries(Object.entries(controls).map(([name,control])=>[name,control.value]));
    close();onSubmit(values);
  });
  (Object.values(controls)[0]||submit).focus();
}
function exportWorkspace(){
  const report={exportedAt:new Date().toISOString(),page:currentPage,subjects,customSubjects:demoState.subjects,flashcardReviews:demoState.reviews,knowledgeVault:[...vaultItems.map(([title,category,detail])=>({title,category,detail})),...demoState.savedVault],favorites:demoState.favorites,completedQuests:demoState.completedQuests,studyGoalMinutes:demoState.dailyGoal,customMilestones:demoState.milestones,studyBlocks:demoState.plannerTasks,customQuests:demoState.customQuests,groups:demoState.customGroups,joinedGroups:demoState.joinedGroups,purchases:demoState.purchases,demoGems:demoState.gems,examHistory:demoState.examHistory};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download=`recalro-${currentPage.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.json`;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Your demo workspace export has been downloaded.");
}
function openSavedSummary(card){
  const topic=card.dataset.summary||card.querySelector("h3")?.textContent||"Study notes";
  const detail=card.querySelector("p")?.textContent||"";
  $("#summaryTopic").value=`${topic}. ${detail}`;
  makeLocalSummary();
}
function makeLocalSummary(){
  const source=$("#summaryTopic").value.trim(),result=$("#summaryResult");
  if(!source){toast("Paste some notes or source text first.");$("#summaryTopic").focus();return}
  const sentences=source.match(/[^.!?]+[.!?]?/g)||[source],keyLines=sentences.map(line=>line.trim()).filter(Boolean).slice(0,4);
  result.replaceChildren();
  const label=document.createElement("b");label.textContent="Local study summary (not AI-generated)";
  const list=document.createElement("ul");list.style.cssText="text-align:left;line-height:1.7";
  keyLines.forEach(line=>{const item=document.createElement("li");item.textContent=line;list.append(item)});
  result.append(label,list);
  if(sentences.length>4){const note=document.createElement("p");note.textContent="This draft keeps the first four sentences. Check your source notes to confirm you have not missed important details.";result.append(note)}
}
function reviewExplanation(){
  const text=$("#explainText").value.trim(),topic=$("#explainTopic").value.trim(),feedback=$("#explainFeedback");
  if(!text){toast("Write your explanation before asking for feedback.");$("#explainText").focus();return}
  const concepts=["energy","entropy","system","heat","work","irreversible"];
  const found=concepts.filter(word=>text.toLowerCase().includes(word));
  const panel=document.createElement("div");panel.className="panel";
  const label=document.createElement("span");label.className="status-tag orange";label.textContent="Local practice feedback";
  const heading=document.createElement("h3");heading.style.cssText="font:800 14px Manrope";heading.textContent=text.length>120?"Good detail to build on":"A useful first draft";
  const message=document.createElement("p");message.className="muted";message.style.cssText="font-size:10px;line-height:1.7";
  message.textContent=`For “${topic||"your topic"}”, your response is ${text.length} characters long and mentions ${found.length?found.join(", "):"none of the sample thermodynamics keywords"}. This is a simple text check, not an AI or scientific accuracy assessment. Compare it with your course materials and add a concrete example.`;
  panel.append(label,heading,message);feedback.replaceChildren(panel);
}
const demoQuestions=[
  {prompt:"Which statement best describes the first law of thermodynamics?",answers:["Energy is always lost in a closed system.","Energy is conserved and can change form.","Entropy always decreases.","Heat and work are identical."],correct:1,explanation:"The first law expresses conservation of energy."},
  {prompt:"For an incompressible steady flow, which relation expresses continuity?",answers:["A₁v₁ = A₂v₂","P₁V₁ = P₂V₂","F = ma","Q = mcΔT"],correct:0,explanation:"Mass flow rate is conserved; for constant density, area times velocity is constant."},
  {prompt:"What does entropy describe in a thermodynamic system?",answers:["The system's total mass","Energy dispersal and the number of possible microscopic states","The rate of heat transfer only","The pressure at equilibrium"],correct:1,explanation:"Entropy relates to energy dispersal and the number of microscopic configurations."},
  {prompt:"What happens to total entropy during a spontaneous irreversible process?",answers:["It decreases","It remains exactly zero","It increases","It becomes independent of the surroundings"],correct:2,explanation:"The total entropy of a system and its surroundings increases in an irreversible process."},
  {prompt:"Which equation is commonly used for an ideal-gas state?",answers:["PV = nRT","A₁v₁ = A₂v₂","V = IR","F = ma"],correct:0,explanation:"The ideal gas equation relates pressure, volume, amount of gas and temperature."},
  {prompt:"What is the SI unit of pressure?",answers:["Joule","Pascal","Watt","Newton"],correct:1,explanation:"Pressure is measured in pascals (Pa), equivalent to newtons per square metre."},
  {prompt:"In a heat engine, what is the purpose of the working fluid?",answers:["To convert heat interactions into work over a cycle","To eliminate all heat losses","To create energy from nothing","To keep entropy constant in every process"],correct:0,explanation:"A heat engine uses a working fluid to undergo a cycle that produces net work while exchanging heat."},
  {prompt:"For a reversible adiabatic process, which property remains constant?",answers:["Pressure","Volume","Entropy","Temperature"],correct:2,explanation:"A reversible adiabatic process is isentropic, so entropy stays constant."},
  {prompt:"What is the SI unit of energy?",answers:["Pascal","Joule","Ampere","Kelvin"],correct:1,explanation:"Energy is measured in joules (J)."},
  {prompt:"Bernoulli's equation relates pressure, velocity and what else along a streamline?",answers:["Elevation","Electrical resistance","Entropy generation only","Mass fraction"],correct:0,explanation:"The elevation (gravitational potential) term is included alongside pressure and velocity."}
];
function startDemoExam(){
  examSession={subject:$("#examSubject").value,difficulty:$("#examDifficulty").value,total:$("#examCount").value.startsWith("20")?20:10,index:0,score:0,answered:false,timed:$("#timedExam").checked,seconds:1200};
  if(examTimer){clearInterval(examTimer);examTimer=null}
  renderExamQuestion();
  if(examSession.timed)examTimer=setInterval(()=>{
    if(!examSession)return;
    examSession.seconds--;
    const clock=$("#examTimer");
    if(clock)clock.textContent=`${Math.floor(examSession.seconds/60)}:${String(examSession.seconds%60).padStart(2,"0")}`;
    if(examSession.seconds<=0){clearInterval(examTimer);examTimer=null;finishDemoExam(true)}
  },1000);
}
function renderExamQuestion(){
  const area=$("#examArea");if(!area||!examSession)return;
  const question=demoQuestions[examSession.index%demoQuestions.length];
  area.replaceChildren();
  const panel=document.createElement("div");panel.className="panel";panel.style.marginTop="15px";
  const header=document.createElement("div");header.className="panel-head";
  const title=document.createElement("h3");title.textContent=`${examSession.subject} · Question ${examSession.index+1} of ${examSession.total}`;
  const badge=document.createElement("span");badge.className="status-tag orange";badge.textContent=examSession.timed?"Timed demo exam":"Practice exam";
  header.append(title,badge);panel.append(header);
  if(examSession.timed){const timer=document.createElement("p");timer.id="examTimer";timer.className="muted";timer.textContent=`${Math.floor(examSession.seconds/60)}:${String(examSession.seconds%60).padStart(2,"0")} remaining`;panel.append(timer)}
  const questionText=document.createElement("p");questionText.style.cssText="font:700 14px/1.6 Manrope";questionText.textContent=question.prompt;panel.append(questionText);
  question.answers.forEach((answer,index)=>{
    const label=document.createElement("label");label.style.cssText="display:block;padding:12px;border:1px solid var(--line);border-radius:8px;margin:8px 0;font-size:10px";
    const input=document.createElement("input");input.type="radio";input.name="answer";input.value=String(index);input.disabled=examSession.answered;
    label.append(input,document.createTextNode(` ${answer}`));panel.append(label);
  });
  if(examSession.answered){
    const result=document.createElement("p");result.className=examSession.lastCorrect?"trend":"muted";result.textContent=`${examSession.lastCorrect?"Correct.":"Not quite."} ${question.explanation}`;panel.append(result);
    const next=document.createElement("button");next.className="btn btn-primary btn-small";next.textContent=examSession.index+1>=examSession.total?"See results":"Next question →";next.addEventListener("click",()=>{examSession.index++;examSession.answered=false;if(examSession.index>=examSession.total)finishDemoExam(false);else renderExamQuestion()});panel.append(next);
  }else{
    const submit=document.createElement("button");submit.className="btn btn-primary btn-small";submit.textContent="Submit answer";submit.addEventListener("click",submitDemoAnswer);panel.append(submit);
  }
  area.append(panel);
}
function submitDemoAnswer(){
  if(!examSession||examSession.answered)return;
  const selected=$('input[name="answer"]:checked');
  if(!selected){toast("Choose an answer before submitting.");return}
  const question=demoQuestions[examSession.index%demoQuestions.length];
  examSession.lastCorrect=Number(selected.value)===question.correct;
  if(examSession.lastCorrect)examSession.score++;
  examSession.answered=true;renderExamQuestion();
}
function finishDemoExam(timedOut){
  if(!examSession)return;
  if(examTimer){clearInterval(examTimer);examTimer=null}
  const result={subject:examSession.subject,score:examSession.score,total:examSession.index+(examSession.answered?1:0),at:new Date().toISOString()};
  demoState.examHistory.push(result);saveDemoState();
  const area=$("#examArea");
  if(area)area.innerHTML=`<div class="panel" style="margin-top:15px"><span class="status-tag orange">Demo results</span><h3 style="font:800 18px Manrope">${timedOut?"Time is up": "Practice complete"}</h3><p class="muted">${result.score} correct out of ${examSession.total} questions. These sample results are saved only in this browser.</p><button class="btn btn-primary btn-small" id="restartExam">Start another practice exam</button></div>`;
  const restart=$("#restartExam");if(restart)restart.addEventListener("click",startDemoExam);
  examSession=null;
}
function speakText(){
  if(!("speechSynthesis"in window)){toast("Speech synthesis is not supported on this device.");return}
  const text=$("#readText").value.trim();
  if(!text){toast("Enter some text to read aloud.");$("#readText").focus();return}
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);utterance.rate=Number($("#voiceSpeed").value);
  const voiceIndex=$("#voiceSelect").value;
  if(voiceIndex!==""){const voice=speechSynthesis.getVoices()[Number(voiceIndex)];if(voice)utterance.voice=voice}
  utterance.onerror=event=>{console.error("Speech playback failed.",event.error);toast("Could not play speech. Try another system voice.")};
  speechSynthesis.speak(utterance);toast("Reading aloud.");
}
function stopSpeaking(){
  if(!("speechSynthesis"in window)){toast("Speech synthesis is not supported on this device.");return}
  speechSynthesis.cancel();toast("Playback stopped.");
}
