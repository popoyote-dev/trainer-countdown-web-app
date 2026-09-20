const generateId = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function createCounter({
    id = generateId(),
    name = 'Contador',
    seconds = 30,
    sound = '',
    soundUrl = '',
    startSound = '',
    startSoundUrl = '',
} = {}) {
    return {
        id,
        name: String(name || 'Contador').trim() || 'Contador',
        seconds: Number(seconds) > 0 ? Number(seconds) : 30,
        sound: String(sound || '').trim(),
        soundUrl: String(soundUrl || '').trim(),
        startSound: String(startSound || '').trim(),
        startSoundUrl: String(startSoundUrl || '').trim(),
    };
}

export function createEmptyCycle() {
    return {
        id: generateId(),
        name: 'Nuevo ciclo',
        repetitions: 1,
        startSound: '',
        startSoundUrl: '',
        finalSound: '',
        finalSoundUrl: '',
        counters: [createCounter({ name: 'Contador 1', seconds: 30 })],
    };
}

export function validateCycle(cycle) {
    const errors = [];

    if (!cycle || typeof cycle !== 'object') {
        return { isValid: false, errors: ['El ciclo no es válido.'] };
    }

    const name = String(cycle.name ?? '').trim();
    const repetitions = Number(cycle.repetitions ?? 0);

    if (!name) {
        errors.push('El nombre del ciclo es obligatorio.');
    }

    if (!Number.isInteger(repetitions) || repetitions <= 0) {
        errors.push('Las repeticiones deben ser un número entero mayor a 0.');
    }

    if (!Array.isArray(cycle.counters) || cycle.counters.length === 0) {
        errors.push('Debes agregar al menos un contador.');
    }

    if (Array.isArray(cycle.counters)) {
        cycle.counters.forEach((counter, index) => {
            const counterName = String(counter?.name ?? '').trim();
            const seconds = Number(counter?.seconds ?? 0);

            if (!counterName) {
                errors.push(`El nombre del contador ${index + 1} es obligatorio.`);
            }

            if (!Number.isFinite(seconds) || seconds <= 0) {
                errors.push(`El tiempo del contador ${index + 1} debe ser mayor a 0.`);
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

export function getCycleDurationSeconds(cycle) {
    if (!cycle || !Array.isArray(cycle.counters)) {
        return 0;
    }

    const cycleSeconds = cycle.counters.reduce((total, counter) => {
        const seconds = Number(counter?.seconds ?? 0);
        return total + (Number.isFinite(seconds) ? seconds : 0);
    }, 0);

    const repetitions = Number(cycle.repetitions ?? 1);
    return cycleSeconds * (Number.isFinite(repetitions) && repetitions > 0 ? repetitions : 1);
}

export function duplicateCycle(cycle) {
    const cloned = JSON.parse(JSON.stringify(cycle || createEmptyCycle()));

    return {
        ...cloned,
        id: generateId(),
        name: `${String(cloned.name || 'Ciclo').trim() || 'Ciclo'} (copia)`,
        counters: (cloned.counters || []).map((counter) => ({
            ...counter,
            id: generateId(),
        })),
    };
}
