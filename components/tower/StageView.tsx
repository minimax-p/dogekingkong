"use client";
// Debug view of a whole stage: /tower?debug=stage&id=4-2
import React, { useEffect, useRef } from "react";
import { H, W } from "@/game/engine/constants";
import { makeLayers, renderWorld } from "@/game/render/renderer";
import { FLOORS } from "@/game/story/floors";
import { parseStage } from "@/game/world/stage";
import { createWorld, stepWorld } from "@/game/world/world";
import { emptyInput } from "@/game/engine/input";
import { preloadImages } from "@/game/render/images";

const StageView: React.FC = () => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const id = q.get("id") ?? "G-1";
        const steps = Number(q.get("steps") ?? 1);
        const def = FLOORS.flatMap((f) => f.stages).find((s) => s.id === id)!;
        const stage = parseStage(def);
        const w = createWorld(stage, 1);
        for (let i = 0; i < steps; i++) stepWorld(w, emptyInput());
        preloadImages([def]);
        const c = ref.current!;
        c.width = Math.max(W, stage.pw);
        c.height = Math.max(H, stage.ph);
        const g = c.getContext("2d")!;
        const { layers, canvases } = makeLayers();
        const draw = () => {
        for (let y = 0; y < stage.ph; y += H) {
            for (let x = 0; x < stage.pw; x += W) {
                w.cam.x = Math.min(x, Math.max(0, stage.pw - W));
                w.cam.y = Math.min(y, Math.max(0, stage.ph - H));
                w.cam.sx = 0;
                w.cam.sy = 0;
                renderWorld(layers, w, { hud: false, prompt: null, mode: "play", label: "", reduced: true, t: 0 });
                for (const cv of canvases) g.drawImage(cv, w.cam.x, w.cam.y);
            }
        }
        };
        draw();
        // Images (the penthouse furniture) arrive a moment later
        setTimeout(draw, 700);
        document.title = `stage ${id} ${stage.pw}x${stage.ph}`;
    }, []);
    return <canvas ref={ref} style={{ imageRendering: "pixelated", display: "block" }} />;
};

export default StageView;
