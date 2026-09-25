// Bullets (including shotgun pellets, shuttlecocks and the boss's notes) and
// thrown items.
import { TILE } from "@/game/engine/constants";
import { range, rand } from "@/game/engine/rng";
import { emit, killEnemy, killPlayer, particle, spawnSparks } from "@/game/world/common";
import { shieldFacing } from "@/game/world/combat";
import { hitBoss } from "@/game/world/boss";
import { rayHit } from "@/game/world/physics";
import { isInvulnerable } from "@/game/world/player";
import type { Body, Enemy, World } from "@/game/world/types";

// Does the segment (x1,y1)→(x2,y2) cross the box, grown by r?
export const segHitsBox = (x1: number, y1: number, x2: number, y2: number, bx1: number, by1: number, bx2: number, by2: number, r = 0) => {
    bx1 -= r;
    by1 -= r;
    bx2 += r;
    by2 += r;
    const dx = x2 - x1;
    const dy = y2 - y1;
    let t0 = 0;
    let t1 = 1;
    const clip = (p: number, q: number) => {
        if (p === 0) return q >= 0;
        const t = q / p;
        if (p < 0) {
            if (t > t1) return false;
            if (t > t0) t0 = t;
        } else {
            if (t < t0) return false;
            if (t < t1) t1 = t;
        }
        return true;
    };
    return clip(-dx, x1 - bx1) && clip(dx, bx2 - x1) && clip(-dy, y1 - by1) && clip(dy, by2 - y1);
};

const bodyBox = (b: Body) => [b.x - b.w / 2, b.y - b.h, b.x + b.w / 2, b.y] as const;

const enemyBox = (e: Enemy) => {
    if (e.kind === "sentry") return [e.x - 6, e.y, e.x + 6, e.y + 9] as const;
    return bodyBox(e);
};

export const updateBullets = (w: World) => {
    const dt = w.scale;
    const p = w.player;
    for (const b of w.bullets) {
        b.px = b.x;
        b.py = b.y;
        b.vy += b.grav * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;

        // Walls
        const wall = rayHit(w, b.px, b.py, b.x, b.y);
        if (wall) {
            b.life = 0;
            spawnSparks(w, wall.x, wall.y, Math.atan2(-b.vy, -b.vx), b.kind === "shuttle" ? 2 : 4, 0.7);
            if (b.kind !== "shuttle") w.decals.push({ x: wall.x, y: wall.y, kind: "scorch", v: Math.floor(rand(w.fxRng) * 3), r: 0 });
            emit(w, "ricochet", wall.x, wall.y);
            continue;
        }

        // The Headhunter
        if (b.owner === "enemy" && p.state !== "dead" && !isInvulnerable(p)) {
            const [x1, y1, x2, y2] = bodyBox(p);
            if (segHitsBox(b.px, b.py, b.x, b.y, x1, y1, x2, y2, 1)) {
                b.life = 0;
                killPlayer(w, b.kind === "shuttle" ? "shuttle" : b.kind === "pellet" ? "shotgun" : "bullet", Math.atan2(b.vy, b.vx));
                continue;
            }
        }

        // Enemies: deflected bullets kill anyone, and stray enemy fire hits other enemies too
        for (const e of w.enemies) {
            if (e.state === "dead" || e.id === b.from) continue;
            if (b.owner === "enemy" && (e.kind === "sentry" || e.kind === "launcher" || e.kind === "boss")) continue;
            const [x1, y1, x2, y2] = enemyBox(e);
            if (!segHitsBox(b.px, b.py, b.x, b.y, x1, y1, x2, y2, 1)) continue;
            b.life = 0;
            if (shieldFacing(e, b.px)) {
                spawnSparks(w, b.x, b.y, Math.atan2(-b.vy, -b.vx), 6);
                emit(w, "ricochet", b.x, b.y);
            } else if (e.kind === "boss") {
                hitBoss(w, e, Math.atan2(b.vy, b.vx), "bullet");
            } else {
                killEnemy(w, e, Math.atan2(b.vy, b.vx), 5, "bullet");
            }
            break;
        }
    }
    w.bullets = w.bullets.filter((b) => b.life > 0 && b.x > -40 && b.x < w.stage.pw + 40 && b.y > -80 && b.y < w.stage.ph + 40);
};

