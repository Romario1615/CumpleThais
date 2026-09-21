(function () {
  "use strict";
  const config = window.BIRTHDAY_CONFIG;
  const engine = window.BirthdayEngine;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const cameraIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13.5" r="4"/></svg>';
  const lockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/><path d="M12 14v3"/></svg>';
  const titles = ["Un poquito de cariño", "Las cosas que conectan", "La palabra secreta", "Algo que debes recordar"];
  const descriptions = ["Toca los cinco corazones escondidos entre las estrellas y los regalitos. Aquí, el cariño siempre suma.", "Toca dos tarjetas y encuentra sus parejas. Puedes intentarlo todas las veces que quieras.", "Lee con calma. Esta respuesta merece celebrarse.", "Toca las palabras en el orden correcto para descubrir un recordatorio muy especial."];
  const actionLabels = ["Encontrar los corazones", "Encontrar las parejas", "Resolver la adivinanza", "Descubrir la frase"];
  const hints = ["Busca la silueta ♡. Las estrellas y los regalitos son bonitos, pero hoy buscamos corazones.", "Prueba de dos en dos y recuerda dónde viste cada dibujo. No hay límite de intentos.", "Empieza por «cumple» y termina con lo que sumas cada vuelta al sol.", "Empieza por «Hoy». Después piensa en todo lo bonito que mereces."];
  const victories = ["El cariño siempre encuentra su camino.", "Algunas cosas van juntas sin esfuerzo.", "Exacto. Hoy celebramos que existes.", "Hoy merezco cosas bonitas."];
  const riddleText = "Llego una vez al año,\ncuento una vuelta más al sol.\nHoy llevo tu nombre\ny se me celebra con mucho cariño.\n¿Qué soy?";
  const dialog = $("#challenge-dialog");
  const content = $("#challenge-content");
  const screens = $$("main > section[data-screen]");
  const effects = window.BirthdayEffects.create();
  const mascot = window.BirthdayMascot.create();
  let storageAvailable = true;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(config.storageKey) || "{}"); } catch { storageAvailable = false; }
  let journey = engine.createJourney(saved);
  let experience = engine.createExperience(journey, saved?.experience);
  let visibleScreen = "welcome";
  let reviewIndex = 0;
  const resetDialog = $("#reset-dialog");
  const memoryNotes = [
    "Hay momentos que se quedan para siempre. Y qué bonito que tú formes parte de ellos.",
    "Ojalá nunca falten las risas y las ganas de compartir buenos momentos.",
    "Todavía quedan muchos lugares por descubrir y recuerdos por inventar. Qué suerte celebrar contigo cada uno.",
    "Guarda esta frase contigo: hoy merezco cosas bonitas. Hoy, mañana y en cada vuelta al sol.",
    "Ojalá este nuevo año esté lleno de momentos tan bonitos como estos. ♡"
  ];
  let activeStage = -1;
  let won = false;
  let roundId = 0;
  const pendingTimers = new Set();
  let toastTimer;
  let lastOpener = null;
  let riddleAttempts = 0;
  let openingGift = false;
  let giftTimer;

  function later(callback, delay) {
    const id = roundId;
    const timer = setTimeout(() => { pendingTimers.delete(timer); if (id === roundId && dialog.open) callback(); }, delay);
    pendingTimers.add(timer);
  }
  function clearRoundTimers() { roundId++; pendingTimers.forEach(clearTimeout); pendingTimers.clear(); }
  function persist() {
    try { localStorage.setItem(config.storageKey, JSON.stringify({ ...journey.snapshot(), experience: experience.snapshot() })); storageAvailable = true; }
    catch { storageAvailable = false; }
  }
  function feedback(message, gesture = "think") {
    $("#game-feedback").textContent = message;
    if (message && dialog.open) mascot.react(won ? "cheer" : gesture, won ? "¡Lo lograste! ♡" : gesture === "cheer" ? "¡Vas muy bien!" : gesture === "point" ? "Una pista para ti…" : "Podemos intentarlo otra vez. ♡");
  }
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
  function renderPhoto(figure, index) {
    figure.replaceChildren();
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
  }
  $$('[data-photo]').forEach(figure => renderPhoto(figure, Number(figure.dataset.photo)));

  function focusScreen() {
    const screen = screens.find(section => section.dataset.screen === visibleScreen);
    const title = document.getElementById(screen.getAttribute("aria-labelledby"));
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function showScreen(name = experience.screen(), moveFocus = true) {
    const next = experience.screen();
    // Las visitas al inicio y al repaso conservan el punto real del recorrido.
    const canReview = name === "review" && journey.snapshot().completed > 0;
    if (name !== "welcome" && name !== next && !canReview && !(name === "album" && journey.snapshot().completed === 4 && next === "surprise")) name = next;
    const changed = visibleScreen !== name;
    clearTimeout(giftTimer); openingGift = false;
    $("#surprise-box").classList.remove("is-opening");
    visibleScreen = name;
    screens.forEach(section => { section.hidden = section.dataset.screen !== name; });
    $("#welcome-ribbon").hidden = name !== "welcome";
    $("#home-button").hidden = name === "welcome";
    $(".header-progress").hidden = name === "welcome" && !experience.snapshot().started;
    document.body.dataset.scene = name;
    document.body.classList.toggle("is-finale", name === "surprise" && journey.snapshot().revealed);
    renderProgress();
    if (name === "reward") renderReward();
    if (name === "review") renderReview();
    mascot.scene(name, name === "review" ? reviewIndex : journey.snapshot().completed, journey.snapshot().revealed);
    if (moveFocus) focusScreen();
    effects.refresh();
    if (changed && moveFocus) effects.transition(name === "surprise");
  }
  function renderReward() {
    const { completed } = journey.snapshot();
    const opened = experience.snapshot().memoriesOpened >= completed;
    const index = completed + 2;
    const photo = config.photos[index];
    $("#reward-eyebrow").textContent = `RECUERDO ${String(completed).padStart(2, "0")} DESBLOQUEADO`;
    $("#reward-description").textContent = opened ? "Este momento ya es tuyo. Quédate todo lo que quieras." : "Hay algo bonito guardado aquí. Toca para abrirlo.";
    $("#unwrap-memory").hidden = opened;
    $("#unwrap-memory").setAttribute("aria-expanded", String(opened));
    $("#unwrapped-memory").hidden = !opened;
    if (opened) {
      renderPhoto($("#reward-photo"), index);
      $("#reward-note").textContent = photo?.note || memoryNotes[completed - 1];
    }
    $("#next-chapter").disabled = !opened;
    $("#next-chapter").textContent = completed === 4 ? "Ver todos mis recuerdos ↗" : `Descubrir el capítulo ${String(completed + 1).padStart(2, "0")} ↗`;
    $("#reward-next-hint").textContent = opened ? (completed === 4 ? "Completaste los cuatro capítulos. Tu álbum está listo." : "Un nuevo capítulo acaba de desbloquearse.") : "Abre tu recuerdo para seguir el camino.";
  }
  $("#unwrap-memory").addEventListener("click", () => {
    if (!experience.openMemory()) return;
    persist(); renderReward(); effects.refresh(); confetti(20);
    const note = $("#reward-note"); note.tabIndex = -1; note.focus({ preventScroll: true });
  });
  $("#next-chapter").addEventListener("click", () => {
    if (!experience.continueJourney()) return;
    persist(); showScreen();
  });
  $("#album-continue").addEventListener("click", () => {
    if (!experience.openSurprise()) return;
    persist(); showScreen("surprise");
  });
  $("#back-to-memories").addEventListener("click", () => showScreen("album"));
  $$('[data-home], .brand').forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    if (dialog.open) closeChallenge(false);
    showScreen("welcome");
  }));

  function renderReview() {
    const { completed } = journey.snapshot();
    reviewIndex = Math.max(0, Math.min(reviewIndex, completed - 1));
    $("#review-eyebrow").textContent = `RETO ${String(reviewIndex + 1).padStart(2, "0")} · COMPLETADO`;
    $("#review-title").textContent = titles[reviewIndex];
    $("#review-prompt").textContent = reviewIndex === 2 ? riddleText : descriptions[reviewIndex];
    $("#review-tabs").replaceChildren(...titles.map((_title, index) => {
      const button = element("button", "review-tab", `Reto ${index + 1} ${index < completed ? "✓" : "· Bloqueado"}`);
      button.disabled = index >= completed;
      button.dataset.review = index;
      if (index === reviewIndex) button.setAttribute("aria-current", "step");
      button.addEventListener("click", () => selectReview(index));
      return button;
    }));
    const answer = $("#review-answer");
    answer.replaceChildren(element("span", "eyebrow", "LA RESPUESTA"));
    if (reviewIndex === 0) {
      answer.append(element("p", "review-answer-title", "Estos eran los cinco corazones ♡"));
      const grid = element("div", "review-heart-grid");
      grid.setAttribute("role", "img");
      grid.setAttribute("aria-label", "Los corazones estaban en las casillas 1, 4, 6, 9 y 11, contando de izquierda a derecha y de arriba abajo.");
      for (let index = 0; index < 12; index++) {
        const heart = engine.isHeart(index);
        const tile = element("span", heart ? "review-heart found" : "review-heart", heart ? "♥" : "✧");
        tile.setAttribute("aria-hidden", "true"); grid.append(tile);
      }
      answer.append(grid, element("p", "review-answer-note", "Cinco corazones entre las estrellas. Cada uno sumaba un poquito de cariño."));
    } else if (reviewIndex === 1) {
      answer.append(element("p", "review-answer-title", "Cada dibujo encontraba a su pareja"));
      const pairs = element("div", "review-pairs");
      for (const [symbol, label] of [["🌷", "Tulipanes"], ["🎀", "Lazos"], ["🎁", "Regalos"], ["🍰", "Pasteles"]]) {
        const pair = element("div", "review-pair");
        const icons = element("span", "", `${symbol} + ${symbol}`); icons.setAttribute("aria-hidden", "true");
        pair.append(icons, element("span", "review-pair-label", label)); pairs.append(pair);
      }
      answer.append(pairs, element("p", "review-answer-note", "Las posiciones cambian al jugar. Estas son las cuatro parejas que había que reunir."));
    } else if (reviewIndex === 2) {
      answer.append(element("p", "review-answer-title", "Cumpleaños"), element("p", "review-answer-note", "Una vuelta más al sol y un día para celebrar tu vida. También valían respuestas como «mi cumpleaños» o «cumple»."));
    } else {
      answer.append(element("p", "review-answer-title", engine.WORDS.join(" ")), element("p", "review-answer-note", "Ese era el orden. Y sigue siendo un recordatorio para llevar contigo todos los días. ♡"));
    }
    $("#review-previous").disabled = reviewIndex === 0;
    $("#review-next").textContent = reviewIndex + 1 < completed ? "Siguiente reto →" : "Terminar repaso ↗";
  }
  function selectReview(index) {
    if (!Number.isInteger(index) || index < 0 || index >= journey.snapshot().completed) return;
    reviewIndex = index;
    const alreadyReviewing = visibleScreen === "review";
    showScreen("review");
    if (alreadyReviewing) effects.transition();
  }
  $("#review-button").addEventListener("click", () => selectReview(0));
  $("#review-previous").addEventListener("click", () => selectReview(reviewIndex - 1));
  $("#review-next").addEventListener("click", () => {
    if (reviewIndex + 1 < journey.snapshot().completed) selectReview(reviewIndex + 1);
    else showScreen("welcome");
  });
  $("#review-resume").addEventListener("click", () => showScreen());

  function closeReset() {
    resetDialog.close(); document.body.classList.remove("modal-open");
    if (!$("#reset-button").closest('[hidden]')) $("#reset-button").focus({ preventScroll: true });
  }
  $("#reset-button").addEventListener("click", () => {
    document.body.classList.add("modal-open"); resetDialog.showModal();
    $("#cancel-reset").focus({ preventScroll: true });
  });
  $("#cancel-reset").addEventListener("click", closeReset);
  resetDialog.addEventListener("cancel", event => { event.preventDefault(); closeReset(); });
  $("#confirm-reset").addEventListener("click", () => {
    if (!resetDialog.open) return;
    clearRoundTimers(); clearTimeout(giftTimer); clearTimeout(toastTimer);
    journey.cancel();
    journey = engine.createJourney(); experience = engine.createExperience(journey);
    activeStage = -1; reviewIndex = 0; won = false; riddleAttempts = 0; lastOpener = null;
    closeReset(); persist();
    content.replaceChildren(); feedback(""); $("#toast").hidden = true;
    $("#gift-reveal").hidden = true; $("#surprise-box").hidden = false;
    $("#sorpresa").setAttribute("aria-labelledby", "surprise-title");
    ["gift-message", "gift-clue", "gift-signature", "extra-clue", "reward-note", "reward-photo", "review-answer", "review-prompt"].forEach(id => document.getElementById(id).replaceChildren());
    $("#extra-clue").hidden = true;
    $("#extra-clue-button").textContent = "Necesito una pista más ↗";
    $("#extra-clue-button").setAttribute("aria-expanded", "false");
    $$('.memory-photo').forEach(figure => {
      $(".album-note", figure).hidden = true;
      const button = $(".memory-note-button", figure);
      button.textContent = "Leer este recuerdo ♡"; button.setAttribute("aria-expanded", "false");
      figure.classList.remove("is-reading");
    });
    showScreen("welcome");
    toast("Todo listo para empezar de nuevo. El primer reto te espera. ♡");
  });
  $$('.memory-photo').forEach((figure, index) => {
    const note = element("p", "album-note", config.photos[index + 3]?.note || memoryNotes[index]);
    note.id = `memory-note-${index}`; note.hidden = true;
    const button = element("button", "text-button memory-note-button", "Leer este recuerdo ♡");
    button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-controls", note.id);
    button.setAttribute("aria-label", `Leer recuerdo: ${config.photos[index + 3]?.caption || index + 1}`);
    button.addEventListener("click", () => {
      note.hidden = !note.hidden;
      button.setAttribute("aria-expanded", String(!note.hidden));
      button.textContent = note.hidden ? "Leer este recuerdo ♡" : "Guardar estas palabras ♡";
      figure.classList.toggle("is-reading", !note.hidden);
      effects.refresh();
    });
    figure.append(button, note);
  });

  function renderProgress() {
    const { completed, revealed } = journey.snapshot();
    $("#journey-progress").value = completed;
    $("#progress-label").textContent = `${completed} de 4 retos`;
    $$('[data-stage]').forEach((stage, index) => {
      const done = index < completed, current = index === completed;
      stage.className = `stage ${done ? "is-complete" : current ? "is-current" : "is-locked"}`;
      stage.hidden = !current;
      const button = $('[data-open]', stage);
      button.classList.toggle("path-action", current);
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
    start.replaceChildren(document.createTextNode(experience.snapshot().started ? "Continuar mi aventura " : "Empezar mi aventura "));
    $("#welcome-options").hidden = !experience.snapshot().started;
    $("#review-button").disabled = completed === 0;
    $("#welcome-progress-note").textContent = completed ? `${completed} ${completed === 1 ? "reto completado. Puedes volver a ver su respuesta." : "retos completados. Puedes volver a ver sus respuestas."}` : "Completa tu primer reto para desbloquear el repaso.";
    const arrow = element("span", "", "↗"); arrow.setAttribute("aria-hidden", "true"); start.append(arrow);
    $("#chapter-label").textContent = `CAPÍTULO ${String(Math.min(completed + 1, 4)).padStart(2, "0")} DE 04`;
    $("#chapter-description").textContent = completed === 0 ? "Tu primer recuerdo está al otro lado de este reto." : "Un nuevo reto. Otro recuerdo que espera por ti.";
    $("#chapter-track").replaceChildren(...Array.from({ length: 4 }, (_, index) => {
      const step = element("li", index < completed ? "is-complete" : index === completed ? "is-current" : "is-locked");
      const symbol = element("span", "chapter-number", index < completed ? "✓" : String(index + 1).padStart(2, "0"));
      symbol.setAttribute("aria-hidden", "true");
      const label = index < completed ? "Completado" : index === completed ? "Tu turno" : "Por descubrir";
      step.setAttribute("aria-label", `Capítulo ${index + 1}: ${label}`);
      if (index === completed) step.setAttribute("aria-current", "step");
      step.append(symbol, element("span", "chapter-state", label));
      return step;
    }));
    $("#reveal-button").disabled = completed < 4;
    $("#reveal-label").textContent = completed === 4 ? "Abrir mi sorpresa" : "Completa los 4 retos";
    $("#surprise-count").textContent = completed === 4 ? "Toca el regalo. Esta sorpresa es para ti." : `Tu sorpresa está a ${4 - completed} ${completed === 3 ? "pequeño paso" : "pequeños pasos"}.`;
    $("#surprise-box").classList.toggle("is-ready", completed === 4);
    $("#surprise-title").innerHTML = completed === 4 ? 'La sorpresa <em>ya es tuya.</em>' : 'Lo mejor está <em>por abrirse.</em>';
    $("#surprise-description").textContent = completed === 4 ? "Cada paso te trajo hasta aquí. Ahora sí: tenemos algo muy especial para ti." : "Al final de este camino hay algo que lleva tu nombre. Y no, todavía no te vamos a contar qué es.";
    $("#reveal-button [data-lock]").innerHTML = completed === 4 ? "♡" : lockIcon;
    $("#journey-reassurance").textContent = completed === 4 ? "Cuatro retos, cuatro sonrisas. Ahora viene la mejor parte." : "Sin prisa, sin perder: puedes intentarlo todas las veces que quieras.";
    if (revealed) renderGift();
  }
  function showWin(index) {
    won = true;
    clearRoundTimers();
    $("#challenge-description").textContent = "Un pasito más en este camino hecho para ti.";
    content.replaceChildren();
    const box = element("div", "win-state");
    const check = element("div", "win-icon", "✓"); check.setAttribute("aria-hidden", "true");
    box.append(check, element("p", "win-message", victories[index]));
    box.append(element("p", "win-subtitle", "Desbloqueaste un recuerdo. Hay unas palabras guardadas solo para ti."));
    const next = element("button", "button button-primary path-action", "Descubrir mi recuerdo ♡");
    next.addEventListener("click", () => closeChallenge(false));
    box.append(next); content.append(box);
    $("#hint-button").hidden = true;
    $("#pause-button").textContent = "Volver al camino";
    feedback(storageAvailable ? "Tus retos completados se guardan en este dispositivo. ♡" : "Tu avance se conserva mientras esta página siga abierta. ♡");
    next.focus({ preventScroll: true });
  }
  function finish(delay = 0) {
    if (!journey.complete()) return;
    won = true;
    clearRoundTimers(); persist();
    const celebrate = () => { showWin(activeStage); confetti(28); };
    if (delay) later(celebrate, delay); else celebrate();
  }
  function openChallenge(index, opener) {
    if (dialog.open) return false;
    experience.begin();
    if (experience.screen() !== "challenge" || index !== journey.snapshot().completed) {
      toast("Cada cosa a su tiempo. Abre tu recuerdo y continúa para descubrir el siguiente reto. ♡"); return false;
    }
    const result = journey.start(index);
    if (!result.ok) { toast("Primero completa el reto que te está esperando. Cada paso tiene su magia. ♡"); return false; }
    persist();
    if (visibleScreen !== "challenge") showScreen("challenge", false);
    clearRoundTimers(); activeStage = index; won = false; riddleAttempts = 0; lastOpener = opener || $('[data-open]', $(`[data-stage="${index}"]`));
    $("#challenge-eyebrow").textContent = `RETO ${String(index + 1).padStart(2, "0")} DE 04`;
    $("#challenge-title").textContent = titles[index];
    $("#challenge-description").textContent = descriptions[index];
    $("#dialog-dots").replaceChildren(...Array.from({ length: 4 }, (_, i) => element("span", i <= index ? "filled" : "")));
    content.replaceChildren(); feedback("");
    $("#hint-button").hidden = false; $("#pause-button").textContent = "Seguir luego";
    if (!result.alreadyComplete) [buildHearts, buildMemory, buildRiddle, buildWords][index]();
    document.body.classList.add("modal-open"); dialog.showModal();
    mascot.forChallenge(index);
    if (result.alreadyComplete) showWin(index);
    else $("#close-dialog").focus({ preventScroll: true });
    return true;
  }
  function closeChallenge(paused = true) {
    clearRoundTimers(); journey.cancel(); dialog.close(); document.body.classList.remove("modal-open");
    if (won) showScreen();
    else if (lastOpener?.isConnected && !lastOpener.closest('[hidden]')) lastOpener.focus({ preventScroll: true });
    if (paused && !won) toast(storageAvailable ? "Aquí te esperamos. Tus retos completados están guardados; este intento empieza de nuevo. ♡" : "Aquí te esperamos. Mantén esta página abierta para conservar tus retos completados. ♡");
    activeStage = -1;
    if (!won) mascot.scene(visibleScreen, journey.snapshot().completed, journey.snapshot().revealed);
    effects.refresh();
  }
  dialog.addEventListener("cancel", event => { event.preventDefault(); closeChallenge(); });
  $("#close-dialog").addEventListener("click", () => closeChallenge());
  $("#pause-button").addEventListener("click", () => closeChallenge());
  $("#hint-button").addEventListener("click", () => feedback(hints[activeStage], "point"));
  $$('[data-open]').forEach(button => button.addEventListener("click", () => openChallenge(Number(button.dataset.open), button)));
  $("#start-button").addEventListener("click", () => { experience.begin(); persist(); showScreen(); });

  function buildHearts() {
    const grid = element("div", "game-grid");
    const counter = element("p", "game-counter", "0 de 5 corazones reunidos");
    const giftSlots = new Set([2, 6, 9]);
    for (let i = 0; i < 12; i++) {
      const heart = engine.isHeart(i);
      const shape = heart ? "heart" : giftSlots.has(i) ? "gift" : "star";
      const symbol = heart ? "♡" : shape === "gift" ? "🎁" : i % 2 ? "✦" : "✧";
      const label = heart ? `Corazón ${i + 1}` : shape === "gift" ? `Regalo ${i + 1}` : `Estrella ${i + 1}`;
      const button = element("button", `heart-tile ${shape}-bubble`, symbol);
      button.setAttribute("aria-label", label);
      button.addEventListener("click", () => {
        const result = journey.act("heart", i); if (!result.ok) return;
        if (!result.hit) {
          button.classList.add("decoy");
          feedback(shape === "gift" ? "Ese regalito es una tentación, pero todavía buscamos corazones. ♡" : "Esa estrella es preciosa, pero el corazón anda por otro lado. ♡");
          return;
        }
        button.disabled = true; button.classList.add("found"); button.textContent = "✓"; button.setAttribute("aria-label", "Corazón encontrado");
        counter.textContent = `${result.count} de 5 corazones reunidos`;
        feedback(result.count < 5 ? `¡Uno más! ${result.count === 4 ? "Solo falta un corazón." : "Sigue así, cada vez estás más cerca."}` : "¡Reuniste todo el cariño!", "cheer");
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
          feedback(result.solved ? "¡Todas las parejas están juntas!" : "¡Hicieron match! Vas muy bien. ♡", "cheer");
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
    const riddle = element("p", "riddle", riddleText);
    const form = element("form", "answer-form");
    const label = element("label", "", "Tu respuesta"); label.htmlFor = "riddle-answer";
    const input = element("input"); input.id = "riddle-answer"; input.name = "answer"; input.type = "text"; input.required = true; input.maxLength = 120; input.autocomplete = "off"; input.placeholder = "Creo que es…"; input.setAttribute("aria-describedby", "game-feedback");
    const submit = element("button", "button button-primary path-action", "Comprobar mi respuesta ↗"); submit.type = "submit";
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
        feedback(result.solved ? "Léelo otra vez. Y créetelo. ♡" : `${result.words.join(" ")}… vas por buen camino.`, "cheer");
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
    document.body.classList.toggle("is-finale", visibleScreen === "surprise");
  }
  $("#reveal-button").addEventListener("click", () => {
    if (experience.screen() !== "surprise" || openingGift || journey.snapshot().revealed) return;
    openingGift = true;
    $("#reveal-button").disabled = true;
    $("#reveal-label").textContent = "Abriendo tu gran sorpresa…";
    $("#surprise-box").classList.add("is-opening");
    effects.burst(window.innerWidth / 2, window.innerHeight / 2, true);
    giftTimer = setTimeout(() => {
      openingGift = false;
      if (!journey.reveal()) return;
      persist(); renderGift(); effects.finale(); mascot.react("cheer", "¡Feliz cumpleaños! ♡"); effects.refresh();
      $("#gift-reveal").scrollIntoView({ behavior: "smooth", block: "start" });
      const title = $("#gift-title"); title.tabIndex = -1; title.focus({ preventScroll: true });
    }, effects.isPaused() ? 0 : 1350);
  });
  $("#extra-clue-button").addEventListener("click", () => {
    const extra = $("#extra-clue"); extra.textContent = config.gift.extraClue; extra.hidden = !extra.hidden;
    $("#extra-clue-button").textContent = extra.hidden ? "Necesito una pista más ↗" : "Guardar esta pista ♡";
    $("#extra-clue-button").setAttribute("aria-expanded", String(!extra.hidden));
    effects.refresh();
  });
  $("#extra-clue-button").setAttribute("aria-expanded", "false");
  $("#extra-clue-button").setAttribute("aria-controls", "extra-clue");
  $("#celebrate-button").addEventListener("click", () => effects.finale());
  function confetti(count) {
    effects.confetti(count);
  }
  showScreen(experience.screen(), false);
  // Mejora progresiva: los navegadores sin WebMCP mantienen todas las funciones.
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    const tools = [
      { name: "read_birthday_progress", title: "Consultar el recorrido", description: "Lee los retos completados sin mostrar ni saltar la sorpresa.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => ({ ...journey.snapshot(), screen: visibleScreen, activeChallenge: activeStage < 0 ? null : activeStage + 1, total: 4 }) },
      { name: "start_birthday_challenge", title: "Abrir un reto de cumpleaños", description: "Abre el reto actual cuando está desbloqueado. No resuelve retos ni salta los recuerdos pendientes.", inputSchema: { type: "object", properties: { challenge: { type: "integer", minimum: 1, maximum: 4 } }, required: ["challenge"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (input) => {
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
