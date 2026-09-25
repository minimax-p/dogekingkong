// Draws a world into three low-res layers: the set (world), everything that
// moves (actors) and the HUD. The post-processing pass composites them.
import { BATTERY_CELLS, H, TILE, W } from "@/game/engine/constants";
import { aimFrame } from "@/game/art/characters";
import { frameOf, getAtlas, type Sprite } from "@/game/art/atlas";
import { PAL } from "@/game/art/palette";
import { bakeStage, type Baked } from "@/game/render/env";
import { drawText, textWidth } from "@/game/render/font";
import { ANIM_PROPS, drawAnimProp, glow, hexA, R } from "@/game/render/props";
import { drawSetpiece, SETPIECES } from "@/game/render/setpieces";
import { blinkOn } from "@/game/world/physics";
import { bubble, drawSetpieceOver } from "@/game/render/setpieces";
import { BOSS_QUIPS } from "@/game/world/boss";
import { DOOR_W } from "@/game/world/physics";
import { EK, eyeY } from "@/game/world/enemies";
import { alive } from "@/game/world/world";
import type { Enemy, Player, World } from "@/game/world/types";

export type Layers = {
    world: CanvasRenderingContext2D;
    actors: CanvasRenderingContext2D;
    hud: CanvasRenderingContext2D;
};

export type HudOpts = {
    hud: boolean;
    prompt: string | null;
    mode: "play" | "replay" | "rewind" | "dead" | "clear" | "cutscene";
    label: string; // stage label for the tape
    clock?: string; // on-screen clock in replays
    reduced: boolean;
    t: number; // real frames, for blinking
    ghost?: Player | null; // the last attempt, replayed beside you
};

export const makeLayers = (): { layers: Layers; canvases: HTMLCanvasElement[] } => {
    const mk = () => {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const g = c.getContext("2d", { willReadFrequently: false })!;
        g.imageSmoothingEnabled = false;
        return { c, g };
    };
    const a = mk();
    const b = mk();
    const c = mk();
    return { layers: { world: a.g, actors: b.g, hud: c.g }, canvases: [a.c, b.c, c.c] };
};

const tintCache = new Map<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();

// A sprite frame filled with one color (afterimages)
const tinted = (src: HTMLCanvasElement, color: string) => {
    let m = tintCache.get(src);
    if (!m) {
        m = new Map();
        tintCache.set(src, m);
    }
    let c = m.get(color);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext("2d")!;
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    m.set(color, c);
    return c;
};

const drawSprite = (
    g: CanvasRenderingContext2D,
    s: Sprite,
    frame: number,
    x: number,
    y: number,
    face: 1 | -1,
    opts: { rot?: number; white?: boolean; alpha?: number; tint?: string } = {},
) => {
    const i = Math.max(0, Math.min(s.r.length - 1, frame));
    let img = face > 0 ? (opts.white ? s.white[i] : s.r[i]) : opts.white ? s.whiteL[i] : s.l[i];
    if (opts.tint) img = tinted(img, opts.tint);
    const ox = face > 0 ? s.ox : s.w - s.ox;
    if (opts.alpha !== undefined) g.globalAlpha = opts.alpha;
    if (opts.rot) {
        g.save();
        g.translate(Math.round(x), Math.round(y - 12));
        g.rotate(opts.rot);
        g.drawImage(img, -ox, -s.oy + 12);
        g.restore();
    } else g.drawImage(img, Math.round(x) - ox, Math.round(y) - s.oy);
    if (opts.alpha !== undefined) g.globalAlpha = 1;
};

// ---------------------------------------------------------------------------

