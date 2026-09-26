// Checks for the tower game: npm run test:tower
//
//  1. Every stage map is well formed.
//  2. Every stage is reachable: from the start you can get to every enemy,
//     the intel file and the exit (a rough model of the Headhunter's moves).
//  3. The simulation is deterministic, so replays match the run.
//  4. Slow motion and deflects behave as designed.
import { emptyInput, type Input } from "@/game/engine/input";
import { FOCUS_WORLD } from "@/game/engine/constants";
import { makeRng, rand } from "@/game/engine/rng";
import { FLOORS } from "@/game/story/floors";
import { chestY } from "@/game/world/player";
import { parseStage, T_PLATFORM, T_SOLID, tileAt, type Stage, type StageDef } from "@/game/world/stage";
import type { World } from "@/game/world/types";
import { createWorld, stepWorld } from "@/game/world/world";

let failures = 0;
const check = (ok: boolean, what: string) => {
    if (!ok) {
        failures++;
        console.log(`  ✗ ${what}`);
    }
};

const stages: StageDef[] = FLOORS.flatMap((f) => f.stages);

// ---- 1. Maps
console.log("Maps");
for (const def of stages) {
    const widths = new Set(def.map.map((r) => r.length));
    check(widths.size === 1, `${def.id}: rows have different widths (${[...widths].join(", ")})`);
    const spawns = def.map.join("").split("@").length - 1;
    check(spawns === 1, `${def.id}: needs exactly one @ (has ${spawns})`);
    const s = parseStage(def);
    check(s.enemies.length > 0, `${def.id}: has no enemies`);
    if (!def.boss) check(def.map.join("").includes("$"), `${def.id}: has no exit`);
    check(def.time >= 30, `${def.id}: time limit too short`);
}

// ---- 2. Reachability
// Cells are tiles; "standing" means an empty 1x2 space with ground under it.
const solid = (s: Stage, x: number, y: number) => tileAt(s, x, y) === T_SOLID;
const blocked = (s: Stage, x: number, y: number) => y >= 0 && y < s.rows && solid(s, x, y);
const floorAt = (s: Stage, def: StageDef, x: number, y: number) => {
    const t = tileAt(s, x, y);
    if (t === T_SOLID || t === T_PLATFORM) return true;
    return (def.blinks ?? []).some((b) => y === b.y && x >= b.x && x < b.x + b.w);
};
const standable = (s: Stage, def: StageDef, x: number, y: number) =>
    x > 0 && x < s.cols - 1 && y > 0 && y < s.rows - 1 && !blocked(s, x, y) && !blocked(s, x, y - 1) && floorAt(s, def, x, y + 1);

