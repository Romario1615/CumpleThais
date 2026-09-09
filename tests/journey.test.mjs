import test from 'node:test';
import assert from 'node:assert/strict';
import '../core.js';
const { createJourney, normalize, shuffle } = globalThis.BirthdayEngine;

test('las etapas y la sorpresa solo se abren en orden', () => {
  const game = createJourney();
  for (const step of [-1, 1, 2, 3, 4, NaN, '0']) assert.equal(game.start(step).ok, false);
  assert.equal(game.reveal(), false);
  assert.equal(game.complete(), false);
  game.start(0);
  assert.equal(game.act('riddle', 'cumpleaños').ok, false);
  assert.equal(game.act('heart', 1).hit, false);
  for (const heart of [0, 0, 3, 5, 8]) game.act('heart', heart);
  assert.equal(game.complete(), false, 'un corazón repetido no suma');
  assert.equal(game.act('heart', 10).solved, true);
  assert.equal(game.complete(), true);
  assert.equal(game.complete(), false, 'no se puede completar dos veces');
  assert.equal(game.snapshot().completed, 1);
  assert.equal(game.start(2).ok, false);
});

test('la memoria exige cuatro parejas y bloquea un tercer giro durante una discrepancia', () => {
  const game = createJourney({ completed: 1 }); game.start(1);
  const seen = new Map(); let pending = null;
  // Explora las ocho cartas por parejas, como lo haría una persona.
  for (let i = 0; i < 8; i++) {
    const result = game.act('memory', i); assert.equal(result.ok, true);
    const indexes = seen.get(result.symbol) || []; indexes.push(i); seen.set(result.symbol, indexes);
    if (pending === null) {
      pending = i;
      assert.equal(game.act('memory', i).ok, false, 'una carta no hace pareja consigo misma');
    } else {
      if (result.mismatch) {
        assert.equal(game.act('memory', (i + 1) % 8).ok, false);
        assert.equal(game.complete(), false);
        assert.equal(game.settleMemory(), true);
      }
      pending = null;
    }
  }
  for (const indexes of seen.values()) {
    const first = game.act('memory', indexes[0]);
    if (first.ok) game.act('memory', indexes[1]);
  }
  assert.equal(game.complete(), true);
  assert.equal(game.snapshot().completed, 2);
});

test('la respuesta tolera tildes, mayúsculas y espacios y permite reintentar', () => {
  const game = createJourney({ completed: 2 }); game.start(2);
  assert.equal(game.act('riddle', 'navidad').solved, false);
  assert.equal(game.act('riddle', null).ok, false);
  assert.equal(game.complete(), false);
  assert.equal(game.act('riddle', ' ¡Mi CUMPLEAÑOS! ').solved, true);
  assert.equal(game.complete(), true);
  assert.equal(normalize('  CUMPLEAÑOS '), 'cumpleanos');
});

test('la frase incorrecta se reinicia y la correcta desbloquea el regalo', () => {
  const game = createJourney({ completed: 3 }); game.start(3);
  assert.equal(game.reveal(), false);
  assert.equal(game.act('word', 1).correct, false);
  game.act('word', 0);
  assert.equal(game.act('word', 0).ok, false);
  assert.equal(game.act('word', 2).correct, false);
  for (const i of [0, 1, 2]) assert.equal(game.act('word', i).solved, false);
  assert.equal(game.act('word', 3).solved, true);
  assert.equal(game.complete(), true);
  assert.equal(game.reveal(), true);
  assert.deepEqual(game.snapshot(), { completed: 4, revealed: true });
});

test('el progreso guardado se valida y pausar cancela el intento incompleto', () => {
  for (const saved of [null, {}, { completed: -1 }, { completed: 8 }, { completed: '4' }, { completed: 1.5 }]) assert.equal(createJourney(saved).snapshot().completed, 0);
  assert.equal(createJourney({ completed: 2, revealed: true }).snapshot().revealed, false);
  assert.equal(createJourney({ completed: 4, revealed: true }).snapshot().revealed, true);
  const game = createJourney({ completed: 1 });
  assert.equal(game.start(0).alreadyComplete, true);
  game.start(1); game.cancel();
  assert.equal(game.act('memory', 0).ok, false);
  assert.equal(game.snapshot().completed, 1);
});

test('barajar conserva exactamente las parejas sin modificar el original', () => {
  const input = [1, 1, 2, 2, 3, 3, 4, 4];
  const result = shuffle(input, () => .37);
  assert.notDeepEqual(result, input);
  assert.deepEqual([...result].sort(), input);
  assert.deepEqual(input, [1, 1, 2, 2, 3, 3, 4, 4]);
});
