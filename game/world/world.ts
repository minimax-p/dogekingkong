// Creating a stage's world and advancing it one step.
import {
    BATTERY_CELLS,
    BATTERY_DRAIN,
    BATTERY_FILL,
    BATTERY_FILL_DELAY,
    FOCUS_IN_STEPS,
    FOCUS_OUT_STEPS,
    FOCUS_PLAYER,
    FOCUS_WORLD,
    H,
    TILE,
    W,
} from "@/game/engine/constants";
import type { Input } from "@/game/engine/input";
import { clamp, easeOutCubic } from "@/game/engine/math";
import { makeRng, range } from "@/game/engine/rng";
import { processSlash } from "@/game/world/combat";
import { emit, killPlayer } from "@/game/world/common";
import { makeEnemy } from "@/game/world/enemies";
import { updateEnemies } from "@/game/world/enemies";
import { chestY, makePlayer, updatePlayer } from "@/game/world/player";
import { laserBeam, updateBullets, updateItems, updateLasers } from "@/game/world/projectiles";
import { solidPx, type Stage } from "@/game/world/stage";
import type { Laser, World } from "@/game/world/types";

export const createWorld = (stage: Stage, seed = 1, opts: { invincible?: boolean } = {}): World => {
    const w: World = {
        stage,
        seed,
        rng: makeRng(seed),
        fxRng: makeRng(seed * 7919 + 17),
        step: 0,
        nextId: 1,
        player: makePlayer(stage.spawn.x, stage.spawn.y, stage.spawn.face),
        enemies: [],
        bullets: [],
        items: [],
        doors: [],
        lasers: [],
        particles: [],
        decals: [],
        fx: [],
        focus: 0,
        focusHeld: false,
        battery: BATTERY_CELLS,
        batteryIdle: 0,
        scale: 1,
        pscale: 1,
        hitstop: 0,
        time: 0,
        timeLimit: stage.def.time,
        cam: { x: 0, y: 0, shake: 0, sx: 0, sy: 0, kick: 0, ka: 0 },
        cleared: false,
        won: false,
        dead: false,
        deadT: 0,
        deathCause: "",
        events: [],
        flash: 0,
        ca: 0,
        kills: 0,
        deflects: 0,
        flags: {},
        invincible: !!opts.invincible,
    };
    for (const s of stage.enemies) w.enemies.push(makeEnemy(w, s.kind, s.x, s.y, s.face, s.patrol));
    for (const it of stage.items) w.items.push({ id: w.nextId++, kind: it.kind, x: it.x, y: it.y, vx: 0, vy: 0, state: "ground", rot: 0 });
    for (const d of stage.doors) w.doors.push({ id: w.nextId++, tx: d.tx, ty: d.ty, h: d.h, open: false, dir: 1, t: 0 });
    const period = stage.def.gatePeriod ?? 150;
    const onFor = stage.def.gateOn ?? 80;
    stage.gates.forEach((g, i) => {
        w.lasers.push({ id: w.nextId++, kind: "gate", ...laserBeam(g.tx, g.ty, g.h), period, onFor, offset: (i * 37) % period, on: false, warn: false, tripped: -1, disabled: false });
    });
    stage.wires.forEach((g) => {
        w.lasers.push({ id: w.nextId++, kind: "wire", ...laserBeam(g.tx, g.ty, g.h), period: 0, onFor: 0, offset: 0, on: true, warn: false, tripped: -1, disabled: false });
    });
    for (const s of stage.sentries) {
        const e = makeEnemy(w, "sentry", s.x, s.y, 1, null);
        const wires = w.lasers.filter((l) => l.kind === "wire");
        let best: Laser | null = null;
        for (const l of wires) if (!best || Math.abs(l.x1 - s.x) < Math.abs(best.x1 - s.x)) best = l;
        e.wire = best ? best.id : -1;
        e.aim = Math.PI / 2;
        w.enemies.push(e);
    }
    stage.def.hooks?.start?.(w);
    snapCamera(w);
    return w;
};

export const alive = (w: World) => w.enemies.filter((e) => e.counts && e.state !== "dead").length;

const updateFocus = (w: World, inp: Input) => {
    const p = w.player;
    const can = p.state !== "dead" && !w.won;
    const want = can && inp.focus && (w.focusHeld ? w.battery > 0 : w.battery >= 1);
    if (want && !w.focusHeld) emit(w, "focusOn", p.x, p.y);
    if (!want && w.focusHeld) emit(w, w.battery <= 0 ? "focusEmpty" : "focusOff", p.x, p.y);
    if (can && inp.focus && !w.focusHeld && w.battery < 1 && w.step % 20 === 0) emit(w, "focusEmpty", p.x, p.y);
    w.focusHeld = want;
    w.focus = want ? Math.min(1, w.focus + 1 / FOCUS_IN_STEPS) : Math.max(0, w.focus - 1 / FOCUS_OUT_STEPS);
    if (want) {
        w.battery = Math.max(0, w.battery - BATTERY_DRAIN);
        w.batteryIdle = 0;
    } else {
        w.batteryIdle++;
        if (w.batteryIdle > BATTERY_FILL_DELAY) w.battery = Math.min(BATTERY_CELLS, w.battery + BATTERY_FILL);
    }
    const e = easeOutCubic(w.focus);
    w.scale = 1 - (1 - FOCUS_WORLD) * e;
    w.pscale = 1 - (1 - FOCUS_PLAYER) * e;
    if (w.dead) {
        w.scale = 0.3;
        w.pscale = 0.3;
    }
};

