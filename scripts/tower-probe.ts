// Mechanics probe: scripted fights run through the simulation.
import { emptyInput, type Input } from "@/game/engine/input";
import { parseStage, type StageDef } from "@/game/world/stage";
import { createWorld, stepWorld } from "@/game/world/world";
import { chestY } from "@/game/world/player";
import type { World } from "@/game/world/types";

const arena = (row: string): StageDef => ({
    id: "P",
    title: "probe",
    theme: "test",
    time: 60,
    map: ["#".repeat(40), ...Array(8).fill("#" + ".".repeat(38) + "#"), row, "#".repeat(40), "#".repeat(40)],
});

const run = (w: World, n: number, f: (w: World, i: number) => Partial<Input>) => {
    for (let i = 0; i < n; i++) {
        const inp = { ...emptyInput(), ...f(w, i) };
        stepWorld(w, inp);
        if (w.dead || w.won) return i;
    }
    return n;
};

// 1. A guard shoots; the Headhunter waits and deflects the bullet back.
{
    const w = createWorld(parseStage(arena("#..@.............g....................#")), 1);
    let deflectAt = -1;
    const n = run(w, 300, (w, i) => {
        const p = w.player;
        const b = w.bullets.find((b) => b.owner === "enemy");
        if (b && deflectAt < 0 && Math.abs(b.x - p.x) < 34) {
            deflectAt = i;
            return { attack: true, ax: b.x - p.x, ay: b.y - chestY(p) };
        }
        return {};
    });
    const g = w.enemies[0];
    console.log("deflect test:", { steps: n, deflectAt, deflects: w.deflects, guard: g.state, dead: w.dead, cleared: w.cleared });
}

// 2. Same guard, the Headhunter does nothing: the bullet should kill.
{
    const w = createWorld(parseStage(arena("#..@.............g....................#")), 1);
    const n = run(w, 300, () => ({}));
    console.log("no-deflect test:", { steps: n, dead: w.dead, cause: w.deathCause, seconds: (n / 60).toFixed(2) });
}

// 3. Slow motion: how far does a bullet travel in one real second, with and without Focus?
for (const focus of [false, true]) {
    const w = createWorld(parseStage(arena("#..@.............g....................#")), 1);
    run(w, 400, (w) => (w.bullets.length ? {} : {}));
    const w2 = createWorld(parseStage(arena("#..@..............g...................#")), 1);
    let x0 = -1;
    let travelled = 0;
    let steps = 0;
    run(w2, 600, (w) => {
        const b = w.bullets[0];
        if (b && x0 < 0) x0 = b.x;
        if (x0 >= 0) {
            steps++;
            if (steps === 60) travelled = Math.abs(w.bullets[0]?.x - x0);
        }
        return { focus: focus && x0 >= 0 };
    });
    console.log(`bullet travel in 1 real second, focus=${focus}:`, travelled.toFixed(0), "px");
}

// 4. Walk into a bouncer: slash kills it.
{
    const w = createWorld(parseStage(arena("#..@..........b.......................#")), 1);
    const n = run(w, 200, (w) => {
        const p = w.player;
        const e = w.enemies[0];
        if (e.state !== "dead" && Math.abs(e.x - p.x) < 30) return { attack: true, ax: e.x - p.x, ay: 0 };
        return { mx: 1 };
    });
    console.log("bouncer test:", { steps: n, bouncer: w.enemies[0].state, dead: w.dead, kills: w.kills });
}

// 5. Determinism: same inputs, same result.
{
    const make = () => createWorld(parseStage(arena("#..@......b.....g.......e.............#")), 7);
    const tape: Input[] = [];
    const a = make();
    for (let i = 0; i < 400; i++) {
        const inp = { ...emptyInput(), mx: i % 90 < 60 ? 1 : -1, jump: i % 37 === 0, jumpHeld: i % 37 < 10, attack: i % 23 === 0, ax: 30, ay: -5, focus: i % 200 > 150 };
        tape.push(inp);
        stepWorld(a, inp);
    }
    const b = make();
    for (const inp of tape) stepWorld(b, inp);
    const sig = (w: World) => JSON.stringify([w.player.x, w.player.y, w.enemies.map((e) => [e.x, e.y, e.state]), w.bullets.length, w.kills, w.dead]);
    console.log("determinism:", sig(a) === sig(b) ? "same" : "DIFFERENT", sig(a).slice(0, 120));
}
