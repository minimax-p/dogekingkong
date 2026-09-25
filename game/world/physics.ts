// Tile collision for anything with a box: move one axis at a time and stop
// at walls, floors, ceilings, closed doors and (when falling) platforms.
import { TILE } from "@/game/engine/constants";
import { T_PLATFORM, T_SOLID, tileAt } from "@/game/world/stage";
import type { Body, Door, World } from "@/game/world/types";

const EPS = 0.001;
export const DOOR_W = 4;

export const doorRect = (d: Door) => ({
    x1: d.tx * TILE + TILE / 2 - DOOR_W / 2,
    x2: d.tx * TILE + TILE / 2 + DOOR_W / 2,
    y1: d.ty * TILE,
    y2: (d.ty + d.h) * TILE,
});

const doorBlocks = (w: World, x1: number, y1: number, x2: number, y2: number): Door | null => {
    for (const d of w.doors) {
        if (d.open) continue;
        const r = doorRect(d);
        if (x2 > r.x1 && x1 < r.x2 && y2 > r.y1 && y1 < r.y2) return d;
    }
    return null;
};

export type MoveResult = { hitX: -1 | 0 | 1; hitY: -1 | 0 | 1; door: Door | null };

export const moveBody = (w: World, b: Body, dx: number, dy: number, drop = false): MoveResult => {
    const s = w.stage;
    const res: MoveResult = { hitX: 0, hitY: 0, door: null };
    const hw = b.w / 2;

    // Horizontal
    if (dx !== 0) {
        let nx = b.x + dx;
        const top = b.y - b.h + EPS;
        const bot = b.y - EPS;
        const ty1 = Math.floor(top / TILE);
        const ty2 = Math.floor(bot / TILE);
        if (dx > 0) {
            const tx = Math.floor((nx + hw - EPS) / TILE);
            for (let ty = ty1; ty <= ty2; ty++) {
                if (tileAt(s, tx, ty) === T_SOLID) {
                    nx = tx * TILE - hw;
                    res.hitX = 1;
                    break;
                }
            }
        } else {
            const tx = Math.floor((nx - hw + EPS) / TILE);
            for (let ty = ty1; ty <= ty2; ty++) {
                if (tileAt(s, tx, ty) === T_SOLID) {
                    nx = (tx + 1) * TILE + hw;
                    res.hitX = -1;
                    break;
                }
            }
        }
        const d = doorBlocks(w, nx - hw, top, nx + hw, bot);
        if (d) {
            const r = doorRect(d);
            if (dx > 0 && b.x + hw <= r.x1 + EPS * 10) {
                nx = r.x1 - hw;
                res.hitX = 1;
                res.door = d;
            } else if (dx < 0 && b.x - hw >= r.x2 - EPS * 10) {
                nx = r.x2 + hw;
                res.hitX = -1;
                res.door = d;
            }
        }
        b.x = nx;
    }

    // Vertical
    if (dy !== 0) {
        let ny = b.y + dy;
        const tx1 = Math.floor((b.x - hw + EPS) / TILE);
        const tx2 = Math.floor((b.x + hw - EPS) / TILE);
        if (dy > 0) {
            const ty = Math.floor((ny - EPS) / TILE);
            const prevBottom = b.y;
            for (let tx = tx1; tx <= tx2; tx++) {
                const t = tileAt(s, tx, ty);
                const top = ty * TILE;
                if (t === T_SOLID || (t === T_PLATFORM && !drop && prevBottom <= top + EPS * 10)) {
                    ny = top;
                    res.hitY = 1;
                    break;
                }
            }
        } else {
            const ty = Math.floor((ny - b.h + EPS) / TILE);
            for (let tx = tx1; tx <= tx2; tx++) {
                if (tileAt(s, tx, ty) === T_SOLID) {
                    ny = (ty + 1) * TILE + b.h;
                    res.hitY = -1;
                    break;
                }
            }
        }
        b.y = ny;
    }
    return res;
};

// Is there something to stand on right under the feet?
export const groundBelow = (w: World, b: Body, drop = false) => {
    const s = w.stage;
    const hw = b.w / 2;
    const ty = Math.floor((b.y + 0.5) / TILE);
    if (Math.abs(b.y - ty * TILE) > 0.01) return false;
    const tx1 = Math.floor((b.x - hw + EPS) / TILE);
    const tx2 = Math.floor((b.x + hw - EPS) / TILE);
    for (let tx = tx1; tx <= tx2; tx++) {
        const t = tileAt(s, tx, ty);
        if (t === T_SOLID || (t === T_PLATFORM && !drop)) return true;
    }
    return false;
};

export const onPlatform = (w: World, b: Body) => {
    const s = w.stage;
    const hw = b.w / 2;
    const ty = Math.floor((b.y + 0.5) / TILE);
    const tx1 = Math.floor((b.x - hw + EPS) / TILE);
    const tx2 = Math.floor((b.x + hw - EPS) / TILE);
    let plat = false;
    for (let tx = tx1; tx <= tx2; tx++) {
        const t = tileAt(s, tx, ty);
        if (t === T_SOLID) return false;
        if (t === T_PLATFORM) plat = true;
    }
    return plat;
};

// Wall directly beside the body (for wall slides and jumps)
export const wallBeside = (w: World, b: Body, side: -1 | 1) => {
    const s = w.stage;
    const x = side > 0 ? b.x + b.w / 2 + 1 : b.x - b.w / 2 - 1;
    const tx = Math.floor(x / TILE);
    const ty1 = Math.floor((b.y - b.h + 4) / TILE);
    const ty2 = Math.floor((b.y - 4) / TILE);
    for (let ty = ty1; ty <= ty2; ty++) if (tileAt(s, tx, ty) !== T_SOLID) return false;
    return true;
};

// Would stepping forward walk off a ledge?
export const ledgeAhead = (w: World, b: Body, side: -1 | 1) => {
    const x = b.x + side * (b.w / 2 + 2);
    const tx = Math.floor(x / TILE);
    const ty = Math.floor((b.y + 1) / TILE);
    return tileAt(w.stage, tx, ty) === 0;
};

// Walk a line through the tile grid; returns the first point that hits a wall
export const rayHit = (w: World, x1: number, y1: number, x2: number, y2: number, doors = true): { x: number; y: number } | null => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;
    const steps = Math.ceil(len / 4);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + dx * t;
        const y = y1 + dy * t;
        if (tileAt(w.stage, Math.floor(x / TILE), Math.floor(y / TILE)) === T_SOLID) return { x, y };
        if (doors && doorBlocks(w, x - 0.5, y - 0.5, x + 0.5, y + 0.5)) return { x, y };
    }
    return null;
};

export const lineOfSight = (w: World, x1: number, y1: number, x2: number, y2: number) => rayHit(w, x1, y1, x2, y2) === null;
