/* ============================================================
   roberto.inf.br — comportamento
   i18n · acessibilidade (eMAG) · painel · leitura em voz alta ·
   terminal · partículas · GitHub
   ============================================================ */
(function () {
  "use strict";

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* modo privado */ } }
  };

  var root = document.documentElement;
  var body = document.body;

  /* ---------- anunciador para leitores de tela ---------- */
  var announcer = document.getElementById("announcer");
  function announce(msg) {
    if (!announcer) return;
    announcer.textContent = "";
    window.setTimeout(function () { announcer.textContent = msg; }, 50);
  }

  /* ---------- i18n ---------- */
  var lang = store.get("lang") || "pt";
  function t(key) {
    var dict = window.I18N[lang] || window.I18N.pt;
    return dict[key] !== undefined ? dict[key] : (window.I18N.pt[key] || key);
  }

  function applyLang(next, quiet) {
    lang = next;
    store.set("lang", lang);
    root.lang = lang === "pt" ? "pt-BR" : "en";
    document.title = t("_title");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      el.setAttribute("alt", t(el.getAttribute("data-i18n-alt")));
    });

    var cv = document.getElementById("cv-link");
    if (cv) cv.setAttribute("href", t("_cv"));

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang") === lang));
    });

    tts.stop(true);
    tts.updateUI();
    restartTyping();
    if (!quiet) announce(t("ann_lang"));
  }

  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { applyLang(btn.getAttribute("data-lang")); });
  });

  /* ============================================================
     Preferências de acessibilidade
     ============================================================ */
  var switches = document.querySelectorAll(".pnl-switch[data-feature]");
  function syncSwitch(feature, on) {
    switches.forEach(function (sw) {
      if (sw.getAttribute("data-feature") === feature) sw.setAttribute("aria-checked", String(on));
    });
  }
  function announceToggle(labelKey, on) {
    announce(t(labelKey) + ": " + t(on ? "st_on" : "st_off") + ".");
  }

  /* ---- tema ---- */
  function setTheme(mode, quiet) {
    if (mode === "light") { root.setAttribute("data-theme", "light"); }
    else { root.removeAttribute("data-theme"); }
    store.set("theme", mode);
    var btn = document.getElementById("btn-theme");
    var icon = document.getElementById("theme-icon");
    if (btn) btn.setAttribute("aria-pressed", String(mode === "light"));
    if (icon) icon.textContent = mode === "light" ? "☾" : "☀";
    syncSwitch("theme", mode === "light");
    if (!quiet) announce(t(mode === "light" ? "ann_theme_light" : "ann_theme_dark"));
  }
  function toggleTheme() { setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light"); }
  document.getElementById("btn-theme").addEventListener("click", toggleTheme);

  /* ---- alto contraste ---- */
  function setContrast(on, quiet) {
    if (on) { root.setAttribute("data-contrast", "high"); }
    else { root.removeAttribute("data-contrast"); }
    store.set("contrast", on ? "1" : "0");
    document.getElementById("btn-contrast").setAttribute("aria-pressed", String(on));
    syncSwitch("contrast", on);
    if (!quiet) announceToggle("pnl_contrast", on);
  }
  document.getElementById("btn-contrast").addEventListener("click", function () {
    setContrast(root.getAttribute("data-contrast") !== "high");
  });

  /* ---- escalas: fonte, linhas, letras, velocidade ---- */
  var SCALES = {
    font:   { steps: [100, 112.5, 125, 137.5, 150], def: 0, out: "val-font",
              fmt: function (v) { return v + "%"; },
              apply: function (v) { root.style.fontSize = v + "%"; }, ann: "ann_font" },
    line:   { steps: [100, 120, 140], def: 0, out: "val-line",
              fmt: function (v) { return v + "%"; },
              apply: function (v) { body.style.setProperty("--lh", (1.65 * v / 100).toFixed(2)); }, ann: "ann_line" },
    letter: { steps: [0, 1, 2], def: 0, out: "val-letter",
              fmt: function (v) { return v === 0 ? "0" : "+" + v; },
              apply: function (v) { body.style.letterSpacing = v === 0 ? "" : (v * 0.06) + "em"; }, ann: "ann_letter" },
    rate:   { steps: [0.8, 1, 1.2, 1.5], def: 1, out: "val-rate",
              fmt: function (v) { return v.toFixed(1) + "×"; },
              apply: function () { /* usada na próxima leitura */ }, ann: "tts_rate" }
  };
  var scaleIdx = {};

  function applyScale(name, quiet) {
    var s = SCALES[name];
    scaleIdx[name] = Math.max(0, Math.min(s.steps.length - 1, scaleIdx[name]));
    var v = s.steps[scaleIdx[name]];
    s.apply(v);
    store.set("a11y_" + name, String(scaleIdx[name]));
    var out = document.getElementById(s.out);
    if (out) out.textContent = s.fmt(v);
    if (!quiet) announce(t(s.ann) + ": " + s.fmt(v) + ".");
  }
  function stepScale(name, dir) { scaleIdx[name] += dir; applyScale(name); }

  Object.keys(SCALES).forEach(function (name) {
    var saved = parseInt(store.get("a11y_" + name), 10);
    scaleIdx[name] = isNaN(saved) ? SCALES[name].def : saved;
  });

  document.querySelectorAll("[data-step]").forEach(function (btn) {
    var parts = btn.getAttribute("data-step").split(":");
    btn.addEventListener("click", function () { stepScale(parts[0], parseInt(parts[1], 10)); });
  });

  /* barra do topo: A− / A / A+ */
  document.getElementById("btn-font-inc").addEventListener("click", function () { stepScale("font", 1); });
  document.getElementById("btn-font-dec").addEventListener("click", function () { stepScale("font", -1); });
  document.getElementById("btn-font-reset").addEventListener("click", function () { scaleIdx.font = 0; applyScale("font"); });

  /* ---- recursos liga/desliga ---- */
  var FEATURES = {
    readable: { attr: "data-readable", ann: "pnl_readable" },
    links:    { attr: "data-links",    ann: "pnl_links" },
    motion:   { attr: "data-motion",   ann: "pnl_motion", val: "off" },
    guide:    { attr: "data-guide",    ann: "pnl_guide" }
  };
  var featureState = {};

  function setFeature(name, on, quiet) {
    var f = FEATURES[name];
    featureState[name] = on;
    if (on) { body.setAttribute(f.attr, f.val || "on"); }
    else { body.removeAttribute(f.attr); }
    store.set("a11y_" + name, on ? "1" : "0");
    syncSwitch(name, on);
    if (name === "guide") guideEnable(on);
    if (name === "motion") { motionChanged(); }
    if (!quiet) announceToggle(f.ann, on);
  }

  switches.forEach(function (sw) {
    sw.addEventListener("click", function () {
      var feature = sw.getAttribute("data-feature");
      if (feature === "theme") { toggleTheme(); return; }
      if (feature === "contrast") { setContrast(root.getAttribute("data-contrast") !== "high"); return; }
      setFeature(feature, !featureState[feature]);
    });
  });

  /* ---- guia de leitura ---- */
  var guide = document.getElementById("reading-guide");
  function onGuideMove(e) { guide.style.top = (e.clientY - guide.offsetHeight / 2) + "px"; }
  function guideEnable(on) {
    if (!guide) return;
    guide.hidden = !on;
    if (on) { document.addEventListener("mousemove", onGuideMove); }
    else { document.removeEventListener("mousemove", onGuideMove); }
  }

  /* ---- restaurar padrões ---- */
  document.getElementById("pnl-reset").addEventListener("click", function () {
    setTheme("dark", true);
    setContrast(false, true);
    Object.keys(SCALES).forEach(function (name) { scaleIdx[name] = SCALES[name].def; applyScale(name, true); });
    Object.keys(FEATURES).forEach(function (name) { setFeature(name, false, true); });
    announce(t("ann_reset"));
  });

  /* ---- estado inicial ---- */
  if (store.get("theme") === "light") setTheme("light", true);
  var storedContrast = store.get("contrast");
  if (storedContrast === "1") { setContrast(true, true); }
  else if (storedContrast === null && window.matchMedia("(prefers-contrast: more)").matches) { setContrast(true, true); }
  Object.keys(SCALES).forEach(function (name) { applyScale(name, true); });
  Object.keys(FEATURES).forEach(function (name) {
    if (store.get("a11y_" + name) === "1") setFeature(name, true, true);
    else featureState[name] = false;
  });

  /* ============================================================
     Painel de acessibilidade (diálogo)
     ============================================================ */
  var fab = document.getElementById("a11y-fab");
  var panel = document.getElementById("a11y-panel");
  var sheet = panel.querySelector(".a11y-panel__sheet");
  var lastFocused = null;

  function openPanel() {
    lastFocused = document.activeElement;
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    var first = sheet.querySelector("button");
    if (first) first.focus();
    document.addEventListener("keydown", onPanelKeydown);
  }
  function closePanel() {
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onPanelKeydown);
    if (lastFocused) lastFocused.focus();
  }
  function onPanelKeydown(e) {
    if (e.key === "Escape") { closePanel(); return; }
    if (e.key !== "Tab") return;
    var focusables = sheet.querySelectorAll("button, [href], input, select, [tabindex]:not([tabindex='-1'])");
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  fab.addEventListener("click", function () { panel.hidden ? openPanel() : closePanel(); });
  panel.querySelectorAll("[data-panel-close]").forEach(function (el) {
    el.addEventListener("click", closePanel);
  });

  /* ============================================================
     Leitura em voz alta (Web Speech API)
     ============================================================ */
  var tts = (function () {
    var supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    var speaking = false, paused = false, queue = [], idx = 0;
    var btnPlay = document.getElementById("tts-play");
    var btnStop = document.getElementById("tts-stop");

    function collectText() {
      var chunks = [];
      document.querySelectorAll("#conteudo section").forEach(function (sec) {
        var parts = [];
        sec.querySelectorAll("h2, h3, p, li").forEach(function (el) {
          if (el.closest(".terminal") || el.closest(".gh-grid") || el.closest(".eyebrow")) return;
          var txt = el.textContent.replace(/\s+/g, " ").trim();
          if (txt) parts.push(txt);
        });
        if (parts.length) chunks.push(parts.join(". "));
      });
      return chunks;
    }

    function pickVoice() {
      var want = lang === "pt" ? "pt" : "en";
      var voices = window.speechSynthesis.getVoices();
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang && voices[i].lang.toLowerCase().indexOf(want) === 0) return voices[i];
      }
      return null;
    }

    function speakNext() {
      if (idx >= queue.length) { finish(t("ann_tts_done")); return; }
      var u = new SpeechSynthesisUtterance(queue[idx]);
      u.lang = lang === "pt" ? "pt-BR" : "en-US";
      u.rate = SCALES.rate.steps[scaleIdx.rate];
      var voice = pickVoice();
      if (voice) u.voice = voice;
      u.onend = function () { if (speaking) { idx++; speakNext(); } };
      u.onerror = function () { finish(t("ann_tts_stop")); };
      window.speechSynthesis.speak(u);
    }

    function finish(msg) {
      speaking = false; paused = false; queue = []; idx = 0;
      try { window.speechSynthesis.cancel(); } catch (e) { /* nada */ }
      updateUI();
      if (msg) announce(msg);
    }

    function start() {
      if (!supported) { announce(t("tts_unsupported")); return; }
      if (speaking && !paused) { window.speechSynthesis.pause(); paused = true; updateUI(); return; }
      if (speaking && paused) { window.speechSynthesis.resume(); paused = false; updateUI(); return; }
      queue = collectText();
      idx = 0; speaking = true; paused = false;
      updateUI();
      announce(t("ann_tts_start"));
      speakNext();
    }

    function updateUI() {
      if (!btnPlay) return;
      if (!supported) { btnPlay.disabled = true; btnPlay.textContent = t("tts_unsupported"); btnStop.hidden = true; return; }
      btnPlay.textContent = !speaking ? t("tts_play") : (paused ? t("tts_resume") : t("tts_pause"));
      btnStop.hidden = !speaking;
      btnStop.textContent = t("tts_stop");
    }

    if (btnPlay) btnPlay.addEventListener("click", start);
    if (btnStop) btnStop.addEventListener("click", function () { finish(t("ann_tts_stop")); });
    window.addEventListener("beforeunload", function () { try { window.speechSynthesis.cancel(); } catch (e) { /* nada */ } });

    return {
      start: start,
      stop: function (quiet) { if (speaking) finish(quiet ? "" : t("ann_tts_stop")); },
      updateUI: updateUI
    };
  })();

  /* ============================================================
     Menu mobile
     ============================================================ */
  var navToggle = document.querySelector(".nav-toggle");
  var navList = document.getElementById("nav-list");
  navToggle.addEventListener("click", function () {
    var open = navList.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navList.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      navList.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ============================================================
     Movimento: preferência do sistema + pausa manual
     ============================================================ */
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function motionOff() { return reducedMotion || featureState.motion; }
  function motionChanged() {
    restartTyping();
    if (particles) particles.update();
  }

  /* ---------- efeito de digitação ---------- */
  var typedEl = document.getElementById("typed");
  var typeTimer = null;

  function restartTyping() {
    if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
    if (!typedEl) return;
    var phrases = t("_typed");
    if (motionOff()) { typedEl.textContent = phrases[0]; return; }

    var pi = 0, ci = 0, deleting = false;
    function tick() {
      if (motionOff()) { typedEl.textContent = phrases[pi]; return; }
      var phrase = phrases[pi];
      if (!deleting) {
        ci++;
        typedEl.textContent = phrase.slice(0, ci);
        if (ci === phrase.length) { deleting = true; typeTimer = setTimeout(tick, 2200); return; }
        typeTimer = setTimeout(tick, 55);
      } else {
        ci--;
        typedEl.textContent = phrase.slice(0, ci);
        if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; typeTimer = setTimeout(tick, 350); return; }
        typeTimer = setTimeout(tick, 28);
      }
    }
    tick();
  }

  /* ---------- partículas (constelação discreta) ---------- */
  var particles = (function () {
    var canvas = document.getElementById("particles");
    if (!canvas) return { update: function () { /* sem canvas */ } };
    var ctx = canvas.getContext("2d");
    var dots = [], W, H, raf = null, running = false;

    function accentColor() {
      return root.getAttribute("data-contrast") === "high" ? null
        : (root.getAttribute("data-theme") === "light" ? "91,63,214" : "139,111,255");
    }

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = canvas.width = rect.width;
      H = canvas.height = rect.height;
      var count = Math.min(70, Math.floor(W / 22));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
          r: Math.random() * 1.6 + .6
        });
      }
    }

    function step() {
      if (!running) return;
      var rgb = accentColor();
      ctx.clearRect(0, 0, W, H);
      if (rgb) {
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          d.x += d.vx; d.y += d.vy;
          if (d.x < 0 || d.x > W) d.vx *= -1;
          if (d.y < 0 || d.y > H) d.vy *= -1;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + rgb + ",.55)";
          ctx.fill();
          for (var j = i + 1; j < dots.length; j++) {
            var e = dots[j];
            var dx = d.x - e.x, dy = d.y - e.y, dist = dx * dx + dy * dy;
            if (dist < 130 * 130) {
              ctx.beginPath();
              ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y);
              ctx.strokeStyle = "rgba(" + rgb + "," + (0.14 * (1 - dist / (130 * 130))) + ")";
              ctx.stroke();
            }
          }
        }
      }
      raf = requestAnimationFrame(step);
    }

    function update() {
      var shouldRun = !motionOff() && !document.hidden;
      if (shouldRun && !running) { running = true; step(); }
      else if (!shouldRun && running) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, W, H);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", update);
    update();
    return { update: update };
  })();

  /* ---------- reveal on scroll ---------- */
  (function reveal() {
    var targets = document.querySelectorAll(".section h2, .skill-card, .serv-card, .port-card, .tl-item, .stat, .contact-card, .acc-card");
    targets.forEach(function (el) { el.classList.add("reveal"); });
    if (!("IntersectionObserver" in window) || motionOff()) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: .12 });
    targets.forEach(function (el) { io.observe(el); });
  })();

  /* ============================================================
     Terminal interativo
     ============================================================ */
  var termOut = document.getElementById("term-output");
  var termIn = document.getElementById("term-input");
  var LINKS = {
    github: "https://github.com/euroberto-br",
    linkedin: "https://www.linkedin.com/in/roberto084",
    whatsapp: "https://wa.me/5561998484160?text=Ol%C3%A1%20Roberto!%20Vim%20pelo%20terminal%20do%20seu%20site.%20%F0%9F%98%84"
  };

  function termPrint(text, cls) {
    var line = document.createElement("div");
    if (cls) line.className = cls;
    line.textContent = text;
    termOut.appendChild(line);
    termOut.scrollTop = termOut.scrollHeight;
  }

  function goTo(id, label) {
    termPrint(t("term_nav") + " #" + label + " …", "t-ok");
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: motionOff() ? "auto" : "smooth" });
  }

  function runCommand(raw) {
    var cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    termPrint(raw, "t-cmd");

    switch (cmd) {
      case "help": case "ajuda": case "?":
        termPrint(t("term_help"), "t-accent"); break;
      case "sobre": case "about":
        goTo("sobre", cmd); break;
      case "skills": case "stack":
        goTo("skills", cmd); break;
      case "projetos": case "projects": case "portfolio": case "portfólio":
        goTo("portfolio", cmd); break;
      case "servicos": case "serviços": case "services":
        goTo("servicos", cmd); break;
      case "contato": case "contact":
        goTo("contato", cmd); break;
      case "trajetoria": case "trajetória": case "journey":
        goTo("trajetoria", cmd); break;
      case "acessibilidade": case "accessibility": case "a11y": case "painel":
        termPrint(t("term_a11y"), "t-ok"); openPanel(); break;
      case "ouvir": case "listen": case "read": case "ler":
        termPrint(t("term_tts"), "t-ok"); tts.start(); break;
      case "libras": case "vlibras":
        termPrint(t("term_libras"), "t-accent"); break;
      case "github": case "git":
        termPrint(t("term_open") + " GitHub …", "t-ok"); window.open(LINKS.github, "_blank", "noopener"); break;
      case "linkedin":
        termPrint(t("term_open") + " LinkedIn …", "t-ok"); window.open(LINKS.linkedin, "_blank", "noopener"); break;
      case "whatsapp": case "wpp": case "zap":
        termPrint(t("term_open") + " WhatsApp …", "t-ok"); window.open(LINKS.whatsapp, "_blank", "noopener"); break;
      case "cv": case "curriculo": case "currículo": case "resume":
        termPrint(t("term_open") + " CV (PDF) …", "t-ok");
        var a = document.createElement("a"); a.href = t("_cv"); a.download = ""; a.click(); break;
      case "en": case "english":
        applyLang("en"); termPrint(t("term_lang"), "t-ok"); break;
      case "pt": case "portugues": case "português":
        applyLang("pt"); termPrint(t("term_lang"), "t-ok"); break;
      case "tema": case "theme": case "dark": case "light":
        toggleTheme(); termPrint(t("term_theme"), "t-ok"); break;
      case "contraste": case "contrast":
        setContrast(root.getAttribute("data-contrast") !== "high"); termPrint("ok", "t-ok"); break;
      case "clear": case "cls": case "limpar":
        termOut.innerHTML = ""; break;
      case "whoami":
        termPrint(t("term_whoami"), "t-accent"); break;
      case "coffee": case "cafe": case "café":
        termPrint(t("term_coffee"), "t-accent"); break;
      case "sudo": case "sudo su": case "sudo rm -rf /":
        termPrint(t("term_sudo"), "t-accent"); break;
      case "ls":
        termPrint("sobre/  trajetoria/  skills/  servicos/  portfolio/  acessibilidade/  contato/", "t-dim"); break;
      case "date": case "data":
        termPrint(new Date().toLocaleString(lang === "pt" ? "pt-BR" : "en-US"), "t-dim"); break;
      default:
        termPrint(cmd + ": " + t("term_unknown"), "t-dim");
    }
  }

  if (termIn && termOut) {
    termPrint(t("term_welcome"), "t-dim");
    termIn.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { runCommand(termIn.value); termIn.value = ""; }
    });
  }

  /* ============================================================
     GitHub API
     ============================================================ */
  (function githubRepos() {
    var wrap = document.getElementById("gh-repos");
    if (!wrap) return;

    var FALLBACK = [
      { name: "institutobioequilibrio", description: "Site do Instituto BioEquilíbrio — Paula Cristina", language: "HTML", html_url: "https://github.com/euroberto-br/institutobioequilibrio" },
      { name: "delegadoyasser", description: "Site institucional — delegadoyasser.com.br", language: "HTML", html_url: "https://github.com/euroberto-br/delegadoyasser" },
      { name: "festa-enzo", description: "Site com cardápio da festa de 3 anos do Enzo", language: "HTML", html_url: "https://github.com/euroberto-br/festa-enzo" },
      { name: "evolux", description: "Site do grupo de robótica EVOLUX (FIRST LEGO League)", language: "CSS", html_url: "https://github.com/euroberto-br/evolux" }
    ];

    function render(repos) {
      wrap.innerHTML = "";
      repos.forEach(function (r) {
        var card = document.createElement("a");
        card.className = "gh-card";
        card.href = r.html_url;
        card.target = "_blank";
        card.rel = "noopener";

        var name = document.createElement("span");
        name.className = "gh-card__name";
        name.textContent = r.name;

        var desc = document.createElement("span");
        desc.className = "gh-card__desc";
        desc.textContent = r.description || "—";

        var meta = document.createElement("span");
        meta.className = "gh-card__meta";
        var date = r.pushed_at ? new Date(r.pushed_at).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US") : "";
        meta.textContent = (r.language || "code") + (date ? " · " + t("gh_updated") + " " + date : "") + (r.stargazers_count ? " · ★ " + r.stargazers_count : "");

        card.appendChild(name); card.appendChild(desc); card.appendChild(meta);
        wrap.appendChild(card);
      });
    }

    fetch("https://api.github.com/users/euroberto-br/repos?sort=pushed&per_page=24")
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function (repos) {
        repos = repos.filter(function (r) { return !r.fork; });
        render(repos.length ? repos : FALLBACK);
      })
      .catch(function () {
        render(FALLBACK);
        var note = document.createElement("p");
        note.className = "mono muted";
        note.textContent = t("gh_error");
        wrap.appendChild(note);
      });
  })();

  /* ---------- ano do rodapé ---------- */
  document.getElementById("year").textContent = String(new Date().getFullYear());

  /* ---------- estado inicial de idioma e UI ---------- */
  applyLang(lang, true);

  /* debug/link direto: ?a11y=1 abre o painel */
  if (window.location.search.indexOf("a11y=1") !== -1) openPanel();
})();
