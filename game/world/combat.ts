// What a slash touches: enemies die, bullets fly back, doors burst open.
import { STOP_DEFLECT, TILE } from "@/game/engine/constants";
import { angleDiff } from "@/game/engine/math";
import { attackActive, chestY, P } from "@/game/world/player";
import { emit, kickDoor, killEnemy, shake, spawnSparks } from "@/game/world/common";
import { hitBoss } from "@/game/world/boss";
import type { Enemy, World } from "@/game/world/types";

const inArc = (w: World, x: number, y: number, extra: number) => {
    const p = w.player;
    const cx = p.x;
    const cy = chestY(p);
    const d = Math.hypot(x - cx, y - cy);
    if (d > P.atkReach + extra) return false;
    if (d < 10) return true;
    return Math.abs(angleDiff(p.aim, Math.atan2(y - cy, x - cx))) <= P.atkArc;
};

// A shield stops slashes that come from the side it's facing
export const shieldFacing = (e: Enemy, fromX: number) => e.kind === "firewall" && e.state !== "stun" && e.state !== "dead" && Math.sign(fromX - e.x) === e.face;

export const processSlash = (w: World) => {
    const p = w.player;
    if (!attackActive(p)) return;

    for (const e of w.enemies) {
        if (e.state === "dead" || p.atkHits.includes(e.id)) continue;
        if (e.kind === "sentry") continue;
        const ey = e.y - e.h / 2;
        const reach = Math.max(e.w, e.h) / 2;
        if (!inArc(w, e.x, ey, reach)) continue;
        p.atkHits.push(e.id);
        if (shieldFacing(e, p.x)) {
            // Clang: both sides bounce off
            p.vx = -Math.sign(e.x - p.x) * 3.2;
            e.vx = Math.sign(e.x - p.x) * 1.5;
            e.state = "block";
            e.t = 0;
            w.hitstop = Math.max(w.hitstop, STOP_DEFLECT);
            w.fx.push({ kind: "clang", x: e.x - e.face * -6, y: ey, a: 0, t: 0, max: 8, follow: false });
            spawnSparks(w, e.x + e.face * 6, ey, Math.atan2(chestY(p) - ey, p.x - e.x), 10);
            shake(w, 2);
            emit(w, "clang", e.x, ey);
            continue;
        }
        if (e.kind === "boss") {
            hitBoss(w, e, p.aim);
            continue;
        }
        killEnemy(w, e, p.aim, 6.5, "slash");
    }

    for (const b of w.bullets) {
        if (b.owner !== "enemy" || b.kind === "wave") continue;
        if (!inArc(w, b.x, b.y, 8)) continue;
        const speed = Math.max(10, Math.hypot(b.vx, b.vy) * 1.25);
        b.vx = Math.cos(p.aim) * speed;
        b.vy = Math.sin(p.aim) * speed;
        b.grav = 0;
        b.owner = "player";
        b.life = 120;
        b.from = -1;
        w.deflects++;
        w.hitstop = Math.max(w.hitstop, STOP_DEFLECT);
        w.ca = Math.max(w.ca, 0.8);
        w.fx.push({ kind: "deflect", x: b.x, y: b.y, a: p.aim, t: 0, max: 8, follow: false });
        spawnSparks(w, b.x, b.y, p.aim, 7, 0.5);
        shake(w, 2);
        emit(w, "deflect", b.x, b.y);
    }

    for (const d of w.doors) {
        if (d.open) continue;
        const dx = d.tx * TILE + TILE / 2;
        for (let ty = d.ty; ty < d.ty + d.h; ty++) {
            if (inArc(w, dx, ty * TILE + TILE / 2, 4)) {
                kickDoor(w, d, dx > p.x ? 1 : -1);
                break;
            }
        }
    }
};
