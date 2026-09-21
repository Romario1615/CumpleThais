(function (root) {
  "use strict";
  function create() {
    const dock = document.getElementById("mascot-dock");
    const dialogSlot = document.getElementById("dialog-mascot-slot");
    const companion = document.getElementById("mascot-companion");
    const sprite = document.getElementById("mascot-sprite");
    const message = document.getElementById("mascot-message");
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const labels = { wave: "saludando", think: "pensando contigo", cheer: "celebrando", point: "señalando el siguiente paso", walk: "caminando" };
    let settling;
    let progress = 0;
    let destination = "wave";
    function pose(gesture) {
      companion.dataset.gesture = gesture;
      sprite.setAttribute("aria-label", `Tu compañera de aventura, ${labels[gesture]}`);
    }
    function position() {
      const host = companion.parentElement;
      const available = host.clientWidth || (host === dock ? Math.min(window.innerWidth - 32, 1180) : Math.min(window.innerWidth - 76, 440));
      const companionWidth = Math.min(available, companion.offsetWidth || (host === dock ? 264 : 235));
      companion.style.setProperty("--mascot-x", `${Math.max(0, available - companionWidth) * progress}px`);
    }
    function arrive(gesture, text, walk) {
      clearTimeout(settling);
      destination = gesture;
      message.textContent = text;
      if (walk && !media.matches) {
        pose("walk");
        settling = setTimeout(() => pose(destination), 1450);
      } else pose(gesture);
      position();
    }
    function scene(name, chapter = 0, revealed = false) {
      dock.append(companion);
      companion.dataset.context = "page";
      const scenes = {
        welcome: ["wave", "¡Vamos juntas! Hay sorpresas esperando.", 0],
        challenge: [chapter === 1 || chapter === 2 ? "think" : "point", "Un reto más. Yo te acompaño. ♡", (chapter + .5) / 4],
        reward: ["cheer", "¡Lo lograste! Abre tu recuerdo.", chapter / 4],
        review: ["point", "Recordemos este paso juntas.", (chapter + .5) / 4],
        album: ["wave", "¡Cuántos momentos bonitos!", .85],
        surprise: [revealed ? "cheer" : "point", revealed ? "¡Feliz cumpleaños! Este día es tuyo. ♡" : "¡Llegamos! Tu regalo está esperando.", 1]
      };
      const [gesture, text, step] = scenes[name] || scenes.welcome;
      progress = Math.max(0, Math.min(1, step));
      arrive(gesture, text, true);
    }
    function forChallenge(index) {
      dialogSlot.append(companion);
      companion.dataset.context = "dialog";
      progress = 0;
      const messages = ["¡A reunir corazones!", "Miremos bien cada tarjeta.", "Pensemos juntas…", "Tú mereces cosas bonitas."];
      arrive(index === 1 || index === 2 ? "think" : "point", messages[index], false);
    }
    function react(gesture, text) { arrive(gesture, text, false); }
    window.addEventListener("resize", position);
    media.addEventListener("change", () => { clearTimeout(settling); pose(destination); });
    window.addEventListener("pagehide", () => { clearTimeout(settling); pose(destination); });
    scene("welcome");
    return { scene, forChallenge, react };
  }
  root.BirthdayMascot = Object.freeze({ create });
})(window);
