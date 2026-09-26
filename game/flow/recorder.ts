// What we keep while a stage is played: the inputs (for the replay, which
// re-runs the stage exactly) and light snapshots (for the rewind on death).
import type { Input } from "@/game/engine/input";
import type { World } from "@/game/world/types";

export type Snapshot = Pick<
    World,
    "step" | "player" | "enemies" | "bullets" | "items" | "doors" | "lasers" | "fx" | "cam" | "battery" | "focus" | "focusHeld" | "time" | "cleared" | "flags" | "scale"
> & { decalCount: number; particles: World["particles"] };

const MAX_SNAPS = 900;

export type Recorder = { tape: Input[]; snaps: Snapshot[] };

export const makeRecorder = (): Recorder => ({ tape: [], snaps: [] });

const clone = <T>(v: T): T => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

export const record = (r: Recorder, w: World, inp: Input) => {
    r.tape.push({ ...inp });
    if (w.step % 2 !== 0) return;
    r.snaps.push({
        step: w.step,
        player: clone(w.player),
        enemies: clone(w.enemies),
        bullets: clone(w.bullets),
        items: clone(w.items),
        doors: clone(w.doors),
        lasers: clone(w.lasers),
        fx: [],
        cam: { ...w.cam, shake: 0, sx: 0, sy: 0 },
        battery: w.battery,
        focus: 0,
        focusHeld: false,
        time: w.time,
        cleared: w.cleared,
        flags: { ...w.flags },
        scale: 1,
        decalCount: w.decals.length,
        particles: clone(w.particles.slice(-80)),
    });
    if (r.snaps.length > MAX_SNAPS) r.snaps.shift();
};

// A world to draw for one rewind frame
export const worldAt = (live: World, s: Snapshot): World => ({
    ...live,
    ...s,
    decals: live.decals.slice(0, s.decalCount),
    events: [],
    hitstop: 0,
    flash: 0,
    ca: 0,
    dead: false,
    won: false,
});
