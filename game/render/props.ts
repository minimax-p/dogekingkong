// Set dressing, drawn with plain rectangles so it stays on the pixel grid.
// Static props are baked into the stage backdrop once; animated ones are
// drawn every frame.
import { TILE } from "@/game/engine/constants";
import { drawText, textWidth } from "@/game/render/font";
import type { Theme } from "@/game/render/themes";
import type { PropDef } from "@/game/world/stage";

type G = CanvasRenderingContext2D;

export const R = (g: G, x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

export const glow = (g: G, x: number, y: number, r: number, color: string, alpha = 0.35) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, hexA(color, alpha));
    grad.addColorStop(1, hexA(color, 0));
    const prev = g.globalCompositeOperation;
    g.globalCompositeOperation = "lighter";
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.globalCompositeOperation = prev;
};

export const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1, 7), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// A cone of light falling from a lamp
export const cone = (g: G, x: number, y: number, w: number, h: number, color: string, alpha = 0.16) => {
    const grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, hexA(color, alpha));
    grad.addColorStop(1, hexA(color, 0));
    const prev = g.globalCompositeOperation;
    g.globalCompositeOperation = "lighter";
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x - 3, y);
    g.lineTo(x + 3, y);
    g.lineTo(x + w / 2, y + h);
    g.lineTo(x - w / 2, y + h);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = prev;
};

export type PropCtx = { theme: Theme; seed: number };

