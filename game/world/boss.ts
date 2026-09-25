// DogeKing, the penthouse boss. Three phases; you land one hit per phase.
//   1 · Code review: telegraphed dash slashes, then bracket spreads { } you can deflect.
//   2 · Deploy: the same, plus bugs from the vents and a laser along the floor.
//   3 · Guitar solo: shockwaves along the floor (jump them) and notes on the beat (deflect them).
// A slash only lands while he's catching his breath after an attack; a
// deflected projectile always lands; a thrown item stuns him.
import { STOP_DEFLECT } from "@/game/engine/constants";
import { approach } from "@/game/engine/math";
import { range } from "@/game/engine/rng";
import { emit, killPlayer, shake, spawnOil, spawnSparks } from "@/game/world/common";
import { makeEnemy } from "@/game/world/enemies";
import { groundBelow, moveBody } from "@/game/world/physics";
import { chestY, isInvulnerable } from "@/game/world/player";
import type { Enemy, Face, World } from "@/game/world/types";

export const BOSS_QUIPS = ["Okay. Not bad.", "Deploying to production. Hope you're ready.", "Fine. Guitar solo."];

const setState = (e: Enemy, s: Enemy["state"]) => {
    e.state = s;
    e.t = 0;
};

const face = (w: World, e: Enemy) => {
    const dx = w.player.x - e.x;
    if (dx !== 0) e.face = (dx > 0 ? 1 : -1) as Face;
};

const shoot = (w: World, e: Enemy, a: number, speed: number, kind: "bracket" | "note" | "wave", y?: number) => {
    const x = e.x + e.face * 8;
    const yy = y ?? e.y - 14;
    w.bullets.push({ id: w.nextId++, kind, x, y: yy, px: x, py: yy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, grav: 0, owner: "enemy", life: 240, from: e.id });
};

export const hitBoss = (w: World, e: Enemy, a: number, source: "slash" | "bullet" | "item" = "slash") => {
    if (e.state === "dead" || (e.data.inv ?? 0) > 0) return;
    const open = e.state === "recover" || e.state === "stun";
    if (source === "slash" && !open) {
        // He blocks with the guitar
        const p = w.player;
        p.vx = -Math.sign(e.x - p.x) * 3.4;
        w.hitstop = Math.max(w.hitstop, STOP_DEFLECT);
        w.fx.push({ kind: "clang", x: e.x - e.face * 4, y: e.y - 14, a: 0, t: 0, max: 8, follow: false });
        spawnSparks(w, e.x, e.y - 14, Math.atan2(chestY(p) - e.y + 14, p.x - e.x), 10);
        shake(w, 2);
        emit(w, "clang", e.x, e.y);
        return;
    }
    if (source === "item" && !open) {
        setState(e, "stun");
        e.vx = Math.cos(a) * 2;
        emit(w, "clang", e.x, e.y);
        return;
    }
    // A hit
    e.hp--;
    e.flash = 10;
    w.hitstop = Math.max(w.hitstop, 10);
    w.ca = Math.max(w.ca, 2);
    shake(w, 6);
    spawnOil(w, e.x, e.y - 12, a, 16, 5);
    spawnSparks(w, e.x, e.y - 12, a, 14);
    emit(w, "kill", e.x, e.y, 8);
    if (e.hp <= 0) {
        e.state = "dead";
        e.t = 0;
        e.vx = Math.cos(a) * 2;
        e.vy = -2;
        e.data.down = 1;
        // Everything he deployed crashes with him
        for (const o of w.enemies) if (o !== e && o.state !== "dead") o.state = "dead";
        for (const l of w.lasers) l.disabled = true;
        w.bullets = w.bullets.filter((b) => b.owner === "player");
        return;
    }
    setState(e, "hurt");
    e.vx = Math.cos(a) * 4;
    e.vy = -3;
    e.ground = false;
    e.data.inv = 80;
    e.phase = 3 - e.hp;
    e.data.quip = e.phase - 1;
    e.data.quipT = 150;
};

const PHASE_PLAN: Enemy["state"][][] = [
    ["dash", "throw", "dash", "throw"],
    ["throw", "dash", "throw", "dash"],
    ["solo", "dash", "solo", "dash"],
];

