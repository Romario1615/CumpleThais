/* Motor del recorrido, sin dependencias ni acceso al navegador. */
(function (root) {
  "use strict";
  const TOTAL = 4;
  const HEARTS = new Set([0, 3, 5, 8, 10]);
  const WORDS = ["Hoy", "merezco", "cosas", "bonitas"];
  const normalize = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, " ");
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function createJourney(saved = {}) {
    let completed = saved && Number.isInteger(saved.completed) && saved.completed >= 0 && saved.completed <= TOTAL ? saved.completed : 0;
    let revealed = completed === TOTAL && saved?.revealed === true;
    let round = null;
    const snapshot = () => ({ completed, revealed });
    function start(index) {
      if (!Number.isInteger(index) || index < 0 || index >= TOTAL || index > completed) return { ok: false, reason: "locked" };
      if (index < completed) return { ok: true, alreadyComplete: true };
      round = { index, hearts: new Set(), cards: shuffle(["🌷", "🎀", "🎁", "🍰", "🌷", "🎀", "🎁", "🍰"]), flipped: [], matched: new Set(), words: [], solved: false };
      return { ok: true, alreadyComplete: false };
    }
    function act(type, value) {
      if (!round || round.solved || round.index !== completed) return { ok: false, reason: "inactive" };
      const expected = ["heart", "memory", "riddle", "word"][round.index];
      if (type !== expected) return { ok: false, reason: "wrong_challenge" };
      if (type === "heart") {
        if (!Number.isInteger(value) || value < 0 || value > 11) return { ok: false, reason: "invalid" };
        if (!HEARTS.has(value)) return { ok: true, hit: false };
        round.hearts.add(value);
        round.solved = round.hearts.size === HEARTS.size;
        return { ok: true, hit: true, count: round.hearts.size, solved: round.solved };
      }
      if (type === "memory") {
        if (!Number.isInteger(value) || value < 0 || value > 7) return { ok: false, reason: "invalid" };
        if (round.flipped.length === 2 || round.matched.has(value) || round.flipped.includes(value)) return { ok: false, reason: "busy" };
        round.flipped.push(value);
        const result = { ok: true, symbol: round.cards[value], pair: [...round.flipped], match: false, mismatch: false, solved: false };
        if (round.flipped.length === 2) {
          const [a, b] = round.flipped;
          if (round.cards[a] === round.cards[b]) {
            round.matched.add(a); round.matched.add(b); round.flipped = [];
            round.solved = round.matched.size === 8;
            result.match = true; result.solved = round.solved;
          } else result.mismatch = true;
        }
        result.pairs = round.matched.size / 2;
        return result;
      }
      if (type === "riddle") {
        if (typeof value !== "string" || value.length > 120) return { ok: false, reason: "invalid" };
        const answers = ["cumpleanos", "mi cumpleanos", "tu cumpleanos", "el cumpleanos", "un cumpleanos", "cumple", "mi cumple", "el cumple", "mi cumpleanos feliz"];
        round.solved = answers.includes(normalize(value));
        return { ok: true, solved: round.solved };
      }
      if (!Number.isInteger(value) || value < 0 || value >= WORDS.length || round.words.includes(value)) return { ok: false, reason: "invalid" };
      if (value !== round.words.length) { round.words = []; return { ok: true, correct: false, words: [], solved: false }; }
      round.words.push(value); round.solved = round.words.length === WORDS.length;
      return { ok: true, correct: true, words: round.words.map(i => WORDS[i]), solved: round.solved };
    }
    function settleMemory() {
      if (!round || round.index !== 1 || round.flipped.length !== 2) return false;
      round.flipped = []; return true;
    }
    function resetWords() {
      if (!round || round.index !== 3 || round.solved) return false;
      round.words = []; return true;
    }
    function complete() {
      if (!round || !round.solved || round.index !== completed) return false;
      completed++; round = null; return true;
    }
    function reveal() { if (completed !== TOTAL) return false; revealed = true; return true; }
    function cancel() { round = null; }
    return { snapshot, start, act, settleMemory, resetWords, complete, reveal, cancel };
  }
  // La presentación también tiene pasos: resolver, abrir el recuerdo y continuar.
  // Se conserva aparte del intento para poder retomar una sorpresa sin saltársela.
  function createExperience(journey, saved) {
    const initial = journey.snapshot();
    const validCount = (value, fallback) => Number.isInteger(value) && value >= 0 && value <= initial.completed ? value : fallback;
    const legacyCount = saved == null ? initial.completed : 0;
    let started = saved?.started === true || initial.completed > 0;
    let memoriesSeen = validCount(saved?.memoriesSeen, legacyCount);
    let memoriesOpened = Math.max(memoriesSeen, validCount(saved?.memoriesOpened, legacyCount));
    let albumSeen = initial.completed === TOTAL && (saved?.albumSeen === true || initial.revealed);
    function screen() {
      const { completed, revealed } = journey.snapshot();
      if (!started) return "welcome";
      if (revealed) return "surprise";
      if (completed > memoriesSeen) return "reward";
      if (completed < TOTAL) return "challenge";
      return albumSeen ? "surprise" : "album";
    }
    function begin() { started = true; }
    function openMemory() {
      if (screen() !== "reward") return false;
      memoriesOpened = journey.snapshot().completed;
      return true;
    }
    function continueJourney() {
      if (screen() !== "reward" || memoriesOpened !== journey.snapshot().completed) return false;
      memoriesSeen = memoriesOpened;
      return true;
    }
    function openSurprise() {
      if (screen() !== "album" && screen() !== "surprise") return false;
      albumSeen = true;
      return true;
    }
    const snapshot = () => ({ started, memoriesSeen, memoriesOpened, albumSeen });
    return { snapshot, screen, begin, openMemory, continueJourney, openSurprise };
  }
  root.BirthdayEngine = Object.freeze({ createJourney, createExperience, normalize, shuffle, WORDS, TOTAL, isHeart: index => HEARTS.has(index) });
})(globalThis);
