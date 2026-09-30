import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const sources = await Promise.all(['config.js', 'core.js', 'effects.js', 'mascot.js', 'rhythm.js', 'audio.js', 'script.js'].map(file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
const wait = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));

// Ejecuta el HTML y los scripts reales. Solo adapta APIs de ventana que JSDOM
// no implementa; el cambio de pantalla y los juegos usan sus eventos reales.
function loadPage(saved, reducedMotion = true, previousMotion, options = {}) {
  const dom = new JSDOM(html, { url: 'https://birthday.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const errors = [];
  window.addEventListener('error', event => { errors.push(event.error); event.preventDefault(); });
  window.matchMedia = () => ({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
  if (options.audioEvents) {
    const events = options.audioEvents;
    window.HTMLMediaElement.prototype.play = function () {
      events.musicPlays++;
      events.media = this;
      if (options.blockAutoplay && events.musicPlays === 1) return Promise.reject(new Error('Autoplay blocked'));
      return Promise.resolve();
    };
    window.HTMLMediaElement.prototype.pause = function () { events.musicPauses++; };
    window.AudioContext = class {
      constructor() { events.constructed++; this.currentTime = 0; this.state = 'suspended'; this.destination = {}; }
      createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} }, connect() {}, disconnect() {} }; }
      createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() { events.notes++; }, stop() {} }; }
      resume() { this.state = 'running'; return Promise.resolve(); }
      suspend() { this.state = 'suspended'; return Promise.resolve(); }
    };
  }
  if (options.styles) {
    const stylesheet = window.document.createElement('style');
    stylesheet.textContent = styles;
    window.document.head.append(stylesheet);
  }
  let advance;
  if (options.manualClock) {
    let clock = 1;
    let nextId = 0;
    const frames = new Map();
    const timers = new Map();
    if (options.randomSeed === undefined) window.Math.random = () => .5;
    else {
      let seed = options.randomSeed >>> 0;
      window.Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    }
    window.requestAnimationFrame = callback => { const id = ++nextId; frames.set(id, callback); return id; };
    window.cancelAnimationFrame = id => frames.delete(id);
    window.setTimeout = (callback, delay = 0) => { const id = ++nextId; timers.set(id, { callback, due: clock + delay }); return id; };
    window.clearTimeout = id => timers.delete(id);
    advance = milliseconds => {
      const end = clock + milliseconds;
      while (clock < end) {
        clock = Math.min(end, clock + 1000 / 60);
        const dueTimers = [...timers].filter(([, timer]) => timer.due <= clock);
        for (const [id, timer] of dueTimers) { timers.delete(id); timer.callback(); }
        const pending = [...frames.values()]; frames.clear();
        pending.forEach(callback => callback(clock));
      }
    };
  } else {
    const nativeTimeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay) => nativeTimeout(callback, delay >= 30000 ? delay : Math.min(delay, 5));
  }
  if (options.width) window.innerWidth = options.width;
  if (options.height) window.innerHeight = options.height;
  if (saved) window.localStorage.setItem('cumple-thais-2026-v1', JSON.stringify(saved));
  if (previousMotion) window.localStorage.setItem('cumple-thais-2026-v1:motion', previousMotion);
  for (const source of sources) window.eval(source);
  const document = window.document;
  const click = selector => {
    const node = document.querySelector(selector);
    assert.ok(node, `Existe ${selector}`);
    assert.equal(node.disabled, false, `${selector} está habilitado`);
    assert.equal(node.closest('[hidden]'), null, `${selector} está visible`);
    node.click();
    assert.deepEqual(errors, [], 'no hay errores durante el clic');
  };
  const screen = name => {
    assert.equal(document.body.hidden, false, 'el body nunca se oculta al navegar');
    assert.deepEqual([...document.querySelectorAll('main > section[data-screen]:not([hidden])')].map(node => node.dataset.screen), [name]);
    assert.deepEqual(errors, [], 'no hay errores de ejecución');
  };
  const snapshot = () => JSON.parse(window.localStorage.getItem('cumple-thais-2026-v1'));
  return { dom, window, document, errors, click, screen, snapshot, advance };
}