// Static props. x/y are the prop's left and bottom edges in pixels.
export const drawStaticProp = (g: G, p: PropDef, t: PropCtx) => {
    const x = Math.round(p.x * TILE);
    const y = Math.round(p.y * TILE);
    const w = Math.round((p.w ?? 1) * TILE);
    const h = Math.round((p.h ?? 1) * TILE);
    const th = t.theme;
    switch (p.kind) {
        case "window": {
            // Cut a hole to the skyline, then frame it
            g.clearRect(x, y - h, w, h);
            R(g, x - 2, y - h - 2, w + 4, 2, th.wallHi);
            R(g, x - 2, y, w + 4, 3, th.wallHi);
            R(g, x - 2, y + 2, w + 4, 1, th.wallLo);
            R(g, x - 2, y - h, 2, h, th.wallHi);
            R(g, x + w, y - h, 2, h, th.wallHi);
            for (let mx = x + 32; mx < x + w - 8; mx += 32) R(g, mx, y - h, 2, h, th.wallHi);
            R(g, x, y - Math.round(h * 0.62), w, 1, th.wallHi);
            break;
        }
        case "light":
            glow(g, x, y, w, p.text ?? th.light, 0.3);
            break;
        case "lamp": {
            // Hanging lamp: cord, shade, bulb, cone of light
            const cord = Math.round((p.h ?? 1) * 8);
            R(g, x, y, 1, cord, "#0a0816");
            R(g, x - 4, y + cord, 9, 3, "#2c2754");
            R(g, x - 3, y + cord + 3, 7, 1, p.text ?? th.light);
            cone(g, x, y + cord + 4, w, 90, p.text ?? th.light, 0.12);
            glow(g, x, y + cord + 4, 22, p.text ?? th.light, 0.35);
            break;
        }
        case "desk": {
            R(g, x, y - 12, w, 2, "#3d3570");
            R(g, x, y - 10, w, 1, "#1d1838");
            R(g, x + 2, y - 10, 2, 10, "#1d1838");
            R(g, x + w - 4, y - 10, 2, 10, "#1d1838");
            R(g, x + w - 14, y - 10, 10, 7, "#241e44");
            R(g, x + w - 12, y - 8, 6, 1, "#3d3570");
            break;
        }
        case "monitor": {
            // A monitor on a stand (the screen itself is drawn per frame)
            R(g, x, y - 15, 18, 12, "#0a0816");
            R(g, x + 8, y - 3, 3, 3, "#2c2754");
            R(g, x + 5, y - 1, 9, 1, "#2c2754");
            break;
        }
        case "plant": {
            R(g, x + 3, y - 7, 8, 7, "#3d3570");
            R(g, x + 4, y - 7, 6, 1, "#5b4f9a");
            const leaves = ["#2a8a6a", "#1f6b52", "#5cf2b8"];
            for (let i = 0; i < 14; i++) {
                const a = -Math.PI / 2 + (i - 7) * 0.22;
                const len = 6 + ((i * 7) % 5);
                for (let k = 2; k < len; k++) R(g, x + 7 + Math.cos(a) * k, y - 8 + Math.sin(a) * k, 1, 1, leaves[(i + k) % 3 === 0 ? 2 : i % 2]);
            }
            break;
        }
        case "poster": {
            R(g, x, y - h, w, h, "#0a0816");
            R(g, x + 1, y - h + 1, w - 2, h - 2, p.flip ? "#2b1f45" : "#1d1838");
            if (p.text) {
                const lines = p.text.split("|");
                lines.forEach((ln, i) => drawText(g, ln, x + w / 2, y - h + 4 + i * 9, i === 0 ? th.accent : "#a9a3d6", { align: "center" }));
            }
            break;
        }
        case "board": {
            // Directory board: a title and lines of text
            R(g, x, y - h, w, h, "#07050f");
            R(g, x + 1, y - h + 1, w - 2, h - 2, "#141029");
            R(g, x + 1, y - h + 1, w - 2, 1, "#3d3570");
            const lines = (p.text ?? "").split("|");
            lines.forEach((ln, i) => {
                const [l, r] = ln.split("~");
                drawText(g, l, x + 5, y - h + 5 + i * 10, i === 0 ? th.accent : "#ece8ff");
                if (r) drawText(g, r, x + w - 5, y - h + 5 + i * 10, "#8c9eff", { align: "right" });
            });
            break;
        }
        case "elevator": {
            // Elevator doors with a frame and a floor readout
            R(g, x - 3, y - 50, w + 6, 50, "#2c2754");
            R(g, x - 2, y - 49, w + 4, 49, "#0a0816");
            R(g, x, y - 46, w / 2 - 1, 46, "#3d3570");
            R(g, x + w / 2 + 1, y - 46, w / 2 - 1, 46, "#3d3570");
            R(g, x + 2, y - 44, 1, 42, "#5b4f9a");
            R(g, x + w / 2 + 3, y - 44, 1, 42, "#5b4f9a");
            R(g, x + w / 2 - 6, y - 60, 12, 8, "#07050f");
            drawText(g, p.text ?? "G", x + w / 2, y - 59, th.accent, { align: "center" });
            R(g, x + w + 6, y - 28, 4, 8, "#2c2754");
            R(g, x + w + 7, y - 27, 2, 2, th.accent);
            R(g, x + w + 7, y - 23, 2, 2, "#5b4f9a");
            break;
        }
        case "counter": {
            // Reception desk
            R(g, x, y - 22, w, 3, "#5b4f9a");
            R(g, x, y - 19, w, 19, "#241e44");
            R(g, x, y - 19, w, 1, "#3d3570");
            for (let i = 6; i < w - 4; i += 12) R(g, x + i, y - 16, 8, 14, "#1d1838");
            if (p.text) drawText(g, p.text, x + w / 2, y - 14, th.accent, { align: "center" });
            break;
        }
        case "vent":
            R(g, x, y - 8, 16, 8, "#0a0816");
            for (let i = 1; i < 8; i += 2) R(g, x + 1, y - 8 + i, 14, 1, "#2c2754");
            break;
        case "pipe":
            if ((p.h ?? 0) > (p.w ?? 0)) {
                R(g, x, y - h, 4, h, "#241e44");
                R(g, x + 1, y - h, 1, h, "#3d3570");
            } else {
                R(g, x, y - 4, w, 4, "#241e44");
                R(g, x, y - 3, w, 1, "#3d3570");
            }
            break;
        case "crate":
            R(g, x, y - h, w, h, "#2b2550");
            R(g, x + 1, y - h + 1, w - 2, h - 2, "#3d3570");
            R(g, x + 2, y - h + 2, w - 4, h - 4, "#2b2550");
            g.fillStyle = "#3d3570";
            for (let i = 0; i < Math.min(w, h) - 4; i++) g.fillRect(x + 2 + i, y - h + 2 + i, 1, 1);
            break;
        case "vending": {
            R(g, x, y - 34, 20, 34, "#241e44");
            R(g, x + 2, y - 32, 12, 22, "#0a0816");
            for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) R(g, x + 3 + c * 4, y - 30 + r * 5, 2, 3, ["#ff3d7f", "#54e3ff", "#ffcf6b", "#5cf2b8"][(r + c) % 4]);
            R(g, x + 15, y - 30, 3, 8, "#3d3570");
            R(g, x + 3, y - 7, 10, 3, "#07050f");
            glow(g, x + 8, y - 20, 20, "#54e3ff", 0.18);
            break;
        }
        case "cooler":
            R(g, x + 2, y - 18, 8, 18, "#3d3570");
            R(g, x + 3, y - 28, 6, 10, "#54e3ff");
            R(g, x + 4, y - 27, 2, 8, "#b8f4ff");
            break;
        case "couch":
            R(g, x, y - 10, w, 6, "#3d3570");
            R(g, x, y - 16, w, 6, "#2b2550");
            R(g, x - 2, y - 13, 4, 11, "#2b2550");
            R(g, x + w - 2, y - 13, 4, 11, "#2b2550");
            R(g, x + 2, y - 4, 2, 4, "#1d1838");
            R(g, x + w - 4, y - 4, 2, 4, "#1d1838");
            break;
        case "frame": {
            // A framed diploma / plaque
            R(g, x, y - h, w, h, "#ffcf6b");
            R(g, x + 1, y - h + 1, w - 2, h - 2, "#ece8ff");
            R(g, x + 3, y - h + 4, w - 6, 1, "#a9a3d6");
            R(g, x + 3, y - h + 7, w - 8, 1, "#a9a3d6");
            R(g, x + w / 2 - 2, y - 5, 4, 3, "#ff3d7f");
            break;
        }
        case "text": {
            drawText(g, p.text ?? "", x, y - 7, p.flip ? "#5b4f9a" : "#a9a3d6", { align: "left" });
            break;
        }
        case "rail":
            // Balcony railing
            R(g, x, y - 12, w, 2, "#3d3570");
            for (let i = 0; i < w; i += 6) R(g, x + i, y - 10, 1, 10, "#2c2754");
            break;
        case "server": {
            // A rack of blinking servers
            R(g, x, y - h, w, h, "#0a0c18");
            for (let yy = y - h + 3; yy < y - 3; yy += 5) {
                R(g, x + 2, yy, w - 4, 4, "#161a2e");
                R(g, x + 3, yy + 1, 2, 1, (yy / 5) % 3 === 0 ? th.accent : th.light);
                R(g, x + w - 8, yy + 2, 5, 1, "#2c3354");
            }
            break;
        }
        case "net": {
            // Badminton net (the post is a solid tile in the map)
            R(g, x + 6, y - h, 3, h, "#ece8ff");
            g.fillStyle = "rgba(236,232,255,0.35)";
            for (let yy = y - h + 2; yy < y - 12; yy += 3) g.fillRect(x + 3, yy, 9, 1);
            for (let xx = x + 3; xx < x + 13; xx += 3) g.fillRect(xx, y - h + 2, 1, h - 14);
            R(g, x + 2, y - h, 11, 2, "#ece8ff");
            break;
        }
        case "courtline":
            R(g, x, y - 1, w, 1, "#ece8ff");
            R(g, x + w / 2, y - 1, 1, 1, "#ff3d7f");
            break;
        case "boba": {
            // Boba counter with cups and a menu board
            R(g, x, y - 20, w, 3, "#ff8fb4");
            R(g, x, y - 17, w, 17, "#3a2050");
            R(g, x + 2, y - 15, w - 4, 1, "#5a3070");
            for (let i = 0; i < 4; i++) {
                const cx = x + 6 + i * 10;
                R(g, cx, y - 28, 6, 8, "#ece8ff");
                R(g, cx + 1, y - 26, 4, 5, i % 2 ? "#c9a27a" : "#e8b8d0");
                R(g, cx + 1, y - 23, 4, 2, "#1d1838");
                R(g, cx + 3, y - 32, 1, 4, "#ff3d7f");
            }
            R(g, x + 4, y - 58, w - 8, 24, "#07050f");
            drawText(g, "BOBA", x + w / 2, y - 55, "#ff8fb4", { align: "center" });
            drawText(g, "TARO · MATCHA", x + w / 2, y - 45, "#a9a3d6", { align: "center" });
            glow(g, x + w / 2, y - 46, 40, "#ff8fb4", 0.2);
            break;
        }
        case "amp":
            R(g, x, y - 22, 18, 22, "#141022");
            R(g, x + 1, y - 21, 16, 5, "#2c2754");
            R(g, x + 2, y - 20, 2, 2, "#ffcf6b");
            R(g, x + 6, y - 20, 2, 2, "#ffcf6b");
            for (let yy = y - 14; yy < y - 2; yy += 2) R(g, x + 2, yy, 14, 1, "#1d1838");
            break;
        case "weights": {
            R(g, x, y - 18, w, 2, "#3d3570");
            R(g, x + 2, y - 16, 2, 16, "#2c2754");
            R(g, x + w - 4, y - 16, 2, 16, "#2c2754");
            for (let i = 0; i < 4; i++) {
                R(g, x + 6 + i * 8, y - 24, 2, 6, "#5b4f9a");
                R(g, x + 4 + i * 8, y - 22, 6, 2, "#a9a3d6");
            }
            break;
        }
        case "trophy": {
            // Glass case: the badminton team trophy
            R(g, x, y - 34, 26, 34, "#1d1838");
            R(g, x + 2, y - 32, 22, 28, "rgba(140,158,255,0.12)");
            R(g, x + 9, y - 26, 8, 6, "#ffcf6b");
            R(g, x + 11, y - 20, 4, 4, "#ffcf6b");
            R(g, x + 8, y - 16, 10, 2, "#c99a4a");
            drawText(g, "CAPTAIN", x + 13, y - 11, "#ffcf6b", { align: "center" });
            glow(g, x + 13, y - 22, 20, "#ffcf6b", 0.2);
            break;
        }
        case "emergency":
            R(g, x, y, 6, 3, "#2c2754");
            R(g, x + 1, y + 3, 4, 2, "#ff4a4a");
            glow(g, x + 3, y + 6, (p.w ?? 3) * 16, "#ff4a4a", 0.3);
            break;
        case "sign": {
            const t2 = p.text ?? "";
            const tw = t2.length * 6 + 6;
            R(g, x, y - 13, tw, 13, "#07050f");
            R(g, x, y - 13, tw, 1, p.flip ? th.accent : th.light);
            drawText(g, t2, x + 3, y - 10, p.flip ? th.accent : "#ece8ff");
            break;
        }
        case "wreck": {
            // Collapsed legacy hardware
            g.fillStyle = "#1d1838";
            for (let i = 0; i < w; i += 4) g.fillRect(x + i, y - 4 - ((i * 7) % 9), 5, 4 + ((i * 7) % 9));
            R(g, x + 3, y - 10, 12, 8, "#0a0816");
            drawText(g, "IONIC", x + 3, y - 20, "#6b2a4a");
            break;
        }
        case "sqlite": {
            R(g, x, y - 20, 18, 20, "#141022");
            for (let i = 0; i < 3; i++) R(g, x + 2, y - 18 + i * 6, 14, 4, "#2c2754");
            R(g, x + 3, y - 17, 2, 1, "#5cf2b8");
            drawText(g, "SQLITE", x + 9, y - 30, "#5cf2b8", { align: "center" });
            drawText(g, "OFFLINE OK", x + 9, y - 40, "#5b4f9a", { align: "center" });
            break;
        }
        case "column":
            R(g, x, y - h, 12, h, th.wallHi);
            R(g, x + 1, y - h, 1, h, "#2c2754");
            R(g, x + 10, y - h, 2, h, th.wallLo);
            break;
    }
};

