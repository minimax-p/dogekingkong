// Turns keyboard, mouse, gamepad and touch into one Input per step.
import { emptyInput, type Input } from "@/game/engine/input";

export type TouchState = {
    mx: number;
    up: boolean;
    down: boolean;
    downPressed: boolean;
    jump: boolean;
    jumpHeld: boolean;
    attack: boolean;
    aimX: number; // screen position of the last tap, 0..1 of the game frame
    aimY: number;
    throw: boolean;
    focus: boolean;
    active: boolean;
};

export const makeTouchState = (): TouchState => ({
    mx: 0,
    up: false,
    down: false,
    downPressed: false,
    jump: false,
    jumpHeld: false,
    attack: false,
    aimX: 0.6,
    aimY: 0.5,
    throw: false,
    focus: false,
    active: false,
});

type Rect = { left: number; top: number; width: number; height: number };

export type BrowserInput = {
    sample: (toWorld: (sx: number, sy: number) => { x: number; y: number }, chest: { x: number; y: number }, face: number) => Input;
    consumeAny: () => boolean; // any key or click since last asked (for "press any key")
    consumeSkip: () => boolean; // a click, Enter, Space or J (to skip replays and cards)
    setRect: (r: Rect) => void;
    pressed: (code: string) => boolean;
    touch: TouchState;
    destroy: () => void;
    usingGamepad: () => boolean;
};

const KEYS = {
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    jump: ["KeyW", "ArrowUp", "Space"],
    focus: ["ShiftLeft", "ShiftRight"],
    attack: ["KeyJ"],
    throw: ["KeyK"],
};