test('regresión: comenzar, volver y continuar mantienen visible una única pantalla', () => {
  const page = loadPage();
  try {
    page.screen('welcome');
    assert.equal(page.document.querySelector('#home-button').hidden, true);
    page.click('#start-button'); page.screen('challenge');
    assert.equal(page.document.activeElement.id, 'journey-title');
    page.click('#home-button'); page.screen('welcome');
    page.click('#start-button'); page.screen('challenge');
    page.click('[data-open="0"]');
    assert.equal(page.document.querySelector('dialog').open, true);
    page.click('.dialog-home');
    assert.equal(page.document.querySelector('dialog').open, false);
    page.screen('welcome');
    page.click('#start-button');
    page.screen('challenge');
  } finally { page.dom.window.close(); }
});

test('el primer reto mantiene sus fichas en la cuadrícula y permite reunir los cinco corazones', () => {
  const page = loadPage(undefined, false, undefined, { manualClock: true, styles: true });
  try {
    page.click('#start-button');
    page.click('[data-open="0"]');
    const tiles = [...page.document.querySelectorAll('.heart-tile')];
    assert.equal(tiles.length, 15);
    assert.equal(page.window.getComputedStyle(page.document.querySelector('#bubble-layer .heart-bubble')).position, 'absolute', 'se carga el CSS real de las burbujas');
    assert.equal(page.window.getComputedStyle(tiles[0].parentElement).display, 'grid');
    for (const tile of tiles) {
      const style = page.window.getComputedStyle(tile);
      assert.ok(!['absolute', 'fixed'].includes(style.position), `${tile.getAttribute('aria-label')} debe ocupar su propia celda`);
      assert.equal(style.display, 'flex');
      assert.notEqual(style.pointerEvents, 'none');
      assert.notEqual(style.visibility, 'hidden');
    }
    page.click('.heart-tile[aria-label^="Estrella"]');
    page.click('.heart-tile[aria-label^="Regalo"]');
    assert.equal(page.document.querySelector('.game-counter').textContent, '0 de 5 corazones reunidos');
    const hearts = tiles.filter(tile => tile.getAttribute('aria-label').startsWith('Corazón'));
    hearts.forEach((heart, index) => {
      heart.click();
      heart.click();
      assert.equal(page.document.querySelector('.game-counter').textContent, `${index + 1} de 5 corazones reunidos`);
    });
    page.advance(500);
    page.click('.win-state button');
    page.screen('reward');
    assert.equal(page.snapshot().completed, 1);
    assert.deepEqual(page.errors, []);
  } finally { page.dom.window.close(); }
});

