// The Headhunter: run, jump, wall-jump, roll, slash, throw. Numbers are per
// step of the Headhunter's own time, which runs at 0.45× in slow motion.
import { STOP_DOOR } from "@/game/engine/constants";
import type { Input } from "@/game/engine/input";
import { approach, clamp, lerp } from "@/game/engine/math";
import { groundBelow, moveBody, onPlatform, wallBeside } from "@/game/world/physics";
import type { Face, Player, World } from "@/game/world/types";
import { emit, kickDoor, spawnDust } from "@/game/world/common";

export const P = {
    w: 8,
    h: 22,
    hCrouch: 12,
    run: 3.4,
    accGround: 0.6,
    decGround: 0.8,
    accAir: 0.35,
    dragAir: 0.12,
    grav: 0.32,
    maxFall: 7,
    jump: 5.6,
    jumpCut: 0.45,
    coyote: 6,
    jumpBuf: 6,
    atkBuf: 6,
    wallSlide: 1.6,
    wallJumpX: 3.6,
    wallJumpY: 5.2,
    wallLock: 8,
    rollT: 20,
    rollV0: 4.6,
    rollV1: 3.0,
    rollIFrom: 2,
    rollITo: 16,
    rollCd: 8,
    atkT: 14,
    atkFrom: 1,
    atkTo: 7,
    atkCd: 22,
    atkReach: 32,
    atkArc: (75 * Math.PI) / 180,
    lungeGround: 4.2,
    lungeAir: 5.2,
    lungeAirLater: 3.4,
    kickT: 10,
    throwSpeed: 11,
} as const;

export const SCARF_LEN = 9;

export const makePlayer = (x: number, y: number, face: Face): Player => ({
    x,
    y,
    vx: 0,
    vy: 0,
    w: P.w,
    h: P.h,
    ground: true,
    face,
    state: "move",
    t: 0,
    coyote: 0,
    jumpBuf: 0,
    atkBuf: 0,
    throwBuf: 0,
    jumpCut: false,
    wall: 0,
    wallSlide: false,
    wallLock: 0,
    flipT: 99,
    atkCd: 0,
    airAtk: 0,
    aim: 0,
    atkHits: [],
    crouch: false,
    dropT: 0,
    rollCd: 0,
    held: null,
    throwT: 0,
    landT: 0,
    anim: "idle",
    animT: 0,
    stepT: 0,
    scarf: Array.from({ length: SCARF_LEN }, (_, i) => ({ x: x - face * i * 2, y: y - 19 + i * 0.5, px: x - face * i * 2, py: y - 19 + i * 0.5 })),
    ghosts: [],
    ghostT: 0,
    killedBy: "",
});

export const chestY = (p: Player) => p.y - (p.crouch || p.state === "roll" ? 8 : 14);

export const isInvulnerable = (p: Player) => p.state === "roll" && p.t >= P.rollIFrom && p.t <= P.rollITo;

export const attackActive = (p: Player) => p.state === "attack" && p.t >= P.atkFrom && p.t <= P.atkTo;

// Presses are buffered in real steps, so a click during hit-stop or slow
// motion still happens as soon as it can.
export const bufferInput = (p: Player, inp: Input) => {
    p.jumpBuf = inp.jump ? P.jumpBuf : Math.max(0, p.jumpBuf - 1);
    p.atkBuf = inp.attack ? P.atkBuf : Math.max(0, p.atkBuf - 1);
    p.throwBuf = inp.throw ? P.atkBuf : Math.max(0, p.throwBuf - 1);
    if (inp.ax !== 0 || inp.ay !== 0) p.aim = Math.atan2(inp.ay, inp.ax);
};

const setHeight = (w: World, p: Player, h: number) => {
    if (h === p.h) return;
    if (h > p.h) {
        // Only stand up if there's headroom
        const test = { ...p, h };
        const before = test.y;
        moveBody(w, test, 0, -0.01);
        if (test.y !== before - 0.01) return;
    }
    p.h = h;
};

const startAttack = (w: World, p: Player) => {
    p.state = "attack";
    p.t = 0;
    p.atkCd = P.atkCd;
    p.atkBuf = 0;
    p.atkHits = [];
    const a = p.aim;
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    if (Math.abs(cx) > 0.15) p.face = cx > 0 ? 1 : -1;
    if (p.ground) {
        p.vx = cx * P.lungeGround;
        if (sy < -0.35) {
            p.vy = sy * 5;
            p.ground = false;
        }
    } else if (p.airAtk === 0) {
        p.vx = cx * P.lungeAir;
        p.vy = sy < 0 ? sy * P.lungeAir : Math.max(p.vy, sy * P.lungeAir);
        p.airAtk++;
    } else {
        p.vx = cx * P.lungeAirLater;
        if (sy > 0.3) p.vy = Math.max(p.vy, sy * 3);
        p.airAtk++;
    }
    p.wallSlide = false;
    w.fx.push({ kind: "slash", x: p.x, y: chestY(p), a, t: 0, max: 10, follow: true });
    emit(w, "slash", p.x, chestY(p));
};

