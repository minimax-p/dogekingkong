// DogeKing's security. Every enemy dies in one hit and kills in one hit.
// Timings are in world steps, which run at 0.2× in slow motion.
import { TILE } from "@/game/engine/constants";
import { approach, clamp, sign } from "@/game/engine/math";
import { range } from "@/game/engine/rng";
import { emit, killPlayer, noise, particle, shake, spawnSparks } from "@/game/world/common";
import { groundBelow, ledgeAhead, lineOfSight, moveBody } from "@/game/world/physics";
import { chestY, isInvulnerable } from "@/game/world/player";
import { updateBoss } from "@/game/world/boss";
import type { Enemy, EnemyKind, Face, World } from "@/game/world/types";

export const EK: Record<EnemyKind, { w: number; h: number; walk: number; run: number; alert: number; aim: number; cd: number; speed: number }> = {
    bouncer: { w: 10, h: 22, walk: 0.9, run: 2.6, alert: 10, aim: 0, cd: 12, speed: 0 },
    guard: { w: 10, h: 22, walk: 0.8, run: 2.2, alert: 14, aim: 24, cd: 45, speed: 9 },
    enforcer: { w: 10, h: 22, walk: 0.7, run: 1.8, alert: 16, aim: 30, cd: 72, speed: 8 },
    firewall: { w: 12, h: 22, walk: 0.7, run: 1.5, alert: 16, aim: 0, cd: 20, speed: 0 },
    bug: { w: 8, h: 7, walk: 1.2, run: 3.6, alert: 6, aim: 0, cd: 40, speed: 0 },
    drone: { w: 12, h: 10, walk: 0.8, run: 1.7, alert: 12, aim: 28, cd: 60, speed: 8 },
    launcher: { w: 16, h: 18, walk: 0, run: 0, alert: 10, aim: 0, cd: 90, speed: 0 },
    sentry: { w: 12, h: 8, walk: 0, run: 0, alert: 0, aim: 10, cd: 48, speed: 10 },
    boss: { w: 10, h: 24, walk: 1, run: 3.2, alert: 0, aim: 0, cd: 0, speed: 9 },
};

const GRAV = 0.32;
const VIEW = 280;

export const makeEnemy = (w: World, kind: EnemyKind, x: number, y: number, face: Face, patrol: [number, number] | null): Enemy => ({
    id: w.nextId++,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    w: EK[kind].w,
    h: EK[kind].h,
    ground: kind !== "drone" && kind !== "sentry",
    face,
    state: patrol ? "patrol" : "idle",
    t: 0,
    aware: false,
    hearT: 0,
    aim: face > 0 ? 0 : Math.PI,
    cd: 0,
    lostT: 0,
    patrol,
    pauseT: 0,
    anim: "idle",
    animT: range(w.rng, 0, 40),
    flash: 0,
    spin: 0,
    rot: 0,
    counts: kind !== "sentry",
    hp: kind === "boss" ? 3 : 1,
    phase: 0,
    data: { hy: y, turnT: 0, burst: 0, active: 0 },
    wire: -1,
});

export const eyeY = (e: Enemy) => e.y - e.h + 5;

export const canSee = (w: World, e: Enemy) => {
    const p = w.player;
    if (p.state === "dead" || p.state === "cutscene") return false;
    const dx = p.x - e.x;
    const range_ = w.stage.def.dark ? (e.aware ? 200 : 110) : VIEW;
    if (Math.abs(dx) > range_) return false;
    const dy = chestY(p) - eyeY(e);
    if (Math.abs(dy) > 140) return false;
    const omni = e.kind === "launcher" || e.kind === "sentry" || e.kind === "drone";
    if (!e.aware && !omni && sign(dx) !== e.face && Math.abs(dx) > 14) return false;
    return lineOfSight(w, e.x, eyeY(e), p.x, chestY(p));
};

const becomeAware = (w: World, e: Enemy, saw: boolean) => {
    if (e.aware) return;
    e.aware = true;
    e.state = "alert";
    e.t = 0;
    e.vx = 0;
    const dx = w.player.x - e.x;
    if (dx !== 0 && e.kind !== "sentry") e.face = (dx > 0 ? 1 : -1) as Face;
    emit(w, "alert", e.x, e.y - e.h - 6, saw ? 1 : 0);
};

const aimAt = (w: World, e: Enemy, mx: number, my: number) => {
    const p = w.player;
    return Math.atan2(chestY(p) - my, p.x - mx);
};