test('reiniciar borra el avance, persiste y permite completar de nuevo toda la aventura', async () => {
  const withStyles = saved => loadPage(saved, true, undefined, { styles: true });
  let page = withStyles({ completed: 4, revealed: true });
  try {
    page.screen('surprise');
    page.click('#back-to-memories');
    page.click('.memory-note-button');
    page.click('#home-button'); page.screen('welcome');
    page.window.localStorage.setItem('otro-proyecto', 'conservar');
    const originalProgress = page.snapshot();
    page.click('#reset-button');
    assert.equal(page.document.querySelector('#reset-dialog').open, true);
    page.click('#cancel-reset');
    assert.deepEqual(page.snapshot(), originalProgress, 'cancelar conserva el avance');
    page.click('#reset-button'); page.click('#confirm-reset');
    page.screen('welcome');
    assert.equal(page.document.querySelector('#reset-dialog').open, false);
    assert.equal(page.document.querySelector('#review-button').disabled, true);
    assert.equal(page.document.querySelector('#gift-reveal').hidden, true);
    assert.equal(page.document.querySelector('#reveal-button').disabled, true);
    assert.equal(page.document.querySelector('#gift-wish').textContent, '');
    assert.equal(page.document.querySelector('#birthday-tunnel').hidden, true);
    assert.ok([...page.document.querySelectorAll('.album-note')].every(node => node.hidden));
    assert.equal(page.window.localStorage.getItem('otro-proyecto'), 'conservar');
    const cleanProgress = page.snapshot();
    assert.deepEqual(cleanProgress, { completed: 0, revealed: false, experience: { started: false, memoriesSeen: 0, memoriesOpened: 0, albumSeen: false } });
    page.dom.window.close(); page = withStyles(cleanProgress); page.screen('welcome');
    page.click('#start-button');
    for (let stage = 0; stage < 4; stage++) {
      page.screen('challenge');
      const visible = [...page.document.querySelectorAll('[data-stage]')].filter(node => !node.hidden);
      assert.equal(visible.length, 1);
      assert.equal(visible[0].dataset.stage, String(stage));
      page.click(`[data-open="${stage}"]`);
      for (const control of page.document.querySelectorAll('#challenge-content button, #challenge-content input')) {
        const style = page.window.getComputedStyle(control);
        assert.ok(!['absolute', 'fixed'].includes(style.position), 'los controles permanecen en el contenido del reto');
        assert.notEqual(style.display, 'none');
        assert.notEqual(style.visibility, 'hidden');
        assert.notEqual(style.pointerEvents, 'none');
      }
      if (stage === 0) {
        assert.equal(page.document.querySelectorAll('.heart-tile[aria-label^="Corazón"]').length, 5);
        assert.equal(page.document.querySelectorAll('.heart-tile[aria-label^="Estrella"]').length, 5);
        assert.equal(page.document.querySelectorAll('.heart-tile[aria-label^="Regalo"]').length, 5);
        for (const heart of page.document.querySelectorAll('.heart-tile[aria-label^="Corazón"]')) heart.click();
      } else if (stage === 1) {
        const cards = [...page.document.querySelectorAll('.memory-tile')];
        const seen = new Map();
        for (let i = 0; i < cards.length; i++) {
          cards[i].click();
          const pair = seen.get(cards[i].textContent) || [];
          pair.push(i); seen.set(cards[i].textContent, pair);
          await wait();
        }
        for (const [a, b] of seen.values()) {
          if (!cards[a].disabled) { cards[a].click(); cards[b].click(); await wait(); }
        }
      } else if (stage === 2) {
        const answer = page.document.querySelector('#riddle-answer');
        answer.value = 'Mi cumpleaños';
        page.click('.answer-form button');
      } else {
        for (const word of ['Hoy', 'merezco', 'cosas', 'bonitas']) {
          [...page.document.querySelectorAll('.word-bank button')].find(button => button.textContent === word).click();
        }
      }
      await wait();
      page.click('.win-state button'); page.screen('reward');
      assert.equal(page.document.querySelector('#next-chapter').disabled, true);
      if (stage === 0) {
        const saved = page.snapshot(); page.dom.window.close(); page = withStyles(saved);
        page.screen('reward');
        assert.equal(page.document.querySelector('#unwrapped-memory').hidden, true);
      }
      page.click('#unwrap-memory');
      assert.equal(page.document.querySelector('#unwrapped-memory').hidden, false);
      page.click('#next-chapter');
    }
    page.screen('album');
    page.click('.memory-note-button');
    assert.equal(page.document.querySelector('#memory-note-0').hidden, false);
    page.click('#album-continue'); page.screen('surprise');
    page.click('#reveal-button'); await wait();
    assert.equal(page.document.querySelector('#gift-reveal').hidden, false);
    assert.equal(page.document.body.classList.contains('is-finale'), true);
    assert.equal(page.document.querySelector('#birthday-tunnel').hidden, false);
    const completedProgress = page.snapshot();
    page.click('#tunnel-skip'); page.screen('welcome');
    assert.deepEqual(page.snapshot(), completedProgress);
    page.click('#start-button'); page.screen('surprise');
    page.click('#celebrate-button');
    assert.equal(page.document.querySelector('#birthday-tunnel').hidden, false);
    page.click('#tunnel-skip'); page.screen('welcome');
    page.click('#start-button'); page.screen('surprise');
    page.click('#back-to-memories'); page.screen('album');
    page.click('#album-continue'); page.screen('surprise');
    assert.equal(page.document.activeElement.id, 'gift-title');
    const saved = page.snapshot(); page.dom.window.close(); page = withStyles(saved);
    page.screen('surprise');
    assert.equal(page.document.querySelector('#gift-reveal').hidden, false);
    assert.deepEqual(page.errors, []);
  } finally { page.dom.window.close(); }
});

