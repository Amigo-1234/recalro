/* ==========================================================================
   Signup UI components.
   Markup builders return HTML strings (the wizard re-renders a step at a time);
   behaviour attachers wire up the interactive ones:
     FormField, SelectField, PasswordField + PasswordStrengthIndicator,
     SelectionCard, Chip, OTPInput(), InstitutionSearch() (ARIA combobox)
   ========================================================================== */
(function () {
  "use strict";
  const esc = (s) => window.R.esc(s);
  const icon = (n) => window.R.icon(n);

  const describedBy = (id, hint) => `aria-describedby="${hint ? `${id}-hint ` : ""}${id}-err"`;
  const labelText = (label, optional) => `${esc(label)}${optional ? ' <span class="sw-opt">Optional</span>' : ""}`;

  function FormField({ id, label, bind, value = "", type = "text", placeholder = "", autocomplete = "off", inputmode = "", optional = false, hint = "", attrs = "" }) {
    return `<div class="sw-field" data-field="${id}">
      <label for="${id}">${labelText(label, optional)}</label>
      <input id="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="${autocomplete}" ${inputmode ? `inputmode="${inputmode}"` : ""} data-bind="${bind}" ${describedBy(id, hint)} ${attrs}>
      ${hint ? `<p class="sw-hint" id="${id}-hint">${hint}</p>` : ""}
      <p class="sw-err" id="${id}-err"></p>
    </div>`;
  }

  function SelectField({ id, label, bind, value = "", options, placeholder = "Select…", optional = false, hint = "" }) {
    return `<div class="sw-field" data-field="${id}">
      <label for="${id}">${labelText(label, optional)}</label>
      <span class="sw-select"><select id="${id}" data-bind="${bind}" ${describedBy(id, hint)}>
        <option value="" ${value ? "" : "selected"} disabled>${esc(placeholder)}</option>
        ${options.map((o) => `<option value="${esc(o)}" ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("")}
      </select>${icon("chevron-down")}</span>
      ${hint ? `<p class="sw-hint" id="${id}-hint">${hint}</p>` : ""}
      <p class="sw-err" id="${id}-err"></p>
    </div>`;
  }

  /* ---------- Password ---------- */
  function passwordScore(v) {
    if (!v) return 0;
    let s = 0;
    if (v.length >= 8) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v) || v.length >= 14) s++;
    return Math.max(1, s);
  }
  const RULES = [
    { id: "len", label: "8+ characters", test: (v) => v.length >= 8 },
    { id: "letter", label: "A letter", test: (v) => /[A-Za-z]/.test(v) },
    { id: "num", label: "A number", test: (v) => /\d/.test(v) },
  ];
  const passwordValid = (v) => RULES.every((r) => r.test(v));
  function PasswordStrengthIndicator(id, value) {
    const score = passwordScore(value);
    return `<div class="sw-strength" id="${id}-strength" data-score="${score}">
      <div class="sw-strength-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <span class="sw-strength-label" aria-live="polite">${value ? `Strength: ${["", "Weak", "Fair", "Good", "Strong"][score]}` : "Strength"}</span>
      <ul class="sw-rules">${RULES.map((r) => `<li data-rule="${r.id}" class="${r.test(value) ? "ok" : ""}">${icon("check")}${r.label}</li>`).join("")}</ul>
    </div>`;
  }
  function updateStrength(root, id, value) {
    const el = root.querySelector(`#${id}-strength`);
    if (!el) return;
    const score = passwordScore(value);
    el.dataset.score = String(score);
    el.querySelector(".sw-strength-label").textContent = value ? `Strength: ${["", "Weak", "Fair", "Good", "Strong"][score]}` : "Strength";
    RULES.forEach((r) => el.querySelector(`[data-rule="${r.id}"]`).classList.toggle("ok", r.test(value)));
  }
  function PasswordField({ id, label, bind, value = "", autocomplete = "new-password", placeholder = "", strength = false, hint = "" }) {
    return `<div class="sw-field" data-field="${id}">
      <label for="${id}">${esc(label)}</label>
      <span class="sw-password">
        <input id="${id}" type="password" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="${autocomplete}" data-bind="${bind}" ${describedBy(id, hint || strength)} ${strength ? `data-strength="${id}"` : ""}>
        <button type="button" class="sw-eye" data-eye="${id}" aria-label="Show password" aria-pressed="false">${icon("eye")}</button>
      </span>
      ${hint ? `<p class="sw-hint" id="${id}-hint">${hint}</p>` : ""}
      ${strength ? `<div id="${id}-hint">${PasswordStrengthIndicator(id, value)}</div>` : ""}
      <p class="sw-err" id="${id}-err"></p>
    </div>`;
  }

  /* ---------- Selection tiles and chips (native inputs, styled) ---------- */
  function SelectionCard({ type = "radio", name, value, checked = false, title, desc = "", img = "", ic = "", bind, compact = false }) {
    return `<label class="sw-tile${compact ? " sw-tile-compact" : ""}" data-value="${esc(value)}">
      <input class="sw-tile-input" type="${type}" name="${name}" value="${esc(value)}" ${checked ? "checked" : ""} data-bind="${bind}">
      <span class="sw-tile-box">
        ${img ? `<img class="sw-tile-img" src="${img}" alt="" width="200" height="200">` : ic ? `<span class="sw-tile-ic">${icon(ic)}</span>` : ""}
        <span class="sw-tile-text"><b>${esc(title)}</b>${desc ? `<small>${esc(desc)}</small>` : ""}</span>
        <span class="sw-tile-check" aria-hidden="true">${icon("check")}</span>
      </span>
    </label>`;
  }
  function Chip({ type = "radio", name, value, checked = false, label, bind }) {
    return `<label class="sw-chip"><input type="${type}" name="${name}" value="${esc(value)}" ${checked ? "checked" : ""} data-bind="${bind}"><span>${type === "checkbox" ? `<i aria-hidden="true">${icon("check")}</i>` : ""}${esc(label)}</span></label>`;
  }
  function ChoiceGroup({ id, legend, optional = false, hint = "", content, cls = "" }) {
    return `<fieldset class="sw-group ${cls}" id="${id}" data-field="${id}" aria-describedby="${hint ? `${id}-hint ` : ""}${id}-err">
      <legend>${labelText(legend, optional)}</legend>
      ${hint ? `<p class="sw-hint" id="${id}-hint">${hint}</p>` : ""}
      <div class="sw-group-items">${content}</div>
      <p class="sw-err" id="${id}-err"></p>
    </fieldset>`;
  }

  /* ---------- OTPInput ---------- */
  function OTPInput(root, { length = 6, value = "", onChange, onComplete } = {}) {
    root.innerHTML = Array.from({ length }, (_, i) => `<input class="sw-otp-cell" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="${i === 0 ? length : 1}" autocomplete="${i === 0 ? "one-time-code" : "off"}" aria-label="Digit ${i + 1} of ${length}" value="${value[i] || ""}">`).join("");
    const cells = [...root.querySelectorAll("input")];
    const code = () => cells.map((c) => c.value).join("");
    const emit = () => { onChange?.(code()); if (code().length === length && /^\d+$/.test(code())) onComplete?.(code()); };
    const fill = (start, digits) => {
      digits.split("").slice(0, length - start).forEach((d, k) => (cells[start + k].value = d));
      const next = Math.min(start + digits.length, length - 1);
      cells[next].focus(); cells[next].select();
      root.classList.remove("is-error");
      emit();
    };
    cells.forEach((cell, i) => {
      cell.addEventListener("input", () => {
        const digits = cell.value.replace(/\D/g, "");
        if (digits.length > 1) { cell.value = ""; fill(i, digits); return; } // autofill / fast typing
        cell.value = digits;
        root.classList.remove("is-error");
        if (digits && i < length - 1) { cells[i + 1].focus(); cells[i + 1].select(); }
        emit();
      });
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !cell.value && i > 0) { e.preventDefault(); cells[i - 1].value = ""; cells[i - 1].focus(); emit(); }
        else if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); cells[i - 1].focus(); cells[i - 1].select(); }
        else if (e.key === "ArrowRight" && i < length - 1) { e.preventDefault(); cells[i + 1].focus(); cells[i + 1].select(); }
      });
      cell.addEventListener("focus", () => cell.select());
      cell.addEventListener("paste", (e) => {
        const digits = (e.clipboardData?.getData("text") || "").replace(/\D/g, "");
        if (!digits) return;
        e.preventDefault();
        fill(digits.length >= length ? 0 : i, digits);
      });
    });
    return {
      value: code,
      focus() { (cells.find((c) => !c.value) || cells[length - 1]).focus(); },
      clear() { cells.forEach((c) => (c.value = "")); root.classList.remove("is-error", "is-success"); cells[0].focus(); onChange?.(""); },
      setState(state) {
        root.classList.remove("is-error", "is-success");
        cells.forEach((c) => c.setAttribute("aria-invalid", String(state === "error")));
        if (!state) return;
        void root.offsetWidth; root.classList.add(`is-${state}`);
        cells.forEach((c) => (c.disabled = state === "success"));
      },
    };
  }

  /* ---------- InstitutionSearch: ARIA 1.2 combobox with "not listed" escape hatch ---------- */
  function InstitutionSearch(input, list, { getOptions, onSelect, notListed = "My institution isn't listed" }) {
    let active = -1, items = [];
    const NOT = "__not_listed__";
    const mark = (text, q) => {
      if (!q) return esc(text);
      const i = text.toLowerCase().indexOf(q.toLowerCase());
      return i < 0 ? esc(text) : `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
    };
    function render() {
      const q = input.value.trim();
      const all = getOptions();
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      items = all.filter((o) => words.every((w) => o.toLowerCase().includes(w))).slice(0, 8);
      list.innerHTML = items.map((o, i) => `<li role="option" id="${list.id}-${i}" data-i="${i}" aria-selected="false">${mark(o, q)}</li>`).join("")
        + (q && !items.length ? `<li class="sw-combo-empty" aria-hidden="true">No match in our sample list</li>` : "")
        + `<li role="option" id="${list.id}-not" data-i="${items.length}" class="sw-combo-not" aria-selected="false">${icon("plus")}${esc(notListed)}</li>`;
      items.push(NOT);
      active = -1; input.removeAttribute("aria-activedescendant");
    }
    function open() { render(); list.hidden = false; input.setAttribute("aria-expanded", "true"); }
    function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; }
    function move(d) {
      if (list.hidden) open();
      active = (active + d + items.length) % items.length;
      [...list.querySelectorAll("[role=option]")].forEach((li, i) => {
        li.setAttribute("aria-selected", String(i === active));
        if (i === active) { input.setAttribute("aria-activedescendant", li.id); li.scrollIntoView({ block: "nearest" }); }
      });
    }
    function choose(i) {
      const v = items[i]; if (v === undefined) return;
      close();
      if (v === NOT) onSelect({ notListed: true, value: input.value.trim() });
      else { input.value = v; onSelect({ notListed: false, value: v }); }
    }
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", list.id);
    list.setAttribute("role", "listbox");
    list.hidden = true;
    input.addEventListener("input", () => { open(); onSelect({ typing: true, value: input.value.trim() }); });
    input.addEventListener("focus", open);
    input.addEventListener("blur", () => setTimeout(close, 120));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter" && !list.hidden && active >= 0) { e.preventDefault(); choose(active); }
      else if (e.key === "Escape" && !list.hidden) { e.preventDefault(); e.stopPropagation(); close(); }
    });
    list.addEventListener("pointerdown", (e) => { const li = e.target.closest("[role=option]"); if (li) { e.preventDefault(); choose(Number(li.dataset.i)); } });
    return { close };
  }

  window.RecalroSignupUI = { FormField, SelectField, PasswordField, PasswordStrengthIndicator, updateStrength, passwordScore, passwordValid, SelectionCard, Chip, ChoiceGroup, OTPInput, InstitutionSearch };
})();
