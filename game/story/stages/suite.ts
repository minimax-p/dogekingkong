// 4 · 04:00 AM: Stealth, summer 2025. A Playwright pipeline that runs 87
// tests across 8 platforms and 8 languages, every night at four.
import { TILE } from "@/game/engine/constants";
import { makeEnemy } from "@/game/world/enemies";
import { emit, shake } from "@/game/world/common";
import type { StageDef } from "@/game/world/stage";

// "cron 0 4 * * *": the sentries fire on a schedule, not on sight
const cron: StageDef["hooks"] = {
    step: (w) => {
        const slot = Math.floor((w.time * 60) / 240);
        if (slot !== w.flags.cron) {
            w.flags.cron = slot;
            for (const e of w.enemies) {
                if (e.kind === "sentry" && e.state !== "dead") {
                    e.data.active = 100;
                    e.aware = true;
                    e.cd = 12;
                }
            }
            if (slot > 0) emit(w, "sentry", w.player.x, w.player.y);
        }
    },
};

export const CLOSET: StageDef = {
    id: "4-1",
    title: "3:59",
    theme: "suite",
    time: 75,
    map: [
        "############################################################",
        "#...................^.......................^..............#",
        "#..........................................................#",
        "#..........................................................#",
        "#..........................................................#",
        "#..........................................................#",
        "#..........................................................#",
        "#..........................................................#",
        "#..........................................................#",
        "#..........................................................#",
        "#.................G.......................e...?............#",
        "#.............===========.............===========..........#",
        "#.............................|..........................$$#",
        "#.@.........G.............f...|b....................g....$$#",
        "############################################################",
        "############################################################",
        "############################################################",
    ],
    hooks: cron,
    prompts: [{ from: 1, to: 10, text: "THE TURRETS RUN ON A SCHEDULE · EVERY FOUR SECONDS" }],
    props: [
        { kind: "server", x: 3, y: 14, w: 1.5, h: 4 },
        { kind: "server", x: 5, y: 14, w: 1.5, h: 4 },
        { kind: "clock", x: 26, y: 6, text: "3:59:40" },
        { kind: "sign", x: 25, y: 7.4, text: "CRON 0 4 * * *" },
        { kind: "window", x: 8, y: 9, w: 5, h: 5 },
        { kind: "server", x: 35, y: 14, w: 1.5, h: 4 },
        { kind: "server", x: 50, y: 14, w: 1.5, h: 4 },
        { kind: "window", x: 51, y: 8, w: 5, h: 5 },
        { kind: "monitor", x: 45, y: 14 },
        { kind: "lamp", x: 14, y: 1, h: 1, w: 3, text: "#5cf2b8" },
        { kind: "lamp", x: 40, y: 1, h: 1, w: 3, text: "#5cf2b8" },
    ],
};

// The three screens whose tests fail (and whose bugs get out)
export const FAILING = [11, 38, 53];

// The test wall sits here (bottom-left corner, in tiles)
const WALL_X = 23;
const WALL_Y = 13;

export const SUITE: StageDef = {
    id: "4-2",
    title: "The suite",
    theme: "suite",
    time: 90,
    map: [
        "################################################################",
        "#..............................................................#",
        "#..............................................................#",
        "#..............................................................#",
        "#..............................................................#",
        "#..............................................................#",
        "#..............................................................#",
        "#..............................................................#",
        "#..............................................................#",
        "#..............................................................#",
        "#..............................................................#",
        "#....?..G.............................................g........#",
        "#...=========.....................................=========....#",
        "#............................................................$$#",
        "#.@...............G.........................e................$$#",
        "################################################################",
        "################################################################",
        "################################################################",
    ],
    hooks: {
        start: (w) => {
            w.flags.hold = 1; // the room isn't clear until the bugs are out
        },
        step: (w) => {
            const f = w.time * 60;
            // 03:59:57 + 3 seconds: the suite starts
            if (w.flags.runAt === undefined && f >= 180) {
                w.flags.runAt = f;
                shake(w, 2);
                emit(w, "sentry", w.player.x, w.player.y);
            }
            // The last screens finish; three fail and their bugs escape
            if (w.flags.runAt !== undefined && !w.flags.fail && f >= w.flags.runAt + 64 * 1.6 + 40) {
                w.flags.fail = 1;
                for (const i of FAILING) {
                    const sx = (WALL_X * TILE + (i % 8) * 18 + 8) | 0;
                    const sy = WALL_Y * TILE - 8 * 13 + Math.floor(i / 8) * 13 + 11;
                    for (let k = 0; k < 2; k++) {
                        const e = makeEnemy(w, "bug", sx + k * 6 - 3, sy, k ? 1 : -1, null);
                        e.ground = false;
                        e.vy = -2;
                        e.vx = (k ? 1 : -1) * 1.5;
                        e.aware = true;
                        e.state = "chase";
                        w.enemies.push(e);
                    }
                    emit(w, "bugHatch", sx, sy);
                }
                shake(w, 4);
                w.flags.hold = 0;
            }
        },
    },
    prompts: [{ from: 1, to: 12, text: "04:00 · THE SUITE RUNS · THREE TESTS WILL FAIL" }],
    props: [
        { kind: "clock", x: 34, y: 4.5, text: "3:59:57" },
        { kind: "testwall", x: WALL_X, y: WALL_Y },
        { kind: "sign", x: 22, y: 14.6, text: "87 TESTS · 8 PLATFORMS · 8 LANGUAGES" },
        { kind: "report", x: 34, y: 6 },
        { kind: "server", x: 15, y: 15, w: 1.5, h: 4 },
        { kind: "server", x: 46, y: 15, w: 1.5, h: 4 },
        { kind: "lamp", x: 8, y: 1, h: 2, w: 4, text: "#5cf2b8" },
        { kind: "lamp", x: 54, y: 1, h: 2, w: 4, text: "#5cf2b8" },
        { kind: "window", x: 2, y: 9, w: 3, h: 5 },
        { kind: "window", x: 59, y: 9, w: 3, h: 5 },
    ],
};
