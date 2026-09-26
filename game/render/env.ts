// Baking a stage's backdrop and tiles once, and the city outside the windows.
import { H, TILE, W } from "@/game/engine/constants";
import { makeRng, rand, range } from "@/game/engine/rng";
import { canvas } from "@/game/art/pixels";
import { ANIM_PROPS, drawStaticProp, glow, R } from "@/game/render/props";
import { THEMES, type Theme } from "@/game/render/themes";
import { T_PLATFORM, T_SOLID, tileAt, type Stage } from "@/game/world/stage";

export type Baked = {
    theme: Theme;
    back: HTMLCanvasElement; // wall, windows cut out, static props
    tiles: HTMLCanvasElement;
    front: HTMLCanvasElement; // props drawn over the actors
    decals: HTMLCanvasElement;
    decalCount: number;
    sky: HTMLCanvasElement[]; // parallax layers
};

const bakedCache = new WeakMap<Stage, Baked>();

export const bakeStage = (s: Stage): Baked => {
    const hit = bakedCache.get(s);
    if (hit) return hit;
    const th = THEMES[s.def.theme];
    const rng = makeRng(s.def.id.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));

    // Back wall
    const back = canvas(s.pw, s.ph);
    const g = back.g;
    R(g, 0, 0, s.pw, s.ph, th.wall);
    drawPattern(g, s, th, rng);
    // Baseboards and ceiling shadows along every floor and ceiling
    for (let ty = 0; ty < s.rows; ty++) {
        for (let tx = 0; tx < s.cols; tx++) {
            const t = tileAt(s, tx, ty);
            if (t !== 0) continue;
            if (tileAt(s, tx, ty + 1) === T_SOLID) {
                R(g, tx * TILE, (ty + 1) * TILE - 4, TILE, 4, th.wallLo);
                R(g, tx * TILE, (ty + 1) * TILE - 5, TILE, 1, th.wallHi);
            }
            if (tileAt(s, tx, ty - 1) === T_SOLID) {
                R(g, tx * TILE, ty * TILE, TILE, 3, "rgba(0,0,0,0.35)");
            }
        }
    }
    const front = canvas(s.pw, s.ph);
    for (const p of s.def.props ?? []) {
        if (ANIM_PROPS.has(p.kind)) {
            if (p.kind === "monitor") drawStaticProp(g, p, { theme: th, seed: 1 });
            continue;
        }
        drawStaticProp(p.layer === "front" ? front.g : g, p, { theme: th, seed: 1 });
    }

    // Tiles
    const tiles = canvas(s.pw, s.ph);
    drawTiles(tiles.g, s, th, rng);

    const decals = canvas(s.pw, s.ph);
    const baked: Baked = { theme: th, back: back.c, tiles: tiles.c, front: front.c, decals: decals.c, decalCount: 0, sky: skyline(th) };
    bakedCache.set(s, baked);
    return baked;
};

const drawPattern = (g: CanvasRenderingContext2D, s: Stage, th: Theme, rng: ReturnType<typeof makeRng>) => {
    const { pw, ph } = s;
    switch (th.pattern) {
        case "panels":
            for (let x = 0; x < pw; x += 48) {
                R(g, x, 0, 1, ph, th.wallLo);
                R(g, x + 1, 0, 1, ph, th.wallHi);
            }
            for (let y = 24; y < ph; y += 64) R(g, 0, y, pw, 1, th.wallLo);
            break;
        case "stripes":
            for (let x = 0; x < pw; x += 12) R(g, x, 0, 4, ph, th.wallHi);
            break;
        case "tiles":
            for (let y = 0; y < ph; y += 12) R(g, 0, y, pw, 1, th.wallLo);
            for (let y = 0; y < ph; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < pw; x += 12) R(g, x, y, 1, 12, th.wallLo);
            break;
        case "brick":
            for (let y = 0; y < ph; y += 8) {
                R(g, 0, y, pw, 1, th.wallLo);
                for (let x = (y / 8) % 2 ? 8 : 0; x < pw; x += 16) R(g, x, y, 1, 8, th.wallLo);
            }
            for (let i = 0; i < pw / 6; i++) R(g, range(rng, 0, pw), range(rng, 0, ph), range(rng, 4, 14), 7, th.wallHi);
            break;
        case "racks":
            for (let x = 0; x < pw; x += 40) {
                R(g, x + 4, 0, 30, ph, th.wallLo);
                for (let y = 4; y < ph; y += 6) {
                    R(g, x + 6, y, 26, 4, th.wallHi);
                    if (rand(rng) < 0.5) R(g, x + 8 + Math.floor(rand(rng) * 20), y + 1, 1, 1, rand(rng) < 0.5 ? "#54e3ff" : "#5cf2b8");
                }
            }
            break;
        case "wood":
            for (let x = 0; x < pw; x += 10) {
                R(g, x, 0, 1, ph, th.wallLo);
                if (rand(rng) < 0.3) R(g, x + 3, range(rng, 0, ph), 1, 20, th.wallHi);
            }
            break;
        case "concrete":
            for (let i = 0; i < (pw * ph) / 200; i++) R(g, range(rng, 0, pw), range(rng, 0, ph), 1, 1, rand(rng) < 0.5 ? th.wallHi : th.wallLo);
            for (let x = 0; x < pw; x += 64) R(g, x, 0, 1, ph, th.wallLo);
            break;
    }
};

