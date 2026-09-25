// Animated, floor-specific props. They can read the world (the Headhunter's
// position, the clock, kills) but never change it.
import { TILE, W } from "@/game/engine/constants";
import { PAL } from "@/game/art/palette";
import { drawText, textWidth } from "@/game/render/font";
import { glow, hexA, R } from "@/game/render/props";
import type { Theme } from "@/game/render/themes";
import type { PropDef } from "@/game/world/stage";
import type { World } from "@/game/world/types";
import { FAILING } from "@/game/story/stages/suite";
import { pixelArt } from "@/game/render/images";

type G = CanvasRenderingContext2D;

export const SETPIECES = new Set(["furniture", "crew", "calendar", "figma", "globe", "keypad", "clock", "testwall", "code", "terminal", "band", "lights", "legacy", "report", "signal"]);

// Break text into lines that fit a width (in characters)
const wrap = (text: string, max: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const wd of words) {
        if ((cur + " " + wd).trim().length > max) {
            lines.push(cur.trim());
            cur = wd;
        } else cur += " " + wd;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines;
};

export const bubble = (g: G, text: string, x: number, y: number, color: string) => {
    const lines = wrap(text.toUpperCase(), 24);
    const w = Math.max(...lines.map((l) => textWidth(l))) + 8;
    const h = lines.length * 9 + 5;
    const bx = Math.round(Math.max(4, Math.min(W - w - 4, x - w / 2)));
    const by = Math.round(y - h - 6);
    g.fillStyle = "rgba(7,5,15,0.88)";
    g.fillRect(bx, by, w, h);
    R(g, bx, by, w, 1, color);
    R(g, bx, by + h - 1, w, 1, color);
    R(g, Math.round(x) - 1, by + h, 3, 2, color);
    R(g, Math.round(x), by + h + 2, 1, 2, color);
    lines.forEach((l, i) => drawText(g, l, bx + 4, by + 3 + i * 9, "#ece8ff"));
};

const progress = (w: World) => {
    const counted = w.enemies.filter((e) => e.counts);
    if (!counted.length) return 1;
    return counted.filter((e) => e.state === "dead").length / counted.length;
};