const muzzle = (e: Enemy) => ({ x: e.x + e.face * 8, y: e.y - 14 });

export const fireBullet = (w: World, e: Enemy, x: number, y: number, a: number, speed: number, kind: "bullet" | "pellet" | "shuttle" | "note" | "bracket" = "bullet", life = 90, grav = 0) => {
    w.bullets.push({ id: w.nextId++, kind, x, y, px: x, py: y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, grav, owner: "enemy", life, from: e.id });
};

// Walk toward x, without stepping off ledges unless the Headhunter is below
const walkToward = (w: World, e: Enemy, tx: number, speed: number) => {
    const dx = tx - e.x;
    if (Math.abs(dx) < 3) {
        e.vx = approach(e.vx, 0, 0.4);
        return;
    }
    const dir = (dx > 0 ? 1 : -1) as Face;
    e.face = dir;
    const below = w.player.y > e.y + 8;
    if (e.ground && ledgeAhead(w, e, dir) && !below && e.kind !== "bug") {
        e.vx = approach(e.vx, 0, 0.5);
        return;
    }
    e.vx = approach(e.vx, dir * speed, 0.4);
};

const physics = (w: World, e: Enemy, dt: number) => {
    if (e.kind === "drone" || e.kind === "sentry" || e.kind === "launcher") return;
    if (!e.ground) e.vy = Math.min(e.vy + GRAV * dt, 7);
    const res = moveBody(w, e, e.vx * dt, e.vy * dt);
    if (res.hitX !== 0) e.vx = 0;
    if (res.hitY !== 0) e.vy = 0;
    e.ground = e.vy >= 0 && groundBelow(w, e);
    if (e.ground) e.vy = 0;
};

const strikeHits = (w: World, e: Enemy, reach: number) => {
    const p = w.player;
    if (p.state === "dead" || isInvulnerable(p)) return;
    const x1 = e.face > 0 ? e.x : e.x - reach;
    const x2 = e.face > 0 ? e.x + reach : e.x;
    const y1 = e.y - 22;
    const y2 = e.y - 2;
    if (p.x + p.w / 2 > x1 && p.x - p.w / 2 < x2 && p.y > y1 && p.y - p.h < y2) {
        killPlayer(w, e.kind === "firewall" ? "shield" : "punch", e.face > 0 ? -0.4 : Math.PI + 0.4);
    }
};

const touchKills = (w: World, e: Enemy) => {
    const p = w.player;
    if (p.state === "dead" || isInvulnerable(p)) return;
    if (Math.abs(p.x - e.x) < (p.w + e.w) / 2 - 1 && p.y > e.y - e.h + 1 && p.y - p.h < e.y - 1) {
        killPlayer(w, "bug", Math.atan2(p.y - e.y, p.x - e.x));
    }
};

const patrol = (w: World, e: Enemy, dt: number) => {
    const [a, b] = e.patrol!;
    if (e.pauseT > 0) {
        e.pauseT -= dt;
        e.vx = 0;
        if (e.pauseT <= 0) e.face = (e.face * -1) as Face;
        return;
    }
    const speed = EK[e.kind].walk;
    e.vx = e.face * speed;
    if ((e.face > 0 && e.x >= b) || (e.face < 0 && e.x <= a) || (e.ground && ledgeAhead(w, e, e.face) && e.kind !== "bug")) {
        e.vx = 0;
        e.pauseT = 50;
    }
};

const updateBouncer = (w: World, e: Enemy, dt: number) => {
    const p = w.player;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    switch (e.state) {
        case "chase":
            e.cd -= dt;
            if (Math.abs(dx) < 22 && Math.abs(dy) < 18 && e.cd <= 0) {
                e.state = "windup";
                e.t = 0;
                e.vx = 0;
                e.face = (dx > 0 ? 1 : -1) as Face;
            } else walkToward(w, e, p.x, EK[e.kind].run);
            break;
        case "windup":
            e.t += dt;
            e.vx = approach(e.vx, 0, 0.5 * dt);
            if (e.t >= 16) {
                e.state = "strike";
                e.t = 0;
                e.vx = e.face * 2.5;
                emit(w, "punch", e.x, e.y);
            }
            break;
        case "strike":
            e.t += dt;
            strikeHits(w, e, 22);
            e.vx = approach(e.vx, 0, 0.3 * dt);
            if (e.t >= 6) {
                e.state = "recover";
                e.t = 0;
            }
            break;
        case "recover":
            e.t += dt;
            e.vx = approach(e.vx, 0, 0.4 * dt);
            if (e.t >= 20) {
                e.state = "chase";
                e.cd = EK[e.kind].cd;
            }
            break;
    }
};

