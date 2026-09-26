"use client";
// Debug view of every baked sprite frame: /tower?debug=sprites
import React, { useEffect, useRef } from "react";
import { getAtlas } from "@/game/art/atlas";

const SpriteSheet: React.FC = () => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const atlas = getAtlas();
        const c = ref.current!;
        const q = new URLSearchParams(window.location.search);
        const scale = Number(q.get("scale") ?? 3);
        const only = q.get("only")?.split(",") ?? null;
        const names = Object.keys(atlas).filter((n) => !only || only.some((o) => n.startsWith(o)));
        const rowH = 60;
        const colW = 60;
        const cols = 16;
        c.width = (cols + 2) * colW * scale;
        c.height = names.length * rowH * scale;
        const g = c.getContext("2d")!;
        g.imageSmoothingEnabled = false;
        g.fillStyle = "#15122b";
        g.fillRect(0, 0, c.width, c.height);
        g.font = `${10 * scale}px monospace`;
        names.forEach((name, row) => {
            const s = atlas[name];
            g.fillStyle = "#8c9eff";
            g.fillText(name, 4, row * rowH * scale + 14 * scale);
            s.r.forEach((f, i) => {
                const x = (2 + (i % cols)) * colW * scale;
                const y = row * rowH * scale;
                g.fillStyle = "#1d1838";
                g.fillRect(x, y, s.w * scale, s.h * scale);
                g.drawImage(f, x, y, s.w * scale, s.h * scale);
                g.fillStyle = "#ff3d7f";
                g.fillRect(x + s.ox * scale, y + s.oy * scale, scale, scale);
            });
        });
    }, []);
    return <canvas ref={ref} style={{ imageRendering: "pixelated", display: "block" }} />;
};

export default SpriteSheet;