export const drawSetpiece = (g: G, p: PropDef, w: World, th: Theme, x: number, y: number) => {
    const t = w.step;
    const pw = Math.round((p.w ?? 1) * TILE);
    const ph = Math.round((p.h ?? 1) * TILE);
    const pl = w.player;
    switch (p.kind) {
        case "furniture": {
            // A piece of the hand-drawn room from the main site
            const img = pixelArt(`/assets/${p.text}-colored.svg`, pw);
            if (img) g.drawImage(img, Math.round(x), Math.round(y - img.height));
            break;
        }
        case "crew": {
            // A hologram crewmate at a desk; says a line when you pass
            const flick = t % 90 < 2 ? 0.3 : 0.75;
            g.globalAlpha = flick;
            const c = PAL.cyan;
            R(g, x + 5, y - 20, 5, 5, c);
            R(g, x + 4, y - 15, 7, 8, c);
            R(g, x + 3, y - 8, 3, 2, c);
            R(g, x + 9, y - 8, 3, 2, c);
            for (let i = 0; i < 20; i += 2) R(g, x + 3, y - 20 + i, 9, 1, "rgba(7,5,15,0.5)");
            g.globalAlpha = 1;
            glow(g, x + 7, y - 12, 16, c, 0.25);
            // Desk and a small screen
            R(g, x - 2, y - 7, 22, 2, "#3d3570");
            R(g, x + 14, y - 14, 8, 6, "#0a0816");
            R(g, x + 15, y - 13, 6, 4, "#1e3a5a");
            break;
        }
        case "calendar": {
            // Tears off a week as you cross the floor: five weeks, one app
            const k = Math.min(1, Math.max(0, (pl.x - 32) / (w.stage.pw - 64)));
            const week = Math.min(5, 1 + Math.floor(k * 5));
            R(g, x, y - 26, 22, 26, "#ece8ff");
            R(g, x, y - 26, 22, 7, PAL.hot);
            drawText(g, "WEEK", x + 11, y - 25, "#ffffff", { align: "center" });
            drawText(g, String(week), x + 11, y - 16, "#1d1838", { align: "center", scale: 1 });
            drawText(g, "OF 5", x + 11, y - 8, "#5b4f9a", { align: "center" });
            break;
        }
        case "figma": {
            // The big screen: a Figma wireframe that turns into the shipped app
            const k = w.cleared ? 1 : progress(w);
            R(g, x, y - ph, pw, ph, "#07050f");
            R(g, x + 2, y - ph + 2, pw - 4, ph - 4, "#0e1022");
            const phx = x + pw / 2 - 18;
            const phy = y - ph + 6;
            R(g, phx, phy, 36, ph - 12, k > 0.99 ? "#1d1838" : "#0e1022");
            const line = (xx: number, yy: number, ww: number, hh: number, col: string, fill: string) => {
                if (k < 0.5) {
                    R(g, xx, yy, ww, 1, col);
                    R(g, xx, yy + hh - 1, ww, 1, col);
                    R(g, xx, yy, 1, hh, col);
                    R(g, xx + ww - 1, yy, 1, hh, col);
                } else R(g, xx, yy, ww, hh, fill);
            };
            line(phx + 2, phy + 2, 32, 6, "#5b4f9a", PAL.peri);
            line(phx + 2, phy + 10, 32, 14, "#5b4f9a", "#2b2550");
            line(phx + 2, phy + 26, 15, 10, "#5b4f9a", PAL.cyan);
            line(phx + 19, phy + 26, 15, 10, "#5b4f9a", PAL.pass);
            line(phx + 6, phy + ph - 24, 24, 6, "#5b4f9a", PAL.hot);
            if (k >= 0.5) {
                // A little seismograph on the app's chart card
                for (let i = 0; i < 30; i++) R(g, phx + 3 + i, phy + 17 + Math.round(Math.sin((i + t * 0.5) * 0.5) * 3), 1, 1, PAL.cyan);
            }
            drawText(g, k > 0.99 ? "ESP MOBILE · SHIPPED" : k >= 0.5 ? "BUILDING..." : "FIGMA · WIREFRAME", x + pw / 2, y - 10, k > 0.99 ? PAL.pass : "#8c9eff", { align: "center" });
            glow(g, x + pw / 2, y - ph / 2, pw * 0.6, k > 0.99 ? PAL.pass : PAL.peri, 0.1);
            break;
        }
        case "globe": {
            // NASA WorldWind: a spinning dotted globe with station pins
            const r = Math.round((p.w ?? 2) * 8);
            const cx = x + r;
            const cy = y - r;
            glow(g, cx, cy, r * 1.6, PAL.cyan, 0.15);
            for (let lat = -80; lat <= 80; lat += 20) {
                for (let lon = 0; lon < 360; lon += 12) {
                    const a = ((lon + t * 0.6) * Math.PI) / 180;
                    const la = (lat * Math.PI) / 180;
                    const z = Math.cos(la) * Math.cos(a);
                    if (z < 0) continue;
                    R(g, cx + Math.cos(la) * Math.sin(a) * r, cy - Math.sin(la) * r, 1, 1, z > 0.6 ? PAL.cyan : "#1e6a7a");
                }
            }
            for (let i = 0; i < 4; i++) {
                const a = ((i * 90 + t * 0.6) * Math.PI) / 180;
                if (Math.cos(a) > 0 && t % 40 < 30) R(g, cx + Math.sin(a) * r * 0.8, cy - r * 0.3 + i * 3, 2, 2, PAL.hot);
            }
            break;
        }
        case "keypad": {
            // OTP keypad on the vault door: types its code once the room is clear
            R(g, x, y - 26, 16, 26, "#1d1838");
            R(g, x + 1, y - 25, 14, 7, "#07050f");
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) R(g, x + 2 + c * 4, y - 16 + r * 4, 3, 3, "#3d3570");
            const code = p.text ?? "481516";
            if (w.cleared) {
                const n = Math.min(code.length, Math.floor((w.time * 60 - (w.flags.clearedAt ?? 0)) / 6));
                drawText(g, code.slice(0, Math.max(0, n)).slice(-2), x + 2, y - 24, PAL.pass);
                R(g, x + 12, y - 4, 3, 3, n >= code.length ? PAL.pass : PAL.amber);
                if (n >= code.length) glow(g, x + 8, y - 12, 20, PAL.pass, 0.25);
            } else {
                R(g, x + 12, y - 4, 3, 3, t % 40 < 20 ? PAL.red : "#6b2a4a");
                drawText(g, "OTP", x + 8, y - 24, "#5b4f9a", { align: "center" });
            }
            break;
        }
        case "clock": {
            // Big wall clock: the floor's time plus game time
            const [h, m, s] = (p.text ?? "3:59:40").split(":").map(Number);
            const total = h * 3600 + m * 60 + s + Math.floor(w.time);
            const hh = Math.floor(total / 3600) % 24;
            const mm = Math.floor(total / 60) % 60;
            const ss = total % 60;
            const str = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
            R(g, x - 2, y - 20, textWidth(str) * 2 + 8, 20, "#07050f");
            const hit = hh === 4 && mm === 0 && ss < 3;
            const col = hit ? (t % 10 < 5 ? PAL.hot : "#ffffff") : PAL.hot;
            drawText(g, str, x + 2, y - 17, col, { scale: 2 });
            glow(g, x + textWidth(str), y - 10, 40, PAL.hot, hit ? 0.35 : 0.15);
            break;
        }
        case "testwall": {
            // 8×8 screens: 8 platforms × 8 languages. At 04:00 the suite runs.
            const runAt = w.flags.runAt ?? -1;
            const fail = w.flags.fail ?? 0;
            const now = w.time * 60;
            R(g, x - 3, y - 8 * 13 - 3, 8 * 18 + 4, 8 * 13 + 4, "#07050f");
            for (let i = 0; i < 64; i++) {
                const c = i % 8;
                const r = Math.floor(i / 8);
                const sx = x + c * 18;
                const sy = y - 8 * 13 + r * 13;
                let col = "#10182a";
                let mark = "";
                if (runAt >= 0) {
                    const start = runAt + ((i * 37) % 64) * 1.6;
                    const end = start + 40;
                    const failed = fail > 0 && FAILING.includes(i);
                    if (now < start) col = "#10182a";
                    else if (now < end) col = (t + i) % 6 < 3 ? "#1e3a5a" : "#2a4a6a";
                    else if (failed) {
                        col = t % 16 < 8 ? PAL.red : "#6b1a2a";
                        mark = "X";
                    } else {
                        col = "#1a5a48";
                        mark = "✓";
                    }
                }
                R(g, sx, sy, 16, 11, col);
                R(g, sx, sy, 16, 1, "#2c2754");
                if (mark === "X") drawText(g, "X", sx + 5, sy + 2, "#ffffff");
                else if (mark) R(g, sx + 6, sy + 5, 4, 2, PAL.pass);
            }
            drawText(g, runAt >= 0 ? "PLAYWRIGHT · 87 TESTS · 8×8" : "SCHEDULED · 04:00", x + 72, y + 4, runAt >= 0 ? PAL.pass : "#5b4f9a", { align: "center" });
            break;
        }
        case "code": {
            // A coding agent writing on the wall screens, by itself
            R(g, x, y - ph, pw, ph, "#07050f");
            R(g, x + 1, y - ph + 1, pw - 2, ph - 2, "#0b1020");
            const lines = CODE;
            const rows = Math.floor((ph - 6) / 8);
            const typed = Math.floor(t / 3 + (p.x * 7) % 40);
            let chars = typed % 240;
            const first = Math.floor(typed / 240) * 3;
            for (let r = 0; r < rows; r++) {
                const ln = lines[(first + r) % lines.length];
                const n = Math.max(0, Math.min(ln.length, chars));
                chars -= ln.length;
                const shown = ln.slice(0, Math.min(n, Math.floor((pw - 8) / 6)));
                drawText(g, shown, x + 4, y - ph + 4 + r * 8, r % 3 === 0 ? PAL.cyan : "#8c9eff");
                if (n < ln.length && n > 0) R(g, x + 4 + shown.length * 6, y - ph + 4 + r * 8, 4, 7, t % 20 < 10 ? PAL.cyan : "transparent");
                if (chars <= 0) break;
            }
            glow(g, x + pw / 2, y - ph / 2, pw * 0.5, PAL.cyan, 0.08);
            break;
        }
        case "terminal": {
            R(g, x, y - 22, 26, 16, "#07050f");
            R(g, x + 1, y - 21, 24, 14, "#08202a");
            drawText(g, ">", x + 3, y - 18, PAL.cyan);
            if (t % 40 < 20) R(g, x + 10, y - 18, 4, 7, PAL.cyan);
            R(g, x + 8, y - 6, 10, 6, "#1d1838");
            glow(g, x + 13, y - 14, 18, PAL.cyan, 0.2);
            break;
        }
        case "band": {
            // The band on stage, moving on the beat (128 BPM)
            const beat = (w.time * 60 * 128) / 3600;
            const bob = Math.floor(beat * 2) % 2;
            const player = (bx: number, instrument: string) => {
                const yy = y - bob;
                R(g, bx + 3, yy - 22, 5, 5, "#2b2550");
                R(g, bx + 2, yy - 17, 7, 9, "#3d3570");
                R(g, bx + 2, yy - 8, 3, 8, "#2b2550");
                R(g, bx + 6, yy - 8, 3, 8, "#2b2550");
                if (instrument === "guitar") {
                    R(g, bx, yy - 13, 10, 3, PAL.hot);
                    R(g, bx + 9, yy - 16, 7, 1, "#5b4f9a");
                } else if (instrument === "bass") {
                    R(g, bx, yy - 12, 10, 3, PAL.cyan);
                    R(g, bx + 9, yy - 16, 8, 1, "#5b4f9a");
                } else if (instrument === "clarinet") {
                    R(g, bx + 8, yy - 18, 1, 10, "#07050f");
                }
            };
            player(x, "guitar");
            player(x + 30, "bass");
            // Drum kit
            R(g, x + 58, y - 12, 14, 12, "#2b2550");
            R(g, x + 60, y - 10, 10, 8, PAL.peri);
            R(g, x + 54, y - 18, 6, 2, PAL.amber);
            R(g, x + 72, y - 16 + (Math.floor(beat) % 2), 6, 2, PAL.amber);
            player(x + 62, "drums");
            break;
        }
        case "lights": {
            // Stage lights sweeping on the beat
            const beat = (w.time * 60 * 128) / 3600;
            const cols = [PAL.hot, PAL.cyan, PAL.peri, PAL.pass];
            for (let i = 0; i < 4; i++) {
                const a = Math.sin(beat * Math.PI * 0.5 + i * 1.3) * 0.5;
                const lx = x + i * (pw / 3);
                const g2 = g.createLinearGradient(lx, y, lx + Math.sin(a) * 120, y + 140);
                g2.addColorStop(0, hexA(cols[i], 0.22));
                g2.addColorStop(1, hexA(cols[i], 0));
                g.save();
                g.globalCompositeOperation = "lighter";
                g.fillStyle = g2;
                g.beginPath();
                g.moveTo(lx - 2, y);
                g.lineTo(lx + 2, y);
                g.lineTo(lx + Math.sin(a) * 140 + 20, y + 150);
                g.lineTo(lx + Math.sin(a) * 140 - 20, y + 150);
                g.fill();
                g.restore();
                R(g, lx - 3, y - 3, 6, 4, "#2c2754");
            }
            break;
        }
        case "legacy": {
            // A dead monitor from the old system
            R(g, x, y - 16, 22, 14, "#0a0816");
            const glitch = t % 50 < 3;
            R(g, x + 1, y - 15, 20, 12, glitch ? "#3a1030" : "#140a1c");
            drawText(g, p.text ?? "410", x + 11, y - 13, glitch ? PAL.hot : "#6b2a4a", { align: "center" });
            R(g, x + 3, y - 6, 16, 1, "#2a1a30");
            R(g, x + 9, y - 2, 4, 2, "#2c2754");
            break;
        }
        case "report": {
            // After the suite: the report goes out before the team is in
            if (!w.cleared) break;
            const k = Math.min(1, (w.time * 60 - (w.flags.clearedAt ?? 0)) / 90);
            const ex = x + k * 200;
            const ey = y - k * 90;
            R(g, ex, ey, 10, 7, "#ece8ff");
            R(g, ex, ey, 10, 1, PAL.peri);
            g.fillStyle = PAL.peri;
            for (let i = 0; i < 5; i++) g.fillRect(Math.round(ex + i), Math.round(ey + i * 0.7), 1, 1);
            for (let i = 0; i < 5; i++) g.fillRect(Math.round(ex + 9 - i), Math.round(ey + i * 0.7), 1, 1);
            if (k < 1) drawText(g, "REPORT SENT", ex - 10, ey - 10, PAL.pass);
            break;
        }
        case "signal": {
            // No uplink on this floor
            drawText(g, "NO UPLINK · LOCALHOST ONLY", x, y - 7, t % 60 < 40 ? PAL.cyan : "#1e6a7a");
            break;
        }
    }
    void th;
};

// Speech bubbles go on top of everything (screen coordinates)
export const drawSetpieceOver = (g: G, p: PropDef, w: World, x: number, y: number) => {
    if (p.kind === "crew" && p.text) {
        const pl = w.player;
        const near = Math.abs(pl.x - (p.x * TILE + 8)) < 44 && Math.abs(pl.y - p.y * TILE) < 40;
        if (near) bubble(g, p.text, x + 7, y - 22, PAL.cyan);
    }
};

const CODE = [
    "def chat(prompt):",
    "  ctx = retrieve(prompt)",
    "  return llm(ctx, prompt)",
    "",
    "# agent: fix failing test",
    "for step in plan(task):",
    "  patch = llm.edit(step)",
    "  run_tests(patch)",
    "  if green: commit(patch)",
    "",
    "model = load('local')",
    "gpu = 'on-prem'",
    "uplink = None",
];
