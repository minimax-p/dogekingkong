// A tiny store the game writes to and the React overlay reads from.

export type Listener = () => void;

export type Store<T> = {
    get: () => T;
    set: (patch: Partial<T>) => void;
    subscribe: (fn: Listener) => () => void;
};

export const makeStore = <T extends object>(initial: T): Store<T> => {
    let state = initial;
    const listeners = new Set<Listener>();
    return {
        get: () => state,
        set: (patch) => {
            let changed = false;
            for (const k of Object.keys(patch) as (keyof T)[]) {
                if (state[k] !== patch[k]) {
                    changed = true;
                    break;
                }
            }
            if (!changed) return;
            state = { ...state, ...patch };
            listeners.forEach((l) => l());
        },
        subscribe: (fn) => {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
    };
};