export const renderWorld = (L: Layers, w: World, o: HudOpts) => {
    const atlas = getAtlas();
    const baked = bakeStage(w.stage);
    const th = baked.theme;
    const shake = o.reduced ? 0 : 1;
    const cx = Math.round(w.cam.x + w.cam.sx * shake);
    const cy = Math.round(w.cam.y + w.cam.sy * shake);
    const t = w.step;

    // ---- World layer: sky, walls, props, decals, tiles, doors
    const g = L.world;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(baked.sky[0], 0, 0);
    const par = [0.06, 0.14, 0.26];
    for (let i = 1; i < baked.sky.length; i++) {
        const layer = baked.sky[i];
        const off = -((cx * par[i - 1]) % layer.width);
        const oy = Math.round(-cy * par[i - 1] * 0.3);
        g.drawImage(layer, Math.round(off), oy);
        g.drawImage(layer, Math.round(off + layer.width), oy);
    }
    if (th.rain) drawRain(g, t, o.reduced);
    // Outside the map (small stages): solid dark
    if (cx < 0 || cy < 0 || cx + W > w.stage.pw || cy + H > w.stage.ph) {
        R(g, 0, 0, W, H, "#07050f");
    }
    g.drawImage(baked.back, -cx, -cy);
    for (const p of w.stage.def.props ?? []) {
        const anim = ANIM_PROPS.has(p.kind);
        const set = SETPIECES.has(p.kind);
        if (!anim && !set) continue;
        const px = p.x * TILE - cx;
        const py = p.y * TILE - cy;
        const pw = (p.w ?? 1) * TILE;
        if (px < -160 - pw || px > W + 160 || py < -60 || py > H + 200) continue;
        if (anim) drawAnimProp(g, p, t, th, px, py);
        else drawSetpiece(g, p, w, th, px, py);
    }
    updateDecals(baked, w);
    g.drawImage(baked.decals, -cx, -cy);
    g.drawImage(baked.tiles, -cx, -cy);
    drawBlinks(g, w, cx, cy, t);
    drawVents(g, w, cx, cy, t);
    drawDoors(g, w, cx, cy);
    drawExit(g, w, cx, cy, t);

    // ---- Actors layer
    const a = L.actors;
    a.clearRect(0, 0, W, H);
    a.setTransform(1, 0, 0, 1, -cx, -cy);
    drawLasers(a, w, t);
    drawItems(a, w, atlas, t);
    for (const e of w.enemies) if (e.state === "dead") drawEnemy(a, e, atlas, w);
    for (const e of w.enemies) if (e.state !== "dead") drawEnemy(a, e, atlas, w);
    if (o.ghost) drawGhost(a, o.ghost, atlas);
    drawPlayer(a, w.player, atlas, w);
    drawBullets(a, w, atlas);
    drawParticles(a, w);
    drawFx(a, w);
    for (const e of w.enemies) drawEnemyIcons(a, e, atlas, w, t);
    a.drawImage(baked.front, 0, 0);
    a.setTransform(1, 0, 0, 1, 0, 0);
    // Speech bubbles, over everything
    for (const p of w.stage.def.props ?? []) if (p.kind === "crew") drawSetpieceOver(a, p, w, p.x * TILE - cx, p.y * TILE - cy);
    for (const e of w.enemies) {
        if (e.kind === "boss" && (e.data.quipT ?? 0) > 0 && e.state !== "dead") bubble(a, BOSS_QUIPS[e.data.quip ?? 0] ?? "", e.x - cx, e.y - 34 - cy, PAL.hot);
    }

    // ---- HUD layer
    const h = L.hud;
    h.clearRect(0, 0, W, H);
    if (w.stage.def.dark) drawDark(h, w, cx, cy);
    if (o.hud) drawHud(h, w, atlas, o);
    if (o.hud && w.cleared && !w.won && o.mode === "play") drawGo(h, w, cx, cy, t);
    if (o.prompt && o.mode === "play") drawPrompt(h, o.prompt, t);
};

// Code blocks the agent types into platforms: on, flickering, or ghosted out
const drawBlinks = (g: CanvasRenderingContext2D, w: World, cx: number, cy: number, t: number) => {
    const bl = w.stage.def.blinks;
    if (!bl) return;
    bl.forEach((b, i) => {
        const on = blinkOn(w, i);
        const ph = (w.time * 60 + b.offset) % b.period;
        const warn = !on && ph > b.period - 30;
        const x = b.x * TILE - cx;
        const y = b.y * TILE - cy;
        const wd = b.w * TILE;
        if (on) {
            const fading = ph > b.on - 24;
            R(g, x, y, wd, 4, fading && t % 6 < 3 ? "#1e6a7a" : "#1b3a52");
            R(g, x, y, wd, 1, PAL.cyan);
            drawText(g, "{", x - 5, y - 2, PAL.cyan);
            drawText(g, "}", x + wd, y - 2, PAL.cyan);
            glow(g, x + wd / 2, y + 2, wd * 0.6, PAL.cyan, 0.18);
        } else {
            g.fillStyle = hexA(PAL.cyan, warn && t % 6 < 3 ? 0.6 : 0.18);
            for (let i2 = 0; i2 < wd; i2 += 4) g.fillRect(x + i2, y, 2, 1);
        }
    });
};

const drawVents = (g: CanvasRenderingContext2D, w: World, cx: number, cy: number, t: number) => {
    for (const z of w.stage.def.zones ?? []) {
        const x = z.x * TILE - cx;
        const y = (z.y + z.h) * TILE - cy;
        const wd = z.w * TILE;
        R(g, x, y - 3, wd, 3, "#2c2754");
        for (let i = 2; i < wd; i += 3) R(g, x + i, y - 3, 1, 3, "#07050f");
        // Rising air
        g.fillStyle = "rgba(84,227,255,0.35)";
        for (let i = 0; i < 10; i++) {
            const ax = x + ((i * 37) % wd);
            const ay = y - ((t * 3 + i * 29) % (z.h * TILE));
            g.fillRect(Math.round(ax), Math.round(ay), 1, 4);
        }
    }
};