test('el túnel muestra las fotos y vuelve al inicio al cumplir treinta segundos', () => {
  const page = loadPage({ completed: 4, revealed: true }, true, undefined, { manualClock: true, styles: true });
  try {
    page.screen('surprise');
    assert.doesNotMatch(page.document.querySelector('#gift-reveal').textContent, /última pista|necesito una pista/i);
    page.click('#celebrate-button');
    const tunnel = page.document.querySelector('#birthday-tunnel');
    assert.equal(tunnel.hidden, false);
    assert.equal(page.document.querySelectorAll('.tunnel-ring').length, 9);
    const photos = [...page.document.querySelectorAll('#tunnel-photo-field img')];
    assert.equal(photos.length, 14);
    assert.deepEqual(new Set(photos.map(photo => photo.getAttribute('src'))), new Set(page.window.BIRTHDAY_CONFIG.photos.map(photo => photo.tunnelSrc || photo.src)));
    const progress = page.snapshot();
    page.advance(20000);
    assert.match(page.document.querySelector('#tunnel-description').textContent, /Tu grandeza/);
    page.advance(9999);
    assert.equal(tunnel.hidden, false);
    page.advance(1);
    page.screen('welcome');
    assert.equal(tunnel.hidden, true);
    assert.equal(page.document.body.classList.contains('tunnel-active'), false);
    assert.deepEqual(page.snapshot(), progress);
  } finally { page.dom.window.close(); }
});

test('el túnel móvil usa menos efectos y miniaturas ligeras sin perder recuerdos', async () => {
  const page = loadPage({ completed: 4, revealed: true }, true, undefined, { width: 390, height: 844 });
  try {
    page.click('#celebrate-button');
    const photos = [...page.document.querySelectorAll('#tunnel-photo-field img')];
    assert.equal(page.document.querySelectorAll('.tunnel-ring').length, 4);
    assert.equal(photos.length, 8);
    assert.equal(new Set(photos.map(photo => photo.getAttribute('src'))).size, 6);
    assert.ok(photos.every(photo => photo.getAttribute('src').endsWith('-tunnel.webp')));
    for (let index = 1; index <= 6; index++) {
      const base = new URL(`../assets/fotos/T${index}`, import.meta.url);
      const original = await stat(new URL(`${base.href}.png`));
      const optimized = await stat(new URL(`${base.href}.webp`));
      const thumbnail = await stat(new URL(`${base.href}-tunnel.webp`));
      assert.ok(optimized.size < original.size * .2, `T${index} carga mucho menos`);
      assert.ok(thumbnail.size < 30000, `T${index} tiene miniatura ligera`);
    }
  } finally { page.dom.window.close(); }
});

test('el repaso recorre las cuatro soluciones sin cambiar el avance guardado', () => {
  const page = loadPage({ completed: 4, revealed: true });
  try {
    page.click('#home-button');
    const saved = page.snapshot();
    page.click('#review-button'); page.screen('review');
    assert.equal(page.document.querySelector('#review-previous').disabled, true);
    assert.equal(page.document.querySelectorAll('.review-heart.found').length, 5);
    page.click('#review-next');
    assert.equal(page.document.querySelectorAll('.review-pair').length, 4);
    page.click('#review-next');
    assert.match(page.document.querySelector('#review-prompt').textContent, /una vez al año/);
    assert.equal(page.document.querySelector('.review-answer-title').textContent, 'Cumpleaños');
    page.click('#review-next');
    assert.equal(page.document.querySelector('.review-answer-title').textContent, 'Hoy merezco cosas bonitas');
    page.click('#review-previous');
    assert.equal(page.document.querySelector('.review-answer-title').textContent, 'Cumpleaños');
    page.click('[data-review="3"]');
    page.click('#review-next'); page.screen('welcome');
    assert.deepEqual(page.snapshot(), saved);
    page.click('#start-button'); page.screen('surprise');
    assert.equal(page.document.querySelector('#gift-reveal').hidden, false);
  } finally { page.dom.window.close(); }
});

