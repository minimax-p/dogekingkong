// Progress and settings, kept in this browser only. Every read and write is
// guarded: private windows and blocked storage just mean nothing is saved.

export type Settings = {
    volume: number; // 0..1
    music: boolean;
    reduced: boolean; // no shake, flashes or tape noise
    crt: boolean; // scanlines, grain, color fringing
    recruiter: boolean; // can't die
};

export type SaveData = {
    v: 1;
    settings: Settings;
    floorsSeen: string[];
    floorsDone: string[];
    cleared: string[]; // "4-1" style stage keys
    intel: string[]; // dossier entries found
};

const KEY = "dogeking-tower:v1";

const reducedByDefault = () => {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
        return false;
    }
};

export const defaultSave = (): SaveData => ({
    v: 1,
    settings: { volume: 0.8, music: true, reduced: reducedByDefault(), crt: true, recruiter: false },
    floorsSeen: [],
    floorsDone: [],
    cleared: [],
    intel: [],
});

export const loadSave = (): SaveData => {
    const d = defaultSave();
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return d;
        const s = JSON.parse(raw) as Partial<SaveData>;
        return {
            ...d,
            ...s,
            v: 1,
            settings: { ...d.settings, ...(s.settings ?? {}) },
            floorsSeen: Array.isArray(s.floorsSeen) ? s.floorsSeen : [],
            floorsDone: Array.isArray(s.floorsDone) ? s.floorsDone : [],
            cleared: Array.isArray(s.cleared) ? s.cleared : [],
            intel: Array.isArray(s.intel) ? s.intel : [],
        };
    } catch {
        return d;
    }
};

export const saveSave = (s: SaveData) => {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
        // Storage unavailable; progress lasts for this visit only
    }
};

export const clearSave = () => {
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        // ignore
    }
};