// Props that move or flicker are redrawn every frame (x, y relative to camera)
export const drawAnimProp = (g: G, p: PropDef, t: number, th: Theme, x: number, y: number) => {
    const w = Math.round((p.w ?? 1) * TILE);
    const h = Math.round((p.h ?? 1) * TILE);
    switch (p.kind) {
        case "neon": {
            const text = p.text ?? "OPEN";
            const color = p.flip ? th.accent : th.light;
            // Occasional flicker
            const f = Math.sin(t * 0.13) + Math.sin(t * 0.71) * 0.6;
            const on = f > -1.3;
            const tw = textWidth(text);
            if (on) {
                glow(g, x + tw / 2, y - 4, tw * 0.8 + 10, color, 0.22);
                drawText(g, text, x, y - 7, color);
            } else drawText(g, text, x, y - 7, "#2c2754");
            break;
        }
        case "monitor": {
            const lit = (Math.floor(t / 7) + Math.round(p.x * 3)) % 23 !== 0;
            R(g, x + 1, y - 14, 16, 10, lit ? "#0e1d2e" : "#08070f");
            if (lit) {
                const c = p.text ?? th.light;
                for (let i = 0; i < 4; i++) {
                    const len = 3 + ((Math.floor(t / 20) + i * 5 + Math.round(p.x)) % 10);
                    R(g, x + 3, y - 12 + i * 2, len, 1, i === 0 ? c : "#3d6a8a");
                }
                glow(g, x + 9, y - 9, 16, c, 0.14);
            }
            break;
        }
        case "screen": {
            // Big wall screen with a scrolling trace
            R(g, x, y - h, w, h, "#07050f");
            R(g, x + 1, y - h + 1, w - 2, h - 2, "#0b1424");
            const c = p.text ?? th.light;
            g.fillStyle = c;
            for (let i = 0; i < w - 4; i++) {
                const v = Math.sin((i + t * 0.6) * 0.18) * 0.5 + Math.sin((i + t * 0.9) * 0.05 + p.x) * 0.5;
                g.fillRect(x + 2 + i, Math.round(y - h / 2 + v * (h * 0.3)), 1, 1);
            }
            glow(g, x + w / 2, y - h / 2, Math.max(w, h) * 0.7, c, 0.1);
            break;
        }
        case "blink":
            if (Math.floor(t / 30) % 2 === 0) R(g, x, y - 2, 2, 2, p.text ?? th.accent);
            break;
    }
};

export const ANIM_PROPS = new Set(["neon", "monitor", "screen", "blink"]);