test('el repaso oculta las respuestas pendientes y permite retomar el recuerdo pendiente', () => {
  const page = loadPage({ completed: 2, revealed: false, experience: { started: true, memoriesSeen: 1, memoriesOpened: 1, albumSeen: false } });
  try {
    page.screen('reward'); page.click('#home-button');
    const saved = page.snapshot();
    page.click('#review-button'); page.screen('review');
    assert.equal(page.document.querySelector('[data-review="2"]').disabled, true);
    assert.equal(page.document.querySelector('[data-review="3"]').disabled, true);
    page.document.querySelector('[data-review="2"]').click();
    assert.equal(page.document.querySelectorAll('.review-heart.found').length, 5);
    page.click('#review-next');
    assert.equal(page.document.querySelectorAll('.review-pair').length, 4);
    page.click('#review-resume'); page.screen('reward');
    assert.deepEqual(page.snapshot(), saved);
    assert.equal(page.document.querySelector('#next-chapter').disabled, true);
  } finally { page.dom.window.close(); }
});

test('el audio de assets comienza en el preloader y conserva los sonidos de botones', async () => {
  const events = { constructed: 0, notes: 0, musicPlays: 0, musicPauses: 0 };
  const page = loadPage(undefined, true, undefined, { audioEvents: events });
  try {
    const toggle = page.document.querySelector('#sound-toggle');
    assert.equal(toggle.hidden, false);
    assert.equal(events.constructed, 0, 'los efectos de botones esperan a la primera interacción');
    assert.equal(events.musicPlays, 1, 'la canción se solicita durante el preloader');
    await wait();
    assert.equal(page.document.querySelector('#birthday-preloader').classList.contains('is-playing'), true);
    page.click('#start-button');
    await wait();
    assert.equal(events.constructed, 1);
    assert.equal(events.musicPlays, 1, 'la canción continúa sin reiniciarse');
    assert.match(events.media.src, /assets\/videoplayback\.weba$/);
    assert.equal(events.media.loop, true);
    assert.ok(events.notes > 0, 'el botón conserva su sonido');
    const buttonNotes = events.notes;
    await wait(250);
    assert.equal(events.notes, buttonNotes, 'ya no se programa la melodía anterior');
    page.click('#sound-toggle');
    assert.equal(toggle.getAttribute('aria-pressed'), 'false');
    assert.equal(page.window.localStorage.getItem('cumple-thais-2026-v1:sound'), 'off');
    assert.equal(events.musicPauses, 1);
    const mutedNotes = events.notes;
    page.click('#home-button');
    await wait();
    assert.equal(events.notes, mutedNotes);
    page.click('#sound-toggle');
    await wait();
    assert.equal(toggle.getAttribute('aria-pressed'), 'true');
    assert.equal(events.musicPlays, 2, 'la canción se reanuda');
    page.click('#start-button');
    await wait();
    assert.ok(events.notes > mutedNotes, 'los botones siguen sonando');
    assert.deepEqual(page.errors, []);
  } finally { page.dom.window.close(); }
});

