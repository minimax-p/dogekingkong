// Stage maps are ASCII, one character per 16px tile:
//
//   #  wall / floor            =  platform (jump up through it, S to drop)
//   |  door (stack them)       @  Headhunter start
//   $  exit zone               !  laser gate (stack them into a beam)
//   :  tripwire (wakes the nearest sentry)
//   ^  sentry (hangs from the ceiling)
//   *  throwable               ?  intel file
//   -  patrol range for the enemy on the same row
//
// Enemies are letters; lowercase faces left, uppercase faces right:
//   b bouncer   g guard   e enforcer   f firewall   u bug   d drone   l launcher   k DogeKing
import { TILE } from "@/game/engine/constants";
import type { EnemyKind, Face, ItemKind } from "@/game/world/types";

export const T_EMPTY = 0;
export const T_SOLID = 1;
export const T_PLATFORM = 2;

export type ThemeId = "lobby" | "seismic" | "command" | "boxoffice" | "suite" | "localhost" | "afterhours" | "penthouse" | "test";

export type PropDef = {
    kind: string;
    x: number; // tiles (may be fractional)
    y: number; // tiles, bottom edge of the prop
    w?: number;
    h?: number;
    flip?: boolean;
    text?: string;
    layer?: "back" | "front";
};

export type PromptDef = { from: number; to: number; text: string; once?: string };

export type StageHooks = {
    // Set pieces: called every step with the world. Kept in the static stage so
    // the world itself stays plain data.
    start?: (w: import("@/game/world/types").World) => void;
    step?: (w: import("@/game/world/types").World) => void;
};

// A platform that blinks on and off (in tiles; frames of game time)
export type BlinkDef = { x: number; y: number; w: number; period: number; on: number; offset: number };

// An updraft from a cooling vent (in tiles)
export type ZoneDef = { kind: "vent"; x: number; y: number; w: number; h: number };

export type StageDef = {
    id: string;
    title: string;
    theme: ThemeId;
    time: number; // seconds
    map: string[];
    props?: PropDef[];
    prompts?: PromptDef[];
    items?: ItemKind[]; // what each `*` becomes, in order (repeats)
    gatePeriod?: number;
    gateOn?: number;
    hooks?: StageHooks;
    dark?: boolean;
    blinks?: BlinkDef[];
    zones?: ZoneDef[];
    talk?: { x: number; script: import("@/game/story/types").Script }[]; // conversations when the Headhunter reaches column x
    ghost?: boolean; // show a ghost of the last attempt
    boss?: boolean; // no exit: the stage ends when DogeKing is down
};

export type Stage = {
    def: StageDef;
    cols: number;
    rows: number;
    pw: number; // size in pixels
    ph: number;
    tiles: Uint8Array;
    spawn: { x: number; y: number; face: Face };
    exit: { x: number; y: number; w: number; h: number };
    enemies: { kind: EnemyKind; x: number; y: number; face: Face; patrol: [number, number] | null }[];
    items: { kind: ItemKind; x: number; y: number }[];
    intel: { x: number; y: number } | null;
    doors: { tx: number; ty: number; h: number }[];
    gates: { tx: number; ty: number; h: number }[];
    wires: { tx: number; ty: number; h: number }[];
    sentries: { x: number; y: number }[];
};

const ENEMY_LETTERS: Record<string, EnemyKind> = {
    b: "bouncer",
    g: "guard",
    e: "enforcer",
    f: "firewall",
    u: "bug",
    d: "drone",
    l: "launcher",
    k: "boss",
};

const DEFAULT_ITEMS: ItemKind[] = ["mug", "bottle", "duck", "keyboard"];

// Group vertical runs of one character into spans
const columnsOf = (map: string[], ch: string) => {
    const spans: { tx: number; ty: number; h: number }[] = [];
    const rows = map.length;
    const cols = Math.max(...map.map((r) => r.length));
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (map[y][x] !== ch) continue;
            if (y > 0 && map[y - 1][x] === ch) continue;
            let h = 1;
            while (y + h < rows && map[y + h][x] === ch) h++;
            spans.push({ tx: x, ty: y, h });
        }
    }
    return spans;
};

export const parseStage = (def: StageDef): Stage => {
    const map = def.map;
    const rows = map.length;
    const cols = Math.max(...map.map((r) => r.length));
    const tiles = new Uint8Array(cols * rows);
    let spawn = { x: 2 * TILE, y: (rows - 1) * TILE, face: 1 as Face };
    const exitCells: { x: number; y: number }[] = [];
    const enemies: Stage["enemies"] = [];
    const items: Stage["items"] = [];
    const sentries: Stage["sentries"] = [];
    let intel: Stage["intel"] = null;
    const itemKinds = def.items ?? DEFAULT_ITEMS;
    let itemN = 0;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const ch = map[y][x] ?? " ";
            const cx = x * TILE + TILE / 2;
            const by = (y + 1) * TILE;
            if (ch === "#") tiles[y * cols + x] = T_SOLID;
            else if (ch === "=") tiles[y * cols + x] = T_PLATFORM;
            else if (ch === "@") spawn = { x: cx, y: by, face: 1 };
            else if (ch === "$") exitCells.push({ x, y });
            else if (ch === "*") items.push({ kind: itemKinds[itemN++ % itemKinds.length], x: cx, y: by });
            else if (ch === "?") intel = { x: cx, y: by };
            else if (ch === "^") sentries.push({ x: cx, y: y * TILE });
            else {
                const kind = ENEMY_LETTERS[ch.toLowerCase()];
                if (!kind) continue;
                const face: Face = ch === ch.toUpperCase() ? 1 : -1;
                // Patrol range: the run of `-` touching the enemy on its row
                let l = x;
                let r = x;
                while (l > 0 && map[y][l - 1] === "-") l--;
                while (r < cols - 1 && map[y][r + 1] === "-") r++;
                const patrol: [number, number] | null = l < x || r > x ? [l * TILE + 6, (r + 1) * TILE - 6] : null;
                const fly = kind === "drone";
                enemies.push({ kind, x: cx, y: fly ? by - 4 : by, face, patrol });
            }
        }
    }

    const ex = exitCells.length ? Math.min(...exitCells.map((c) => c.x)) : cols - 2;
    const ey = exitCells.length ? Math.min(...exitCells.map((c) => c.y)) : rows - 3;
    const ex2 = exitCells.length ? Math.max(...exitCells.map((c) => c.x)) + 1 : cols - 1;
    const ey2 = exitCells.length ? Math.max(...exitCells.map((c) => c.y)) + 1 : rows - 1;

    return {
        def,
        cols,
        rows,
        pw: cols * TILE,
        ph: rows * TILE,
        tiles,
        spawn,
        exit: { x: ex * TILE, y: ey * TILE, w: (ex2 - ex) * TILE, h: (ey2 - ey) * TILE },
        enemies,
        items,
        intel,
        doors: columnsOf(map, "|"),
        gates: columnsOf(map, "!"),
        wires: columnsOf(map, ":"),
        sentries,
    };
};

// Outside the map is solid, except below it: that's a pit.
export const tileAt = (s: Stage, tx: number, ty: number) => {
    if (ty >= s.rows) return T_EMPTY;
    if (tx < 0 || tx >= s.cols || ty < 0) return T_SOLID;
    return s.tiles[ty * s.cols + tx];
};

export const solidPx = (s: Stage, x: number, y: number) => tileAt(s, Math.floor(x / TILE), Math.floor(y / TILE)) === T_SOLID;
