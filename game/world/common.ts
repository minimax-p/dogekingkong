// Shared helpers: events, noise, kills, deaths, doors and particles.
import { STOP_DEATH, STOP_KILL, TILE } from "@/game/engine/constants";
import { range, rand } from "@/game/engine/rng";
import { rayHit } from "@/game/world/physics";
import type { Door, Enemy, EventType, Face, ParticleKind, World } from "@/game/world/types";

export const emit = (w: World, type: EventType, x: number, y: number, v?: number) => {
    w.events.push({ type, x, y, v });
};

export const shake = (w: World, amount: number) => {
    w.cam.shake = Math.max(w.cam.shake, amount);
};

// Enemies within earshot turn toward the noise a moment later
export const noise = (w: World, x: number, y: number, radius: number) => {
    for (const e of w.enemies) {
        if (e.state === "dead" || e.aware || e.hearT > 0) continue;
        if (Math.abs(e.x - x) < radius && Math.abs(e.y - y) < radius * 0.6) e.hearT = 12;
    }
};

export const particle = (
    w: World,
    kind: ParticleKind,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    g = 0.2,
    stick = false,
    c = 0,
) => {
    if (w.particles.length > 600) w.particles.shift();
    w.particles.push({ kind, x, y, vx, vy, g, life, max: life, c, stick });
};

export const spawnDust = (w: World, x: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) {
        particle(w, "dust", x + range(w.fxRng, -3, 3), y - 1, range(w.fxRng, -0.6, 0.6), range(w.fxRng, -0.5, -0.1), 18 + rand(w.fxRng) * 10, -0.005);
    }
};

export const spawnSparks = (w: World, x: number, y: number, a: number, n: number, spread = 0.9) => {
    for (let i = 0; i < n; i++) {
        const aa = a + range(w.fxRng, -spread, spread);
        const v = range(w.fxRng, 1.5, 4.5);
        particle(w, "spark", x, y, Math.cos(aa) * v, Math.sin(aa) * v, 8 + rand(w.fxRng) * 10, 0.12, false, Math.floor(rand(w.fxRng) * 3));
    }
};

// Robots leak oil, not blood. Drops stick where they land.
export const spawnOil = (w: World, x: number, y: number, a: number, n: number, speed = 4) => {
    for (let i = 0; i < n; i++) {
        const aa = a + range(w.fxRng, -0.55, 0.55);
        const v = range(w.fxRng, speed * 0.3, speed * 1.3);
        particle(w, "oil", x, y, Math.cos(aa) * v, Math.sin(aa) * v - 0.6, 50 + rand(w.fxRng) * 40, 0.2, true, Math.floor(rand(w.fxRng) * 4));
    }
    // A big splat on the wall behind, if there is one close by
    const hit = rayHit(w, x, y, x + Math.cos(a) * 56, y + Math.sin(a) * 56, false);
    if (hit) w.decals.push({ x: hit.x, y: hit.y, kind: "splat", v: Math.floor(rand(w.fxRng) * 4), r: a });
};

export const killEnemy = (w: World, e: Enemy, a: number, power = 6, cause: "slash" | "bullet" | "item" | "door" | "laser" = "slash") => {
    if (e.state === "dead") return;
    e.state = "dead";
    e.t = 0;
    e.flash = 6;
    e.vx = Math.cos(a) * power;
    e.vy = Math.sin(a) * power - (e.kind === "drone" ? 0 : 2.5);
    e.spin = (Math.cos(a) >= 0 ? 1 : -1) * range(w.fxRng, 0.25, 0.45);
    e.ground = false;
    e.face = (Math.cos(a) >= 0 ? -1 : 1) as Face;
    w.kills++;
    w.hitstop = Math.max(w.hitstop, cause === "laser" ? 2 : STOP_KILL);
    shake(w, cause === "door" ? 3 : 4);
    w.ca = Math.max(w.ca, 1);
    const cy = e.y - e.h / 2;
    spawnOil(w, e.x, cy, a, e.kind === "bug" ? 10 : 22, power * 0.7);
    spawnSparks(w, e.x, cy, a, 8);
    emit(w, "kill", e.x, cy, power);
    noise(w, e.x, e.y, 150);
};

export const killPlayer = (w: World, cause: string, a: number) => {
    const p = w.player;
    if (p.state === "dead" || w.won) return;
    if (w.invincible) {
        // Recruiter mode: a flash and a shove instead of a death
        w.flash = Math.max(w.flash, 4);
        p.vx = Math.cos(a) * 3;
        shake(w, 3);
        return;
    }
    p.state = "dead";
    p.t = 0;
    p.killedBy = cause;
    p.vx = Math.cos(a) * 4.5;
    p.vy = Math.min(-2.5, Math.sin(a) * 4 - 2);
    p.ground = false;
    p.h = 12;
    w.dead = true;
    w.deadT = 0;
    w.deathCause = cause;
    w.hitstop = STOP_DEATH;
    w.flash = 6;
    w.ca = 2;
    shake(w, 6);
    spawnSparks(w, p.x, p.y - 12, a, 14, 1.2);
    for (let i = 0; i < 10; i++) {
        const aa = a + range(w.fxRng, -0.6, 0.6);
        const v = range(w.fxRng, 1, 4);
        particle(w, "ember", p.x, p.y - 12, Math.cos(aa) * v, Math.sin(aa) * v - 1, 30 + rand(w.fxRng) * 20, 0.15, true, 0);
    }
    emit(w, "death", p.x, p.y);
};

// A kicked door swings away from the kicker and flattens anyone behind it
export const kickDoor = (w: World, d: Door, dir: Face) => {
    if (d.open) return;
    d.open = true;
    d.dir = dir;
    d.t = 0;
    const dx = d.tx * TILE + TILE / 2;
    const top = d.ty * TILE;
    const bot = (d.ty + d.h) * TILE;
    for (const e of w.enemies) {
        if (e.state === "dead") continue;
        const rel = (e.x - dx) * dir;
        if (rel > -2 && rel < 30 && e.y > top && e.y - e.h < bot) killEnemy(w, e, dir > 0 ? -0.3 : Math.PI + 0.3, 6, "door");
    }
    for (let i = 0; i < 10; i++) {
        particle(w, "splinter", dx, range(w.fxRng, top + 4, bot - 4), dir * range(w.fxRng, 1, 4), range(w.fxRng, -2, 0.5), 30 + rand(w.fxRng) * 20, 0.2, false, Math.floor(rand(w.fxRng) * 3));
    }
    shake(w, 3);
    emit(w, "door", dx, bot);
    noise(w, dx, bot, 170);
};