test('las burbujas pulsan con la posición de la canción y se calman al silenciarla', async () => {
  const events = { constructed: 0, notes: 0, musicPlays: 0, musicPauses: 0 };
  const page = loadPage(undefined, false, undefined, { manualClock: true, audioEvents: events, width: 390, height: 844 });
  try {
    await wait();
    const layer = page.document.querySelector('#bubble-layer');
    events.media.currentTime = .55;
    page.advance(50);
    const onBeat = Number(layer.style.getPropertyValue('--rhythm-scale'));
    events.media.currentTime = 1.1;
    page.advance(50);
    const betweenBeats = Number(layer.style.getPropertyValue('--rhythm-scale'));
    assert.ok(onBeat > betweenBeats + .05, 'el pulso sigue la pista de audio');
    page.click('#sound-toggle');
    page.advance(50);
    assert.equal(Number(layer.style.getPropertyValue('--rhythm-scale')), .93);
    assert.deepEqual(page.errors, []);
  } finally { page.dom.window.close(); }
});

test('las animaciones se activan sin botón incluso con una pausa guardada anteriormente', async () => {
  const page = loadPage(undefined, false, 'paused');
  try {
    assert.equal(page.document.querySelector('#motion-toggle'), null);
    assert.equal(page.document.body.dataset.motion, 'running');
    const bubble = page.document.querySelector('.heart-bubble');
    assert.ok(bubble.querySelector('img[src="assets/heart-bubble.svg"]'));
    assert.equal(bubble.textContent, '', 'la burbuja es la silueta, sin un corazón de texto dentro');
    const startPosition = bubble.style.transform;
    await wait(55);
    assert.notEqual(bubble.style.transform, startPosition);
    page.click('.heart-bubble');
    assert.equal(bubble.classList.contains('is-popping'), true);
    assert.ok(page.document.querySelectorAll('.pop-particle').length > 0);
    const popConfetti = page.document.querySelector('.pop-confetti');
    assert.ok(popConfetti, 'al explotar sale confeti');
    const popOrigin = page.document.querySelector('.pop-ring');
    assert.equal(popConfetti.style.left, popOrigin.style.left, 'el confeti nace en el corazón');
    assert.equal(popConfetti.style.top, popOrigin.style.top);
    page.click('#start-button'); page.screen('challenge');
    assert.ok(page.document.querySelectorAll('.confetti').length > 0);
    assert.ok(page.document.querySelectorAll('.flying-symbol').length > 0);
    assert.equal(page.document.body.dataset.motion, 'running');
  } finally { page.dom.window.close(); }
});

test('las burbujas flotantes incluyen corazones, estrellas y regalos', () => {
  const page = loadPage();
  try {
    const hearts = page.document.querySelectorAll('.heart-bubble');
    const stars = page.document.querySelectorAll('.star-bubble');
    const gifts = page.document.querySelectorAll('.gift-bubble');
    const rounds = page.document.querySelectorAll('.round-bubble');
    assert.ok(hearts.length > 0, 'hay burbujas de corazón');
    assert.ok(stars.length > 0, 'hay burbujas de estrella');
    assert.ok(gifts.length > 0, 'hay burbujas de regalo');
    assert.ok(rounds.length > 0, 'hay burbujas redondas');
    assert.equal(hearts.length, stars.length, 'hay la misma cantidad de corazones y estrellas');
    assert.equal(hearts.length, gifts.length, 'hay la misma cantidad de corazones y regalos');
    assert.equal(hearts.length, rounds.length, 'hay la misma cantidad de cada forma');
    assert.ok([...stars].every(node => node.getAttribute('aria-label').startsWith('Explotar estrella')));
    assert.ok([...gifts].every(node => node.getAttribute('aria-label').startsWith('Explotar regalo')));
    assert.ok([...stars].every(node => node.querySelector('img[src="assets/star-bubble.svg"]')));
    assert.ok([...gifts].every(node => node.querySelector('img[src="assets/gift-bubble.svg"]')));
    assert.ok([...rounds].every(node => node.querySelector('.round-bubble-shape')));
    assert.ok([...stars].every(node => parseFloat(node.style.getPropertyValue('--size')) <= 75), 'las estrellas conservan un tamaño discreto');
    assert.equal([...stars, ...gifts].some(node => node.classList.contains('heart-bubble')), false);
  } finally { page.dom.window.close(); }
});