export const makeBrowserInput = (target: HTMLElement): BrowserInput => {
    const held = new Set<string>();
    const hits = new Set<string>(); // pressed since the last sample
    let any = false;
    let skip = false;
    let mouse = { x: 0.7, y: 0.5, moved: 0 };
    let mouseDown = false;
    let click = false;
    let rclick = false;
    let rect: Rect = { left: 0, top: 0, width: 1, height: 1 };
    let keyAimAt = 0;
    let pad = false;
    const padPrev: boolean[] = [];
    const touch = makeTouchState();
    let tick = 0;

    const onKey = (e: KeyboardEvent) => {
        if (e.type === "keydown") {
            if (!held.has(e.code)) hits.add(e.code);
            held.add(e.code);
            any = true;
            if (["Enter", "Space", "KeyJ"].includes(e.code)) skip = true;
            pad = false;
            if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
            if (KEYS.attack.includes(e.code)) keyAimAt = tick;
        } else held.delete(e.code);
    };
    const onMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        mouse = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height, moved: tick };
        pad = false;
    };
    const onDown = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        onMove(e);
        any = true;
        skip = true;
        if (e.button === 0) {
            click = true;
            mouseDown = true;
        }
        if (e.button === 2) rclick = true;
    };
    const onUp = (e: PointerEvent) => {
        if (e.button === 0) mouseDown = false;
    };
    const onContext = (e: Event) => e.preventDefault();
    const onBlur = () => {
        held.clear();
        mouseDown = false;
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    target.addEventListener("contextmenu", onContext);
    window.addEventListener("blur", onBlur);

    const has = (list: string[]) => list.some((k) => held.has(k));
    const hit = (list: string[]) => list.some((k) => hits.has(k));

    return {
        touch,
        setRect: (r) => {
            rect = r;
        },
        usingGamepad: () => pad,
        pressed: (code) => hits.has(code),
        consumeAny: () => {
            const a = any || touch.attack || touch.jump;
            any = false;
            skip = false;
            return a;
        },
        consumeSkip: () => {
            const a = skip || touch.attack;
            skip = false;
            any = false;
            return a;
        },
        sample: (toWorld, chest, face) => {
            tick++;
            const inp = emptyInput();
            let mx = (has(KEYS.right) ? 1 : 0) - (has(KEYS.left) ? 1 : 0);
            let up = has(KEYS.up);
            let down = has(KEYS.down);
            let downPressed = hit(KEYS.down);
            let jump = hit(KEYS.jump);
            let jumpHeld = has(KEYS.jump);
            let attack = click || hit(KEYS.attack);
            let thr = rclick || hit(KEYS.throw);
            let focus = has(KEYS.focus);

            // Aim: the mouse, unless the keyboard slash was used more recently
            const m = toWorld(mouse.x, mouse.y);
            let ax = m.x - chest.x;
            let ay = m.y - chest.y;
            if (keyAimAt > mouse.moved) {
                const dx = mx !== 0 ? mx : face;
                const dy = up ? -1 : down ? 1 : 0;
                ax = dx * 40 * (up || down ? 0.7 : 1);
                ay = dy * 40;
                if (up && mx === 0) ax = 0.01 * face;
            }

            // Gamepad
            const gp = typeof navigator !== "undefined" && navigator.getGamepads ? Array.from(navigator.getGamepads()).find((g) => g && g.connected) : null;
            if (gp) {
                const b = (i: number) => !!gp.buttons[i]?.pressed;
                const edge = (i: number) => b(i) && !padPrev[i];
                const lx = gp.axes[0] ?? 0;
                const ly = gp.axes[1] ?? 0;
                const rx = gp.axes[2] ?? 0;
                const ry = gp.axes[3] ?? 0;
                const usedPad = Math.abs(lx) > 0.35 || Math.abs(ly) > 0.5 || gp.buttons.some((x) => x.pressed);
                if (usedPad) {
                    pad = true;
                    any = any || gp.buttons.some((x, i) => x.pressed && !padPrev[i]);
                }
                if (pad) {
                    if (Math.abs(lx) > 0.35) mx = lx > 0 ? 1 : -1;
                    down = down || ly > 0.6 || b(13);
                    up = up || ly < -0.6 || b(12);
                    if (b(14)) mx = -1;
                    if (b(15)) mx = 1;
                    downPressed = downPressed || edge(1) || (ly > 0.6 && !padPrev[99]);
                    jump = jump || edge(0);
                    jumpHeld = jumpHeld || b(0);
                    attack = attack || edge(2) || edge(5);
                    thr = thr || edge(3) || edge(4);
                    focus = focus || (gp.buttons[7]?.value ?? 0) > 0.3 || b(6);
                    if (Math.hypot(rx, ry) > 0.4) {
                        ax = rx * 40;
                        ay = ry * 40;
                    } else if (Math.hypot(lx, ly) > 0.4) {
                        ax = lx * 40;
                        ay = ly * 40;
                    } else {
                        ax = face * 40;
                        ay = 0;
                    }
                }
                gp.buttons.forEach((x, i) => (padPrev[i] = x.pressed));
                padPrev[99] = ly > 0.6;
            }

            // Touch
            if (touch.active) {
                if (touch.mx !== 0) mx = touch.mx;
                up = up || touch.up;
                down = down || touch.down;
                downPressed = downPressed || touch.downPressed;
                jump = jump || touch.jump;
                jumpHeld = jumpHeld || touch.jumpHeld;
                focus = focus || touch.focus;
                thr = thr || touch.throw;
                if (touch.attack) {
                    attack = true;
                    const t = toWorld(touch.aimX, touch.aimY);
                    ax = t.x - chest.x;
                    ay = t.y - chest.y;
                }
                touch.jump = false;
                touch.attack = false;
                touch.throw = false;
                touch.downPressed = false;
            }

            inp.mx = mx;
            inp.up = up;
            inp.down = down;
            inp.downPressed = downPressed;
            inp.jump = jump;
            inp.jumpHeld = jumpHeld;
            inp.attack = attack;
            inp.throw = thr;
            inp.focus = focus;
            inp.ax = ax;
            inp.ay = ay;
            if (!mouseDown) click = false;
            click = false;
            rclick = false;
            hits.clear();
            return inp;
        },
        destroy: () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKey);
            target.removeEventListener("pointermove", onMove);
            target.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointerup", onUp);
            target.removeEventListener("contextmenu", onContext);
            window.removeEventListener("blur", onBlur);
        },
    };
};
