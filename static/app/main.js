import { AVAILABLE_SOUNDS, createSoundPreviewHandler, playSoundConfig } from './audio.js';
import { createCounter, createEmptyCycle, duplicateCycle, getCycleDurationSeconds, validateCycle } from './cycleManager.js';
import { deleteCycleById, readCycles, saveCycles } from './storage.js';
import { createCycleRunner } from './timer.js';

const cycleListElement = document.querySelector('#cycle-list');
const cycleEditorElement = document.querySelector('.cycle-editor');
const cancelEditButton = document.querySelector('#cancel-edit-btn');
const cycleNameInput = document.querySelector('#cycle-name');
const cycleRepetitionsInput = document.querySelector('#cycle-repetitions');
const finalSoundInput = document.querySelector('#final-sound-url');
const startSoundInput = document.querySelector('#start-sound-url');
const counterListElement = document.querySelector('#counter-list');
const formElement = document.querySelector('#cycle-form');
const addCounterButton = document.querySelector('#add-counter-btn');
const newCycleButton = document.querySelector('#new-cycle-btn');
const duplicateCycleButton = document.querySelector('#duplicate-cycle-btn');
const deleteCycleButton = document.querySelector('#delete-cycle-btn');
const shareCycleButton = document.querySelector('#share-cycle-btn');
const shareQrModal = document.querySelector('#share-qr-modal');
const shareQrCloseButton = document.querySelector('#share-qr-close-btn');
const shareQrCanvas = document.querySelector('#share-qr-canvas');
const scanQrButton = document.querySelector('#scan-qr-btn');
const scanQrModal = document.querySelector('#scan-qr-modal');
const scanQrCloseButton = document.querySelector('#scan-qr-close-btn');
const scanQrVideo = document.querySelector('#scan-qr-video');
const scanQrCanvas = document.querySelector('#scan-qr-canvas');
const scanQrHint = document.querySelector('#scan-qr-hint');
const activeTimersListElement = document.querySelector('#active-timers-list');
const activeTimersEmptyElement = document.querySelector('#active-timers-empty');
const sidebarElement = document.querySelector('.sidebar');
const sidebarToggleButton = document.querySelector('#sidebar-toggle-btn');
const sidebarBackdrop = document.querySelector('#sidebar-backdrop');

const previewSelectedSound = createSoundPreviewHandler(playSoundConfig);

const bindSoundPreview = (select) => {
    if (!select) {
        return;
    }

    select.addEventListener('change', previewSelectedSound);
};

const createSoundSelect = ({ className, value, label }) => {
    const select = document.createElement('select');
    select.className = className;
    select.setAttribute('aria-label', label);
    bindSoundPreview(select);

    const availableValues = new Set(AVAILABLE_SOUNDS.map((sound) => sound.value));
    const options = [...AVAILABLE_SOUNDS];

    if (value && !availableValues.has(value)) {
        options.push({ label: 'Sonido guardado', value });
    }

    select.innerHTML = options.map((sound) => `
            <option value="${sound.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${sound.label}</option>
        `).join('');
    select.value = value || '';

    return select;
};

const state = {
    cycles: [],
    selectedCycleId: null,
    isEditing: false,
    activeCycleIds: [],
    timers: new Map(),
};

const persistCycles = () => {
    saveCycles(state.cycles).catch((error) => console.error('No se pudo guardar el ciclo.', error));
};