test('el regalo cae al centro y el preloader libera la página tras el splash', async () => {
  const page = loadPage(undefined, false, undefined, { manualClock: true, styles: true });
  try {
    const preloader = page.document.querySelector('#birthday-preloader');
    assert.equal(preloader.hidden, false);
    assert.ok(preloader.querySelector('.preloader-gift img[src="assets/gift-bubble.svg"]'));
    assert.equal(preloader.querySelectorAll('#preloader-confetti i').length, 18);
    await wait();
    assert.equal(preloader.classList.contains('is-playing'), true);
    page.advance(2350);
    assert.equal(preloader.classList.contains('is-leaving'), true);
    page.advance(450);
    assert.equal(preloader.hidden, true);
    page.screen('welcome');
  } finally { page.dom.window.close(); }
});

test('si el navegador bloquea el inicio automático, el preloader permite tocar para escuchar', async () => {
  const events = { constructed: 0, notes: 0, musicPlays: 0, musicPauses: 0 };
  const page = loadPage(undefined, false, undefined, { manualClock: true, audioEvents: events, blockAutoplay: true });
  try {
    // Simula la política de autoplay antes de la primera interacción.
    const preloader = page.document.querySelector('#birthday-preloader');
    const button = page.document.querySelector('#preloader-start');
    assert.equal(events.musicPlays, 1);
    await wait();
    assert.equal(button.hidden, false);
    assert.equal(preloader.classList.contains('is-playing'), false);
    page.click('#preloader-start');
    await wait();
    assert.equal(events.musicPlays, 2, 'el toque inicia el audio bloqueado');
    assert.equal(preloader.classList.contains('is-playing'), true);
    page.advance(2850);
    assert.equal(preloader.hidden, true);
  } finally { page.dom.window.close(); }
});

test('las burbujas pequeñas se mantienen separadas mientras flotan y rebotan', () => {
  for (const randomSeed of [undefined, 42, 1337]) {
    const page = loadPage(undefined, false, undefined, { manualClock: true, width: 390, height: 844, randomSeed });
    try {
      const checkSeparation = () => {
        const bubbles = [...page.document.querySelectorAll('#bubble-layer .floating-bubble[data-phase="floating"]')].map(node => {
          const [, x, y] = node.style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
          return { x: Number(x), y: Number(y), size: parseFloat(node.style.getPropertyValue('--size')) };
        });
        for (let i = 0; i < bubbles.length; i++) {
          assert.ok(bubbles[i].size <= 60, 'tamaño adecuado para móvil');
          for (let j = i + 1; j < bubbles.length; j++) {
            const a = bubbles[i], b = bubbles[j];
            const distance = Math.hypot(a.x + a.size / 2 - b.x - b.size / 2, a.y + a.size / 2 - b.y - b.size / 2);
            assert.ok(distance >= (a.size + b.size) / 2 + 3, `burbujas ${i} y ${j} mantienen espacio`);
          }
        }
      };
      checkSeparation();
      for (const step of [3000, 4000, 5000, 8000]) { page.advance(step); checkSeparation(); }
      assert.deepEqual(page.errors, []);
    } finally { page.dom.window.close(); }
  }
});

