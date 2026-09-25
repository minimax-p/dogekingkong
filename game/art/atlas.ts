// Bakes every animation into canvases once, facing both ways.
import { botAnims, BOTS, HEADHUNTER, HH_ANIMS, type Anim } from "@/game/art/characters";
import { flipBuf, makeBuf, toCanvas, whiteBuf, type Buf } from "@/game/art/pixels";
import { CELL, drawPose, ORIGIN_Y, type Look } from "@/game/art/rig";
import { SMALL_SPRITES } from "@/game/art/small";

export type Sprite = {
    r: HTMLCanvasElement[]; // facing right
    l: HTMLCanvasElement[]; // facing left
    white: HTMLCanvasElement[]; // hit flash (right)
    whiteL: HTMLCanvasElement[];
    fps: number;
    loop: boolean;
    ox: number; // feet position within the frame
    oy: number;
    w: number;
    h: number;
};

// Drop the frame so its lowest pixel sits on the ground line
const settle = (b: Buf): Buf => {
    let low = -1;
    for (let y = b.h - 1; y >= 0 && low < 0; y--) {
        for (let x = 0; x < b.w; x++) if (b.d[y * b.w + x] >>> 24) {
            low = y;
            break;
        }
    }
    if (low < 0) return b;
    const shift = ORIGIN_Y - low;
    const o = makeBuf(b.w, b.h);
    for (let y = 0; y < b.h; y++) {
        const sy = y - shift;
        if (sy < 0 || sy >= b.h) continue;
        o.d.set(b.d.subarray(sy * b.w, sy * b.w + b.w), y * b.w);
    }
    return o;
};

const fromBufs = (bufs: Buf[], fps: number, loop: boolean, ox: number, oy: number): Sprite => ({
    r: bufs.map(toCanvas),
    l: bufs.map((b) => toCanvas(flipBuf(b))),
    white: bufs.map((b) => toCanvas(whiteBuf(b))),
    whiteL: bufs.map((b) => toCanvas(whiteBuf(flipBuf(b)))),
    fps,
    loop,
    ox,
    oy,
    w: bufs[0].w,
    h: bufs[0].h,
});

const bakeAnim = (look: Look, a: Anim): Sprite => {
    const bufs = a.poses.map((p) => {
        const b = drawPose(look, p);
        return a.settle ? settle(b) : b;
    });
    return fromBufs(bufs, a.fps, a.loop, CELL / 2, ORIGIN_Y);
};

export type Atlas = Record<string, Sprite>;

let atlas: Atlas | null = null;

export const getAtlas = (): Atlas => {
    if (atlas) return atlas;
    const a: Atlas = {};
    for (const [name, anim] of Object.entries(HH_ANIMS)) a[`hh.${name}`] = bakeAnim(HEADHUNTER, anim);
    for (const kind of Object.keys(BOTS) as (keyof typeof BOTS)[]) {
        for (const [name, anim] of Object.entries(botAnims(kind))) a[`${kind}.${name}`] = bakeAnim(BOTS[kind], anim);
    }
    for (const [name, s] of Object.entries(SMALL_SPRITES)) {
        a[name] = fromBufs(s.frames, s.fps, s.loop, s.ox, s.oy);
    }
    atlas = a;
    return a;
};

export const frameOf = (s: Sprite, t: number) => {
    const n = s.r.length;
    if (n === 1 || s.fps === 0) return 0;
    const f = Math.floor((t / 60) * s.fps);
    return s.loop ? f % n : Math.min(n - 1, f);
};
