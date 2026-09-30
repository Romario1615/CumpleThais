(function (root) {
  "use strict";

  function create() {
    const bubbleLayer = document.getElementById("bubble-layer");
    const confettiLayer = document.getElementById("confetti-layer");
    const burstLayer = document.getElementById("burst-layer");
    const transitionLayer = document.getElementById("transition-sparkles");
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const bubbles = [];
    const timers = new Set();
    const celebrationTimers = new Set();
    const colors = ["#ee548e", "#ffd166", "#a781de", "#f394c1", "#79cdbb", "#c54376"];
    let frame = 0;
    let lastTime = 0;
    let settleTimer = null;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let protectedAreas = [];
    let rhythmSource = () => 0;
    let tunnelActive = false;
    const bubbleCount = width < 600 ? 3 : 8;
    // Cada familia mantiene la misma cantidad: corazones, estrellas, regalos y círculos.
    const extraBubbleCount = bubbleCount * 3;
    const bubbleKinds = {
      heart: { className: "heart-bubble", label: "corazón" },
      star: { className: "star-bubble", label: "estrella", src: "assets/star-bubble.svg" },
      gift: { className: "gift-bubble", label: "regalo", src: "assets/gift-bubble.svg" },
      round: { className: "round-bubble", label: "burbuja de color", colors: ["#f5a9c8", "#f4d27e", "#a8d8cf", "#c8b4ed", "#f0b0a2"] },
    };
    const isPaused = () => media.matches;
    function rhythmLevel() {
      const value = isPaused() || document.hidden ? 0 : Number(rhythmSource());
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    }
    function updateRhythm(level) {
      bubbleLayer.style.setProperty("--rhythm-scale", (.93 + level * .07).toFixed(3));
      bubbleLayer.style.setProperty("--rhythm-glow", (1 + level * .18).toFixed(3));
    }
    function setRhythmSource(source) {
      rhythmSource = source;
      updateRhythm(rhythmLevel());
    }
    const later = (callback, delay, collection = timers) => {
      const timer = setTimeout(() => { collection.delete(timer); callback(); }, delay);
      collection.add(timer);
      return timer;
    };
    function particle(className, text, layer) {
      const node = document.createElement("span");
      node.className = className;
      if (text) node.textContent = text;
      layer.append(node);
      return node;
    }
    function removeAfter(node, delay) { later(() => node.remove(), delay); }
    function stopCelebration() {
      celebrationTimers.forEach(clearTimeout);
      celebrationTimers.clear();
      transitionLayer.replaceChildren();
      confettiLayer.replaceChildren();
      burstLayer.replaceChildren();
    }
    function confetti(count = 48, grand = false) {
      if (isPaused() || document.hidden) return;
      const limit = width < 600 ? 120 : 200;
      const available = Math.max(0, limit - confettiLayer.childElementCount);
      for (let i = 0; i < Math.min(count, available); i++) {
        const symbol = i % 7 === 0 ? "♥" : grand && i % 11 === 0 ? "🎁" : "";
        const piece = particle(`confetti${symbol ? " confetti-symbol" : ""}`, symbol, confettiLayer);
        const duration = grand ? 3.4 + Math.random() * 2 : 2.4 + Math.random() * 1.6;
        piece.style.setProperty("--x", `${Math.random() * 100}%`);
        piece.style.setProperty("--confetti-color", colors[i % colors.length]);
        piece.style.setProperty("--duration", `${duration}s`);
        piece.style.setProperty("--delay", `${Math.random() * .4}s`);
        piece.style.setProperty("--drift", `${Math.random() * 240 - 120}px`);
        removeAfter(piece, (duration + .5) * 1000);
      }
    }
    function burst(x, y, grand = false) {
      if (isPaused() || document.hidden) return;
      const count = grand ? 22 : 11;
      const ring = particle("pop-ring", "", burstLayer);
      ring.style.left = `${x}px`; ring.style.top = `${y}px`;
      removeAfter(ring, 800);
      for (let i = 0; i < count; i++) {
        if (burstLayer.childElementCount > 120) break;
        const piece = particle("pop-particle", i % 3 === 0 ? "✦" : "♥", burstLayer);
        const angle = (Math.PI * 2 * i) / count;
        const distance = (grand ? 125 : 65) + Math.random() * (grand ? 150 : 55);
        piece.style.left = `${x}px`; piece.style.top = `${y}px`;
        piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
        piece.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
        piece.style.setProperty("--turn", `${Math.random() * 150 - 75}deg`);
        piece.style.color = colors[i % colors.length];
        removeAfter(piece, 1000);
      }
    }
    function popConfetti(x, y) {
      if (isPaused() || document.hidden) return;
      const limit = width < 600 ? 120 : 200;
      const count = Math.min(width < 600 ? 18 : 26, Math.max(0, limit - confettiLayer.childElementCount));
      for (let i = 0; i < count; i++) {
        const piece = particle("confetti pop-confetti", "", confettiLayer);
        const drift = (Math.random() - .5) * 250;
        const duration = 1.25 + Math.random() * .6;
        piece.style.left = `${x}px`; piece.style.top = `${y}px`;
        piece.style.setProperty("--confetti-color", colors[i % colors.length]);
        piece.style.setProperty("--dx", `${drift}px`);
        piece.style.setProperty("--mid-x", `${drift * .45}px`);
        piece.style.setProperty("--lift", `${-45 - Math.random() * 90}px`);
        piece.style.setProperty("--fall", `${130 + Math.random() * 170}px`);
        piece.style.setProperty("--turn", `${(Math.random() > .5 ? 1 : -1) * (300 + Math.random() * 420)}deg`);
        piece.style.setProperty("--duration", `${duration}s`);
        removeAfter(piece, (duration + .1) * 1000);
      }
    }
    function floatSymbols(grand = false) {
      if (isPaused() || document.hidden) return;
      const symbols = grand ? ["🎁", "💖", "🎉", "💕", "🎈", "✨"] : ["♡", "🎁", "♥", "✦"];
      const count = grand ? 16 : 7;
      for (let i = 0; i < count; i++) {
        const symbol = particle(`flying-symbol${grand ? " is-grand" : ""}`, symbols[i % symbols.length], transitionLayer);
        symbol.style.setProperty("--x", `${5 + Math.random() * 90}%`);
        symbol.style.setProperty("--drift", `${Math.random() * 160 - 80}px`);
        symbol.style.setProperty("--delay", `${Math.random() * .45}s`);
        symbol.style.setProperty("--turn", `${Math.random() * 80 - 40}deg`);
        removeAfter(symbol, grand ? 4700 : 2600);
      }
    }
    function transition(grand = false) {
      stopCelebration();
      confetti(grand ? 80 : 48, grand);
      floatSymbols(grand);
    }
    function finale() {
      transition(true);
      burst(width * .5, height * .38, true);
      [650, 1350, 2150, 3200].forEach((delay, index) => {
        later(() => {
          confetti(45, true);
          burst(width * (index % 2 ? .8 : .2), height * (.25 + Math.random() * .3), true);
          if (index === 2) floatSymbols(true);
        }, delay, celebrationTimers);
      });
    }
    function keepInBounds(bubble) {
      const maxX = Math.max(4, width - bubble.size - 4);
      const maxY = Math.max(4, height - bubble.size - 4);
      if (bubble.x < 4 || bubble.x > maxX) { bubble.x = Math.max(4, Math.min(maxX, bubble.x)); bubble.vx *= -1; }
      if (bubble.y < 4 || bubble.y > maxY) { bubble.y = Math.max(4, Math.min(maxY, bubble.y)); bubble.vy *= -1; }
    }
    function resolveCollisions() {
      for (let i = 0; i < bubbles.length; i++) {
        const a = bubbles[i];
        if (a.phase !== "floating") continue;
        for (let j = i + 1; j < bubbles.length; j++) {
          const b = bubbles[j];
          if (b.phase !== "floating") continue;
          const dx = b.x + b.size / 2 - a.x - a.size / 2;
          const dy = b.y + b.size / 2 - a.y - a.size / 2;
          const minimum = (a.size + b.size) / 2 + (width < 600 ? 12 : 5);
          const distance = Math.hypot(dx, dy);
          if (distance >= minimum) continue;
          const nx = distance ? dx / distance : 1;
          const ny = distance ? dy / distance : 0;
          const aFocused = document.activeElement === a.el;
          const bFocused = document.activeElement === b.el;
          const overlap = minimum - distance;
          if (!aFocused) { a.x -= nx * overlap * (bFocused ? 1 : .5); a.y -= ny * overlap * (bFocused ? 1 : .5); }
          if (!bFocused) { b.x += nx * overlap * (aFocused ? 1 : .5); b.y += ny * overlap * (aFocused ? 1 : .5); }
          const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (approach < 0 && !(aFocused && bFocused)) {
            const impulse = -approach * (aFocused || bFocused ? 1.72 : .86);
            if (!aFocused) { a.vx -= impulse * nx; a.vy -= impulse * ny; }
            if (!bFocused) { b.vx += impulse * nx; b.vy += impulse * ny; }
          }
          keepInBounds(a); keepInBounds(b);
        }
      }
    }
    function refresh() {
      width = window.innerWidth; height = window.innerHeight;
      const protectedSelector = width < 600
        ? "header, footer, main button, main input, main h1, main h2, main h3, main p, .home-return, .mascot-companion"
        : "header, footer, main button, main input, .home-return, .mascot-companion";
      protectedAreas = [...document.querySelectorAll(protectedSelector)]
        .filter(node => node.getClientRects().length)
        .map(node => node.getBoundingClientRect());
      for (const bubble of bubbles) {
        bubble.size = Math.min(bubble.baseSize, Math.max(30, width * .2));
        bubble.el.style.setProperty("--size", `${bubble.size}px`);
        bubble.x = Math.max(4, Math.min(bubble.x, width - bubble.size - 4));
        bubble.y = Math.max(4, Math.min(bubble.y, Math.max(4, height - bubble.size - 4)));
      }
      for (let pass = 0; pass < (width < 600 ? 6 : 4); pass++) resolveCollisions();
      paint();
    }
    function place(bubble, initial = false) {
      bubble.placementId++;
      const sizes = width < 600 ? [27, 33, 40, 49] : [30, 38, 48, 61];
      bubble.baseSize = sizes[(bubble.index + bubble.generation) % sizes.length] + Math.random() * 5;
      if (bubble.kind === bubbleKinds.star) bubble.baseSize *= 1.08;
      bubble.size = Math.min(bubble.baseSize, Math.max(30, width * .2));
      bubble.el.style.setProperty("--size", `${bubble.size}px`);
      bubble.el.style.setProperty("--bubble-opacity", bubble.size > 55 ? ".62" : ".82");
      let best = { x: 4, y: 4, clearance: -Infinity };
      for (let attempt = 0; attempt < 60; attempt++) {
        const seed = bubble.index + bubble.generation * 13 + attempt * 17 + 1;
        const horizontal = (seed * .61803398875 + Math.random() * .04) % 1;
        const vertical = (seed * .754877666 + Math.random() * .04) % 1;
        const x = 4 + Math.max(0, width - bubble.size - 8) * horizontal;
        const y = 4 + Math.max(0, height - bubble.size - 8) * vertical;
        const clearance = bubbles.reduce((nearest, other) => {
          if (other === bubble || other.phase !== "floating") return nearest;
          const dx = x + bubble.size / 2 - other.x - other.size / 2;
          const dy = y + bubble.size / 2 - other.y - other.size / 2;
          return Math.min(nearest, Math.hypot(dx, dy) - (bubble.size + other.size) / 2);
        }, Infinity);
        if (clearance > best.clearance) best = { x, y, clearance };
        if (clearance >= (width < 600 ? 14 : 8)) break;
      }
      bubble.x = best.x; bubble.y = best.y;
      bubble.vx = (Math.random() > .5 ? 1 : -1) * (17 + Math.random() * 14);
      bubble.vy = (Math.random() > .5 ? 1 : -1) * (13 + Math.random() * 13);
      bubble.age = 0;
      bubble.lifetime = initial ? 6 + bubble.index * .7 + Math.random() * 5 : 7 + Math.random() * 11;
      bubble.phase = "floating";
      bubble.el.dataset.phase = "floating";
      bubble.el.dataset.generation = String(bubble.generation);
      bubble.el.hidden = false; bubble.el.disabled = false;
      bubble.el.classList.remove("is-popping");
      bubble.el.setAttribute("aria-label", `Explotar ${bubble.kind.label} ${bubble.index + 1}`);
    }
    function pop(bubble) {
      if (bubble.phase !== "floating") return;
      const placementId = bubble.placementId;
      bubble.phase = "popping";
      bubble.el.dataset.phase = "popping";
      // Un clic deja el foco en el botón: liberarlo evita congelar su próxima vida.
      if (document.activeElement === bubble.el) bubble.el.blur();
      bubble.el.disabled = true;
      bubble.el.classList.add("is-popping");
      bubble.el.setAttribute("aria-label", `¡Pop! Otro ${bubble.kind.label} está por aparecer`);
      const centerX = bubble.x + bubble.size / 2, centerY = bubble.y + bubble.size / 2;
      burst(centerX, centerY);
      popConfetti(centerX, centerY);
      later(() => {
        if (bubble.placementId !== placementId) return;
        bubble.phase = "waiting"; bubble.el.dataset.phase = "waiting";
        bubble.el.hidden = true;
      }, isPaused() ? 0 : 360);
      later(() => {
        if (bubble.placementId !== placementId) return;
        bubble.generation++;
        place(bubble);
        for (let pass = 0; pass < 4; pass++) resolveCollisions();
        paint();
      }, 1050 + Math.random() * 900);
    }
    function paint(level = rhythmLevel()) {
      updateRhythm(level);
      for (const bubble of bubbles) {
        const coversControl = protectedAreas.some(rect => bubble.x < rect.right + 5 && bubble.x + bubble.size > rect.left - 5 && bubble.y < rect.bottom + 5 && bubble.y + bubble.size > rect.top - 5);
        bubble.el.style.transform = `translate3d(${bubble.x}px, ${bubble.y}px, 0)`;
        bubble.el.style.pointerEvents = coversControl || bubble.phase !== "floating" ? "none" : "auto";
        bubble.el.classList.toggle("over-control", coversControl);
      }
    }
    function tick(time) {
      frame = 0;
      if (document.hidden || isPaused()) { lastTime = 0; return; }
      if (width < 600 && lastTime && time - lastTime < 28) { frame = requestAnimationFrame(tick); return; }
      const delta = Math.min((time - (lastTime || time)) / 1000, .04);
      lastTime = time;
      const rhythm = rhythmLevel();
      if (!document.querySelector("dialog[open]")) {
        for (const bubble of bubbles) {
          if (bubble.phase !== "floating" || bubble.el === document.activeElement) continue;
          bubble.age += delta;
          if (bubble.age >= bubble.lifetime) { pop(bubble); continue; }
          bubble.x += bubble.vx * delta * (1 + rhythm * .18); bubble.y += bubble.vy * delta * (1 + rhythm * .18);
          keepInBounds(bubble);
        }
        for (let pass = 0; pass < (width < 600 ? 5 : 2); pass++) resolveCollisions();
        paint(rhythm);
      } else updateRhythm(rhythm);
      frame = requestAnimationFrame(tick);
    }
    function syncMotion() {
      cancelAnimationFrame(frame); frame = 0; lastTime = 0;
      document.body.dataset.motion = isPaused() ? "paused" : "running";
      if (isPaused() || document.hidden || tunnelActive) { stopCelebration(); updateRhythm(0); }
      else frame = requestAnimationFrame(tick);
    }
    function setTunnelActive(active) {
      if (tunnelActive === active) return;
      tunnelActive = active;
      syncMotion();
    }
    function enterScene() {
      if (settleTimer) clearTimeout(settleTimer);
      bubbleLayer.classList.add("scene-entrance");
      bubbles.forEach(bubble => { bubble.phase = "placing"; });
      for (const bubble of bubbles) {
        place(bubble, true);
        bubble.vx *= 1.25;
        bubble.vy *= 1.25;
      }
      refresh();
      settleTimer = later(() => {
        for (const bubble of bubbles) {
          bubble.vx *= .8;
          bubble.vy *= .8;
        }
        bubbleLayer.classList.remove("scene-entrance");
      }, 2600);
    }
    function addBubble(kind, index, initial = true) {
      const el = document.createElement("button");
      el.className = `floating-bubble ${kind.className}`; el.type = "button";
      el.setAttribute("aria-label", `Explotar ${kind.label} ${index + 1}`);
      if (kind === bubbleKinds.round) {
        const roundShape = document.createElement("span");
        roundShape.className = "round-bubble-shape";
        el.style.setProperty("--round-color", kind.colors[index % kind.colors.length]);
        el.append(roundShape);
      } else {
        const bubbleImage = document.createElement("img");
        bubbleImage.src = kind.src || "assets/heart-bubble.svg";
        bubbleImage.alt = ""; bubbleImage.draggable = false;
        bubbleImage.setAttribute("aria-hidden", "true");
        el.append(bubbleImage);
      }
      const bubble = { el, kind, size: 0, baseSize: 0, index, generation: 0, placementId: 0, x: 0, y: 0, vx: 0, vy: 0, age: 0, lifetime: 0, phase: "floating" };
      place(bubble, initial);
      el.addEventListener("click", () => pop(bubble));
      bubbles.push(bubble); bubbleLayer.append(el);
    }
    for (let i = 0; i < bubbleCount; i++) addBubble(bubbleKinds.heart, i);
    for (let i = 0; i < extraBubbleCount; i++) {
      const shape = i % 3 === 0 ? bubbleKinds.star : i % 3 === 1 ? bubbleKinds.gift : bubbleKinds.round;
      addBubble(shape, bubbleCount + i);
    }
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, { passive: true });
    media.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    window.addEventListener("pagehide", () => {
      cancelAnimationFrame(frame); stopCelebration();
      timers.forEach(clearTimeout); timers.clear();
    });
    window.addEventListener("pageshow", event => {
      if (event.persisted) bubbles.forEach(bubble => { bubble.generation++; place(bubble); });
      refresh(); syncMotion();
    });
    refresh(); syncMotion();
    return { confetti, burst, transition, finale, refresh, enterScene, isPaused, setRhythmSource, setTunnelActive };
  }
  root.BirthdayEffects = Object.freeze({ create });
})(window);