test('las burbujas desaparecen, reaparecen y vuelven a moverse después de cada clic', () => {
  const page = loadPage(undefined, false, undefined, { manualClock: true, width: 1440, height: 900 });
  try {
    const bubbles = [...page.document.querySelectorAll('.heart-bubble')];
    const sizes = bubbles.map(bubble => parseFloat(bubble.style.getPropertyValue('--size')));
    const positions = [...page.document.querySelectorAll('#bubble-layer .floating-bubble')].map(bubble => parseFloat(bubble.style.transform.slice(12)));
    assert.ok(new Set(sizes).size >= 4, 'hay al menos cuatro tamaños');
    assert.ok(Math.max(...sizes) / Math.min(...sizes) > 1.7);
    assert.ok(Math.max(...sizes) <= 70, 'ningún corazón domina el fondo');
    assert.ok(Math.min(...positions) < 144 && Math.max(...positions) > 1152, 'ocupan ambos extremos del ancho');
    for (const bubble of bubbles) {
      if (bubble.dataset.phase !== 'floating') page.advance(2000);
      const size = bubble.style.getPropertyValue('--size');
      bubble.focus();
      bubble.dispatchEvent(new page.window.Event('pointerenter'));
      bubble.click();
      assert.equal(bubble.dataset.phase, 'popping');
      assert.notEqual(page.document.activeElement, bubble, 'explotar libera el foco que congelaba la burbuja');
      page.advance(400);
      assert.equal(bubble.hidden, true, 'desaparece tras su explosión');
      page.advance(1150);
      assert.equal(bubble.hidden, false);
      assert.equal(bubble.disabled, false);
      assert.equal(bubble.dataset.phase, 'floating');
      assert.ok(Number(bubble.dataset.generation) > 0);
      assert.notEqual(bubble.style.getPropertyValue('--size'), size);
      const position = bubble.style.transform;
      page.advance(100);
      assert.notEqual(bubble.style.transform, position, 'la burbuja reaparecida se mueve aunque el cursor permanezca encima');
    }
    assert.deepEqual(page.errors, []);
  } finally { page.dom.window.close(); }
});

test('las explosiones automáticas son escalonadas y continúan también en una pantalla móvil', () => {
  const page = loadPage(undefined, false, undefined, { manualClock: true, width: 390, height: 844 });
  try {
    const bubbles = [...page.document.querySelectorAll('.heart-bubble')];
    assert.equal(bubbles.length, 3);
    page.advance(8800);
    assert.equal(bubbles[0].dataset.phase, 'popping');
    assert.equal(bubbles[1].dataset.phase, 'floating', 'no explotan todas juntas');
    assert.ok(page.document.querySelector('.pop-confetti'));
    page.advance(400);
    assert.equal(bubbles[0].hidden, true);
    page.advance(1000);
    assert.equal(bubbles[0].dataset.generation, '1');
    assert.equal(bubbles[0].hidden, false);
    const position = bubbles[0].style.transform;
    page.advance(100);
    assert.notEqual(bubbles[0].style.transform, position);
    page.advance(22000);
    assert.ok(bubbles.every(bubble => Number(bubble.dataset.generation) >= 2), 'todas completan varias vidas');
    for (const bubble of bubbles) {
      const [x, y] = bubble.style.transform.match(/[\d.]+px/g).map(parseFloat);
      const size = parseFloat(bubble.style.getPropertyValue('--size'));
      assert.ok(x >= 4 && x + size <= 386);
      assert.ok(y >= 4 && y + size <= 840);
    }
    assert.deepEqual(page.errors, []);
  } finally { page.dom.window.close(); }
});

test('la mascota camina entre etapas y cambia sus gestos dentro del reto', () => {
  const page = loadPage(undefined, false, undefined, { manualClock: true });
  try {
    const mascot = page.document.querySelector('#mascot-companion');
    const pose = gesture => assert.equal(mascot.dataset.gesture, gesture);
    page.advance(1500); pose('wave');
    const start = mascot.style.getPropertyValue('--mascot-x');
    page.click('#start-button'); pose('walk');
    assert.notEqual(mascot.style.getPropertyValue('--mascot-x'), start);
    page.advance(1500); pose('point');
    page.click('[data-open="0"]');
    assert.equal(mascot.parentElement.id, 'dialog-mascot-slot');
    page.document.querySelector('.heart-tile[aria-label^="Estrella"]').click(); pose('think');
    page.click('#hint-button'); pose('point');
    for (const heart of page.document.querySelectorAll('.heart-tile[aria-label^="Corazón"]')) heart.click();
    page.advance(1000); pose('cheer');
    page.click('.win-state button');
    assert.equal(mascot.parentElement.id, 'mascot-dock');
    page.advance(1500); pose('cheer');
    page.click('#home-button'); page.advance(1500); pose('wave');
    assert.equal(mascot.style.getPropertyValue('--mascot-x'), start);
    assert.deepEqual(page.errors, []);
  } finally { page.dom.window.close(); }
});
