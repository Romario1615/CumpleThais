(function () {
  "use strict";
  const config = window.BIRTHDAY_CONFIG;
  const engine = window.BirthdayEngine;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const cameraIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13.5" r="4"/></svg>';
  const lockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/><path d="M12 14v3"/></svg>';
  const titles = ["Un poquito de amor", "Las cosas que conectan", "La palabra secreta", "Algo que debes recordar"];
  const descriptions = ["Toca los cinco corazones escondidos entre las estrellas. Aquí, el cariño siempre suma.", "Toca dos tarjetas y encuentra sus parejas. Puedes intentarlo todas las veces que quieras.", "Lee con calma. Esta respuesta merece celebrarse.", "Toca las palabras en el orden correcto para descubrir un recordatorio muy especial."];
  const actionLabels = ["Encontrar los corazones", "Encontrar las parejas", "Resolver la adivinanza", "Descubrir la frase"];
  const hints = ["Busca la silueta ♡. Las estrellas son bonitas, pero hoy buscamos corazones.", "Prueba de dos en dos y recuerda dónde viste cada dibujo. No hay límite de intentos.", "Empieza por «cumple» y termina con lo que sumas cada vuelta al sol.", "Empieza por «Hoy». Después piensa en todo lo bonito que mereces."];
  const victories = ["El cariño siempre encuentra su camino.", "Hay conexiones que simplemente se sienten.", "Exacto. Hoy celebramos que existes.", "Hoy merezco cosas bonitas."];
  const dialog = $("#challenge-dialog");
  const content = $("#challenge-content");
  let storageAvailable = true;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(config.storageKey) || "{}"); } catch { storageAvailable = false; }
  const journey = engine.createJourney(saved);
  let activeStage = -1;
  let won = false;
  let roundId = 0;
  let pendingTimers = new Set();
  let toastTimer;
  let confettiTimer;
  let lastOpener = null;
  let riddleAttempts = 0;

  function later(callback, delay) {
    const id = roundId;
    const timer = setTimeout(() => { pendingTimers.delete(timer); if (id === roundId && dialog.open) callback(); }, delay);
    pendingTimers.add(timer);
  }
  function clearRoundTimers() { roundId++; pendingTimers.forEach(clearTimeout); pendingTimers.clear(); }
  function persist() {
    try { localStorage.setItem(config.storageKey, JSON.stringify(journey.snapshot())); storageAvailable = true; }
    catch { storageAvailable = false; }
  }
  function feedback(message) { $("#game-feedback").textContent = message; }
  function toast(message) {
    clearTimeout(toastTimer);
    $("#toast").textContent = message; $("#toast").hidden = false;
    toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 5000);
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Las fotos y los mensajes se insertan como texto; nunca se interpreta el contenido de config como HTML.
  $$('[data-name]').forEach(node => { node.textContent = config.name; });
  document.title = `El día de ${config.name} · Una sorpresa para ti`;
  $$('[data-lock]').forEach(node => { node.innerHTML = lockIcon; });
  $$('[data-photo]').forEach(figure => {
    const index = Number(figure.dataset.photo);
    const photo = config.photos[index] || { src: "", caption: "Un recuerdo contigo", alt: "" };
    const placeholder = () => {
      const box = element("div", "photo-placeholder");
      box.innerHTML = cameraIcon;
      box.append(element("span", "", `RECUERDO ${String(index + 1).padStart(2, "0")}`));
      box.setAttribute("role", "img");
      box.setAttribute("aria-label", `Espacio para foto: ${photo.caption}`);
      return box;
    };
    if (photo.src && !/^(?:javascript|vbscript):/i.test(photo.src.trim())) {
      const img = element("img", "photo-image");
      img.alt = photo.alt || photo.caption; img.loading = index < 3 ? "eager" : "lazy"; img.decoding = "async";
      img.addEventListener("error", () => { img.replaceWith(placeholder()); }, { once: true });
      img.src = photo.src; figure.append(img);
    } else figure.append(placeholder());
    figure.append(element("figcaption", "", photo.caption));
  });

  function renderProgress() {
    const { completed, revealed } = journey.snapshot();
    $("#journey-progress").value = completed;
    $("#progress-label").textContent = `${completed} de 4 retos`;
    $$('[data-stage]').forEach((stage, index) => {
      const done = index < completed, current = index === completed;
      stage.className = `stage ${done ? "is-complete" : current ? "is-current" : "is-locked"}`;
      const button = $('[data-open]', stage);
      button.disabled = index > completed;
      button.removeAttribute("aria-current");
      if (current) button.setAttribute("aria-current", "step");
      $(".stage-status", stage).textContent = done ? "RETO COMPLETADO" : current ? (index === 0 ? "TU PRIMER PASO" : "TE ESTÁ ESPERANDO") : "POR DESCUBRIR";
      $(".stage-pin", stage).textContent = done ? "✓" : String(index + 1).padStart(2, "0");
      button.replaceChildren(document.createTextNode(done ? "Volver a este momento" : current ? actionLabels[index] : "Completa el reto anterior"));
      const icon = element("span");
      if (done || current) { icon.textContent = done ? "✓" : "↗"; icon.setAttribute("aria-hidden", "true"); }
      else icon.innerHTML = lockIcon;
      button.append(icon);
    });
    const start = $("#start-button");
    start.replaceChildren(document.createTextNode(completed === 4 ? "Ir a mi sorpresa " : completed ? "Continuar mi aventura " : "Empezar mi aventura "));
    const arrow = element("span", "", "↗"); arrow.setAttribute("aria-hidden", "true"); start.append(arrow);
    $("#reveal-button").disabled = completed < 4;
    $("#reveal-label").textContent = completed === 4 ? "Abrir mi sorpresa" : "Completa los 4 retos";
    $("#surprise-count").textContent = completed === 4 ? "Te la ganaste. Este momento es tuyo." : `Tu sorpresa está a ${4 - completed} ${completed === 3 ? "pequeño paso" : "pequeños pasos"}.`;
    $("#surprise-box").classList.toggle("is-ready", completed === 4);
    if (completed === 4) {
      $("#surprise-title").innerHTML = 'La sorpresa <em>ya es tuya.</em>';
      $("#surprise-description").textContent = "Cada paso te trajo hasta aquí. Ahora sí: tenemos algo muy especial para ti.";
      $("#reveal-button [data-lock]").textContent = "♡";
      $("#journey-reassurance").textContent = "Cuatro retos, cuatro sonrisas. Ahora viene la mejor parte.";
    }
    if (revealed) renderGift();
  }
  function scrollToNext() {
    const { completed } = journey.snapshot();
    const target = completed < 4 ? $(`[data-stage="${completed}"]`) : $("#sorpresa");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const button = completed < 4 ? $('[data-open]', target) : journey.snapshot().revealed ? $("#celebrate-button") : $("#reveal-button");
    button.focus({ preventScroll: true });
  }

  function showWin(index) {
    won = true;
    clearRoundTimers();
    $("#challenge-description").textContent = "Un pasito más en este camino hecho para ti.";
    content.replaceChildren();
    const box = element("div", "win-state");
    const check = element("div", "win-icon", "✓"); check.setAttribute("aria-hidden", "true");
    box.append(check, element("p", "win-message", victories[index]));
    box.append(element("p", "win-subtitle", journey.snapshot().completed === 4 ? "¡Lo lograste! Tu regalo está esperando al final del camino." : "Lo estás haciendo precioso. Hay algo más esperando por ti."));
    const next = element("button", "button button-primary", journey.snapshot().completed === 4 ? "Descubrir mi sorpresa ↗" : "Ir al siguiente reto ↗");
    next.addEventListener("click", () => { closeChallenge(false); scrollToNext(); });
    box.append(next); content.append(box);
    $("#hint-button").hidden = true;
    $("#pause-button").textContent = "Volver al camino";
    feedback(storageAvailable ? "Tus retos completados se guardan en este dispositivo. ♡" : "Tu avance se conserva mientras esta página siga abierta. ♡");
    next.focus({ preventScroll: true });
  }
  function finish(delay = 0) {
    if (!journey.complete()) return;
    won = true;
    clearRoundTimers(); persist(); renderProgress();
    const celebrate = () => { showWin(activeStage); confetti(28); };
    if (delay) later(celebrate, delay); else celebrate();
  }
  function openChallenge(index, opener) {
    if (dialog.open) return false;
    const result = journey.start(index);
    if (!result.ok) { toast("Primero completa el reto que te está esperando. Cada paso tiene su magia. ♡"); return false; }
    clearRoundTimers(); activeStage = index; won = false; riddleAttempts = 0; lastOpener = opener || document.activeElement;
    $("#challenge-eyebrow").textContent = `RETO ${String(index + 1).padStart(2, "0")} DE 04`;
    $("#challenge-title").textContent = titles[index];
    $("#challenge-description").textContent = descriptions[index];
    $("#dialog-dots").replaceChildren(...Array.from({ length: 4 }, (_, i) => element("span", i <= index ? "filled" : "")));
    content.replaceChildren(); feedback("");
    $("#hint-button").hidden = false; $("#pause-button").textContent = "Seguir luego";
    if (!result.alreadyComplete) [buildHearts, buildMemory, buildRiddle, buildWords][index]();
    document.body.classList.add("modal-open"); dialog.showModal();
    if (result.alreadyComplete) showWin(index);
    else $("#close-dialog").focus({ preventScroll: true });
    return true;
  }
  function closeChallenge(paused = true) {
    clearRoundTimers(); journey.cancel(); dialog.close(); document.body.classList.remove("modal-open");
    if (lastOpener?.isConnected) lastOpener.focus({ preventScroll: true });
    if (paused && !won) toast(storageAvailable ? "Aquí te esperamos. Tus retos completados están guardados; este intento empieza de nuevo. ♡" : "Aquí te esperamos. Mantén esta página abierta para conservar tus retos completados. ♡");
    activeStage = -1;
  }
  dialog.addEventListener("cancel", event => { event.preventDefault(); closeChallenge(); });
  $("#close-dialog").addEventListener("click", () => closeChallenge());
  $("#pause-button").addEventListener("click", () => closeChallenge());
  $("#hint-button").addEventListener("click", () => feedback(hints[activeStage]));
  $$('[data-open]').forEach(button => button.addEventListener("click", () => openChallenge(Number(button.dataset.open), button)));
  $("#start-button").addEventListener("click", event => journey.snapshot().completed === 4 ? scrollToNext() : openChallenge(journey.snapshot().completed, event.currentTarget));

  function buildHearts() {
    const grid = element("div", "game-grid");
    const counter = element("p", "game-counter", "0 de 5 corazones reunidos");
    for (let i = 0; i < 12; i++) {
      const heart = engine.isHeart(i);
      const button = element("button", "heart-tile", heart ? "♡" : i % 2 ? "✦" : "✧");
      button.setAttribute("aria-label", heart ? `Corazón ${i + 1}` : `Estrella ${i + 1}`);
      button.addEventListener("click", () => {
        const result = journey.act("heart", i); if (!result.ok) return;
        if (!result.hit) { button.classList.add("decoy"); feedback("Esa es una estrella. Preciosa, pero el corazón anda por otro lado. ♡"); return; }
        button.disabled = true; button.classList.add("found"); button.textContent = "✓"; button.setAttribute("aria-label", "Corazón encontrado");
        counter.textContent = `${result.count} de 5 corazones reunidos`;
        feedback(result.count < 5 ? `¡Uno más! ${result.count === 4 ? "Solo falta un corazón." : "Sigue así, cada vez estás más cerca."}` : "¡Reuniste todo el cariño!");
        if (result.solved) finish(450);
      });
      grid.append(button);
    }
    content.append(grid, counter);
  }
  function buildMemory() {
    const grid = element("div", "game-grid");
    const counter = element("p", "game-counter", "0 de 4 parejas encontradas");
    const labels = { "🌷": "Tulipán", "🎀": "Lazo", "🎁": "Regalo", "🍰": "Pastel" };
    const buttons = [];
    for (let i = 0; i < 8; i++) {
      const button = element("button", "memory-tile", "♡");
      button.setAttribute("aria-label", `Descubrir tarjeta ${i + 1}`);
      button.addEventListener("click", () => {
        const result = journey.act("memory", i); if (!result.ok) return;
        button.textContent = result.symbol; button.classList.add("flipped"); button.setAttribute("aria-label", `Tarjeta ${i + 1}: ${labels[result.symbol]}`);
        if (result.match) {
          result.pair.forEach(index => { buttons[index].classList.add("matched"); buttons[index].disabled = true; buttons[index].setAttribute("aria-label", `Pareja encontrada: ${labels[result.symbol]}`); });
          counter.textContent = `${result.pairs} de 4 parejas encontradas`;
          feedback(result.solved ? "¡Todas las parejas están juntas!" : "¡Hicieron match! Vas muy bien. ♡");
          if (result.solved) finish(600);
        } else if (result.mismatch) {
          feedback("Casi, casi. Quédate con sus lugares y prueba otra vez.");
          later(() => {
            if (!journey.settleMemory()) return;
            result.pair.forEach(index => { buttons[index].textContent = "♡"; buttons[index].classList.remove("flipped"); buttons[index].setAttribute("aria-label", `Descubrir tarjeta ${index + 1}`); });
          }, 1050);
        }
      });
      buttons.push(button); grid.append(button);
    }
    content.append(grid, counter);
  }
  function buildRiddle() {
    const riddle = element("p", "riddle", "Llego una vez al año,\ncuento una vuelta más al sol.\nHoy llevo tu nombre\ny se me celebra con mucho amor.\n¿Qué soy?");
    const form = element("form", "answer-form");
    const label = element("label", "", "Tu respuesta"); label.htmlFor = "riddle-answer";
    const input = element("input"); input.id = "riddle-answer"; input.name = "answer"; input.type = "text"; input.required = true; input.maxLength = 120; input.autocomplete = "off"; input.placeholder = "Creo que es…"; input.setAttribute("aria-describedby", "game-feedback");
    const submit = element("button", "button button-primary", "Comprobar mi respuesta ↗"); submit.type = "submit";
    form.append(label, input, submit);
    form.addEventListener("submit", event => {
      event.preventDefault(); const result = journey.act("riddle", input.value);
      if (!result.ok) return;
      if (result.solved) { input.removeAttribute("aria-invalid"); finish(); }
      else {
        riddleAttempts++; input.setAttribute("aria-invalid", "true");
        feedback(riddleAttempts > 2 ? "Te damos un empujoncito: escribe «cumpleaños». Hoy es el tuyo. ♡" : riddleAttempts === 2 ? hints[2] : "Todavía no. Piensa en el motivo por el que hoy eres la protagonista. ♡");
        input.focus(); input.select();
      }
    });
    input.addEventListener("input", () => input.removeAttribute("aria-invalid"));
    content.append(riddle, form);
  }
  function buildWords() {
    const answer = element("div", "word-answer"); answer.setAttribute("role", "group"); answer.setAttribute("aria-label", "Tu frase");
    const resetAnswer = () => answer.replaceChildren(element("span", "word-empty", "Tu frase empieza aquí…")); resetAnswer();
    const bank = element("div", "word-bank");
    const reset = element("button", "text-button word-reset", "Volver a ordenar");
    function clearWords() { resetAnswer(); $$('button', bank).forEach(button => { button.disabled = false; }); }
    [2, 0, 3, 1].forEach(index => {
      const button = element("button", "word-chip", engine.WORDS[index]);
      button.addEventListener("click", () => {
        const result = journey.act("word", index); if (!result.ok) return;
        if (!result.correct) { clearWords(); feedback("Probemos otra vez. La frase empieza con «Hoy» y termina bonito. ♡"); return; }
        button.disabled = true;
        answer.replaceChildren(...result.words.map(word => element("span", "word-chip", word)));
        feedback(result.solved ? "Léelo otra vez. Y créetelo. ♡" : `${result.words.join(" ")}… vas por buen camino.`);
        if (result.solved) { reset.disabled = true; finish(850); }
      }); bank.append(button);
    });
    reset.addEventListener("click", () => { if (journey.resetWords()) { clearWords(); feedback("Una nueva oportunidad para decirte algo bonito."); } });
    content.append(answer, bank, reset);
  }
  function renderGift() {
    $("#gift-message").textContent = config.gift.message;
    $("#gift-clue").textContent = config.gift.clue;
    $("#gift-signature").textContent = config.gift.signature;
    $("#extra-clue-button").hidden = !config.gift.extraClue;
    $("#surprise-box").hidden = true; $("#gift-reveal").hidden = false;
    $("#sorpresa").setAttribute("aria-labelledby", "gift-title");
    $("#gift-reveal h2").id = "gift-title";
  }
  $("#reveal-button").addEventListener("click", () => {
    if (!journey.reveal()) return;
    persist(); renderGift(); confetti(85);
    $("#gift-reveal").scrollIntoView({ behavior: "smooth", block: "start" });
    const title = $("#gift-title"); title.tabIndex = -1; title.focus({ preventScroll: true });
  });
  $("#extra-clue-button").addEventListener("click", () => {
    const extra = $("#extra-clue"); extra.textContent = config.gift.extraClue; extra.hidden = !extra.hidden;
    $("#extra-clue-button").textContent = extra.hidden ? "Necesito una pista más ↗" : "Guardar esta pista ♡";
    $("#extra-clue-button").setAttribute("aria-expanded", String(!extra.hidden));
  });
  $("#extra-clue-button").setAttribute("aria-expanded", "false");
  $("#extra-clue-button").setAttribute("aria-controls", "extra-clue");
  $("#celebrate-button").addEventListener("click", () => confetti(85));
  function confetti(count) {
    const layer = $("#confetti-layer"); layer.replaceChildren(); clearTimeout(confettiTimer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#be4979", "#eea7c7", "#d8ad55", "#98af9b", "#dec9e6", "#f278a7"];
    const pieces = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const piece = element("i", "confetti");
      piece.style.setProperty("--x", `${Math.random() * 100}%`);
      piece.style.setProperty("--confetti-color", colors[i % colors.length]);
      piece.style.setProperty("--duration", `${3 + Math.random() * 2}s`);
      piece.style.setProperty("--delay", `${Math.random() * .8}s`);
      piece.style.setProperty("--drift", `${Math.random() * 200 - 100}px`);
      pieces.append(piece);
    } layer.append(pieces); confettiTimer = setTimeout(() => layer.replaceChildren(), 6000);
  }
  renderProgress();
  // Mejora progresiva: los navegadores sin WebMCP mantienen todas las funciones.
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    const tools = [
      { name: "read_birthday_progress", title: "Consultar el recorrido", description: "Lee los retos completados sin mostrar ni saltar la sorpresa.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => ({ ...journey.snapshot(), activeChallenge: activeStage < 0 ? null : activeStage + 1, total: 4 }) },
      { name: "start_birthday_challenge", title: "Abrir un reto de cumpleaños", description: "Abre un reto ya desbloqueado. No resuelve el reto ni permite saltar etapas.", inputSchema: { type: "object", properties: { challenge: { type: "integer", minimum: 1, maximum: 4 } }, required: ["challenge"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (input) => {
        if (!input || !Number.isInteger(input.challenge) || input.challenge < 1 || input.challenge > 4 || Object.keys(input).some(key => key !== "challenge")) throw new Error("Indica un reto del 1 al 4.");
        if (dialog.open) throw new Error("Ya hay un reto abierto. Termínalo o vuelve al camino.");
        if (input.challenge > journey.snapshot().completed + 1) throw new Error("Ese reto todavía está bloqueado.");
        return { opened: openChallenge(input.challenge - 1), challenge: input.challenge, completed: journey.snapshot().completed };
      } }
    ];
    for (const tool of tools) { try { Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Función opcional, sin afectar el juego. */ } }
    window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
  }
})();