const reachable = (s: Stage, def: StageDef) => {
    const seen = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;
    const start = { x: Math.floor(s.spawn.x / 16), y: Math.floor(s.spawn.y / 16) - 1 };
    const q = [start];
    seen.add(key(start.x, start.y));
    const push = (x: number, y: number) => {
        if (!standable(s, def, x, y) || seen.has(key(x, y))) return;
        seen.add(key(x, y));
        q.push({ x, y });
    };
    // Where do you land if you drop from (x, y)?
    const land = (x: number, y: number) => {
        for (let yy = y; yy < s.rows; yy++) {
            if (blocked(s, x, yy)) return null;
            if (standable(s, def, x, yy)) return yy;
        }
        return null;
    };
    const inVent = (x: number, y: number) => (def.zones ?? []).find((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
    // A shaft you can wall-jump up: walls on both sides within 4 tiles
    const wallBoth = (x: number, y: number) => {
        let l = -1;
        let r = -1;
        for (let d = 1; d <= 4; d++) {
            if (l < 0 && blocked(s, x - d, y)) l = d;
            if (r < 0 && blocked(s, x + d, y)) r = d;
        }
        return l > 0 && r > 0 && l + r <= 5;
    };
    while (q.length) {
        const { x, y } = q.shift()!;
        for (const dx of [-1, 1]) {
            push(x + dx, y);
            // Walk off an edge
            if (!blocked(s, x + dx, y) && !blocked(s, x + dx, y - 1)) {
                const ly = land(x + dx, y);
                if (ly !== null) push(x + dx, ly);
            }
        }
        // Drop through a platform
        if (tileAt(s, x, y + 1) === T_PLATFORM) {
            const ly = land(x, y + 2);
            if (ly !== null) push(x, ly);
        }
        // Jumps: up to 3 tiles high, farther when lower. The path is a box:
        // straight up to the peak, across, then down.
        for (let dy = -3; dy <= 6; dy++) {
            const reach = dy <= -3 ? 3 : dy === -2 ? 5 : dy <= 0 ? 6 : 7;
            for (let dx = -reach; dx <= reach; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                if (!standable(s, def, tx, ty) || seen.has(key(tx, ty))) continue;
                const peak = Math.min(y, ty);
                let clear = true;
                for (let r = peak; r <= y && clear; r++) if (blocked(s, x, r) || blocked(s, x, r - 1)) clear = false;
                for (let xx = Math.min(x, tx); xx <= Math.max(x, tx) && clear; xx++) if (blocked(s, xx, peak) || blocked(s, xx, peak - 1)) clear = false;
                for (let r = peak; r <= ty && clear; r++) if (blocked(s, tx, r) || blocked(s, tx, r - 1)) clear = false;
                if (clear) push(tx, ty);
            }
        }
        // Wall-jump shafts (within a jump of here) and vents: straight up the column
        let climb = inVent(x, y) !== undefined;
        for (let k = 0; k <= 3 && !climb; k++) if (!blocked(s, x, y - k) && wallBoth(x, y - k)) climb = true;
        if (climb) {
            for (let yy = y - 1; yy > 0; yy--) {
                if (blocked(s, x, yy)) break;
                const ok = wallBoth(x, yy) || inVent(x, yy) || wallBoth(x, yy + 1) || wallBoth(x, yy + 2) || wallBoth(x, yy + 3) || yy >= y - 3;
                if (!ok) break;
                for (const dx of [-2, -1, 0, 1, 2]) push(x + dx, yy);
                for (const dx of [-3, -2, -1, 1, 2, 3]) {
                    const ly = land(x + dx, yy);
                    if (ly !== null) push(x + dx, ly);
                }
            }
        }
    }
    return seen;
};

console.log("Reachability");
for (const def of stages) {
    const s = parseStage(def);
    const seen = reachable(s, def);
    const near = (px: number, py: number, rx: number, ry: number) => {
        const cx = Math.floor(px / 16);
        const cy = Math.floor(py / 16) - 1;
        for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) if (seen.has(`${cx + dx},${cy + dy}`)) return true;
        return false;
    };
    for (const e of s.enemies) {
        const flying = e.kind === "drone";
        check(near(e.x, e.y, flying ? 6 : 1, flying ? 6 : 1), `${def.id}: can't reach the ${e.kind} at tile ${Math.floor(e.x / 16)},${Math.floor(e.y / 16) - 1}`);
    }
    if (s.intel) check(near(s.intel.x, s.intel.y, 1, 1), `${def.id}: can't reach the intel file`);
    if (!def.boss) check(near(s.exit.x + 8, s.exit.y + s.exit.h, 1, 1), `${def.id}: can't reach the exit`);
}

// ---- 3. Determinism
console.log("Determinism");
const sig = (w: World) =>
    JSON.stringify([w.step, w.player.x.toFixed(3), w.player.y.toFixed(3), w.enemies.map((e) => [e.x.toFixed(2), e.y.toFixed(2), e.state]), w.bullets.length, w.kills, w.dead, w.time.toFixed(4)]);
for (const def of stages) {
    const s = parseStage(def);
    const rng = makeRng(42);
    const tape: Input[] = [];
    for (let i = 0; i < 700; i++) {
        tape.push({
            ...emptyInput(),
            mx: rand(rng) < 0.7 ? 1 : rand(rng) < 0.5 ? -1 : 0,
            jump: rand(rng) < 0.05,
            jumpHeld: rand(rng) < 0.5,
            attack: rand(rng) < 0.06,
            focus: rand(rng) < 0.3,
            downPressed: rand(rng) < 0.02,
            throw: rand(rng) < 0.01,
            ax: rand(rng) * 80 - 40,
            ay: rand(rng) * 80 - 40,
        });
    }
    const a = createWorld(s, 9);
    const b = createWorld(s, 9);
    for (const inp of tape) stepWorld(a, inp);
    for (const inp of tape) stepWorld(b, inp);
    check(sig(a) === sig(b), `${def.id}: two runs with the same inputs differ`);
}

// ---- 4. Feel
console.log("Feel");
{
    const arena: StageDef = {
        id: "P",
        title: "probe",
        theme: "test",
        time: 60,
        map: ["#".repeat(40), ...Array(8).fill("#" + ".".repeat(38) + "#"), "#..@.............g....................#", "#".repeat(40), "#".repeat(40)],
    };
    // A bullet crosses the screen in under a second, and five times slower in slow motion
    const speeds: number[] = [];
    for (const focus of [false, true]) {
        const w = createWorld(parseStage(arena), 1);
        let x0 = -1;
        let n = 0;
        let dist = 0;
        for (let i = 0; i < 600 && !w.dead; i++) {
            const b = w.bullets[0];
            if (b && x0 < 0) x0 = b.x;
            if (x0 >= 0 && b) {
                n++;
                dist = Math.abs(b.x - x0);
                if (n === 10) break;
            }
            stepWorld(w, { ...emptyInput(), focus: focus && !!b });
        }
        speeds.push(dist / 10);
    }
    check(speeds[0] * 60 > 480, `bullets should cross the 480 px screen in under a second (${(speeds[0] * 60).toFixed(0)} px/s)`);
    check(speeds[1] / speeds[0] < FOCUS_WORLD + 0.12, `slow motion should slow bullets to about ${FOCUS_WORLD}× (${(speeds[1] / speeds[0]).toFixed(2)}×)`);

    // Waiting for the bullet and slashing it sends it back into the guard
    const w = createWorld(parseStage(arena), 1);
    for (let i = 0; i < 300 && !w.dead; i++) {
        const p = w.player;
        const b = w.bullets.find((q) => q.owner === "enemy");
        const inp = emptyInput();
        const g = w.enemies[0];
        if (b && Math.abs(b.x - p.x) < 34) {
            // Slash toward the shooter, as a player would
            inp.attack = true;
            inp.ax = g.x - p.x;
            inp.ay = g.y - 14 - chestY(p);
        }
        stepWorld(w, inp);
    }
    check(w.deflects === 1 && w.cleared && !w.dead, "a deflected bullet should kill the guard");
}

if (failures) {
    console.log(`\n${failures} problem${failures > 1 ? "s" : ""}`);
    process.exit(1);
}
console.log("\nAll good.");