// Power's out: everything is dark except your scanner beam, lamps and gunfire
const drawDark = (h: CanvasRenderingContext2D, w: World, cx: number, cy: number) => {
    const c = darkCanvas();
    const g = c.getContext("2d")!;
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(4,2,10,0.86)";
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "destination-out";
    const hole = (x: number, y: number, r: number, a = 1) => {
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(0,0,0,${a})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const p = w.player;
    const px = p.x - cx;
    const py = p.y - 14 - cy;
    hole(px, py, 34, 0.9);
    if (p.state !== "dead") {
        // The visor's scanner beam, pointed wherever you aim
        const len = 150;
        const spread = 0.42;
        const grad = g.createRadialGradient(px, py, 4, px, py, len);
        grad.addColorStop(0, "rgba(0,0,0,0.95)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(px, py);
        g.arc(px, py, len, p.aim - spread, p.aim + spread);
        g.closePath();
        g.fill();
    }
    for (const pr of w.stage.def.props ?? []) {
        if (pr.kind === "emergency" || pr.kind === "light" || pr.kind === "lamp") hole(pr.x * TILE - cx + 3, pr.y * TILE - cy + 6, (pr.w ?? 3) * 14, 0.8);
        if (pr.kind === "neon" || pr.kind === "sqlite" || pr.kind === "legacy" || pr.kind === "sign") hole(pr.x * TILE - cx + 10, pr.y * TILE - cy - 8, 26, 0.6);
    }
    for (const b of w.bullets) hole(b.x - cx, b.y - cy, 14, 0.9);
    for (const f of w.fx) if (f.kind === "muzzle" || f.kind === "slash") hole(f.x - cx, f.y - cy, f.kind === "muzzle" ? 40 : 30, 1);
    for (const e of w.enemies) {
        if (e.state === "dead" || !e.aware || e.kind === "sentry") continue;
        // Guards carry flashlights once they're onto you
        const ex = e.x - cx;
        const ey = e.y - 16 - cy;
        const grad = g.createRadialGradient(ex, ey, 2, ex, ey, 90);
        grad.addColorStop(0, "rgba(0,0,0,0.7)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(ex, ey);
        const a = e.face > 0 ? 0 : Math.PI;
        g.arc(ex, ey, 90, a - 0.3, a + 0.3);
        g.closePath();
        g.fill();
        hole(ex, ey, 14, 0.5);
    }
    for (const l of w.lasers) if (l.on && !l.disabled) for (let y = l.y1; y < l.y2; y += 16) hole(l.x1 - cx, y - cy, 10, 0.6);
    h.drawImage(c, 0, 0);
};

let darkC: HTMLCanvasElement | null = null;
const darkCanvas = () => {
    if (!darkC) {
        darkC = document.createElement("canvas");
        darkC.width = W;
        darkC.height = H;
    }
    return darkC;
};

const drawGhost = (a: CanvasRenderingContext2D, gp: Player, atlas: ReturnType<typeof getAtlas>) => {
    const s = atlas[`hh.${gp.anim}`] ?? atlas["hh.idle"];
    let frame = frameOf(s, gp.animT);
    if (gp.anim.startsWith("attack")) frame = Math.min(s.r.length - 1, Math.floor((gp.t / 14) * s.r.length));
    drawSprite(a, s, frame, gp.x, gp.y, gp.face, { tint: PAL.cyan, alpha: 0.28 });
};

const drawRain = (g: CanvasRenderingContext2D, t: number, reduced: boolean) => {
    g.fillStyle = "rgba(140,158,255,0.28)";
    const n = reduced ? 30 : 70;
    for (let i = 0; i < n; i++) {
        const x = (i * 71 + t * 1.2) % (W + 20);
        const y = (i * 131 + t * 7) % (H + 20);
        g.fillRect(Math.round(x) - 10, Math.round(y) - 10, 1, 5);
    }
};

const updateDecals = (b: Baked, w: World) => {
    const g = b.decals.getContext("2d")!;
    if (w.decals.length < b.decalCount) {
        g.clearRect(0, 0, b.decals.width, b.decals.height);
        b.decalCount = 0;
    }
    for (let i = b.decalCount; i < w.decals.length; i++) {
        const d = w.decals[i];
        const x = Math.round(d.x);
        const y = Math.round(d.y);
        if (d.kind === "oil") {
            g.fillStyle = ["#2a1545", "#3a1d5c", "#4a2c7a", "#241238"][d.v % 4];
            g.fillRect(x, y, 1 + (d.v % 2), 1 + ((d.v >> 1) % 2));
            if (d.v === 3) {
                g.fillStyle = PAL.hot;
                g.fillRect(x, y, 1, 1);
            }
        } else if (d.kind === "splat") {
            // A spray of drops radiating along the hit direction
            const cos = Math.cos(d.r);
            const sin = Math.sin(d.r);
            for (let k = 0; k < 26; k++) {
                const s = ((k * 37 + d.v * 11) % 17) - 8;
                const along = ((k * 53) % 13) - 4;
                const px = x + cos * along - sin * s;
                const py = y + sin * along + cos * s;
                g.fillStyle = k % 7 === 0 ? "#4a2c7a" : k % 3 === 0 ? "#2a1545" : "#1a0d2e";
                g.fillRect(Math.round(px), Math.round(py), k % 4 === 0 ? 2 : 1, k % 5 === 0 ? 2 : 1);
            }
            g.fillStyle = "#1a0d2e";
            g.fillRect(x - 2, y - 2, 4, 4);
        } else if (d.kind === "scorch") {
            g.fillStyle = "rgba(7,5,15,0.8)";
            g.fillRect(x - 1, y - 1, 2, 2);
        }
    }
    b.decalCount = w.decals.length;
};

const drawDoors = (g: CanvasRenderingContext2D, w: World, cx: number, cy: number) => {
    for (const d of w.doors) {
        const x = d.tx * TILE + TILE / 2 - DOOR_W / 2 - cx;
        const y = d.ty * TILE - cy;
        const h = d.h * TILE;
        // Frame
        R(g, x - 3, y - 2, DOOR_W + 6, 2, "#3d3570");
        if (w.stage.def.theme === "boxoffice") {
            // Turnstile: a scanner that reads VALID when you push through
            R(g, x - 4, y + h - 20, 12, 20, "#2b2550");
            R(g, x - 3, y + h - 19, 10, 3, d.open ? PAL.pass : PAL.hot);
            if (!d.open) R(g, x + 2, y + h - 14, 14, 2, "#a9a3d6");
            else R(g, x + 2, y + h - 14, 2, 10, "#a9a3d6");
            if (d.open && d.t < 20) drawText(g, "VALID", x - 8, y + h - 30, PAL.pass);
            continue;
        }
        if (!d.open) {
            R(g, x, y, DOOR_W, h, "#3d3570");
            R(g, x + 1, y + 1, DOOR_W - 2, h - 2, "#2b2550");
            R(g, x + (DOOR_W > 3 ? 1 : 0), y + h / 2, 2, 2, PAL.amber);
            R(g, x, y, 1, h, "#5b4f9a");
        } else {
            // Swung open: a flat leaf on the far side
            const k = Math.min(1, d.t / 6);
            const leaf = Math.round(3 + 9 * k);
            const lx = d.dir > 0 ? x + DOOR_W : x - leaf;
            R(g, lx, y, leaf, h, "#2b2550");
            R(g, d.dir > 0 ? lx + leaf - 1 : lx, y, 1, h, "#5b4f9a");
            R(g, x, y, DOOR_W, 2, "#3d3570");
        }
    }
};

const drawExit = (g: CanvasRenderingContext2D, w: World, cx: number, cy: number, t: number) => {
    if (!w.cleared) return;
    const e = w.stage.exit;
    const pulse = 0.18 + Math.sin(t * 0.12) * 0.08;
    g.fillStyle = hexA(PAL.pass, pulse);
    g.fillRect(e.x - cx, e.y - cy, e.w, e.h);
};

const drawLasers = (a: CanvasRenderingContext2D, w: World, t: number) => {
    for (const l of w.lasers) {
        if (l.y1 === l.y2) {
            // Horizontal: the boss's floor laser
            if (l.disabled) continue;
            const y = Math.round(l.y1);
            R(a, l.x1 - 4, y - 2, 4, 5, "#2c2754");
            R(a, l.x2, y - 2, 4, 5, "#2c2754");
            if (l.on) {
                R(a, l.x1, y - 1, l.x2 - l.x1, 3, hexA(PAL.hot, 0.55));
                R(a, l.x1, y, l.x2 - l.x1, 1, t % 4 < 2 ? "#ffffff" : PAL.hotLight);
            } else if (l.warn) {
                a.fillStyle = hexA(PAL.hot, t % 6 < 3 ? 0.7 : 0.25);
                for (let x = l.x1; x < l.x2; x += 4) a.fillRect(x, y, 2, 1);
            }
            continue;
        }
        const x = Math.round(l.x1);
        const y1 = Math.round(l.y1);
        const y2 = Math.round(l.y2);
        // Emitters
        R(a, x - 3, y1, 6, 3, "#2c2754");
        R(a, x - 3, y2 - 3, 6, 3, "#2c2754");
        if (l.disabled) continue;
        if (l.kind === "gate") {
            if (l.on) {
                const flick = t % 4 < 2 ? 1 : 0;
                R(a, x - 1, y1 + 3, 3, y2 - y1 - 6, hexA(PAL.hot, 0.55));
                R(a, x, y1 + 3, 1, y2 - y1 - 6, flick ? "#ffffff" : PAL.hotLight);
                glow(a, x, y1 + 6, 10, PAL.hot, 0.4);
                glow(a, x, y2 - 6, 10, PAL.hot, 0.4);
            } else if (l.warn) {
                a.fillStyle = hexA(PAL.hot, t % 6 < 3 ? 0.7 : 0.25);
                for (let y = y1 + 3; y < y2 - 3; y += 4) a.fillRect(x, y, 1, 2);
            }
            R(a, x - 1, y1 + 1, 3, 1, l.on || l.warn ? PAL.hot : "#5b4f9a");
            R(a, x - 1, y2 - 2, 3, 1, l.on || l.warn ? PAL.hot : "#5b4f9a");
        } else {
            const hot = l.tripped >= 0 && l.tripped < 40;
            a.fillStyle = hot ? hexA(PAL.red, t % 4 < 2 ? 0.9 : 0.5) : hexA(PAL.red, 0.35);
            a.fillRect(x, y1 + 3, 1, y2 - y1 - 6);
            R(a, x - 1, y1 + 1, 3, 1, PAL.red);
            R(a, x - 1, y2 - 2, 3, 1, PAL.red);
        }
    }
};

const drawItems = (a: CanvasRenderingContext2D, w: World, atlas: ReturnType<typeof getAtlas>, t: number) => {
    for (const it of w.items) {
        const s = atlas[`item.${it.kind}`];
        if (!s) continue;
        if (it.state === "thrown") {
            a.save();
            a.translate(Math.round(it.x), Math.round(it.y));
            a.rotate(it.rot);
            a.drawImage(s.r[0], -Math.round(s.w / 2), -Math.round(s.h / 2));
            a.restore();
        } else {
            const bob = Math.round(Math.sin(t * 0.08 + it.id) * 1);
            drawSprite(a, s, 0, it.x, it.y - 1 + bob, 1);
            if (Math.floor(t / 40 + it.id) % 3 === 0) R(a, it.x + 2, it.y - s.h + bob, 1, 1, "#ffffff");
        }
    }
    // The intel file, if it's still here
    const intel = w.stage.intel;
    if (intel && !w.flags.intel) {
        const s = atlas.intel;
        const bob = Math.round(Math.sin(t * 0.07) * 2);
        glow(a, intel.x, intel.y - 8 + bob, 14, PAL.peri, 0.35);
        drawSprite(a, s, frameOf(s, t), intel.x, intel.y - 3 + bob, 1);
    }
};

const enemyKey = (e: Enemy, w: World) => {
    if (e.kind === "bug" || e.kind === "drone" || e.kind === "sentry" || e.kind === "launcher") {
        if (e.state === "dead") return `${e.kind}.dead`;
        if (e.kind === "bug") return e.state === "leap" ? "bug.leap" : e.aware ? "bug.run" : "bug.idle";
        if (e.kind === "sentry") return e.data.active > 0 ? "sentry.active" : "sentry.idle";
        if (e.kind === "launcher") return e.anim === "fire" ? "launcher.fire" : "launcher.idle";
        return "drone.idle";
    }
    if (e.kind === "boss") {
        const who = w.flags.unmasked ? "minh" : "boss";
        return `${who}.${e.state === "dead" ? "kneel" : e.anim}`;
    }
    return `${e.kind}.${e.anim}`;
};

const drawEnemy = (a: CanvasRenderingContext2D, e: Enemy, atlas: ReturnType<typeof getAtlas>, w: World) => {
    const key = enemyKey(e, w);
    const s = atlas[key] ?? atlas[`${e.kind}.idle`];
    if (!s) {
        R(a, e.x - e.w / 2, e.y - e.h, e.w, e.h, PAL.hot);
        return;
    }
    let frame = frameOf(s, e.animT);
    if (e.anim === "aim" && (e.kind === "guard" || e.kind === "enforcer")) {
        const rel = e.face > 0 ? e.aim : Math.PI - e.aim;
        const r = Math.atan2(Math.sin(rel), Math.cos(rel));
        frame = aimFrame(r);
    }
    const rot = e.state === "dead" && e.anim === "hurt" && e.kind !== "boss" ? e.rot : 0;
    const white = e.flash > 0 && e.flash % 2 === 1;
    if (e.kind === "boss") {
        const blink = (e.data.inv ?? 0) > 0 && Math.floor(e.data.inv / 3) % 2 === 0;
        if (e.state === "windup") {
            // The tell: a glowing line where he's about to dash
            const len = 120;
            a.fillStyle = hexA(PAL.hot, 0.35 + 0.25 * Math.sin(w.step * 0.6));
            a.fillRect(Math.round(e.face > 0 ? e.x : e.x - len), Math.round(e.y - 1), len, 1);
            glow(a, e.x, e.y - 14, 22, PAL.hot, 0.4);
        }
        if (e.state === "recover" || e.state === "stun") glow(a, e.x, e.y - 12, 18, PAL.pass, 0.3);
        drawSprite(a, s, frame, e.x, e.y, e.face, { white, alpha: blink ? 0.4 : undefined });
        return;
    }
    if (e.kind === "sentry") {
        drawSprite(a, s, frame, e.x, e.y + s.oy, 1, { white });
        if (e.state !== "dead") {
            const bx = e.x;
            const by = e.y + 6;
            for (let i = 2; i < 8; i++) R(a, bx + Math.cos(e.aim) * i, by + Math.sin(e.aim) * i, 2, 2, "#3d3570");
        }
        return;
    }
    const y = e.kind === "drone" ? e.y + 2 : e.y;
    drawSprite(a, s, frame, e.x, y, e.face, { rot, white });
    // Muzzle glint just before a shot: the tell
    if ((e.kind === "guard" || e.kind === "enforcer" || e.kind === "drone") && e.state === "aim") {
        const k = EK[e.kind];
        if (e.t > k.aim - 9 && e.t < k.aim - 2) {
            const mx = e.x + Math.cos(e.aim) * 12;
            const my = e.y - 14 + Math.sin(e.aim) * 12 + (e.kind === "drone" ? 10 : 0);
            R(a, mx - 2, my, 5, 1, "#ffffff");
            R(a, mx, my - 2, 1, 5, "#ffffff");
            glow(a, mx, my, 8, PAL.amber, 0.5);
        }
    }
    void w;
};

const drawEnemyIcons = (a: CanvasRenderingContext2D, e: Enemy, atlas: ReturnType<typeof getAtlas>, w: World, t: number) => {
    if (e.state === "dead" || e.kind === "sentry" || e.kind === "launcher") return;
    const top = e.kind === "drone" ? e.y - 16 : eyeY(e) - 16;
    if (e.state === "alert") {
        const s = atlas.alert;
        const pop = e.t < 4 ? -2 : 0;
        drawSprite(a, s, 0, e.x, top + pop, 1);
    } else if (e.hearT > 0 && !e.aware) {
        drawSprite(a, atlas.question, 0, e.x, top, 1);
    }
    void w;
    void t;
};

const drawPlayer = (a: CanvasRenderingContext2D, p: Player, atlas: ReturnType<typeof getAtlas>, w: World) => {
    // Afterimages
    p.ghosts.forEach((gh, i) => {
        const s = atlas[`hh.${gh.anim}`] ?? atlas["hh.idle"];
        const color = w.focus > 0.3 ? (i % 2 ? PAL.hot : PAL.cyan) : PAL.peri;
        drawSprite(a, s, frameOf(s, gh.frame), gh.x, gh.y, gh.face, { tint: color, alpha: (gh.life / 16) * 0.55 });
    });
    drawScarf(a, p);
    let anim = p.anim;
    if (anim === "attack") {
        const sy = Math.sin(p.aim);
        if (sy < -0.6) anim = "attack_up";
        else if (sy > 0.6 && !p.ground) anim = "attack_down";
    }
    const s = atlas[`hh.${anim}`] ?? atlas["hh.idle"];
    let frame = frameOf(s, p.animT);
    if (anim.startsWith("attack")) frame = Math.min(s.r.length - 1, Math.floor((p.t / 14) * s.r.length));
    if (anim === "roll") frame = Math.min(s.r.length - 1, Math.floor((p.t / 20) * s.r.length));
    const rot = p.state === "dead" && anim === "hurt" ? 0 : 0;
    drawSprite(a, s, frame, p.x, p.y, p.face, { rot });
};

const drawScarf = (a: CanvasRenderingContext2D, p: Player) => {
    const pts = p.scarf;
    for (let i = 1; i < pts.length; i++) {
        const q0 = pts[i - 1];
        const q1 = pts[i];
        const n = Math.max(1, Math.ceil(Math.hypot(q1.x - q0.x, q1.y - q0.y)));
        for (let k = 0; k <= n; k++) {
            const x = Math.round(q0.x + ((q1.x - q0.x) * k) / n);
            const y = Math.round(q0.y + ((q1.y - q0.y) * k) / n);
            const wdt = i < pts.length - 2 ? 2 : 1;
            R(a, x, y, wdt, 2, i % 3 === 0 ? PAL.hotDark : PAL.hot);
            if (i < 4) R(a, x, y, 1, 1, PAL.hotLight);
        }
    }
};

const drawBullets = (a: CanvasRenderingContext2D, w: World, atlas: ReturnType<typeof getAtlas>) => {
    for (const b of w.bullets) {
        const mine = b.owner === "player";
        if (b.kind === "shuttle") {
            const s = atlas["item.shuttle"];
            a.save();
            a.translate(Math.round(b.x), Math.round(b.y));
            a.rotate(Math.atan2(b.vy, b.vx) + Math.PI);
            a.drawImage(s.r[0], -2, -2);
            a.restore();
            if (mine) glow(a, b.x, b.y, 8, PAL.cyan, 0.5);
            continue;
        }
        if (b.kind === "wave") {
            // A power chord rolling along the floor
            for (let i = 0; i < 4; i++) {
                const hh = 12 - i * 3;
                a.globalAlpha = 1 - i * 0.22;
                R(a, b.x - Math.sign(b.vx) * i * 3, b.y + 5 - hh, 2, hh, i === 0 ? "#ffffff" : PAL.hot);
            }
            a.globalAlpha = 1;
            glow(a, b.x, b.y, 12, PAL.hot, 0.5);
            continue;
        }
        if (b.kind === "note" || b.kind === "bracket") {
            drawText(a, b.kind === "note" ? "♪" : b.id % 2 ? "{" : "}", b.x - 2, b.y - 3, mine ? PAL.cyan : PAL.hot);
            glow(a, b.x, b.y, 8, mine ? PAL.cyan : PAL.hot, 0.4);
            continue;
        }
        // A streak from where it was to where it is, longer in slow motion
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const len = Math.min(26, sp * (1.4 + (1 - w.scale) * 2.2));
        const ux = b.vx / sp;
        const uy = b.vy / sp;
        const n = Math.ceil(len);
        const core = mine ? "#d8faff" : "#fff3c4";
        const tail = mine ? PAL.cyan : PAL.amber;
        for (let i = 0; i < n; i++) {
            const x = Math.round(b.x - ux * i);
            const y = Math.round(b.y - uy * i);
            if (i < 3) R(a, x, y, 1, 1, core);
            else {
                a.globalAlpha = 1 - i / n;
                R(a, x, y, 1, 1, tail);
                a.globalAlpha = 1;
            }
        }
        R(a, b.x - 1, b.y - 1, 2, 2, core);
        glow(a, b.x, b.y, b.kind === "pellet" ? 5 : 7, tail, 0.45);
    }
};

const PCOL: Record<string, string[]> = {
    oil: ["#2a1545", "#4a2c7a", "#6b3fa0", PAL.hot],
    spark: ["#ffffff", PAL.amber, PAL.cyan],
    dust: ["#5b4f9a"],
    shell: [PAL.amber],
    splinter: ["#3d3570", "#5b4f9a", "#2b2550"],
    shard: ["#ece8ff", "#a9a3d6", "#8c9eff"],
    ember: [PAL.hot],
    smoke: ["#3d3570"],
};

const drawParticles = (a: CanvasRenderingContext2D, w: World) => {
    for (const q of w.particles) {
        const cols = PCOL[q.kind];
        const c = cols[q.c % cols.length];
        const x = Math.round(q.x);
        const y = Math.round(q.y);
        if (q.kind === "dust" || q.kind === "smoke") {
            a.globalAlpha = (q.life / q.max) * 0.6;
            R(a, x, y, q.life > q.max * 0.5 ? 2 : 1, q.life > q.max * 0.5 ? 2 : 1, c);
            a.globalAlpha = 1;
        } else if (q.kind === "spark") {
            R(a, x, y, 1, 1, c);
            R(a, Math.round(q.x - q.vx), Math.round(q.y - q.vy), 1, 1, c);
        } else if (q.kind === "shell") {
            R(a, x, y, 2, 1, c);
        } else R(a, x, y, q.kind === "oil" && q.c === 1 ? 2 : 1, 1, c);
    }
};

// The slash: a crescent of light sweeping around the aim direction
const drawFx = (a: CanvasRenderingContext2D, w: World) => {
    for (const f of w.fx) {
        const k = f.t / f.max;
        if (f.kind === "slash") {
            const sweep = Math.min(1, k * 2.2);
            const fade = k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55;
            const r0 = 12;
            const r1 = 33;
            const span = 1.35;
            const a0 = f.a - span;
            const a1 = f.a - span + span * 2 * sweep;
            const tailA = a1 - 1.4 * fade;
            for (let r = r0; r <= r1; r++) {
                const rr = (r - r0) / (r1 - r0);
                const steps = Math.ceil(r * 2.4);
                for (let s = 0; s <= steps; s++) {
                    const ang = a0 + ((a1 - a0) * s) / steps;
                    if (ang < tailA) continue;
                    // Thickest in the middle of the sweep
                    const mid = 1 - Math.abs(((ang - a0) / (a1 - a0 || 1)) * 2 - 1);
                    const edge = rr > 0.55 + mid * 0.35 || rr < 0.35 - mid * 0.3;
                    if (edge) continue;
                    const lead = (a1 - ang) < 0.25;
                    const col = lead || rr > 0.75 ? "#ffffff" : rr > 0.55 ? PAL.cyan : rr > 0.45 ? PAL.peri : PAL.hot;
                    a.globalAlpha = fade;
                    a.fillStyle = col;
                    a.fillRect(Math.round(f.x + Math.cos(ang) * r), Math.round(f.y + Math.sin(ang) * r), 1, 1);
                }
            }
            a.globalAlpha = 1;
            glow(a, f.x + Math.cos(f.a) * 22, f.y + Math.sin(f.a) * 22, 26, PAL.cyan, 0.25 * fade);
        } else if (f.kind === "muzzle") {
            const s = k < 0.5 ? 4 : 2;
            const x = Math.round(f.x + Math.cos(f.a) * 2);
            const y = Math.round(f.y + Math.sin(f.a) * 2);
            R(a, x - s / 2, y - s / 2, s, s, "#fff3c4");
            for (let i = 1; i < 6; i++) R(a, x + Math.cos(f.a) * i, y + Math.sin(f.a) * i, 1, 1, PAL.amber);
            glow(a, x, y, 12, PAL.amber, 0.6 * (1 - k));
        } else if (f.kind === "clang" || f.kind === "deflect") {
            const r = Math.round(2 + k * 10);
            a.globalAlpha = 1 - k;
            const c = f.kind === "clang" ? "#ffffff" : PAL.cyan;
            for (let i = 0; i < 8; i++) {
                const ang = (i / 8) * Math.PI * 2 + f.a;
                R(a, f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r, 1, 1, c);
                R(a, f.x + Math.cos(ang) * (r - 2), f.y + Math.sin(ang) * (r - 2), 1, 1, "#ffffff");
            }
            a.globalAlpha = 1;
            glow(a, f.x, f.y, 14, c, 0.5 * (1 - k));
        }
    }
};

// ---------------------------------------------------------------------------
// HUD

const hourglass = ["#####", ".###.", "..#..", ".#.#.", "#####"];

const drawHud = (h: CanvasRenderingContext2D, w: World, atlas: ReturnType<typeof getAtlas>, o: HudOpts) => {
    // Bar
    h.fillStyle = "rgba(7,5,15,0.78)";
    h.fillRect(0, 0, W, 17);
    R(h, 0, 17, W, 1, "#2c2754");

    // Battery: 11 cells
    const bx = 8;
    const by = 4;
    R(h, bx - 2, by - 2, BATTERY_CELLS * 5 + 3, 13, "#2c2754");
    R(h, bx - 1, by - 1, BATTERY_CELLS * 5 + 1, 11, "#07050f");
    R(h, bx + BATTERY_CELLS * 5 + 1, by + 2, 2, 5, "#2c2754");
    for (let i = 0; i < BATTERY_CELLS; i++) {
        const fill = Math.max(0, Math.min(1, w.battery - i));
        const x = bx + i * 5;
        if (fill <= 0) {
            R(h, x, by, 4, 9, "#1d1838");
            continue;
        }
        const col = w.focusHeld ? (o.t % 8 < 4 || i < w.battery - 1 ? PAL.cyan : "#ffffff") : fill < 1 ? "#2bb5dd" : PAL.cyan;
        R(h, x, by + Math.round(9 * (1 - fill)), 4, Math.round(9 * fill), col);
        if (fill >= 1) R(h, x, by, 4, 1, "#b8f4ff");
    }

    // Timer
    const left = Math.max(0, w.timeLimit - w.time);
    const frac = left / w.timeLimit;
    const tx = W / 2 - 60;
    hourglass.forEach((row, j) => {
        for (let i = 0; i < 5; i++) if (row[i] === "#") R(h, tx - 10 + i, 5 + j + (j > 1 ? 1 : 0), 1, 1, "#a9a3d6");
    });
    R(h, tx - 1, 5, 122, 7, "#2c2754");
    R(h, tx, 6, 120, 5, "#07050f");
    const low = left < 10;
    const tcol = low ? (o.t % 20 < 10 ? PAL.hot : PAL.hotDark) : PAL.peri;
    R(h, tx, 6, Math.round(120 * frac), 5, tcol);
    R(h, tx, 6, Math.round(120 * frac), 1, low ? PAL.hotLight : "#c9d2ff");

    // Item slot
    const ix = W - 26;
    R(h, ix - 1, 1, 18, 15, "#2c2754");
    R(h, ix, 2, 16, 13, "#07050f");
    if (w.player.held) {
        const s = atlas[`item.${w.player.held}`];
        if (s) h.drawImage(s.r[0], Math.round(ix + 8 - s.w / 2), Math.round(8 - s.h / 2 + 1));
    }
    // Mouse icon: right button lit when there's something to throw
    const mx = ix - 12;
    R(h, mx, 3, 7, 11, "#2c2754");
    R(h, mx + 1, 4, 5, 9, "#07050f");
    R(h, mx + 4, 4, 2, 4, w.player.held ? PAL.hot : "#3d3570");
    R(h, mx + 1, 4, 2, 4, "#3d3570");

    // The boss's health: three crowns
    const boss = w.enemies.find((e) => e.kind === "boss");
    if (boss) {
        drawText(h, "DOGEKING", W / 2 - 60, 22, PAL.hot, { shadow: "#07050f" });
        for (let i = 0; i < 3; i++) {
            const on = i < boss.hp;
            const x = W / 2 - 8 + i * 12;
            R(h, x, 25, 9, 4, on ? PAL.amber : "#2c2754");
            R(h, x, 22, 2, 3, on ? PAL.amber : "#2c2754");
            R(h, x + 4, 21, 1, 4, on ? PAL.amber : "#2c2754");
            R(h, x + 7, 22, 2, 3, on ? PAL.amber : "#2c2754");
        }
    }

    // Enemies left, on the left of the item slot
    const n = alive(w);
    drawText(h, n > 0 ? `×${n}` : "", ix - 30, 5, "#a9a3d6");

    if (o.mode === "replay" || o.mode === "rewind") drawTapeOsd(h, o);
    else if (o.label) drawText(h, o.label, 76, 5, "#5b4f9a");
};

const drawTapeOsd = (h: CanvasRenderingContext2D, o: HudOpts) => {
    const blink = o.t % 40 < 26;
    if (o.mode === "replay") {
        if (blink) drawText(h, "▶ PLAY", 12, 26, "#ffffff", { shadow: "#07050f" });
    } else drawText(h, "◀◀ REW", 12, 26, "#ffffff", { shadow: "#07050f" });
    if (o.clock) drawText(h, o.clock, W - 12, H - 16, "#ffffff", { align: "right", shadow: "#07050f" });
    drawText(h, o.label, 12, H - 16, "#ffffff", { shadow: "#07050f" });
};

const drawGo = (h: CanvasRenderingContext2D, w: World, cx: number, cy: number, t: number) => {
    const e = w.stage.exit;
    const ex = e.x + e.w / 2 - cx;
    const ey = e.y - cy;
    const bob = Math.round(Math.sin(t * 0.2) * 2);
    const on = ex > 10 && ex < W - 10 && ey > 20 && ey < H - 10;
    if (on) {
        drawText(h, "GO", ex, ey - 22 + bob, PAL.pass, { align: "center", shadow: "#07050f" });
        drawText(h, "↓", ex, ey - 13 + bob, PAL.pass, { align: "center", shadow: "#07050f" });
    } else {
        const right = ex > W / 2;
        const x = right ? W - 30 : 30;
        drawText(h, right ? "GO →" : "← GO", x + (right ? bob : -bob), H / 2, PAL.pass, { align: "center", shadow: "#07050f" });
    }
};

const drawPrompt = (h: CanvasRenderingContext2D, text: string, t: number) => {
    const w = textWidth(text.toUpperCase()) + 16;
    const x = Math.round(W / 2 - w / 2);
    const y = H - 30;
    h.fillStyle = "rgba(7,5,15,0.8)";
    h.fillRect(x, y, w, 15);
    R(h, x, y, w, 1, PAL.peri);
    drawText(h, text, W / 2, y + 4, t % 60 < 45 ? "#ece8ff" : "#a9a3d6", { align: "center" });
};
