import assert from 'node:assert/strict';
import test from 'node:test';

import { createSoundPreviewHandler } from '../audio.js';
import { createEmptyCycle, getCycleDurationSeconds, validateCycle } from '../cycleManager.js';

test('createEmptyCycle builds a valid default cycle', () => {
    const cycle = createEmptyCycle();

    assert.equal(cycle.name, 'Nuevo ciclo');
    assert.equal(cycle.repetitions, 1);
    assert.ok(Array.isArray(cycle.counters));
    assert.equal(cycle.counters.length, 1);
    assert.equal(cycle.counters[0].name, 'Contador 1');
});

test('validateCycle rejects empty names and invalid repetitions', () => {
    const invalid = {
        name: '',
        repetitions: 0,
        counters: [{ name: 'Descanso', seconds: 0 }],
    };

    const result = validateCycle(invalid);

    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((item) => item.includes('nombre')));
    assert.ok(result.errors.some((item) => item.includes('repeticiones')));
});

test('getCycleDurationSeconds sums all counter seconds correctly', () => {
    const cycle = {
        repetitions: 2,
        counters: [
            { seconds: 10 },
            { seconds: 25 },
            { seconds: 5 },
        ],
    };

    assert.equal(getCycleDurationSeconds(cycle), 80);
});

test('createSoundPreviewHandler plays a selected sound URL and ignores empty values', async () => {
    let lastConfig = null;

    const handler = createSoundPreviewHandler((config) => {
        lastConfig = config;
        return true;
    });

    const firstResult = await handler({ target: { value: './static/sounds/assets/beep-alarm.mp3' } });
    assert.equal(firstResult, true);
    assert.deepEqual(lastConfig, { url: './static/sounds/assets/beep-alarm.mp3' });

    const secondResult = await handler({ target: { value: '' } });
    assert.equal(secondResult, false);
    assert.deepEqual(lastConfig, { url: './static/sounds/assets/beep-alarm.mp3' });
});