const updateParticles = (w: World) => {
    const dt = w.scale;
    for (const q of w.particles) {
        q.life -= dt;
        q.vy += q.g * dt;
        const nx = q.x + q.vx * dt;
        const ny = q.y + q.vy * dt;
        if (q.kind === "dust" || q.kind === "smoke") {
            q.x = nx;
            q.y = ny;
            q.vx *= 1 - 0.05 * dt;
            continue;
        }
        if (solidPx(w.stage, nx, ny)) {
            if (q.stick) {
                w.decals.push({ x: q.x, y: q.y, kind: "oil", v: q.c, r: Math.atan2(q.vy, q.vx) });
                q.life = 0;
                continue;
            }
            if (q.kind === "shell" || q.kind === "shard" || q.kind === "splinter") {
                if (solidPx(w.stage, q.x, ny)) {
                    q.vy *= -0.35;
                    q.vx *= 0.7;
                } else q.vx *= -0.4;
                continue;
            }
            q.life = 0;
            continue;
        }
        q.x = nx;
        q.y = ny;
    }
    w.particles = w.particles.filter((q) => q.life > 0);
    if (w.decals.length > 900) w.decals.splice(0, w.decals.length - 900);
};

const updateFx = (w: World) => {
    const p = w.player;
    for (const f of w.fx) {
        f.t += f.kind === "slash" ? Math.max(w.pscale, 0.7) : w.scale;
        if (f.follow) {
            f.x = p.x;
            f.y = chestY(p);
        }
    }
    w.fx = w.fx.filter((f) => f.t < f.max);
};

const updateDoors = (w: World) => {
    for (const d of w.doors) if (d.open && d.t < 20) d.t += w.scale;
};

export const snapCamera = (w: World) => {
    const p = w.player;
    w.cam.x = clamp(p.x - W / 2, 0, Math.max(0, w.stage.pw - W));
    w.cam.y = clamp(p.y - 20 - H / 2, 0, Math.max(0, w.stage.ph - H));
    if (w.stage.pw < W) w.cam.x = (w.stage.pw - W) / 2;
    if (w.stage.ph < H) w.cam.y = (w.stage.ph - H) / 2;
};

// The camera follows the Headhunter and leans toward the aim
const updateCamera = (w: World, inp: Input) => {
    const p = w.player;
    const lean = w.dead ? 0 : 1;
    const lx = clamp(inp.ax * 0.3, -56, 56) * lean;
    const ly = clamp(inp.ay * 0.3, -30, 30) * lean;
    const tx = clamp(p.x + lx - W / 2, 0, Math.max(0, w.stage.pw - W));
    const ty = clamp(p.y - 20 + ly - H / 2, 0, Math.max(0, w.stage.ph - H));
    w.cam.x += (tx - w.cam.x) * 0.14;
    w.cam.y += (ty - w.cam.y) * 0.12;
    if (w.stage.pw < W) w.cam.x = (w.stage.pw - W) / 2;
    if (w.stage.ph < H) w.cam.y = (w.stage.ph - H) / 2;
    w.cam.shake *= 0.84;
    if (w.cam.shake < 0.2) w.cam.shake = 0;
    w.cam.sx = w.cam.shake ? range(w.fxRng, -1, 1) * w.cam.shake : 0;
    w.cam.sy = w.cam.shake ? range(w.fxRng, -1, 1) * w.cam.shake : 0;
    w.flash = Math.max(0, w.flash - 1);
    w.ca = Math.max(0, w.ca - 0.08);
};

export const stepWorld = (w: World, inp: Input) => {
    w.events.length = 0;
    w.step++;
    updateFocus(w, inp);

    if (w.hitstop > 0) {
        // Frozen: keep the presses for when time starts again
        w.hitstop--;
        const p = w.player;
        if (inp.jump) p.jumpBuf = 6;
        if (inp.attack) p.atkBuf = 6;
        if (inp.throw) p.throwBuf = 6;
        if (inp.ax !== 0 || inp.ay !== 0) p.aim = Math.atan2(inp.ay, inp.ax);
        updateCamera(w, inp);
        return;
    }

    if (w.dead) w.deadT++;
    updatePlayer(w, inp);
    processSlash(w);
    updateEnemies(w);
    updateBullets(w);
    updateItems(w);
    updateLasers(w);
    updateDoors(w);
    updateParticles(w);
    updateFx(w);
    w.stage.def.hooks?.step?.(w);

    if (!w.dead && !w.won) {
        w.time += w.scale / 60;
        if (w.time >= w.timeLimit) killPlayer(w, "time", w.player.face > 0 ? Math.PI : 0);
        // Fell out of the map
        if (w.player.y > w.stage.ph + 40) killPlayer(w, "fall", -Math.PI / 2);
    }
    // The intel file
    const intel = w.stage.intel;
    if (intel && !w.flags.intel && !w.dead) {
        const p = w.player;
        if (Math.abs(p.x - intel.x) < 10 && Math.abs(p.y - intel.y) < 18) {
            w.flags.intel = 1;
            emit(w, "pickup", intel.x, intel.y, 2);
        }
    }
    if (!w.cleared && !w.flags.hold && alive(w) === 0) {
        w.cleared = true;
        w.flags.clearedAt = w.time * 60;
        emit(w, "clear", w.player.x, w.player.y);
    }
    if (w.cleared && !w.won && !w.dead && !w.stage.def.boss) {
        const p = w.player;
        const x = w.stage.exit;
        if (p.x > x.x && p.x < x.x + x.w && p.y > x.y && p.y - p.h < x.y + x.h) {
            w.won = true;
            emit(w, "win", p.x, p.y);
        }
    }
    updateCamera(w, inp);
};

export const exitCenter = (w: World) => ({ x: w.stage.exit.x + w.stage.exit.w / 2, y: w.stage.exit.y + w.stage.exit.h - TILE });
