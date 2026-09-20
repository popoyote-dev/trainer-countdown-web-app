import { createEmptyCycle } from './cycleManager.js';

const DB_NAME = 'trainerCountdownDB';
const DB_VERSION = 1;
const STORE_NAME = 'cycles';
const LEGACY_STORAGE_KEY = 'trainerCountdownCycles';

let dbPromise = null;

function openDatabase() {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

function runTransaction(mode, executor) {
    return openDatabase().then((db) => new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        let result;

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);

        result = executor(store);
    }));
}

function getAllCycles() {
    return runTransaction('readonly', (store) => new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    }));
}

function replaceAllCycles(cycles) {
    return runTransaction('readwrite', (store) => {
        store.clear();
        cycles.forEach((cycle) => store.put(cycle));
    }).then(() => cycles);
}

// Migra los datos guardados previamente en localStorage a IndexedDB, una única vez.
function migrateFromLocalStorage() {
    let legacyCycles = [];

    try {
        const rawValue = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (rawValue) {
            const parsed = JSON.parse(rawValue);
            legacyCycles = Array.isArray(parsed) ? parsed : [];
        }
    } catch {
        legacyCycles = [];
    }

    localStorage.removeItem(LEGACY_STORAGE_KEY);

    if (!legacyCycles.length) {
        return Promise.resolve([]);
    }

    return replaceAllCycles(legacyCycles);
}

export async function readCycles() {
    try {
        const existingCycles = await getAllCycles();

        if (existingCycles.length > 0) {
            return existingCycles;
        }

        const migratedCycles = await migrateFromLocalStorage();
        if (migratedCycles.length > 0) {
            return migratedCycles;
        }

        return replaceAllCycles([createEmptyCycle()]);
    } catch {
        return [createEmptyCycle()];
    }
}

export async function saveCycles(cycles) {
    const safeCycles = Array.isArray(cycles) ? cycles : [];
    return replaceAllCycles(safeCycles);
}

export async function upsertCycle(cycle) {
    await runTransaction('readwrite', (store) => {
        store.put(cycle);
    });

    return getAllCycles();
}

export async function deleteCycleById(cycleId) {
    await runTransaction('readwrite', (store) => {
        store.delete(cycleId);
    });

    return getAllCycles();
}
