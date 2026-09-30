(function (root) {
  "use strict";

  function create(storageKey) {
    const AudioContext = root.AudioContext || root.webkitAudioContext;
    const preferenceKey = `${storageKey}:sound`;
    const music = root.document.createElement("audio");
    music.src = "assets/videoplayback.weba";
    music.preload = "auto";
    music.loop = true;
    music.volume = .42;

    let enabled = true;
    try { enabled = root.localStorage.getItem(preferenceKey) !== "off"; } catch { /* El sonido sigue funcionando sin almacenamiento. */ }
    let context, effectBus, effectOpening, musicOpening;
    let started = false;
    let playing = false;
    let playbackVersion = 0;

    function start(retry = false) {
      if (!enabled || root.document.hidden) return Promise.resolve(false);
      started = true;
      if (playing) return Promise.resolve(true);
      if (retry) musicOpening = null;
      if (musicOpening) return musicOpening;
      const version = ++playbackVersion;
      try {
        const request = Promise.resolve(music.play()).then(() => {
          if (version !== playbackVersion) return false;
          if (!enabled || root.document.hidden) { music.pause(); return false; }
          playing = true;
          return true;
        }).catch(() => false).finally(() => { if (musicOpening === request) musicOpening = null; });
        musicOpening = request;
        return request;
      } catch { return Promise.resolve(false); }
    }
    function stop() {
      playbackVersion++;
      musicOpening = null;
      playing = false;
      music.pause();
      if (context) context.suspend().catch(() => {});
    }
    function ensureEffects() {
      if (context) return true;
      if (!AudioContext) return false;
      try {
        context = new AudioContext();
        const master = context.createGain(); master.gain.value = .48;
        effectBus = context.createGain(); effectBus.gain.value = .85;
        effectBus.connect(master); master.connect(context.destination);
        return true;
      } catch { context = null; return false; }
    }
    function tone(frequency, time, duration, volume) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, time);
      envelope.gain.setValueAtTime(.0001, time);
      envelope.gain.linearRampToValueAtTime(volume, time + Math.min(.04, duration * .2));
      envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
      oscillator.connect(envelope); envelope.connect(effectBus);
      oscillator.start(time); oscillator.stop(time + duration + .02);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    }
    function playButton(button) {
      if (!enabled || root.document.hidden) return;
      start();
      if (!ensureEffects()) return;
      if (!effectOpening) {
        try { effectOpening = Promise.resolve(context.resume()).catch(() => {}).finally(() => { effectOpening = null; }); }
        catch { effectOpening = null; return; }
      }
      effectOpening.then(() => {
        if (!enabled || root.document.hidden) return;
        const at = context.currentTime + .015;
        if (button.matches(".heart-tile, .memory-tile, .word-chip")) {
          tone(880, at, .16, .065);
        } else if (button.matches(".path-action, .button-primary, .gift-trigger")) {
          tone(659.25, at, .24, .075);
          tone(987.77, at + .075, .3, .065);
        } else {
          tone(740, at, .14, .052);
        }
      });
    }
    function setScene(scene) {
      music.volume = scene === "tunnel" ? .5 : .42;
    }
    function toggle() {
      enabled = !enabled;
      try { root.localStorage.setItem(preferenceKey, enabled ? "on" : "off"); } catch { /* Preferencia solo durante esta visita. */ }
      if (enabled) start(); else stop();
      return enabled;
    }
    root.document.addEventListener("visibilitychange", () => {
      if (root.document.hidden) stop();
      else if (started && enabled) start();
    });
    root.addEventListener("pagehide", stop);
    return { available: Boolean(root.HTMLAudioElement || AudioContext), enabled: () => enabled, start, playButton, celebrate: start, setScene, toggle };
  }

  root.BirthdayAudio = Object.freeze({ create });
})(window);
