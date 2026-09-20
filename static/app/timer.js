export function createCycleRunner(cycle, listeners = {}) {
    const counters = Array.isArray(cycle?.counters) ? cycle.counters : [];
    const totalRepetitions = Number(cycle?.repetitions ?? 1) || 1;
    const END_SOUND_LEAD_SECONDS = 3;

    let currentRepeat = 1;
    let currentCounterIndex = 0;
    let remainingSeconds = counters.length > 0 ? Number(counters[0].seconds ?? 0) : 0;
    let intervalId = null;
    let isRunning = false;
    let isPaused = false;
    let isFinished = false;
    let endSoundPlayed = false;

    const notify = (type, extra = {}) => {
        const snapshot = {
            cycleId: cycle?.id,
            type,
            currentRepeat,
            currentCounterIndex,
            remainingSeconds,
            totalRepetitions,
            totalCounters: counters.length,
            currentCounter: counters[currentCounterIndex] ?? null,
            isRunning,
            isPaused,
            isFinished,
            ...extra,
        };

        if (typeof listeners.onTick === 'function' && type === 'tick') {
            listeners.onTick(snapshot);
        }

        if (typeof listeners.onStatus === 'function' && type === 'status') {
            listeners.onStatus(snapshot);
        }

        if (typeof listeners.onCounterFinish === 'function' && type === 'counter-finish') {
            listeners.onCounterFinish(snapshot);
        }

        if (typeof listeners.onCycleRepeat === 'function' && type === 'repeat') {
            listeners.onCycleRepeat(snapshot);
        }

        if (typeof listeners.onComplete === 'function' && type === 'complete') {
            listeners.onComplete(snapshot);
        }

        if (typeof listeners.onCycleStart === 'function' && type === 'cycle-start') {
            listeners.onCycleStart(snapshot);
        }
    };

    const stopInterval = () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };

    const getCurrentCounter = () => counters[currentCounterIndex] ?? null;

    const updateStatus = () => {
        notify('status', {
            currentCounter: getCurrentCounter(),
        });
    };

    // Dispara el sonido de término del contador o del ciclo unos segundos antes de llegar a cero.
    const maybeTriggerEndSound = () => {
        if (endSoundPlayed || remainingSeconds > END_SOUND_LEAD_SECONDS) {
            return;
        }

        endSoundPlayed = true;

        const isLastCounterOfCycle = currentCounterIndex === counters.length - 1 && currentRepeat === totalRepetitions;

        if (isLastCounterOfCycle) {
            if (typeof listeners.onPlayFinalSound === 'function') {
                listeners.onPlayFinalSound(getCurrentCounter());
            }
            return;
        }

        if (typeof listeners.onPlayCounterSound === 'function') {
            listeners.onPlayCounterSound(getCurrentCounter());
        }
    };

    const finishCounter = () => {
        if (currentCounterIndex < counters.length - 1) {
            currentCounterIndex += 1;
            remainingSeconds = Number(counters[currentCounterIndex]?.seconds ?? 0);
            endSoundPlayed = false;
            notify('counter-finish', { currentCounter: getCurrentCounter() });
            maybeTriggerEndSound();

            if (typeof listeners.onPlayCounterStartSound === 'function') {
                listeners.onPlayCounterStartSound(getCurrentCounter());
            }

            return;
        }

        if (currentRepeat < totalRepetitions) {
            currentRepeat += 1;
            currentCounterIndex = 0;
            remainingSeconds = Number(counters[0]?.seconds ?? 0);
            endSoundPlayed = false;
            notify('repeat', { currentCounter: getCurrentCounter() });
            maybeTriggerEndSound();

            if (typeof listeners.onPlayCounterStartSound === 'function') {
                listeners.onPlayCounterStartSound(getCurrentCounter());
            }

            return;
        }

        isRunning = false;
        isPaused = false;
        isFinished = true;
        stopInterval();
        notify('complete', { currentCounter: getCurrentCounter() });
    };

    const runTick = () => {
        if (!isRunning || isPaused || !counters.length) {
            return;
        }

        remainingSeconds -= 1;
        maybeTriggerEndSound();

        if (remainingSeconds <= 0) {
            finishCounter();
            return;
        }

        notify('tick', { currentCounter: getCurrentCounter() });
    };

    return {
        start() {
            if (!counters.length) {
                return this;
            }

            const isFreshStart = !isRunning && !isPaused;

            if (isFinished) {
                currentRepeat = 1;
                currentCounterIndex = 0;
                remainingSeconds = Number(counters[0]?.seconds ?? 0);
                isFinished = false;
            }

            isRunning = true;
            isPaused = false;
            stopInterval();
            intervalId = setInterval(runTick, 1000);
            updateStatus();

            if (isFreshStart) {
                endSoundPlayed = false;
                notify('cycle-start', { currentCounter: getCurrentCounter() });

                if (typeof listeners.onPlayCounterStartSound === 'function') {
                    listeners.onPlayCounterStartSound(getCurrentCounter());
                }

                maybeTriggerEndSound();
            }

            return this;
        },

        pause() {
            if (!isRunning) {
                return this;
            }

            isPaused = true;
            isRunning = false;
            stopInterval();
            updateStatus();
            return this;
        },

        resume() {
            if (!counters.length || isFinished) {
                return this;
            }

            isRunning = true;
            isPaused = false;
            stopInterval();
            intervalId = setInterval(runTick, 1000);
            updateStatus();
            return this;
        },

        restart() {
            stopInterval();
            currentRepeat = 1;
            currentCounterIndex = 0;
            remainingSeconds = Number(counters[0]?.seconds ?? 0);
            isRunning = false;
            isPaused = false;
            isFinished = false;
            endSoundPlayed = false;
            updateStatus();
            return this;
        },

        stop() {
            stopInterval();
            isRunning = false;
            isPaused = false;
            isFinished = false;
            updateStatus();
            return this;
        },

        getSnapshot() {
            return {
                cycleId: cycle?.id,
                currentRepeat,
                currentCounterIndex,
                remainingSeconds,
                totalRepetitions,
                totalCounters: counters.length,
                currentCounter: getCurrentCounter(),
                isRunning,
                isPaused,
                isFinished,
            };
        },

        getCycleId() {
            return cycle?.id;
        },
    };
}
