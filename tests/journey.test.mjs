import test from 'node:test';
import assert from 'node:assert/strict';
import '../core.js';
const { createJourney, createExperience, normalize, shuffle } = globalThis.BirthdayEngine;

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
  assert.deepEqual([...result].sort((a, b) => a - b), input);
  assert.deepEqual(input, [1, 1, 2, 2, 3, 3, 4, 4]);
});

test('la bienvenida lleva al primer reto y el recuerdo se abre antes de continuar', () => {
  const game = createJourney();
  const flow = createExperience(game);
  assert.equal(flow.screen(), 'welcome');
  assert.equal(flow.openMemory(), false);
  assert.equal(flow.continueJourney(), false);
  assert.equal(flow.openSurprise(), false);
  flow.begin();
  assert.equal(flow.screen(), 'challenge');
  game.start(0);
  for (const heart of [0, 3, 5, 8, 10]) game.act('heart', heart);
  game.complete();
  assert.equal(flow.screen(), 'reward');
  assert.equal(flow.continueJourney(), false, 'no se puede saltar el recuerdo cerrado');
  assert.equal(flow.openSurprise(), false);
  assert.equal(flow.openMemory(), true);
  assert.equal(flow.screen(), 'reward', 'abrir no cambia de pantalla automáticamente');
  assert.equal(flow.continueJourney(), true);
  assert.equal(flow.screen(), 'challenge');
  assert.equal(game.snapshot().completed, 1);
});

test('recargar conserva el recuerdo pendiente, abierto o ya leído', () => {
  let game = createJourney();
  let flow = createExperience(game);
  flow.begin(); game.start(0);
  for (const heart of [0, 3, 5, 8, 10]) game.act('heart', heart);
  game.complete();
  const reload = () => {
    const saved = JSON.parse(JSON.stringify({ ...game.snapshot(), experience: flow.snapshot() }));
    game = createJourney(saved);
    flow = createExperience(game, saved.experience);
  };
  reload();
  assert.equal(flow.screen(), 'reward');
  assert.equal(flow.snapshot().memoriesOpened, 0);
  flow.openMemory(); reload();
  assert.equal(flow.screen(), 'reward');
  assert.equal(flow.snapshot().memoriesOpened, 1);
  flow.continueJourney(); reload();
  assert.equal(flow.screen(), 'challenge');
  assert.equal(flow.snapshot().memoriesSeen, 1);
});

test('el último recuerdo desbloquea el álbum y el álbum da paso al regalo', () => {
  const game = createJourney({ completed: 3 });
  const flow = createExperience(game);
  game.start(3);
  for (const word of [0, 1, 2, 3]) game.act('word', word);
  game.complete();
  assert.equal(flow.screen(), 'reward');
  assert.equal(flow.openSurprise(), false);
  flow.openMemory(); flow.continueJourney();
  assert.equal(flow.screen(), 'album');
  assert.equal(flow.openSurprise(), true);
  assert.equal(flow.screen(), 'surprise');
  assert.equal(game.reveal(), true);
  const restored = createJourney(game.snapshot());
  assert.equal(createExperience(restored, flow.snapshot()).screen(), 'surprise');
  assert.equal(restored.snapshot().revealed, true);
});

test('el progreso anterior se conserva y los valores nuevos inválidos no abren etapas', () => {
  const legacy = createJourney({ completed: 2 });
  assert.equal(createExperience(legacy).screen(), 'challenge');
  assert.equal(createExperience(legacy).snapshot().memoriesSeen, 2);
  for (const invalid of [-1, 99, '4', 1.5, null]) {
    const game = createJourney();
    const flow = createExperience(game, { memoriesOpened: invalid, memoriesSeen: invalid, albumSeen: true });
    assert.equal(flow.screen(), 'welcome');
    flow.begin();
    assert.equal(flow.screen(), 'challenge');
    assert.equal(flow.snapshot().memoriesOpened, 0);
    assert.equal(flow.openSurprise(), false);
  }
});