const drawTiles = (g: CanvasRenderingContext2D, s: Stage, th: Theme, rng: ReturnType<typeof makeRng>) => {
    for (let ty = 0; ty < s.rows; ty++) {
        for (let tx = 0; tx < s.cols; tx++) {
            const t = tileAt(s, tx, ty);
            const x = tx * TILE;
            const y = ty * TILE;
            if (t === T_SOLID) {
                const up = tileAt(s, tx, ty - 1) === T_SOLID;
                const dn = tileAt(s, tx, ty + 1) === T_SOLID;
                const lf = tileAt(s, tx - 1, ty) === T_SOLID;
                const rt = tileAt(s, tx + 1, ty) === T_SOLID;
                R(g, x, y, TILE, TILE, th.solid);
                // Deep inside the mass: darker, with a faint grid
                if (up && dn && lf && rt) {
                    R(g, x, y, TILE, TILE, th.solidLo);
                    if ((tx + ty) % 3 === 0) R(g, x + 7, y + 7, 2, 2, th.solid);
                    continue;
                }
                if (!up) {
                    R(g, x, y, TILE, 3, th.solidLine);
                    R(g, x, y, TILE, 1, th.solidHi);
                    if (rand(rng) < 0.3) R(g, x + Math.floor(rand(rng) * 12), y + 1, 3, 1, th.solidHi);
                }
                if (!dn) R(g, x, y + TILE - 2, TILE, 2, th.solidLo);
                if (!lf) {
                    R(g, x, y, 2, TILE, th.solidLine);
                    R(g, x, y + (up ? 0 : 1), 1, TILE - (up ? 0 : 1), th.solidHi + "88");
                }
                if (!rt) R(g, x + TILE - 2, y, 2, TILE, th.solidLo);
                if (up && !dn) R(g, x, y + 4, TILE, 1, th.solidLine);
            } else if (t === T_PLATFORM) {
                R(g, x, y, TILE, 4, th.plat);
                R(g, x, y, TILE, 1, th.platHi);
                R(g, x, y + 4, TILE, 1, "rgba(0,0,0,0.5)");
                if (tileAt(s, tx - 1, ty) !== T_PLATFORM) R(g, x + 1, y + 4, 2, 5, th.plat);
                if (tileAt(s, tx + 1, ty) !== T_PLATFORM) R(g, x + TILE - 3, y + 4, 2, 5, th.plat);
            }
        }
    }
};

// Three layers of city: hazy far towers, mid-rise with lit windows, and near
// rooftops with neon and antenna lights. Each is wider than the screen and tiles.
const skyCache = new Map<Theme, HTMLCanvasElement[]>();

export const skyline = (th: Theme): HTMLCanvasElement[] => {
    const hit = skyCache.get(th);
    if (hit) return hit;
    const rng = makeRng(99);
    const layers: HTMLCanvasElement[] = [];

    // Sky with a gradient and a moon
    const sky = canvas(W, H);
    const grad = sky.g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, th.sky[0]);
    grad.addColorStop(1, th.sky[1]);
    sky.g.fillStyle = grad;
    sky.g.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) R(sky.g, range(rng, 0, W), range(rng, 0, H * 0.5), 1, 1, rand(rng) < 0.2 ? "#ece8ff" : "#5b4f9a");
    glow(sky.g, 380, 52, 60, "#8c9eff", 0.25);
    sky.g.fillStyle = "#d8d4f5";
    sky.g.beginPath();
    sky.g.arc(380, 52, 11, 0, Math.PI * 2);
    sky.g.fill();
    sky.g.fillStyle = th.sky[0];
    sky.g.beginPath();
    sky.g.arc(385, 49, 10, 0, Math.PI * 2);
    sky.g.fill();
    layers.push(sky.c);

    const layer = (width: number, base: number, minH: number, maxH: number, color: string, lit: number, neon: boolean) => {
        const L = canvas(width, H);
        let x = 0;
        while (x < width) {
            const bw = Math.floor(range(rng, 18, 46));
            const bh = Math.floor(range(rng, minH, maxH));
            const top = base - bh;
            R(L.g, x, top, bw, H - top, color);
            // Rooftop details
            if (rand(rng) < 0.4) R(L.g, x + Math.floor(bw / 2), top - 6, 1, 6, color);
            if (rand(rng) < 0.3) R(L.g, x + 3, top - 3, bw - 6, 3, color);
            // Windows
            for (let wy = top + 4; wy < H - 4; wy += 5) {
                for (let wx = x + 3; wx < x + bw - 3; wx += 4) {
                    if (rand(rng) < lit) R(L.g, wx, wy, 2, 2, th.windowLit[Math.floor(rand(rng) * th.windowLit.length)] + (rand(rng) < 0.5 ? "cc" : "66"));
                }
            }
            if (neon && rand(rng) < 0.25) {
                const c = [th.accent, "#8c9eff", "#54e3ff"][Math.floor(rand(rng) * 3)];
                const sh = Math.floor(range(rng, 14, 30));
                R(L.g, x + bw - 5, top + 8, 3, sh, c);
                glow(L.g, x + bw - 4, top + 8 + sh / 2, 14, c, 0.3);
            }
            if (rand(rng) < 0.5) R(L.g, x + Math.floor(bw / 2), top - 7, 1, 1, "#ff3d7f");
            x += bw + Math.floor(range(rng, 0, 6));
        }
        return L.c;
    };
    layers.push(layer(900, 190, 60, 150, th.city[0], 0.1, false));
    layers.push(layer(1000, 230, 50, 140, th.city[1], 0.22, true));
    layers.push(layer(1100, 270, 30, 110, th.city[2], 0.12, true));
    skyCache.set(th, layers);
    return layers;
};