export const updateBoss = (w: World, e: Enemy, dt: number) => {
    const p = w.player;
    const d = e.data;
    if ((d.inv ?? 0) > 0) d.inv -= dt;
    if ((d.quipT ?? 0) > 0) d.quipT -= dt;
    const phase = Math.min(2, e.phase);

    // Gravity and movement
    if (!e.ground) e.vy = Math.min(e.vy + 0.32 * dt, 7);
    const res = moveBody(w, e, e.vx * dt, e.vy * dt);
    if (res.hitY !== 0) e.vy = 0;
    e.ground = e.vy >= 0 && groundBelow(w, e);
    if (e.ground) e.vy = 0;
    e.t += dt;

    // Phase 2 extras: bugs from the vents, a laser along the floor
    if (phase === 1 && !w.dead) {
        d.bugT = (d.bugT ?? 60) - dt;
        if (d.bugT <= 0) {
            // Deploy: two bugs drop out of the ceiling vents
            d.bugT = 240;
            for (const side of [-1, 1]) {
                const x = Math.max(32, Math.min(w.stage.pw - 32, p.x + side * range(w.rng, 40, 70)));
                const b = makeEnemy(w, "bug", x, 40, (side > 0 ? -1 : 1) as Face, null);
                b.ground = false;
                b.aware = true;
                b.state = "chase";
                b.counts = false;
                w.enemies.push(b);
            }
            emit(w, "bugHatch", p.x, 40);
        }
        if (!d.laser) {
            d.laser = 1;
            const y = w.stage.ph - 3 * 16 - 5;
            w.lasers.push({ id: w.nextId++, kind: "gate", x1: 24, y1: y, x2: w.stage.pw - 24, y2: y, period: 220, onFor: 60, offset: 0, on: false, warn: false, tripped: -1, disabled: false });
        }
    }
    if (phase === 2 && d.laser === 1) {
        d.laser = 2;
        for (const l of w.lasers) l.disabled = true;
    }

    if (w.dead) {
        e.vx = approach(e.vx, 0, 0.3 * dt);
        e.anim = "idle";
        return;
    }

    switch (e.state) {
        case "idle":
        case "patrol":
        case "alert":
        case "chase":
            e.vx = approach(e.vx, 0, 0.4 * dt);
            face(w, e);
            if (e.t > (phase === 2 ? 24 : 34)) {
                const plan = PHASE_PLAN[phase];
                const next = plan[(d.step ?? 0) % plan.length];
                d.step = (d.step ?? 0) + 1;
                // Keep some distance before a dash or a solo
                if ((next === "dash" || next === "solo") && Math.abs(p.x - e.x) < 90) {
                    d.tx = p.x < w.stage.pw / 2 ? w.stage.pw - 48 : 48;
                    d.after = next === "dash" ? 1 : 2;
                    setState(e, "move");
                } else setState(e, next === "dash" ? "windup" : next);
            }
            break;
        case "move": {
            const dir = Math.sign(d.tx - e.x);
            e.face = (dir || e.face) as Face;
            e.vx = approach(e.vx, dir * 3.2, 0.5 * dt);
            if (Math.abs(d.tx - e.x) < 8 || res.hitX !== 0 || e.t > 90) {
                e.vx = 0;
                setState(e, d.after === 2 ? "solo" : "windup");
            }
            break;
        }
        case "windup":
            // The tell: he crouches, the guitar glows, then he goes
            face(w, e);
            e.vx = approach(e.vx, 0, 0.5 * dt);
            if (e.t >= (phase === 2 ? 22 : 30)) {
                setState(e, "dash");
                emit(w, "slash", e.x, e.y);
            }
            break;
        case "dash":
            e.vx = e.face * 8.5;
            if (!isInvulnerable(p) && p.state !== "dead") {
                if (Math.abs(p.x - e.x) < 12 && p.y > e.y - e.h && p.y - p.h < e.y) killPlayer(w, "boss", e.face > 0 ? 0 : Math.PI);
            }
            if (res.hitX !== 0 || e.t > 34) {
                e.vx = 0;
                shake(w, res.hitX !== 0 ? 3 : 1);
                setState(e, "recover");
            }
            break;
        case "throw":
            face(w, e);
            e.vx = approach(e.vx, 0, 0.5 * dt);
            if (e.t >= 26 && !d.thrown) {
                d.thrown = 1;
                const a = Math.atan2(chestY(p) - (e.y - 14), p.x - e.x);
                const n = phase === 0 ? 3 : 5;
                for (let i = 0; i < n; i++) shoot(w, e, a + (i - (n - 1) / 2) * 0.22, 5.5, "bracket");
                emit(w, "throw", e.x, e.y);
            }
            if (e.t >= 60) {
                d.thrown = 0;
                setState(e, "idle");
            }
            break;
        case "solo": {
            // Power chords on the beat: a wave along the floor, then a note at you
            face(w, e);
            e.vx = 0;
            const beat = Math.floor(e.t / 30);
            if (beat !== d.beat) {
                d.beat = beat;
                if (beat >= 1 && beat <= 5) {
                    if (beat % 2 === 1) {
                        shoot(w, e, 0, 4.2, "wave", e.y - 5);
                        shoot(w, e, Math.PI, 4.2, "wave", e.y - 5);
                        shake(w, 2);
                        emit(w, "shotgun", e.x, e.y, 0.6);
                    } else {
                        shoot(w, e, Math.atan2(chestY(p) - (e.y - 14), p.x - e.x), 5, "note");
                        emit(w, "shot", e.x, e.y, 0.5);
                    }
                }
            }
            if (e.t >= 190) {
                d.beat = -1;
                setState(e, "recover");
            }
            break;
        }
        case "recover":
            // Catching his breath: this is the opening
            e.vx = approach(e.vx, 0, 0.5 * dt);
            if (e.t >= (phase === 2 ? 50 : 60)) setState(e, "idle");
            break;
        case "stun":
            e.vx = approach(e.vx, 0, 0.3 * dt);
            if (e.t >= 60) setState(e, "idle");
            break;
        case "hurt":
            if (e.ground) e.vx = approach(e.vx, 0, 0.3 * dt);
            if (e.t >= 50 && e.ground) setState(e, "idle");
            break;
    }

    e.anim =
        e.state === "move"
            ? "run"
            : e.state === "windup"
              ? "windup"
              : e.state === "dash"
                ? "dash"
                : e.state === "throw"
                  ? "throw"
                  : e.state === "solo"
                    ? "strum"
                    : e.state === "hurt"
                      ? "hurt"
                      : e.state === "recover" || e.state === "stun"
                        ? "kneel"
                        : "idle";
};