export const updateItems = (w: World) => {
    const dt = w.scale;
    for (const it of w.items) {
        if (it.state !== "thrown") continue;
        const px = it.x;
        const py = it.y;
        it.vy += 0.06 * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += 0.5 * dt;
        let done = false;
        for (const e of w.enemies) {
            if (e.state === "dead") continue;
            const [x1, y1, x2, y2] = enemyBox(e);
            if (!segHitsBox(px, py, it.x, it.y, x1, y1, x2, y2, 3)) continue;
            done = true;
            if (e.kind === "firewall" && shieldFacing(e, px)) {
                // A throw knocks the shield aside for a moment
                e.state = "stun";
                e.t = 0;
                e.vx = Math.sign(it.vx) * 1.5;
                emit(w, "clang", e.x, e.y - 12);
            } else if (e.kind === "boss") {
                hitBoss(w, e, Math.atan2(it.vy, it.vx), "item");
            } else killEnemy(w, e, Math.atan2(it.vy, it.vx), 5, "item");
            break;
        }
        const wall = done ? null : rayHit(w, px, py, it.x, it.y);
        if (done || wall) {
            const x = wall ? wall.x : it.x;
            const y = wall ? wall.y : it.y;
            for (let i = 0; i < 8; i++) {
                particle(w, "shard", x, y, range(w.fxRng, -2.5, 2.5), range(w.fxRng, -3, 0), 40, 0.25, false, Math.floor(rand(w.fxRng) * 3));
            }
            emit(w, "break", x, y);
            it.state = "ground";
            it.vx = 0;
            it.x = -999; // removed below
        }
    }
    w.items = w.items.filter((it) => it.x > -500);
};

// Laser gates switch on a cycle (with a flicker first); tripwires wake sentries.
export const updateLasers = (w: World) => {
    const p = w.player;
    for (const l of w.lasers) {
        if (l.disabled) {
            l.on = false;
            l.warn = false;
            continue;
        }
        if (l.kind === "gate") {
            const t = (w.time * 60 + l.offset) % l.period;
            l.on = t < l.onFor;
            l.warn = !l.on && t > l.period - 24;
            if (!l.on) continue;
            if (p.state !== "dead" && segHitsBox(l.x1, l.y1, l.x2, l.y2, p.x - p.w / 2, p.y - p.h, p.x + p.w / 2, p.y)) {
                killPlayer(w, "laser", p.vx >= 0 ? Math.PI : 0);
            }
            for (const e of w.enemies) {
                if (e.state === "dead" || e.kind === "sentry" || e.kind === "boss") continue;
                if (segHitsBox(l.x1, l.y1, l.x2, l.y2, e.x - e.w / 2, e.y - e.h, e.x + e.w / 2, e.y)) {
                    killEnemy(w, e, e.vx >= 0 ? 0 : Math.PI, 3, "laser");
                }
            }
        } else {
            l.on = true;
            if (l.tripped >= 0) l.tripped += w.scale;
            if (p.state === "dead") continue;
            if (segHitsBox(l.x1, l.y1, l.x2, l.y2, p.x - p.w / 2, p.y - p.h, p.x + p.w / 2, p.y)) {
                if (l.tripped < 0 || l.tripped > 60) {
                    l.tripped = 0;
                    emit(w, "sentry", (l.x1 + l.x2) / 2, l.y1);
                    for (const e of w.enemies) {
                        if (e.kind === "sentry" && e.wire === l.id && e.state !== "dead") {
                            e.data.active = 300;
                            e.aware = true;
                            e.cd = 10;
                        }
                    }
                }
            }
        }
    }
};

export const laserBeam = (tx: number, ty: number, h: number) => ({
    x1: tx * TILE + TILE / 2,
    y1: ty * TILE,
    x2: tx * TILE + TILE / 2,
    y2: (ty + h) * TILE,
});