const startRoll = (w: World, p: Player) => {
    p.state = "roll";
    p.t = 0;
    if (p.vx !== 0) p.face = p.vx > 0 ? 1 : -1;
    p.vx = p.face * P.rollV0;
    setHeight(w, p, P.hCrouch);
    p.crouch = false;
    emit(w, "roll", p.x, p.y);
    spawnDust(w, p.x - p.face * 4, p.y, 3);
};

export const updatePlayer = (w: World, inp: Input) => {
    const p = w.player;
    bufferInput(p, inp);
    if (p.state === "dead") return updateDeadPlayer(w, p);
    if (p.state === "cutscene") return;

    const dt = w.pscale;
    // Slashes stay snappy in slow motion: they run at up to 0.7× instead of 0.45×
    const adt = p.state === "attack" ? Math.max(dt, lerp(1, 0.7, 1 - (w.scale - 0.2) / 0.8)) : dt;

    p.atkCd -= adt;
    p.wallLock -= dt;
    p.dropT -= dt;
    p.rollCd -= dt;
    p.throwT -= dt;
    p.landT -= dt;
    p.coyote -= dt;
    p.flipT += dt;

    const mx = p.wallLock > 0 ? 0 : inp.mx;
    const wasGround = p.ground;
    let jumped = false;

    // Throw or pick up (doesn't interrupt anything)
    if (p.throwBuf > 0) {
        p.throwBuf = 0;
        throwOrPickUp(w, p);
    }

    if (p.state === "move") {
        // Horizontal
        const target = p.crouch ? 0 : mx * P.run;
        if (p.ground) {
            const acc = target !== 0 && (Math.sign(target) === Math.sign(p.vx) || p.vx === 0) && Math.abs(target) >= Math.abs(p.vx) ? P.accGround : P.decGround;
            p.vx = approach(p.vx, target, acc * dt);
        } else {
            p.vx = approach(p.vx, target, (target !== 0 ? P.accAir : P.dragAir) * dt);
        }
        if (mx !== 0 && p.ground) p.face = mx > 0 ? 1 : -1;
        if (mx !== 0 && !p.ground && !p.wallSlide && p.wallLock <= 0) p.face = mx > 0 ? 1 : -1;

        // Crouch, drop through a platform, or roll
        if (p.ground) {
            if (inp.downPressed && mx !== 0 && p.rollCd <= 0) {
                startRoll(w, p);
            } else if (inp.downPressed && mx === 0 && onPlatform(w, p)) {
                p.dropT = 10;
                p.ground = false;
                p.y += 1;
            }
        }
        if (p.state === "move") {
            const wantCrouch = p.ground && inp.down && mx === 0;
            if (wantCrouch !== p.crouch) {
                setHeight(w, p, wantCrouch ? P.hCrouch : P.h);
                p.crouch = p.h === P.hCrouch;
            }
        }

        // Jumps
        if (p.state === "move" && p.jumpBuf > 0) {
            if (p.ground || p.coyote > 0) {
                p.vy = -P.jump;
                p.ground = false;
                p.coyote = 0;
                p.jumpBuf = 0;
                p.jumpCut = false;
                jumped = true;
                setHeight(w, p, P.h);
                p.crouch = false;
                emit(w, "jump", p.x, p.y);
                spawnDust(w, p.x, p.y, 2);
            } else if (p.wall !== 0) {
                const side = p.wall;
                p.vx = -side * P.wallJumpX;
                p.vy = -P.wallJumpY;
                p.face = -side as Face;
                p.wallLock = P.wallLock;
                p.wallSlide = false;
                p.flipT = 0;
                p.jumpBuf = 0;
                p.jumpCut = false;
                p.airAtk = 0;
                jumped = true;
                emit(w, "walljump", p.x, p.y);
                spawnDust(w, p.x + side * 4, p.y - 8, 2);
            }
        }

        if (p.state === "move" && p.atkBuf > 0 && p.atkCd <= 0) startAttack(w, p);
    } else if (p.state === "roll") {
        p.t += dt;
        const k = clamp(p.t / P.rollT, 0, 1);
        if (p.ground) p.vx = p.face * lerp(P.rollV0, P.rollV1, k);
        if (p.t >= P.rollT) {
            p.state = "move";
            p.t = 0;
            p.rollCd = P.rollCd;
            setHeight(w, p, P.h);
            p.crouch = p.h === P.hCrouch;
            if (p.crouch && !inp.down) setHeight(w, p, P.h);
        } else if (p.t > 10 && p.jumpBuf > 0 && p.ground) {
            // Jump out of the back half of a roll
            p.state = "move";
            setHeight(w, p, P.h);
            p.vy = -P.jump;
            p.ground = false;
            p.jumpBuf = 0;
            p.jumpCut = false;
            jumped = true;
            emit(w, "jump", p.x, p.y);
        } else if (p.t > 12 && p.atkBuf > 0 && p.atkCd <= 0) {
            setHeight(w, p, P.h);
            startAttack(w, p);
        }
    } else if (p.state === "attack") {
        p.t += adt;
        if (p.ground) p.vx = approach(p.vx, mx * P.run * 0.4, 0.28 * adt);
        else p.vx = approach(p.vx, mx * P.run, 0.1 * adt);
        if (p.t >= P.atkT) {
            p.state = "move";
            p.t = 0;
        }
    } else if (p.state === "kick") {
        p.t += dt;
        p.vx = approach(p.vx, 0, 0.5 * dt);
        if (p.t >= P.kickT) {
            p.state = "move";
            p.t = 0;
        }
    }

    // Gravity (a slash hangs you in the air for a moment)
    const hang = p.state === "attack" && p.t < 6 && !p.ground ? 0.45 : 1;
    const g = P.grav * hang;
    if (!p.ground) {
        if (p.vy < 0 && !inp.jumpHeld && !p.jumpCut && p.state === "move" && p.flipT > 6) {
            p.vy *= P.jumpCut;
            p.jumpCut = true;
        }
        p.vy = Math.min(p.vy + g * (p.state === "attack" ? adt : dt), P.maxFall);
    }

    // Wall slide
    p.wallSlide = false;
    if (!p.ground && p.state === "move" && p.vy > 0 && p.wall !== 0 && inp.mx === p.wall) {
        p.vy = Math.min(p.vy, P.wallSlide);
        p.wallSlide = true;
        p.face = p.wall as Face;
        p.airAtk = 0;
    }

    // Move
    const k = p.state === "attack" ? adt : dt;
    const vyBefore = p.vy;
    const res = moveBody(w, p, p.vx * k, p.vy * k, p.dropT > 0);
    if (res.door && p.state !== "roll" && Math.abs(p.vx) > 0.5) {
        kickDoor(w, res.door, p.vx > 0 ? 1 : -1);
        if (p.state === "move") {
            p.state = "kick";
            p.t = 0;
        }
        w.hitstop = Math.max(w.hitstop, STOP_DOOR);
    }
    if (res.hitX !== 0 && p.state !== "roll") p.vx = 0;
    if (res.hitY === -1) p.vy = Math.max(0, p.vy);
    if (res.hitY === 1) {
        if (!wasGround && vyBefore > 2) {
            p.landT = 6;
            emit(w, "land", p.x, p.y, vyBefore);
            spawnDust(w, p.x, p.y, vyBefore > 5 ? 4 : 2);
        }
        p.vy = 0;
    }
    p.ground = p.vy >= 0 && groundBelow(w, p, p.dropT > 0);
    if (p.ground) {
        p.airAtk = 0;
        p.vy = 0;
    }
    if (wasGround && !p.ground && !jumped && p.vy >= 0) p.coyote = P.coyote;

    // Walls
    p.wall = 0;
    if (!p.ground) {
        if (wallBeside(w, p, 1)) p.wall = 1;
        else if (wallBeside(w, p, -1)) p.wall = -1;
    }

    // Footsteps
    if (p.ground && p.state === "move" && Math.abs(p.vx) > 1.5) {
        p.stepT += dt * Math.abs(p.vx) / P.run;
        if (p.stepT >= 10) {
            p.stepT = 0;
            emit(w, "step", p.x, p.y);
        }
    }

    updateAnim(w, p, inp);
    updateScarf(w, p);
    updateGhosts(w, p);
};

