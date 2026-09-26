// Seeded random numbers. The simulation never calls Math.random, so a stage
// replayed with the same inputs plays out exactly the same way.

export type Rng = { s: number };

export const makeRng = (seed: number): Rng => ({ s: seed >>> 0 });

// mulberry32
export const rand = (r: Rng): number => {
    r.s = (r.s + 0x6d2b79f5) >>> 0;
    let t = r.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const range = (r: Rng, a: number, b: number) => a + (b - a) * rand(r);
export const pick = <T>(r: Rng, list: readonly T[]): T => list[Math.floor(rand(r) * list.length)];
export const chance = (r: Rng, p: number) => rand(r) < p;
