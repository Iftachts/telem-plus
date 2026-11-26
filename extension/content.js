/* טלם+ — content script
 * Purely visual: adds classes and a few helper elements next to the site's own.
 * It never fills fields, never clicks "save/send", never reads or stores report content.
 */
(() => {
  // Second click on the bookmarklet: re-enable (if turned off) or open the quick-search palette.
  if (window.__telemPlus) { window.__telemPlusOpen?.(); return; }
  window.__telemPlus = true;

  const DEFAULTS = { enabled: true, theme: "auto", accent: "sea", calm: false, hero: true };
  const root = document.documentElement;
  let settings = { ...DEFAULTS };

  /* ---------------- storage (chrome.storage, with localStorage fallback) ---------------- */
  const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;
  const store = {
    get(keys) {
      if (hasChrome) return new Promise((r) => chrome.storage.sync.get(keys, r));
      const out = {};
      for (const k of Object.keys(keys)) {
        try { const v = localStorage.getItem("tg:" + k); out[k] = v === null ? keys[k] : JSON.parse(v); }
        catch { out[k] = keys[k]; }
      }
      return Promise.resolve(out);
    },
    set(obj) {
      if (hasChrome) return new Promise((r) => chrome.storage.sync.set(obj, r));
      for (const [k, v] of Object.entries(obj)) { try { localStorage.setItem("tg:" + k, JSON.stringify(v)); } catch {} }
      onSettings({ ...settings, ...obj });
      return Promise.resolve();
    },
  };

  /* ---------------- icons ---------------- */
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC = {
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    home: svg('<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'),
    doc: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
    palette: svg('<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.8C22 5.5 17.5 2 12 2z"/>'),
    expand: svg('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
    power: svg('<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>'),
    wave: svg('<path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity=".5"/>'),
    link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  };

  /* ---------------- settings → classes ---------------- */
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => settings.theme === "dark" || (settings.theme === "auto" && mq.matches);

  function applySettings() {
    root.classList.toggle("tg-on", !!settings.enabled);
    root.classList.toggle("tg-dark", !!settings.enabled && isDark());
    root.classList.toggle("tg-calm", !!settings.calm);
    root.dataset.tgAccent = settings.accent || "sea";
    const t = document.getElementById("tg-theme");
    if (t) t.innerHTML = isDark() ? IC.sun : IC.moon;
    if (!settings.enabled) cleanup();
  }
  function onSettings(next) { settings = { ...DEFAULTS, ...next }; applySettings(); schedule(); }
  mq.addEventListener?.("change", applySettings);

  // optimistic: turn on immediately to avoid a flash of the old UI
  root.classList.add("tg-on");
  store.get(DEFAULTS).then(onSettings);
  if (hasChrome) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      const next = { ...settings };
      for (const [k, { newValue }] of Object.entries(changes)) next[k] = newValue;
      onSettings(next);
    });
  }

  /* ---------------- fonts ---------------- */
  function loadFonts() {
    if (document.getElementById("tg-fonts") || !document.head) return;
    const l = document.createElement("link");
    l.id = "tg-fonts";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&family=Rubik:wght@500;600;700&display=swap";
    document.head.appendChild(l);
  }

  /* ---------------- helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, attrs = {}, html = "") => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) k === "class" ? (e.className = v) : e.setAttribute(k, v);
    if (html) e.innerHTML = html;
    return e;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function userName() {
    const n = $("tlv-user-profile .name")?.textContent?.trim() || "";
    const [name, role] = n.split(/\s+-\s+/);
    return { full: name || "", first: (name || "").split(/\s+/)[0] || "", role: role || "" };
  }
  function greeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "בוקר טוב";
    if (h >= 12 && h < 16) return "צהריים טובים";
    if (h >= 16 && h < 18) return "אחר צהריים טובים";
    if (h >= 18 && h < 23) return "ערב טוב";
    return "לילה טוב";
  }
  function dates() {
    const d = new Date();
    const g = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
    let heb = "";
    try { heb = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", { day: "numeric", month: "long", year: "numeric" }).format(d).replace(/\d+/g, (n) => gematria(+n)); } catch {}
    return { g, heb };
  }
  function gematria(n) {
    const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
    const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
    const hund = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
    n %= 1000;
    const r = n % 100;
    let s = hund[Math.floor(n / 100)] + (r === 15 ? "טו" : r === 16 ? "טז" : tens[Math.floor(r / 10)] + ones[r % 10]);
    return s.length > 1 ? s.slice(0, -1) + "״" + s.slice(-1) : s + "׳";
  }

  // SPA navigation: prefer a real link on the page; otherwise push state and let the Angular router react.
  function go(path) {
    closePalette();
    const a = $$("a[href]").find((x) => x.getAttribute("href") === path);
    if (a) { a.click(); return; }
    if (location.pathname === path) return;
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    setTimeout(() => { if (!document.querySelector("router-outlet + *")) location.assign(path); }, 1200);
  }

  /* ---------------- header tools ---------------- */
  function ensureTools() {
    const header = $("tlv-header");
    if (!header || $("#tg-tools", header)) return;
    const tools = el("div", { id: "tg-tools" });
    const isMac = /Mac/i.test(navigator.platform);
    const k = el("button", { class: "tg-kbd-btn", type: "button", title: "חיפוש מהיר" },
      `${IC.search}<span>לאן הולכים?</span><span class="tg-kbd">${isMac ? "⌘" : "Ctrl"} K</span>`);
    k.addEventListener("click", openPalette);
    const clock = el("div", { id: "tg-clock" });
    const theme = el("button", { class: "tg-iconbtn", id: "tg-theme", type: "button", title: "מצב כהה / בהיר" }, isDark() ? IC.sun : IC.moon);
    theme.addEventListener("click", () => store.set({ theme: isDark() ? "light" : "dark" }));
    tools.append(k, clock, theme);
    header.appendChild(tools);
    tickClock();
  }
  function tickClock() {
    const c = $("#tg-clock");
    if (c) c.textContent = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }
  setInterval(tickClock, 15000);

  /* ---------------- desktop hero ---------------- */
  function ensureHero() {
    const desk = $("tlv-user-desktop");
    if (!desk) return;
    let hero = $("#tg-hero", desk);
    if (!settings.hero) { hero?.remove(); return; }
    const { first } = userName();
    if (!hero) {
      hero = el("section", { id: "tg-hero" });
      const confetti = el("div", { class: "tg-confetti", "aria-hidden": "true" });
      const spots = [[8, 18, 20], [18, 70, -30], [30, 30, 60], [62, 12, 10], [74, 64, -50], [88, 34, 35], [52, 82, 80], [94, 80, -15]];
      spots.forEach(([x, y, r], i) => {
        const c = el("i");
        c.style.cssText = `left:${x}%;top:${y}%;--r:${r}deg;animation-delay:${-i * 1.3}s;opacity:${0.35 + (i % 3) * 0.2}`;
        confetti.appendChild(c);
      });
      hero.innerHTML = `<div class="tg-eyebrow"></div><h1></h1><div class="tg-sub"></div>`;
      const cta = el("button", { class: "tg-hero-cta", type: "button" }, `${IC.plus}<span>דיווח התערבות חדש</span>`);
      cta.addEventListener("click", () => go("/protocol"));
      hero.append(confetti, cta);
      desk.prepend(hero);
    }
    const { g, heb } = dates();
    $(".tg-eyebrow", hero).textContent = heb ? `${g} · ${heb}` : g;
    $("h1", hero).textContent = first ? `${greeting()}, ${first}` : greeting();
    const total = $("tlv-counters .counter .value span:not(.tg-count)")?.textContent?.trim();
    $(".tg-sub", hero).textContent = total ? `${total} התערבויות דווחו מתחילת השנה. מה עוד היום?` : "מה מדווחים היום?";
  }

  /* ---------------- counters count-up ---------------- */
  function ensureCounters() {
    for (const v of $$("tlv-counters .counter .value")) {
      const src = $("span:not(.tg-count)", v);
      if (!src) continue;
      const target = parseInt(src.textContent.replace(/[^\d-]/g, ""), 10);
      if (Number.isNaN(target)) continue;
      let out = $(".tg-count", v);
      if (!out) { out = el("span", { class: "tg-count" }); v.appendChild(out); v.classList.add("tg-counting"); }
      if (out.dataset.target === String(target)) continue;
      out.dataset.target = String(target);
      if (settings.calm || target <= 0) { out.textContent = String(target); continue; }
      const start = performance.now(), dur = 900 + Math.min(900, target * 8);
      const step = (t) => {
        const p = Math.min(1, (t - start) / dur);
        out.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1 && out.dataset.target === String(target)) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }

  /* ---------------- links memory (for the palette) ---------------- */
  let knownLinks = {};
  store.get({ links: {} }).then((r) => (knownLinks = r.links || {}));
  function rememberLinks() {
    let changed = false;
    for (const a of $$("tlv-important-module a[href], tlv-user-desktop a[href]")) {
      const href = a.getAttribute("href");
      const label = a.textContent.trim();
      if (href && href.startsWith("/") && label && knownLinks[href] !== label) { knownLinks[href] = label; changed = true; }
    }
    if (changed) store.set({ links: knownLinks });
  }

  /* ---------------- protocol form ---------------- */
  const requiredSeen = new WeakSet();
  function ensureProtocol() {
    const form = $("tlv-eps-protocol form");
    if (!form) { root.classList.remove("tg-emergency"); return; }

    // emergency mode
    const ev = $('[formcontrolname="EPSEventType"] .mat-button-toggle-checked', form);
    root.classList.toggle("tg-emergency", !!ev && /חר?ו?ם/.test(ev.textContent));

    // progress
    const controls = $$("[formcontrolname]", form).filter((c) => !c.parentElement.closest("[formcontrolname]"));
    for (const c of controls) {
      const marker = c.closest("mat-form-field")?.querySelector(".mat-mdc-form-field-required-marker");
      if (marker || c.getAttribute("aria-required") === "true" || c.classList.contains("ng-invalid") || c.hasAttribute("required")) requiredSeen.add(c);
    }
    const req = controls.filter((c) => requiredSeen.has(c));
    const done = req.filter((c) => c.classList.contains("ng-valid")).length;
    const sendDiv = $(".send-div", form);
    if (sendDiv && req.length) {
      let p = $("#tg-progress", sendDiv);
      if (!p) {
        p = el("div", { id: "tg-progress" },
          `<svg class="tg-ring" viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="16"/><circle class="fg" cx="20" cy="20" r="16" stroke-dasharray="100.5" stroke-dashoffset="100.5"/></svg><span></span>`);
        sendDiv.prepend(p);
      }
      const pct = done / req.length;
      $(".fg", p).setAttribute("stroke-dashoffset", String(100.5 * (1 - pct)));
      $("span", p).innerHTML = pct >= 1 ? "<strong>הכול מוכן</strong> · אפשר לשמור" : `שדות חובה: <strong>${done}/${req.length}</strong>`;
      p.classList.toggle("tg-done", pct >= 1);
    }

    // word counter + focus mode for the meeting summary
    const ta = $('textarea[formcontrolname="MeetingSummary"]', form);
    const ff = ta?.closest("mat-form-field");
    if (ta && ff && !ff.nextElementSibling?.classList.contains("tg-wordcount")) {
      const wc = el("div", { class: "tg-wordcount" }, `<span class="tg-wc-text"></span>`);
      const btn = el("button", { type: "button" }, `${IC.expand}<span>מצב כתיבה ממוקדת</span>`);
      btn.addEventListener("click", () => enterFocus(ff, ta));
      wc.appendChild(btn);
      ff.after(wc);
      ta.addEventListener("input", () => updateWC(ta));
    }
    if (ta) updateWC(ta);
  }
  function countWords(s) { return (s.trim().match(/\S+/g) || []).length; }
  function updateWC(ta) {
    const w = countWords(ta.value), c = ta.value.length;
    const t = $(".tg-wordcount .tg-wc-text");
    if (t) t.textContent = `${w} מילים · ${c} תווים`;
    const fb = $("#tg-focus-bar .tg-fb-count");
    if (fb) fb.textContent = `${w} מילים`;
  }

  function enterFocus(ff, ta) {
    ff.classList.add("tg-focus-target");
    root.classList.add("tg-focus-write");
    let bar = $("#tg-focus-bar");
    if (!bar) {
      bar = el("div", { id: "tg-focus-bar" }, `<span class="tg-fb-count"></span><span>·</span><span>Esc ליציאה</span>`);
      const b = el("button", { type: "button" }, "סיום");
      b.addEventListener("click", exitFocus);
      bar.appendChild(b);
      document.body.appendChild(bar);
    }
    updateWC(ta);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 30);
  }
  function exitFocus() {
    root.classList.remove("tg-focus-write");
    $$(".tg-focus-target").forEach((x) => x.classList.remove("tg-focus-target"));
  }

  /* ---------------- command palette ---------------- */
  let palIndex = 0, palItems = [];
  function buildPaletteItems() {
    const nav = { "/user-desktop": "שולחן עבודה", "/protocol": "דיווח התערבות", ...knownLinks };
    const items = Object.entries(nav).map(([href, label]) => ({
      group: "ניווט", label, hint: location.pathname === href ? "את/ה כאן" : "",
      icon: href === "/user-desktop" ? IC.home : href === "/protocol" ? IC.doc : IC.link,
      run: () => go(href), keys: label + " " + href,
    }));
    if ($('textarea[formcontrolname="MeetingSummary"]')) {
      items.push({ group: "פעולות", label: "מצב כתיבה ממוקדת לסיכום הפגישה", icon: IC.expand, keys: "פוקוס כתיבה סיכום focus",
        run: () => { closePalette(); const ta = $('textarea[formcontrolname="MeetingSummary"]'); enterFocus(ta.closest("mat-form-field"), ta); } });
    }
    items.push(
      { group: "מראה", label: isDark() ? "מעבר למצב בהיר" : "מעבר למצב כהה", icon: isDark() ? IC.sun : IC.moon, keys: "dark light כהה בהיר לילה יום theme",
        run: () => { store.set({ theme: isDark() ? "light" : "dark" }); closePalette(); } },
      ...[["sea", "ים תיכון"], ["sunset", "שקיעה בגורדון"], ["citrus", "הדרים"], ["violet", "סגול לילי"]].map(([id, name]) => ({
        group: "מראה", label: `ערכת צבע: ${name}`, hint: settings.accent === id ? "פעיל" : "", icon: IC.palette, keys: "צבע color accent " + name,
        run: () => { store.set({ accent: id }); closePalette(); },
      })),
      { group: "מראה", label: settings.calm ? "הפעלת אנימציות" : "מצב רגוע (בלי אנימציות)", icon: IC.wave, keys: "אנימציה calm motion רגוע",
        run: () => { store.set({ calm: !settings.calm }); closePalette(); } },
      { group: "מראה", label: "כיבוי טלם+ (חזרה לעיצוב המקורי)", icon: IC.power, keys: "off disable כיבוי מקורי",
        run: () => { store.set({ enabled: false }); closePalette(); } },
    );
    return items;
  }
  function ensurePalette() {
    if ($("#tg-palette")) return;
    const p = el("div", { id: "tg-palette", role: "dialog", "aria-modal": "true" },
      `<div class="tg-pal"><div class="tg-pal-input">${IC.search}<input type="text" placeholder="חיפוש עמוד או פעולה…" aria-label="חיפוש"></div><ul></ul><div class="tg-foot"><span>↑↓ לבחירה</span><span>Enter לביצוע</span><span>Esc לסגירה</span></div></div>`);
    p.addEventListener("mousedown", (e) => { if (e.target === p) closePalette(); });
    const input = $("input", p);
    input.addEventListener("input", () => { palIndex = 0; renderPalette(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { palIndex = Math.min(palIndex + 1, palItems.length - 1); renderPalette(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { palIndex = Math.max(palIndex - 1, 0); renderPalette(); e.preventDefault(); }
      else if (e.key === "Enter") { palItems[palIndex]?.run(); e.preventDefault(); }
      else if (e.key === "Escape") { closePalette(); e.preventDefault(); }
    });
    document.body.appendChild(p);
  }
  function renderPalette() {
    const p = $("#tg-palette");
    const q = $("input", p).value.trim().toLowerCase();
    palItems = buildPaletteItems().filter((i) => !q || (i.label + " " + (i.keys || "")).toLowerCase().includes(q));
    const ul = $("ul", p);
    if (!palItems.length) { ul.innerHTML = `<div class="tg-empty">לא נמצא כלום עבור "${esc(q)}"</div>`; return; }
    let html = "", last = "";
    palItems.forEach((it, i) => {
      if (it.group !== last) { html += `<div class="tg-group">${esc(it.group)}</div>`; last = it.group; }
      html += `<li class="tg-item${i === palIndex ? " tg-active" : ""}" data-i="${i}"><span class="tg-ic">${it.icon}</span><span>${esc(it.label)}</span>${it.hint ? `<span class="tg-hint">${esc(it.hint)}</span>` : ""}</li>`;
    });
    ul.innerHTML = html;
    $$("li.tg-item", ul).forEach((li) => {
      li.addEventListener("mouseenter", () => { palIndex = +li.dataset.i; $$("li.tg-item", ul).forEach((x) => x.classList.toggle("tg-active", x === li)); });
      li.addEventListener("click", () => palItems[+li.dataset.i]?.run());
    });
    $("li.tg-active", ul)?.scrollIntoView({ block: "nearest" });
  }
  function openPalette() {
    if (!settings.enabled) return;
    ensurePalette();
    const p = $("#tg-palette");
    palIndex = 0;
    $("input", p).value = "";
    renderPalette();
    p.classList.add("tg-open");
    setTimeout(() => $("input", p).focus(), 10);
  }
  function closePalette() { $("#tg-palette")?.classList.remove("tg-open"); }
  window.__telemPlusOpen = () => (settings.enabled ? openPalette() : store.set({ enabled: true }));

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key === "k" || e.key === "K" || e.code === "KeyK")) {
      if (!settings.enabled) return;
      e.preventDefault();
      $("#tg-palette.tg-open") ? closePalette() : openPalette();
    } else if (e.key === "Escape" && root.classList.contains("tg-focus-write")) {
      exitFocus();
    }
  }, true);

  /* ---------------- lifecycle ---------------- */
  function cleanup() {
    ["#tg-tools", "#tg-hero", "#tg-palette", "#tg-focus-bar", "#tg-progress"].forEach((s) => $(s)?.remove());
    $$(".tg-wordcount").forEach((x) => x.remove());
    $$(".tg-count").forEach((x) => { x.parentElement?.classList.remove("tg-counting"); x.remove(); });
    exitFocus();
    root.classList.remove("tg-emergency");
  }
  function enhance() {
    if (!settings.enabled || !document.body) return;
    loadFonts();
    ensureTools();
    ensureCounters();
    ensureHero();
    rememberLinks();
    ensureProtocol();
  }
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; enhance(); });
  }
  const mo = new MutationObserver((muts) => {
    // ignore our own changes
    if (muts.every((m) => [m.target, ...m.addedNodes].every((n) => n.nodeType === 1 && (n.id?.startsWith?.("tg-") || n.closest?.("#tg-tools, #tg-hero, #tg-palette, #tg-progress, .tg-wordcount, .tg-count, #tg-focus-bar"))))) return;
    schedule();
  });
  const start = () => {
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    schedule();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  document.addEventListener("input", (e) => { if (e.target.closest?.("tlv-eps-protocol")) schedule(); }, true);
})();