const updateShooter = (w: World, e: Enemy, dt: number, sees: boolean) => {
    const p = w.player;
    const k = EK[e.kind];
    const dx = p.x - e.x;
    switch (e.state) {
        case "chase":
            if (sees) {
                e.state = "aim";
                e.t = e.lostT < 30 && e.data.aimed ? k.aim * 0.4 : 0;
                e.vx = 0;
                e.lostT = 0;
            } else {
                e.lostT += dt;
                if (e.kind !== "drone") walkToward(w, e, p.x, k.run);
            }
            break;
        case "aim": {
            e.vx = approach(e.vx, 0, 0.5 * dt);
            if (dx !== 0) e.face = (dx > 0 ? 1 : -1) as Face;
            if (!sees) {
                e.lostT += dt;
                if (e.lostT > 20) {
                    e.state = "chase";
                    break;
                }
            } else e.lostT = 0;
            const m = muzzle(e);
            // The aim tracks until just before the shot, then locks
            if (e.t < k.aim - 5) e.aim = aimAt(w, e, m.x, m.y);
            e.t += dt;
            if (e.t >= k.aim) {
                e.data.aimed = 1;
                if (e.kind === "enforcer") {
                    for (let i = 0; i < 5; i++) fireBullet(w, e, m.x, m.y, e.aim + (i - 2) * 0.13 + range(w.rng, -0.03, 0.03), k.speed * range(w.rng, 0.9, 1.05), "pellet", 24);
                    emit(w, "shotgun", m.x, m.y);
                    e.vx = -e.face * 1.2;
                    shake(w, 2);
                } else {
                    fireBullet(w, e, m.x, m.y, e.aim + range(w.rng, -0.025, 0.025), k.speed);
                    emit(w, "shot", m.x, m.y);
                }
                w.fx.push({ kind: "muzzle", x: m.x, y: m.y, a: e.aim, t: 0, max: 4, follow: false });
                particle(w, "shell", e.x, e.y - 14, -e.face * range(w.fxRng, 0.5, 1.5), range(w.fxRng, -2.5, -1.5), 60, 0.2);
                noise(w, e.x, e.y, 220);
                e.state = "recover";
                e.t = 0;
            }
            break;
        }
        case "recover":
            e.t += dt;
            e.vx = approach(e.vx, 0, 0.2 * dt);
            if (e.t >= k.cd) {
                e.state = sees ? "aim" : "chase";
                e.t = sees ? k.aim * 0.35 : 0;
            }
            break;
    }
};

const updateFirewall = (w: World, e: Enemy, dt: number) => {
    const p = w.player;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const facing = sign(dx) === e.face || dx === 0;
    switch (e.state) {
        case "chase":
            e.cd -= dt;
            if (!facing) {
                // Heavy shield: slow to turn around, which is the opening
                e.vx = approach(e.vx, 0, 0.3 * dt);
                e.data.turnT += dt;
                if (e.data.turnT > 26) {
                    e.face = (e.face * -1) as Face;
                    e.data.turnT = 0;
                }
                break;
            }
            e.data.turnT = 0;
            if (Math.abs(dx) < 20 && Math.abs(dy) < 18 && e.cd <= 0) {
                e.state = "windup";
                e.t = 0;
                e.vx = 0;
            } else if (Math.abs(dx) > 14) {
                e.vx = approach(e.vx, e.face * EK.firewall.run, 0.2 * dt);
                if (e.ground && ledgeAhead(w, e, e.face) && !(p.y > e.y + 8)) e.vx = 0;
            } else e.vx = 0;
            break;
        case "windup":
            e.t += dt;
            if (e.t >= 20) {
                e.state = "strike";
                e.t = 0;
                e.vx = e.face * 3;
                emit(w, "punch", e.x, e.y);
            }
            break;
        case "strike":
            e.t += dt;
            strikeHits(w, e, 20);
            e.vx = approach(e.vx, 0, 0.4 * dt);
            if (e.t >= 6) {
                e.state = "recover";
                e.t = 0;
            }
            break;
        case "recover":
            e.t += dt;
            if (e.t >= 24) {
                e.state = "chase";
                e.cd = EK.firewall.cd;
            }
            break;
        case "block":
            e.t += dt;
            e.vx = approach(e.vx, 0, 0.2 * dt);
            if (e.t >= 14) e.state = "chase";
            break;
        case "stun":
            e.t += dt;
            e.vx = approach(e.vx, 0, 0.2 * dt);
            if (e.t >= 90) e.state = "chase";
            break;
    }
};