const formatTime = (seconds) => {
    const safeSeconds = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

// h:m:s descartando las unidades de mayor orden que sean 0 (ej. 90 -> "1m 30s", 45 -> "45s")
const formatDurationSummary = (seconds) => {
    const safeSeconds = Number.isFinite(Number(seconds)) ? Math.max(0, Math.floor(Number(seconds))) : 0;
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${String(secs).padStart(2, '0')}s`;
    }

    return `${secs}s`;
};

const ensureSelectedCycle = () => {
    if (!state.cycles.length) {
        const newCycle = createEmptyCycle();
        state.cycles.push(newCycle);
        state.selectedCycleId = newCycle.id;
        persistCycles();
        return newCycle;
    }

    const selectedCycle = state.cycles.find((cycle) => cycle.id === state.selectedCycleId) || state.cycles[0];
    state.selectedCycleId = selectedCycle.id;
    return selectedCycle;
};

const getSelectedCycle = () => state.cycles.find((cycle) => cycle.id === state.selectedCycleId) || state.cycles[0] || null;

const activateCycle = (cycleId) => {
    if (!state.activeCycleIds.includes(cycleId)) {
        state.activeCycleIds.unshift(cycleId);
    }

    render();
};

const deactivateCycle = (cycleId) => {
    state.activeCycleIds = state.activeCycleIds.filter((id) => id !== cycleId);
    const timer = state.timers.get(cycleId);
    if (timer) {
        timer.pause?.();
        state.timers.delete(cycleId);
    }

    render();
};

const setEditingMode = (isEditing) => {
    state.isEditing = isEditing;
    render();
};

const updateEditorVisibility = () => {
    cycleEditorElement.hidden = !state.isEditing;
};

const renderCycleList = () => {
    cycleListElement.innerHTML = '';

    state.cycles.forEach((cycle) => {
        const isActive = state.activeCycleIds.includes(cycle.id);
        const item = document.createElement('div');
        item.className = `cycle-item ${cycle.id === state.selectedCycleId ? 'selected' : ''} ${isActive ? 'is-active' : ''}`;
        item.dataset.id = cycle.id;
        item.innerHTML = `
      <span class="cycle-name">${cycle.name || 'Sin nombre'}</span>
      <span class="cycle-meta">${cycle.repetitions}x · ${formatDurationSummary(getCycleDurationSeconds(cycle))}</span>
      <div class="cycle-item-actions">
        <button type="button" class="cycle-activate-btn icon-btn secondary-btn" ${isActive ? 'disabled' : ''} title="${isActive ? 'Ciclo activo' : 'Activar ciclo'}" aria-label="${isActive ? 'Ciclo activo' : 'Activar ciclo'}">
          <img src="static/img/${isActive ? 'toggle-on-svgrepo-com.svg' : 'toggle-off-svgrepo-com.svg'}" alt="" />
        </button>
        <button type="button" class="cycle-edit-btn icon-btn ghost-btn" title="Editar ciclo" aria-label="Editar ciclo">
          <img src="static/img/edit-svgrepo-com.svg" alt="" />
        </button>
      </div>
    `;

        item.querySelector('.cycle-activate-btn').addEventListener('click', () => {
            activateCycle(cycle.id);
        });

        item.querySelector('.cycle-edit-btn').addEventListener('click', () => {
            state.selectedCycleId = cycle.id;
            setEditingMode(true);
            cycleNameInput.focus();
        });

        cycleListElement.appendChild(item);
    });
};

const createCounterCard = (counter, index) => {
    const card = document.createElement('div');
    card.className = 'counter-card';
    card.dataset.counterId = counter.id || `counter-${Date.now()}-${index}`;

    card.innerHTML = `
    <div class="counter-header">
      <span>Contador ${index + 1}</span>
      <button type="button" class="remove-counter-btn icon-btn danger-link" title="Eliminar contador" aria-label="Eliminar contador">
        <img src="static/img/trash-2-svgrepo-com.svg" alt="" />
      </button>
    </div>
    <label>
      Nombre
      <input type="text" class="counter-name" value="${(counter.name || '').replace(/"/g, '&quot;')}" />
        </label>
        <div class="counter-fields">
            <label>
                Segundos
                <input type="number" min="1" class="counter-seconds" value="${Number(counter.seconds || 0)}" />
            </label>
            <label class="counter-sound-field">
                Sonido
            </label>
            <label class="counter-start-sound-field">
                Sonido de inicio
            </label>
    </div>
  `;

    card.querySelector('.counter-sound-field').appendChild(createSoundSelect({
        className: 'counter-sound',
        value: counter.soundUrl || counter.sound || '',
        label: `Sonido del contador ${index + 1}`,
    }));

    card.querySelector('.counter-start-sound-field').appendChild(createSoundSelect({
        className: 'counter-start-sound',
        value: counter.startSoundUrl || counter.startSound || '',
        label: `Sonido de inicio del contador ${index + 1}`,
    }));

    card.querySelector('.remove-counter-btn').addEventListener('click', () => {
        if (counterListElement.querySelectorAll('.counter-card').length <= 1) {
            window.alert('Debe haber al menos un contador en el ciclo.');
            return;
        }

        card.remove();
    });

    return card;
};

const renderCycleForm = () => {
    const cycle = getSelectedCycle();

    if (!cycle) {
        return;
    }

    cycleNameInput.value = cycle.name || '';
    cycleRepetitionsInput.value = cycle.repetitions || 1;
    const startSoundSelect = createSoundSelect({
        className: 'start-sound',
        value: cycle.startSoundUrl || cycle.startSound || '',
        label: 'Sonido de inicio',
    });
    startSoundInput.innerHTML = startSoundSelect.innerHTML;
    startSoundInput.value = startSoundSelect.value;
    bindSoundPreview(startSoundInput);
    const finalSoundSelect = createSoundSelect({
        className: 'final-sound',
        value: cycle.finalSoundUrl || cycle.finalSound || '',
        label: 'Sonido final',
    });
    finalSoundInput.innerHTML = finalSoundSelect.innerHTML;
    finalSoundInput.value = finalSoundSelect.value;
    bindSoundPreview(finalSoundInput);
    counterListElement.innerHTML = '';

    if (!cycle.counters || cycle.counters.length === 0) {
        const defaultCounter = createCounter({ name: 'Contador 1', seconds: 30 });
        cycle.counters = [defaultCounter];
    }

    cycle.counters.forEach((counter, index) => {
        counterListElement.appendChild(createCounterCard(counter, index));
    });
};

const statusTextMap = {
    ready: 'Listo',
    running: 'En ejecución',
    paused: 'Pausado',
    complete: 'Ciclo finalizado',
};

const getStatusText = (snapshot) => {
    if (!snapshot) {
        return statusTextMap.ready;
    }

    if (snapshot.isFinished) {
        return statusTextMap.complete;
    }

    if (snapshot.isPaused) {
        return statusTextMap.paused;
    }

    if (snapshot.isRunning) {
        return statusTextMap.running;
    }

    return statusTextMap.ready;
};

const getToggleButtonLabel = (snapshot) => {
    if (snapshot?.isRunning) {
        return 'Pausar';
    }

    if (snapshot?.isPaused) {
        return 'Reanudar';
    }

    return 'Iniciar';
};

const toggleButtonIconMap = {
    Pausar: 'pause-svgrepo-com.svg',
    Reanudar: 'next-svgrepo-com.svg',
    Iniciar: 'play-2-svgrepo-com.svg',
};

const updateTimerCard = (cycleId, snapshot) => {
    const card = activeTimersListElement.querySelector(`.timer-card[data-cycle-id="${cycleId}"]`);
    if (!card) {
        return;
    }

    const cycle = state.cycles.find((item) => item.id === cycleId);
    const currentCounter = snapshot?.currentCounter || cycle?.counters?.[0] || null;
    const remaining = snapshot ? snapshot.remainingSeconds : Number(currentCounter?.seconds || 0);

    card.querySelector('.timer-card-display').textContent = formatTime(remaining);
    card.querySelector('.timer-card-counter-name').textContent = currentCounter?.name || 'Contador';
    card.querySelector('.timer-card-status').textContent = getStatusText(snapshot);

    const toggleLabel = getToggleButtonLabel(snapshot);
    const toggleButton = card.querySelector('.timer-card-toggle');
    toggleButton.title = toggleLabel;
    toggleButton.setAttribute('aria-label', toggleLabel);
    toggleButton.querySelector('img').src = `static/img/${toggleButtonIconMap[toggleLabel]}`;
};

const createTimerListeners = (cycleId) => ({
    onTick: (snapshot) => updateTimerCard(cycleId, snapshot),
    onStatus: (snapshot) => updateTimerCard(cycleId, snapshot),
    onCounterFinish: (snapshot) => {
        updateTimerCard(cycleId, snapshot);
    },
    onCycleRepeat: (snapshot) => updateTimerCard(cycleId, snapshot),
    onComplete: (snapshot) => {
        updateTimerCard(cycleId, snapshot);
    },
    onCycleStart: async (snapshot) => {
        updateTimerCard(cycleId, snapshot);
        await triggerCycleStartSound(cycleId);
    },
    onPlayCounterSound: async (counter) => {
        await triggerCounterSound(counter);
    },
    onPlayFinalSound: async () => {
        await triggerFinalSound(cycleId);
    },
    onPlayCounterStartSound: async (counter) => {
        await triggerCounterStartSound(counter);
    },
});

const getOrCreateTimer = (cycleId) => {
    let timer = state.timers.get(cycleId);

    if (!timer) {
        const cycle = state.cycles.find((item) => item.id === cycleId);
        if (!cycle) {
            return null;
        }

        timer = createCycleRunner(cycle, createTimerListeners(cycleId));
        state.timers.set(cycleId, timer);
    }

    return timer;
};

const toggleCycleTimer = (cycleId) => {
    const timer = getOrCreateTimer(cycleId);
    if (!timer) {
        return;
    }

    const snapshot = timer.getSnapshot();

    if (snapshot.isRunning) {
        timer.pause();
    } else if (snapshot.isPaused) {
        timer.resume();
    } else {
        timer.start();
    }

    updateTimerCard(cycleId, timer.getSnapshot());
};

const restartCycleTimer = (cycleId) => {
    const timer = getOrCreateTimer(cycleId);
    if (!timer) {
        return;
    }

    timer.restart();
    updateTimerCard(cycleId, timer.getSnapshot());
};

const createTimerCard = (cycle) => {
    const card = document.createElement('div');
    card.className = 'timer-card';
    card.dataset.cycleId = cycle.id;
    card.innerHTML = `
      <div class="timer-card-header">
        <span class="timer-card-name">${cycle.name || 'Ciclo sin nombre'}</span>
        <span class="timer-card-status">Listo</span>
      </div>
      <div class="timer-card-display">00:00</div>
      <div class="timer-card-current">
        <span>Actual</span>
        <strong class="timer-card-counter-name">Contador</strong>
      </div>
      <div class="timer-card-controls">
        <button type="button" class="timer-card-toggle icon-btn primary-btn" title="Iniciar" aria-label="Iniciar">
          <img src="static/img/play-2-svgrepo-com.svg" alt="" />
        </button>
        <button type="button" class="timer-card-restart icon-btn ghost-btn" title="Reiniciar" aria-label="Reiniciar">
          <img src="static/img/reload-svgrepo-com.svg" alt="" />
        </button>
        <button type="button" class="timer-card-remove icon-btn danger-link" title="Quitar" aria-label="Quitar">
          <img src="static/img/logout-svgrepo-com.svg" alt="" />
        </button>
      </div>
    `;

    card.querySelector('.timer-card-toggle').addEventListener('click', () => toggleCycleTimer(cycle.id));
    card.querySelector('.timer-card-restart').addEventListener('click', () => restartCycleTimer(cycle.id));
    card.querySelector('.timer-card-remove').addEventListener('click', () => deactivateCycle(cycle.id));

    return card;
};

const renderActiveTimers = () => {
    activeTimersListElement.innerHTML = '';

    if (!state.activeCycleIds.length) {
        activeTimersListElement.appendChild(activeTimersEmptyElement);
        return;
    }

    state.activeCycleIds.forEach((cycleId) => {
        const cycle = state.cycles.find((item) => item.id === cycleId);
        if (!cycle) {
            return;
        }

        activeTimersListElement.appendChild(createTimerCard(cycle));
        updateTimerCard(cycleId, state.timers.get(cycleId)?.getSnapshot?.() || null);
    });
};

const buildCycleFromForm = () => {
    const cycle = getSelectedCycle() || createEmptyCycle();

    const cards = Array.from(counterListElement.querySelectorAll('.counter-card'));

    cycle.name = cycleNameInput.value.trim() || 'Nuevo ciclo';
    cycle.repetitions = Number(cycleRepetitionsInput.value) || 1;
    cycle.startSoundUrl = startSoundInput.value;
    cycle.startSound = cycle.startSoundUrl;
    cycle.finalSoundUrl = finalSoundInput.value;
    cycle.finalSound = cycle.finalSoundUrl;
    cycle.counters = cards.map((card, index) => {
        const nameInput = card.querySelector('.counter-name');
        const secondsInput = card.querySelector('.counter-seconds');
        const soundInput = card.querySelector('.counter-sound');
        const startSoundInputEl = card.querySelector('.counter-start-sound');

        return createCounter({
            id: card.dataset.counterId || `counter-${index}`,
            name: nameInput.value.trim() || `Contador ${index + 1}`,
            seconds: Number(secondsInput.value) || 30,
            soundUrl: soundInput.value,
            startSoundUrl: startSoundInputEl.value,
        });
    });

    return cycle;
};

const saveSelectedCycle = () => {
    const cycle = buildCycleFromForm();
    const validation = validateCycle(cycle);

    if (!validation.isValid) {
        window.alert(validation.errors.join('\n'));
        return null;
    }

    const cycleIndex = state.cycles.findIndex((item) => item.id === cycle.id);

    if (cycleIndex >= 0) {
        state.cycles[cycleIndex] = cycle;
    } else {
        state.cycles.push(cycle);
        state.selectedCycleId = cycle.id;
    }

    persistCycles();
    render();
    return cycle;
};

const createNewCycle = () => {
    const newCycle = createEmptyCycle();
    state.cycles.unshift(newCycle);
    state.selectedCycleId = newCycle.id;
    persistCycles();
    setEditingMode(true);
};

const duplicateSelectedCycle = () => {
    const cycle = getSelectedCycle();
    if (!cycle) {
        return;
    }

    const copiedCycle = duplicateCycle(cycle);
    state.cycles.unshift(copiedCycle);
    state.selectedCycleId = copiedCycle.id;
    persistCycles();
    setEditingMode(true);
};

const deleteSelectedCycle = async () => {
    const cycle = getSelectedCycle();
    if (!cycle) {
        return;
    }

    const confirmed = window.confirm(`¿Deseas eliminar el ciclo "${cycle.name}"?`);
    if (!confirmed) {
        return;
    }

    state.cycles = await deleteCycleById(cycle.id);
    state.selectedCycleId = state.cycles[0]?.id || null;
    state.isEditing = false;
    deactivateCycle(cycle.id);
};

const triggerCounterSound = async (counter) => {
    const soundSource = counter?.soundUrl || counter?.sound || '';

    if (soundSource) {
        await playSoundConfig({ url: soundSource });
        return;
    }

    playSoundConfig({ frequency: 640, duration: 280, type: 'triangle' });
};

const triggerCounterStartSound = async (counter) => {
    const soundSource = counter?.startSoundUrl || counter?.startSound || '';

    if (soundSource) {
        await playSoundConfig({ url: soundSource });
        return;
    }

    playSoundConfig({ frequency: 440, duration: 200, type: 'square' });
};

const triggerFinalSound = async (cycleId) => {
    const cycle = state.cycles.find((item) => item.id === cycleId);
    const soundSource = cycle?.finalSoundUrl || cycle?.finalSound || '';

    if (soundSource) {
        await playSoundConfig({ url: soundSource });
        return;
    }

    playSoundConfig({ frequency: 880, duration: 520, type: 'sine' });
};

const triggerCycleStartSound = async (cycleId) => {
    const cycle = state.cycles.find((item) => item.id === cycleId);
    const soundSource = cycle?.startSoundUrl || cycle?.startSound || '';

    if (soundSource) {
        await playSoundConfig({ url: soundSource });
        return;
    }

    playSoundConfig({ frequency: 320, duration: 320, type: 'sine' });
};

const importCycleData = (rawCycle) => {
    const validation = validateCycle(rawCycle);

    if (!validation.isValid) {
        window.alert(validation.errors.join('\n'));
        return false;
    }

    const importedCycle = { ...rawCycle };
    importedCycle.id = globalThis.crypto?.randomUUID?.() || `id-${Date.now()}`;
    importedCycle.counters = (importedCycle.counters || []).map((counter, index) => ({
        ...counter,
        id: counter.id || `counter-${index}-${Date.now()}`,
        name: counter.name || `Contador ${index + 1}`,
        seconds: Number(counter.seconds) || 30,
    }));

    state.cycles.unshift(importedCycle);
    state.selectedCycleId = importedCycle.id;
    persistCycles();
    render();
    return true;
};

const openShareQrModal = () => {
    const cycle = getSelectedCycle();
    if (!cycle) {
        return;
    }

    shareQrModal.hidden = false;

    try {
        // eslint-disable-next-line no-new
        new globalThis.QRious({
            element: shareQrCanvas,
            value: JSON.stringify(cycle),
            size: 320,
        });
    } catch {
        window.alert('No se pudo generar el código QR del ciclo.');
    }
};

const closeShareQrModal = () => {
    shareQrModal.hidden = true;
};

let scanQrStream = null;
let scanQrFrameId = null;

const stopQrScan = () => {
    if (scanQrFrameId) {
        cancelAnimationFrame(scanQrFrameId);
        scanQrFrameId = null;
    }

    if (scanQrStream) {
        scanQrStream.getTracks().forEach((track) => track.stop());
        scanQrStream = null;
    }

    scanQrVideo.srcObject = null;
};

const closeScanQrModal = () => {
    stopQrScan();
    scanQrModal.hidden = true;
};

const scanQrFrame = () => {
    try {
        if (scanQrVideo.readyState === scanQrVideo.HAVE_ENOUGH_DATA && scanQrVideo.videoWidth > 0) {
            scanQrCanvas.width = scanQrVideo.videoWidth;
            scanQrCanvas.height = scanQrVideo.videoHeight;
            const context = scanQrCanvas.getContext('2d');
            context.drawImage(scanQrVideo, 0, 0, scanQrCanvas.width, scanQrCanvas.height);
            const imageData = context.getImageData(0, 0, scanQrCanvas.width, scanQrCanvas.height);
            const code = globalThis.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
            });

            if (code) {
                try {
                    const parsedCycle = JSON.parse(code.data);
                    if (importCycleData(parsedCycle)) {
                        closeScanQrModal();
                        return;
                    }
                } catch {
                    scanQrHint.textContent = 'El código QR leído no contiene un ciclo válido.';
                }
            }
        }
    } catch {
        // Se ignora un fallo puntual de decodificación y se reintenta en el siguiente frame.
    }

    scanQrFrameId = requestAnimationFrame(scanQrFrame);
};

const openScanQrModal = async () => {
    scanQrHint.textContent = 'Apunta la cámara al código QR del ciclo.';
    scanQrModal.hidden = false;

    try {
        scanQrStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
            },
        });
        scanQrVideo.srcObject = scanQrStream;
        await scanQrVideo.play();
        scanQrFrameId = requestAnimationFrame(scanQrFrame);
    } catch {
        scanQrHint.textContent = 'No se pudo acceder a la cámara.';
    }
};


const render = () => {
    ensureSelectedCycle();
    renderCycleList();
    renderCycleForm();
    renderActiveTimers();
    updateEditorVisibility();
};

formElement.addEventListener('submit', (event) => {
    event.preventDefault();
    const cycle = saveSelectedCycle();
    if (cycle) {
        const timer = state.timers.get(cycle.id);
        if (timer) {
            timer.pause?.();
            state.timers.delete(cycle.id);
        }
        state.isEditing = false;
        render();
    }
});

cancelEditButton.addEventListener('click', () => setEditingMode(false));

addCounterButton.addEventListener('click', () => {
    const card = createCounterCard(createCounter({ name: `Contador ${counterListElement.querySelectorAll('.counter-card').length + 1}`, seconds: 30 }), counterListElement.querySelectorAll('.counter-card').length);
    counterListElement.appendChild(card);
});

newCycleButton.addEventListener('click', createNewCycle);
duplicateCycleButton.addEventListener('click', duplicateSelectedCycle);
deleteCycleButton.addEventListener('click', deleteSelectedCycle);
shareCycleButton.addEventListener('click', openShareQrModal);
shareQrCloseButton.addEventListener('click', closeShareQrModal);
scanQrButton.addEventListener('click', openScanQrModal);
scanQrCloseButton.addEventListener('click', closeScanQrModal);
sidebarToggleButton.addEventListener('click', () => {
    sidebarElement.classList.toggle('is-open');
    sidebarBackdrop.classList.toggle('is-visible');
});
sidebarBackdrop.addEventListener('click', () => {
    sidebarElement.classList.remove('is-open');
    sidebarBackdrop.classList.remove('is-visible');
});

readCycles().then((cycles) => {
    state.cycles = cycles;
    render();
}).catch((error) => {
    console.error('No se pudieron cargar los ciclos guardados.', error);
    state.cycles = [createEmptyCycle()];
    render();
});
