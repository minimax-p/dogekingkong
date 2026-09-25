// A tiny pixel buffer for drawing sprites at load time: exact lines, fills
// and outlines, with no anti-aliasing. Colors are "#rrggbb" strings.

export type Buf = { w: number; h: number; d: Uint32Array };

const cache = new Map<string, number>();

// "#rrggbb" or "#rrggbbaa" to a little-endian RGBA word, as ImageData stores it
export const rgba = (hex: string): number => {
    let v = cache.get(hex);
    if (v !== undefined) return v;
    const n = parseInt(hex.slice(1, 7), 16);
    const a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255;
    v = ((a << 24) | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
    cache.set(hex, v);
    return v;
};

export const makeBuf = (w: number, h: number): Buf => ({ w, h, d: new Uint32Array(w * h) });

export const px = (b: Buf, x: number, y: number, c: number) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
    b.d[y * b.w + x] = c;
};

export const get = (b: Buf, x: number, y: number) => (x < 0 || y < 0 || x >= b.w || y >= b.h ? 0 : b.d[y * b.w + x]);

export const rect = (b: Buf, x: number, y: number, w: number, h: number, c: number) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(b, x + i, y + j, c);
};

// A round-ish brush of the given width
export const dot = (b: Buf, x: number, y: number, size: number, c: number) => {
    if (size <= 1) return px(b, x, y, c);
    const r = size / 2;
    const x0 = Math.round(x - r + 0.01);
    const y0 = Math.round(y - r + 0.01);
    for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
            if (size >= 4 && (i === 0 || i === size - 1) && (j === 0 || j === size - 1)) continue;
            px(b, x0 + i, y0 + j, c);
        }
    }
};

// A thick line: the brush stamped along a Bresenham path
export const line = (b: Buf, x1: number, y1: number, x2: number, y2: number, size: number, c: number) => {
    let x = Math.round(x1);
    let y = Math.round(y1);
    const ex = Math.round(x2);
    const ey = Math.round(y2);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
        dot(b, x, y, size, c);
        if (x === ex && y === ey) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
            err += dy;
            x += sx;
        }
        if (e2 <= dx) {
            err += dx;
            y += sy;
        }
    }
};

// Tapered limb: width goes from w1 to w2 along the segment
export const limb = (b: Buf, x1: number, y1: number, x2: number, y2: number, w1: number, w2: number, c: number) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        dot(b, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, Math.round(w1 + (w2 - w1) * t), c);
    }
};

// Scanline polygon fill
export const poly = (b: Buf, pts: [number, number][], c: number) => {
    const ys = pts.map((p) => p[1]);
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const y1 = Math.min(b.h - 1, Math.ceil(Math.max(...ys)));
    for (let y = y0; y <= y1; y++) {
        const yc = y + 0.5;
        const xs: number[] = [];
        for (let i = 0; i < pts.length; i++) {
            const [ax, ay] = pts[i];
            const [bx, by] = pts[(i + 1) % pts.length];
            if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
        }
        xs.sort((a, b2) => a - b2);
        for (let k = 0; k + 1 < xs.length; k += 2) {
            for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) px(b, x, y, c);
        }
    }
};

export const circle = (b: Buf, cx: number, cy: number, r: number, c: number) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) px(b, cx + x, cy + y, c);
};

// Stamp a hand-drawn grid. Each character maps to a color; "." is clear.
export const grid = (b: Buf, rows: readonly string[], x: number, y: number, colors: Record<string, string>, flip = false) => {
    const w = Math.max(...rows.map((r) => r.length));
    rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch === "." || ch === " ") continue;
            const col = colors[ch];
            if (!col) continue;
            px(b, x + (flip ? w - 1 - i : i), y + j, rgba(col));
        }
    });
};

// A 1px outline around everything opaque
export const outline = (b: Buf, c: number) => {
    const src = b.d.slice();
    for (let y = 0; y < b.h; y++) {
        for (let x = 0; x < b.w; x++) {
            if (src[y * b.w + x] >>> 24) continue;
            const n =
                (x > 0 && src[y * b.w + x - 1] >>> 24) ||
                (x < b.w - 1 && src[y * b.w + x + 1] >>> 24) ||
                (y > 0 && src[(y - 1) * b.w + x] >>> 24) ||
                (y < b.h - 1 && src[(y + 1) * b.w + x] >>> 24);
            if (n) b.d[y * b.w + x] = c;
        }
    }
};

// Brighten the pixels on one side of the silhouette (neon rim light)
export const rim = (b: Buf, dx: number, dy: number, c: number, skip: number[] = []) => {
    const src = b.d.slice();
    for (let y = 0; y < b.h; y++) {
        for (let x = 0; x < b.w; x++) {
            const v = src[y * b.w + x];
            if (!(v >>> 24) || skip.includes(v)) continue;
            const nx = x + dx;
            const ny = y + dy;
            const out = nx < 0 || ny < 0 || nx >= b.w || ny >= b.h || !(src[ny * b.w + nx] >>> 24);
            if (out) b.d[y * b.w + x] = c;
        }
    }
};

export const flipBuf = (b: Buf): Buf => {
    const o = makeBuf(b.w, b.h);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) o.d[y * b.w + (b.w - 1 - x)] = b.d[y * b.w + x];
    return o;
};

export const whiteBuf = (b: Buf, c = rgba("#ffffff")): Buf => {
    const o = makeBuf(b.w, b.h);
    for (let i = 0; i < b.d.length; i++) if (b.d[i] >>> 24) o.d[i] = c;
    return o;
};

export const toCanvas = (b: Buf): HTMLCanvasElement => {
    const c = document.createElement("canvas");
    c.width = b.w;
    c.height = b.h;
    const g = c.getContext("2d")!;
    const img = g.createImageData(b.w, b.h);
    new Uint32Array(img.data.buffer).set(b.d);
    g.putImageData(img, 0, 0);
    return c;
};

export const canvas = (w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    return { c, g };
};