const updateBug = (w: World, e: Enemy, dt: number) => {
    const p = w.player;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    e.cd -= dt;
    touchKills(w, e);
    switch (e.state) {
        case "chase":
            if (e.ground && Math.abs(dx) < 56 && Math.abs(dy) < 24 && e.cd <= 0) {
                e.state = "leap";
                e.face = (dx > 0 ? 1 : -1) as Face;
                e.vx = e.face * 4.6;
                e.vy = -3.2;
                e.ground = false;
                e.cd = EK.bug.cd;
            } else walkToward(w, e, p.x, EK.bug.run);
            break;
        case "leap":
            if (e.ground) {
                e.state = "chase";
                e.vx *= 0.3;
            }
            break;
    }
};

const updateDrone = (w: World, e: Enemy, dt: number, sees: boolean) => {
    const p = w.player;
    const hy = e.data.hy;
    const bob = Math.sin((e.animT + e.id * 13) * 0.07) * 3;
    if (e.aware) {
        const side = p.x > e.x ? -1 : 1;
        const tx = clamp(p.x + side * 90, 20, w.stage.pw - 20);
        e.vx = approach(e.vx, clamp((tx - e.x) * 0.05, -EK.drone.run, EK.drone.run), 0.1 * dt);
    } else e.vx = approach(e.vx, 0, 0.1 * dt);
    e.vy = (hy + bob - e.y) * 0.1;
    const res = moveBody(w, e, e.vx * dt, e.vy * dt);
    if (res.hitX) e.vx = 0;
    if (e.aware) updateShooter(w, e, dt, sees);
};

const updateLauncher = (w: World, e: Enemy, dt: number, sees: boolean) => {
    const p = w.player;
    if (e.state === "alert") return;
    e.cd -= dt;
    if (!sees || e.cd > 0) return;
    const x0 = e.x + e.face * 8;
    const y0 = e.y - 16;
    const tx = p.x + p.vx * 8;
    const ty = chestY(p);
    const dx = tx - x0;
    const vx = sign(dx || e.face) * clamp(Math.abs(dx) / 34, 2.4, 5.2);
    const T = Math.max(8, Math.abs(dx / vx));
    const g = 0.14;
    const vy = (ty - y0 - 0.5 * g * T * T) / T;
    w.bullets.push({ id: w.nextId++, kind: "shuttle", x: x0, y: y0, px: x0, py: y0, vx, vy, grav: g, owner: "enemy", life: 200, from: e.id });
    e.face = (dx > 0 ? 1 : -1) as Face;
    e.cd = EK.launcher.cd;
    e.anim = "fire";
    e.animT = 0;
    emit(w, "shot", x0, y0, 0.4);
};

const updateSentry = (w: World, e: Enemy, dt: number, sees: boolean) => {
    if (e.data.active <= 0) return;
    e.data.active -= dt;
    const p = w.player;
    const mx = e.x;
    const my = e.y + 8;
    if (sees) e.aim = Math.atan2(chestY(p) - my, p.x - mx);
    e.cd -= dt;
    if (e.cd <= 0 && sees) {
        e.data.burst = 3;
        e.cd = EK.sentry.cd;
    }
    if (e.data.burst > 0) {
        e.data.t = (e.data.t ?? 0) - dt;
        if (e.data.t <= 0) {
            fireBullet(w, e, mx + Math.cos(e.aim) * 7, my + Math.sin(e.aim) * 7, e.aim + range(w.rng, -0.02, 0.02), EK.sentry.speed);
            w.fx.push({ kind: "muzzle", x: mx + Math.cos(e.aim) * 7, y: my + Math.sin(e.aim) * 7, a: e.aim, t: 0, max: 4, follow: false });
            emit(w, "shot", mx, my, 0.8);
            e.data.burst--;
            e.data.t = 6;
        }
    }
};

