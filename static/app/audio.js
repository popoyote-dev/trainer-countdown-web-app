export const AVAILABLE_SOUNDS = [
    { label: 'Sin sonido', value: '' },
    { label: 'Una campana', value: './static/sounds/1-bell.mp3' },
    { label: 'Dos campanas', value: './static/sounds/2-bells.mp3' },
    { label: 'Tres campanas', value: './static/sounds/3-bells.mp3' },
    { label: 'Sonido de inicio', value: './static/sounds/start-sound-beep.mp3' },
    { label: 'Alarma de reloj', value: './static/sounds/alarm-clock-beep.mp3' },
    { label: 'Cuenta regresiva', value: './static/sounds/countdown-beep.mp3' },
    { label: 'Alarma', value: './static/sounds/alarm-beep.mp3' },
    { label: 'Pitido de alarma', value: './static/sounds/beep-alarm.mp3' },
];

export function playTone({
    frequency = 880,
    duration = 350,
    type = 'sine',
    volume = 0.12,
} = {}) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        return false;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);

    oscillator.onended = () => {
        audioContext.close();
    };

    return true;
}

export async function playSoundConfig(config = {}) {
    const soundSource = String(config.url || config.sound || '').trim();

    if (soundSource) {
        try {
            const audio = new Audio(soundSource);
            audio.volume = 0.8;
            await audio.play();
            return true;
        } catch {
            // Fallback a un tono si la URL falla o está bloqueada por el navegador.
        }
    }

    if (config.frequency) {
        return playTone({
            frequency: Number(config.frequency),
            duration: Number(config.duration || 420),
            type: config.type || 'sine',
            volume: config.volume || 0.12,
        });
    }

    return playTone({ frequency: 740, duration: 420, type: 'square' });
}

export const createSoundPreviewHandler = (playFn = playSoundConfig) => async (event) => {
    const selectedValue = String(event?.target?.value ?? '').trim();

    if (!selectedValue) {
        return false;
    }

    const didPlay = await playFn({ url: selectedValue });
    return Boolean(didPlay);
};
