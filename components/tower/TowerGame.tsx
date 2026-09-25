"use client";
// The React side of the tower: sizes the canvas, and draws everything that is
// text (title, cards, dialogue, menus, dossier) as real HTML over it.
import "@fontsource/vt323";
import "@/components/tower/tower.css";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createGame, type GameHandle, type UiState } from "@/game/flow/game";
import { FLOORS, TEST_FLOOR } from "@/game/story/floors";
import type { FloorDef } from "@/game/story/types";
import TowerOverlay from "@/components/tower/TowerOverlay";
import TouchControls from "@/components/tower/TouchControls";

const ASPECT = 16 / 9;

const TowerGame: React.FC = () => {
    const frameRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [game, setGame] = useState<GameHandle | null>(null);
    const [floors, setFloors] = useState<FloorDef[]>(FLOORS);
    const [coarse, setCoarse] = useState(false);

    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const test = q.get("stage") === "test";
        const list = test ? [TEST_FLOOR] : FLOORS;
        const f = Math.max(0, Math.min(list.length - 1, Number(q.get("floor") ?? 0)));
        const g = createGame(canvasRef.current!, list, { floor: f, stage: 0 });
        setFloors(list);
        setGame(g);
        (window as unknown as { __tower?: GameHandle }).__tower = g;
        setCoarse(window.matchMedia("(pointer: coarse)").matches);
        return () => g.destroy();
    }, []);

    // Fit a 16:9 frame in the window
    useEffect(() => {
        if (!game) return;
        const fit = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            let w = vw;
            let h = vw / ASPECT;
            if (h > vh) {
                h = vh;
                w = vh * ASPECT;
            }
            const el = frameRef.current!;
            el.style.width = `${Math.round(w)}px`;
            el.style.height = `${Math.round(h)}px`;
            const r = el.getBoundingClientRect();
            game.resize(Math.round(w), Math.round(h), window.devicePixelRatio || 1, { left: r.left, top: r.top, width: r.width, height: r.height });
        };
        fit();
        window.addEventListener("resize", fit);
        window.addEventListener("orientationchange", fit);
        return () => {
            window.removeEventListener("resize", fit);
            window.removeEventListener("orientationchange", fit);
        };
    }, [game]);

    return (
        <main className="tower" aria-label="DogeKing Tower, a playable version of Minh Pham's portfolio">
            <p className="tower-sr">
                This is a game version of Minh Pham&apos;s portfolio. For the same information as plain text, visit the <Link href="/">main site</Link> or open the Dossier from the pause menu.
            </p>
            <div className="tower-frame" ref={frameRef}>
                <canvas ref={canvasRef} className="tower-canvas" aria-hidden="true" />
                {game && <Overlay game={game} floors={floors} coarse={coarse} />}
            </div>
            <div className="tower-rotate" role="alert">
                <div className="tower-rotate-phone" aria-hidden="true" />
                <p>Turn your phone sideways to enter the tower.</p>
                <Link href="/">Or go back to the room</Link>
            </div>
        </main>
    );
};

const Overlay: React.FC<{ game: GameHandle; floors: FloorDef[]; coarse: boolean }> = ({ game, floors, coarse }) => {
    const ui = useSyncExternalStore(game.store.subscribe, game.store.get, game.store.get) as UiState;
    const dispatch = game.dispatch;

    // Keys the overlay handles: pause, dialogue, replay speed
    const onKey = useCallback(
        (e: KeyboardEvent) => {
            const s = game.store.get();
            if (e.code === "Escape") {
                if (s.menu && s.menu !== "pause") dispatch({ type: "menu", menu: "pause" });
                else if (s.paused) dispatch({ type: "resume" });
                else dispatch({ type: "pause" });
                return;
            }
            if (s.paused) return;
            if (s.screen === "dialogue" || s.screen === "elevator") {
                const d = s.dialogue;
                if (d?.interrupt && (e.code === "KeyE" || e.code === "Digit0")) dispatch({ type: "interrupt" });
                else if (d?.choices) {
                    const n = Number(e.key);
                    if (n >= 1 && n <= d.choices.length) dispatch({ type: "choose", index: n - 1 });
                } else if (["Enter", "Space", "KeyJ"].includes(e.code)) dispatch({ type: "advance" });
            }
            if (s.screen === "play" && e.code === "KeyR") dispatch({ type: "restart" });
            if (s.screen === "replay") {
                if (e.code === "ArrowRight" || e.code === "KeyD") dispatch({ type: "replaySpeed", speed: 4 });
            }
        },
        [game, dispatch],
    );
    const onKeyUp = useCallback(
        (e: KeyboardEvent) => {
            if (e.code === "ArrowRight" || e.code === "KeyD") dispatch({ type: "replaySpeed", speed: 1 });
        },
        [dispatch],
    );
    useEffect(() => {
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [onKey, onKeyUp]);

    return (
        <>
            <TowerOverlay ui={ui} dispatch={dispatch} floors={floors} />
            {coarse && ui.screen === "play" && !ui.paused && <TouchControls game={game} />}
        </>
    );
};

export default TowerGame;