const updateCorpse = (w: World, e: Enemy, dt: number) => {
    e.t += dt;
    if (e.kind === "sentry") return;
    const g = e.kind === "drone" ? 0.25 : 0.3;
    e.vy = Math.min(e.vy + g * dt, 8);
    const res = moveBody(w, e, e.vx * dt, e.vy * dt);
    if (res.hitX !== 0) {
        e.vx *= -0.35;
        spawnSparks(w, e.x, e.y - e.h / 2, e.vx > 0 ? 0 : Math.PI, 3);
    }
    if (res.hitY === 1) {
        if (e.vy > 1.8) {
            e.vy = -e.vy * 0.28;
            e.vx *= 0.65;
            if (e.kind === "drone" && !e.data.boom) {
                e.data.boom = 1;
                spawnSparks(w, e.x, e.y - 4, -Math.PI / 2, 14, 1.4);
                shake(w, 2);
            }
        } else e.vy = 0;
    }
    if (res.hitY === -1) e.vy = Math.abs(e.vy) * 0.3;
    e.ground = e.vy >= 0 && groundBelow(w, e);
    if (e.ground) {
        e.vx = approach(e.vx, 0, 0.18 * dt);
        e.rot = approach(e.rot, 0, 0.3 * dt);
    } else e.rot += e.spin * dt;
    // Oil leaks for a little while
    if (e.t < 50 && Math.floor(e.t) % 5 === 0 && e.kind !== "launcher") {
        particle(w, "oil", e.x, e.y - e.h / 2, e.vx * 0.3, 0.3, 60, 0.2, true, 0);
    }
    e.anim = e.ground && Math.abs(e.vx) < 0.4 ? "dead" : "hurt";
};

export const updateEnemies = (w: World) => {
    const dt = w.scale;
    for (const e of w.enemies) {
        e.animT += dt;
        if (e.flash > 0) e.flash--;
        if (e.state === "dead") {
            updateCorpse(w, e, dt);
            continue;
        }
        if (e.kind === "boss") {
            updateBoss(w, e, dt);
            continue;
        }
        if (w.dead) {
            // The Headhunter is down; everyone stops where they are
            e.vx = approach(e.vx, 0, 0.3 * dt);
            physics(w, e, dt);
            continue;
        }
        if (e.hearT > 0) {
            e.hearT -= dt;
            if (e.hearT <= 0) becomeAware(w, e, false);
        }
        const sees = canSee(w, e);
        if (!e.aware && sees && e.kind !== "sentry") becomeAware(w, e, true);

        if (e.state === "idle" || e.state === "patrol") {
            if (e.patrol) {
                e.state = "patrol";
                patrol(w, e, dt);
            } else e.vx = approach(e.vx, 0, 0.3 * dt);
        } else if (e.state === "alert") {
            e.t += dt;
            e.vx = approach(e.vx, 0, 0.4 * dt);
            if (e.t >= EK[e.kind].alert) {
                e.state = "chase";
                e.t = 0;
            }
        } else {
            switch (e.kind) {
                case "bouncer":
                    updateBouncer(w, e, dt);
                    break;
                case "guard":
                case "enforcer":
                    updateShooter(w, e, dt, sees);
                    break;
                case "firewall":
                    updateFirewall(w, e, dt);
                    break;
                case "bug":
                    updateBug(w, e, dt);
                    break;
            }
        }
        if (e.kind === "drone") updateDrone(w, e, dt, sees);
        else if (e.kind === "launcher") updateLauncher(w, e, dt, sees);
        else if (e.kind === "sentry") updateSentry(w, e, dt, sees);
        else physics(w, e, dt);

        e.anim = animFor(e);
    }
};

const animFor = (e: Enemy): string => {
    if (e.kind === "launcher") return e.anim === "fire" && e.animT < 12 ? "fire" : "idle";
    switch (e.state) {
        case "alert":
            return "alert";
        case "aim":
        case "recover":
            return e.kind === "guard" || e.kind === "enforcer" || e.kind === "drone" ? (e.state === "recover" && e.t < 6 ? "fire" : "aim") : "idle";
        case "windup":
            return "windup";
        case "strike":
            return "strike";
        case "block":
            return "block";
        case "stun":
            return "stun";
        case "leap":
            return "leap";
        default:
            return Math.abs(e.vx) > 1.6 ? "run" : Math.abs(e.vx) > 0.2 ? "walk" : "idle";
    }
};

export const tileOf = (v: number) => Math.floor(v / TILE);
