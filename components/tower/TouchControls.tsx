"use client";
// Touch controls for landscape phones and tablets.
//  Left half: a floating stick (push to run, flick up to jump, flick down to roll or drop).
//  Right half: tap where you want to slash.
//  Buttons: slow time (tap to toggle) and throw.
import React, { useEffect, useRef, useState } from "react";
import type { GameHandle } from "@/game/flow/game";

const DEAD = 14; // px before the stick counts as pushed
const FLICK = 26;

const TouchControls: React.FC<{ game: GameHandle }> = ({ game }) => {
    const t = game.input.touch;
    const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
    const [slow, setSlow] = useState(false);
    const stickId = useRef<number | null>(null);
    const origin = useRef({ x: 0, y: 0 });
    const wasUp = useRef(false);
    const wasDown = useRef(false);

    useEffect(() => {
        t.active = true;
        return () => {
            t.active = false;
            t.mx = 0;
            t.jumpHeld = false;
            t.down = false;
            t.focus = false;
        };
    }, [t]);

    const onStickStart = (e: React.PointerEvent) => {
        if (stickId.current !== null) return;
        stickId.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        origin.current = { x: e.clientX, y: e.clientY };
        setStick({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
    };
    const onStickMove = (e: React.PointerEvent) => {
        if (e.pointerId !== stickId.current) return;
        const dx = e.clientX - origin.current.x;
        const dy = e.clientY - origin.current.y;
        t.mx = Math.abs(dx) > DEAD ? (dx > 0 ? 1 : -1) : 0;
        const up = dy < -FLICK;
        const down = dy > FLICK;
        if (up && !wasUp.current) t.jump = true;
        if (down && !wasDown.current) t.downPressed = true;
        t.jumpHeld = up;
        t.up = up;
        t.down = down;
        wasUp.current = up;
        wasDown.current = down;
        setStick({ x: origin.current.x, y: origin.current.y, dx: Math.max(-40, Math.min(40, dx)), dy: Math.max(-40, Math.min(40, dy)) });
    };
    const onStickEnd = (e: React.PointerEvent) => {
        if (e.pointerId !== stickId.current) return;
        stickId.current = null;
        t.mx = 0;
        t.jumpHeld = false;
        t.up = false;
        t.down = false;
        wasUp.current = false;
        wasDown.current = false;
        setStick(null);
    };

    const onAttack = (e: React.PointerEvent) => {
        const frame = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
        t.aimX = (e.clientX - frame.left) / frame.width;
        t.aimY = (e.clientY - frame.top) / frame.height;
        t.attack = true;
    };

    return (
        <div className="tw-touch">
            <div className="tw-touch-left" onPointerDown={onStickStart} onPointerMove={onStickMove} onPointerUp={onStickEnd} onPointerCancel={onStickEnd} />
            <div className="tw-touch-right" onPointerDown={onAttack} />
            {stick && (
                <div className="tw-stick" style={{ left: stick.x, top: stick.y }}>
                    <span style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
                </div>
            )}
            <button
                type="button"
                className={`tw-touch-btn tw-touch-slow ${slow ? "is-on" : ""}`}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    const on = !slow;
                    setSlow(on);
                    t.focus = on;
                }}
            >
                SLOW
            </button>
            <button
                type="button"
                className="tw-touch-btn tw-touch-throw"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    t.throw = true;
                }}
            >
                THROW
            </button>
        </div>
    );
};

export default TouchControls;