const throwOrPickUp = (w: World, p: Player) => {
    if (p.held) {
        const a = p.aim;
        w.items.push({
            id: w.nextId++,
            kind: p.held,
            x: p.x + Math.cos(a) * 6,
            y: chestY(p) + Math.sin(a) * 6,
            vx: Math.cos(a) * P.throwSpeed,
            vy: Math.sin(a) * P.throwSpeed,
            state: "thrown",
            rot: 0,
        });
        p.held = null;
        p.throwT = 10;
        emit(w, "throw", p.x, chestY(p));
        return;
    }
    let best = -1;
    let bestD = 1e9;
    w.items.forEach((it, i) => {
        if (it.state !== "ground") return;
        const d = Math.abs(it.x - p.x);
        if (d < 18 && Math.abs(it.y - p.y) < 20 && d < bestD) {
            best = i;
            bestD = d;
        }
    });
    if (best >= 0) {
        p.held = w.items[best].kind;
        emit(w, "pickup", p.x, p.y);
        w.items.splice(best, 1);
    }
};

const updateDeadPlayer = (w: World, p: Player) => {
    const dt = w.scale;
    p.t += dt;
    p.vy = Math.min(p.vy + P.grav * dt, P.maxFall);
    const res = moveBody(w, p, p.vx * dt, p.vy * dt);
    if (res.hitX !== 0) p.vx *= -0.3;
    if (res.hitY === 1) {
        p.vy = Math.abs(p.vy) > 2 ? -p.vy * 0.25 : 0;
        p.vx *= 0.7;
    }
    p.ground = groundBelow(w, p);
    if (p.ground) p.vx = approach(p.vx, 0, 0.25 * dt);
    p.anim = p.ground && Math.abs(p.vx) < 0.5 ? "dead" : "hurt";
    p.animT += dt;
    updateScarf(w, p);
};

