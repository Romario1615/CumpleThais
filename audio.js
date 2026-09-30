(function (root) {
  "use strict";

  function create(storageKey) {
    const AudioContext = root.AudioContext || root.webkitAudioContext;
    const preferenceKey = `${storageKey}:sound`;
    const beat = 60 / 96;
    const chords = [
      [130.81, 164.81, 196, 246.94],
      [110, 130.81, 164.81, 196],
      [87.31, 110, 130.81, 164.81],
      [98, 123.47, 146.83, 174.61]
    ];
    const melody = [659.25, 783.99, 1046.5, 0, 659.25, 523.25, 440, 0, 440, 523.25, 659.25, 0, 587.33, 493.88, 392, 587.33];
    let enabled = true;
    try { enabled = root.localStorage.getItem(preferenceKey) !== "off"; } catch { /* El sonido sigue funcionando sin almacenamiento. */ }
    let context, master, musicBus, effectBus, loopTimer, opening;
    let started = false;
    let scene = "welcome";
    let nextBeat = 0;
    let step = 0;

    function ensureContext() {
      if (context) return true;
      if (!AudioContext) return false;
      try {
        context = new AudioContext();
        master = context.createGain(); master.gain.value = .48;
        musicBus = context.createGain(); musicBus.gain.value = scene === "tunnel" ? .9 : .58;
        effectBus = context.createGain(); effectBus.gain.value = .85;
        musicBus.connect(master); effectBus.connect(master); master.connect(context.destination);
        return true;
      } catch { context = null; return false; }
    }
    function tone(frequency, time, duration, volume, type, bus) {
      if (!context || !frequency) return;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, time);
      envelope.gain.setValueAtTime(.0001, time);
      envelope.gain.linearRampToValueAtTime(volume, time + Math.min(.04, duration * .2));
      envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
      oscillator.connect(envelope); envelope.connect(bus);
      oscillator.start(time); oscillator.stop(time + duration + .02);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    }
    function scheduleMusic() {
      if (!context || !enabled || root.document.hidden) return;
      while (nextBeat < context.currentTime + .5) {
        const position = step % melody.length;
        if (position % 4 === 0) {
          const chord = chords[Math.floor(position / 4)];
          chord.forEach((frequency, index) => tone(frequency, nextBeat, beat * 3.9, index === 0 ? .042 : .028, "sine", musicBus));
        }
        tone(melody[position], nextBeat, beat * .82, .085, "triangle", musicBus);
        if (position % 2 === 0) {
          const chord = chords[Math.floor(position / 4)];
          tone(chord[(position / 2) % 4] * 4, nextBeat + .06, beat * .45, .026, "sine", musicBus);
        }
        nextBeat += beat; step++;
      }
    }
    function stopClock() {
      if (loopTimer) root.clearInterval(loopTimer);
      loopTimer = null;
    }
    function start() {
      if (!enabled || root.document.hidden || !ensureContext()) return;
      started = true;
      if (opening) return;
      try {
        opening = Promise.resolve(context.resume()).then(() => {
          if (!enabled || root.document.hidden || loopTimer) return;
          nextBeat = context.currentTime + .06;
          scheduleMusic();
          loopTimer = root.setInterval(scheduleMusic, 180);
        }).catch(() => {}).finally(() => { opening = null; });
      } catch { opening = null; }
    }
    function playButton(button) {
      if (!enabled || !AudioContext) return;
      start();
      const play = () => {
        if (!enabled || !context || root.document.hidden) return;
        const at = context.currentTime + .015;
        if (button.matches(".heart-tile, .memory-tile, .word-chip")) {
          tone(880, at, .16, .065, "sine", effectBus);
        } else if (button.matches(".path-action, .button-primary, .gift-trigger")) {
          tone(659.25, at, .24, .075, "sine", effectBus);
          tone(987.77, at + .075, .3, .065, "sine", effectBus);
        } else {
          tone(740, at, .14, .052, "sine", effectBus);
        }
      };
      if (opening) opening.then(play); else play();
    }
    function celebrate() {
      if (!enabled || !context || root.document.hidden) return;
      const play = () => {
        if (!enabled || !context) return;
        const at = context.currentTime + .035;
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => tone(frequency, at + index * .1, .46, .072, "sine", effectBus));
      };
      if (opening) opening.then(play); else play();
    }
    function setScene(nextScene) {
      scene = nextScene;
      if (context) musicBus.gain.setTargetAtTime(scene === "tunnel" ? .9 : .58, context.currentTime, .18);
    }
    function toggle() {
      enabled = !enabled;
      try { root.localStorage.setItem(preferenceKey, enabled ? "on" : "off"); } catch { /* Preferencia solo durante esta visita. */ }
      if (enabled) {
        start();
        celebrate();
      } else {
        stopClock();
        if (context) context.suspend().catch(() => {});
      }
      return enabled;
    }
    root.document.addEventListener("visibilitychange", () => {
      if (root.document.hidden) {
        stopClock();
        if (context) context.suspend().catch(() => {});
      } else if (started && enabled) start();
    });
    root.addEventListener("pagehide", () => { stopClock(); if (context) context.suspend().catch(() => {}); });
    return { available: Boolean(AudioContext), enabled: () => enabled, playButton, celebrate, setScene, toggle };
  }

  root.BirthdayAudio = Object.freeze({ create });
})(window);