const updateAnim = (w: World, p: Player, inp: Input) => {
    const dt = p.state === "attack" ? Math.max(w.pscale, 0.7) : w.pscale;
    let next: string;
    if (p.state === "roll") next = "roll";
    else if (p.state === "attack") next = "attack";
    else if (p.state === "kick") next = "kick";
    else if (!p.ground) {
        if (p.wallSlide) next = "wallslide";
        else if (p.flipT < 14) next = "flip";
        else next = p.vy < -1 ? "jump" : p.vy < 1.5 ? "apex" : "fall";
    } else if (p.crouch) next = "crouch";
    else if (Math.abs(p.vx) > 0.4 && inp.mx !== 0) next = "run";
    else if (Math.abs(p.vx) > 0.4) next = "stop";
    else if (p.landT > 0) next = "land";
    else next = "idle";
    if (next !== p.anim) {
        // Keep the run cycle's phase when coming back from a short stop
        p.anim = next;
        p.animT = 0;
    } else {
        p.animT += dt * (next === "run" ? Math.max(0.6, Math.abs(p.vx) / P.run) : 1);
    }
};

// The scarf is a short rope pinned to the neck. It trails behind on dashes,
// flutters while running and hangs when still.
const updateScarf = (w: World, p: Player) => {
    const dt = w.pscale;
    const s = p.scarf;
    const neckX = p.x - p.face * 1;
    const neckY = p.y - (p.state === "roll" ? 8 : p.crouch ? 9 : p.h - 4);
    s[0].px = s[0].x;
    s[0].py = s[0].y;
    s[0].x = neckX;
    s[0].y = neckY;
    const speed = Math.min(1.6, Math.hypot(p.vx, p.vy) / P.run);
    const wind = -p.face * 0.08 * dt;
    for (let i = 1; i < s.length; i++) {
        const q = s[i];
        const vx = (q.x - q.px) * 0.86;
        const vy = (q.y - q.py) * 0.86;
        q.px = q.x;
        q.py = q.y;
        q.x += vx + wind;
        q.y += vy + 0.12 * dt * (1.3 - speed * 0.5) + Math.sin((w.step * 0.25 + i) * 0.9) * 0.05 * speed * dt;
    }
    for (let iter = 0; iter < 3; iter++) {
        for (let i = 1; i < s.length; i++) {
            const a = s[i - 1];
            const b = s[i];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 1;
            const rest = 2.2;
            const f = (d - rest) / d;
            if (i === 1) {
                b.x -= dx * f;
                b.y -= dy * f;
            } else {
                a.x += dx * f * 0.5;
                a.y += dy * f * 0.5;
                b.x -= dx * f * 0.5;
                b.y -= dy * f * 0.5;
            }
        }
    }
};

// Afterimages while dashing, rolling, slashing or in slow motion
const updateGhosts = (w: World, p: Player) => {
    for (const g of p.ghosts) g.life -= 1;
    p.ghosts = p.ghosts.filter((g) => g.life > 0);
    const fast = p.state === "roll" || (p.state === "attack" && p.t < 8) || w.focus > 0.3 || Math.abs(p.vx) > P.run + 0.6;
    p.ghostT += 1;
    if (fast && p.ghostT >= (w.focus > 0.3 ? 4 : 3)) {
        p.ghostT = 0;
        p.ghosts.push({ x: p.x, y: p.y, anim: p.anim, frame: p.animT, face: p.face, life: w.focus > 0.3 ? 16 : 10 });
    }
};

