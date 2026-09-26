// The cast, as looks (colors, proportions, heads) and animations (poses).
import { PAL } from "@/game/art/palette";
import type { Look, Pose } from "@/game/art/rig";

// ---------------------------------------------------------------------------
// The Headhunter: trench coat, cyan visor, magenta scarf, a letter opener.

const HH_HEAD = [
    "..hhhh..",
    ".hHHhhh.",
    "hHhhhhhh",
    "hhhVVVVV",
    "hhhvvvvc",
    ".hhsssss",
    "..ssss..",
    "..kk....",
] as const;

export const HEADHUNTER: Look = {
    thigh: 6,
    shin: 7,
    torso: 9,
    upper: 5,
    fore: 5,
    legW: 3,
    armW: 2,
    coatLen: 9,
    coatFlare: 1,
    shoulderW: 2.5,
    colors: {
        coat: "#3b3272",
        coatHi: "#8279d6",
        coatLo: "#28215a",
        pants: "#231d44",
        pantsLo: "#17122f",
        boot: "#0b0916",
        glove: "#141022",
        belt: "#17122f",
        outline: PAL.ink,
        rim: "#a8a0f2",
    },
    head: HH_HEAD,
    headColors: { h: "#1f1a3d", H: "#4a4088", V: PAL.cyan, v: "#2bb5dd", c: "#d8faff", s: "#dcae96", k: PAL.hot },
    headOffset: [-4, -8],
    weapon: "blade",
};

type Anim = { poses: Pose[]; fps: number; loop: boolean; settle?: boolean };

const mix = (a: Pose, b: Pose, t: number): Pose => {
    const out: Pose = {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Pose>;
    for (const k of keys) {
        const va = a[k] ?? (k === "fl" || k === "bl" || k === "fa" || k === "ba" ? [0, 0] : 0);
        const vb = b[k] ?? (k === "fl" || k === "bl" || k === "fa" || k === "ba" ? [0, 0] : 0);
        if (Array.isArray(va)) {
            const aa = va as [number, number];
            const bb = vb as [number, number];
            (out as Record<string, unknown>)[k] = [aa[0] + (bb[0] - aa[0]) * t, aa[1] + (bb[1] - aa[1]) * t];
        } else (out as Record<string, unknown>)[k] = (va as number) + ((vb as number) - (va as number)) * t;
    }
    return out;
};

// Spread key poses over n frames, looping back to the first
const cycle = (keys: Pose[], n: number): Pose[] =>
    Array.from({ length: n }, (_, i) => {
        const f = (i / n) * keys.length;
        const a = Math.floor(f);
        return mix(keys[a % keys.length], keys[(a + 1) % keys.length], f - a);
    });

const swapSides = (p: Pose): Pose => ({ ...p, fl: p.bl, bl: p.fl, fa: p.ba, ba: p.fa });

// Run: five keys for one stride, then the same with legs and arms swapped
const HH_STRIDE: Pose[] = [
    { lean: 18, y: 0, fl: [38, 8], bl: [-36, 55], fa: [-45, 70], ba: [50, 60], coat: 40 },
    { lean: 20, y: 1, fl: [18, 24], bl: [-24, 85], fa: [-25, 70], ba: [35, 70], coat: 46 },
    { lean: 20, y: 0, fl: [0, 12], bl: [8, 100], fa: [0, 60], ba: [10, 70], coat: 42 },
    { lean: 18, y: -1, fl: [-26, 18], bl: [42, 70], fa: [30, 60], ba: [-25, 70], coat: 36 },
    { lean: 18, y: -1, fl: [-36, 45], bl: [44, 20], fa: [45, 60], ba: [-40, 70], coat: 38 },
];
const withBlade = (p: Pose, angle = 165): Pose => ({ ...p, weapon: angle });

export const HH_ANIMS: Record<string, Anim> = {
    idle: {
        fps: 8,
        loop: true,
        poses: [0, 0, 0, 1, 1, 1, 1, 0].map((y, i) => ({
            y,
            lean: 4,
            fl: [8, 4],
            bl: [-8, 2],
            fa: [18 + y * 2, 40],
            ba: [-8, 16],
            coat: 6 + (i % 4),
            weapon: 105,
            headY: y ? 0 : 0,
        })),
    },
    run: {
        fps: 20,
        loop: true,
        poses: cycle([...HH_STRIDE, ...HH_STRIDE.map(swapSides)], 10).map((p) => withBlade(p, 168)),
    },
    stop: {
        fps: 16,
        loop: false,
        poses: [
            { lean: -8, y: 1, fl: [34, 4], bl: [-12, 40], fa: [-20, 30], ba: [-40, 30], coat: 30, weapon: 160 },
            { lean: -12, y: 2, fl: [38, 6], bl: [-8, 50], fa: [-10, 30], ba: [-30, 30], coat: 22, weapon: 150 },
            { lean: -4, y: 1, fl: [24, 10], bl: [-8, 30], fa: [10, 40], ba: [-10, 20], coat: 12, weapon: 120 },
        ],
    },
    jump: {
        fps: 12,
        loop: false,
        poses: [
            { lean: 6, y: -1, fl: [34, 70], bl: [-14, 30], fa: [-50, 40], ba: [60, 40], coat: 24, weapon: 160 },
            { lean: 6, y: -1, fl: [40, 80], bl: [-8, 44], fa: [-40, 50], ba: [70, 40], coat: 28, weapon: 165 },
        ],
    },
    apex: {
        fps: 10,
        loop: false,
        poses: [{ lean: 4, y: -2, fl: [46, 88], bl: [16, 70], fa: [-20, 60], ba: [40, 50], coat: 18, weapon: 150 }],
    },
    fall: {
        fps: 10,
        loop: true,
        poses: [
            { lean: 0, fl: [16, 24], bl: [-14, 36], fa: [150, 30], ba: [-140, 20], coat: 70, weapon: 200 },
            { lean: 0, fl: [18, 28], bl: [-12, 40], fa: [145, 30], ba: [-135, 20], coat: 76, weapon: 205 },
        ],
    },
    land: {
        fps: 16,
        loop: false,
        poses: [
            { lean: 24, y: 4, fl: [44, 90], bl: [-22, 80], fa: [40, 40], ba: [-30, 40], coat: 20, weapon: 120 },
            { lean: 14, y: 2, fl: [28, 50], bl: [-16, 50], fa: [30, 40], ba: [-20, 30], coat: 12, weapon: 110 },
        ],
    },
    crouch: {
        fps: 8,
        loop: true,
        poses: [{ lean: 26, y: 6, fl: [60, 118], bl: [-20, 110], fa: [50, 30], ba: [-10, 40], coat: 10, weapon: 150, headY: 0 }],
    },
    wallslide: {
        fps: 8,
        loop: true,
        poses: [
            { lean: -6, x: -1, fl: [40, 70], bl: [8, 24], fa: [140, -20], ba: [-30, 30], coat: 30, weapon: 200 },
            { lean: -6, x: -1, fl: [42, 72], bl: [10, 26], fa: [142, -20], ba: [-28, 30], coat: 34, weapon: 200 },
        ],
    },
    flip: {
        fps: 26,
        loop: false,
        poses: [0, 1, 2, 3, 4, 5].map((i) => ({
            rot: -(i + 1) * 60,
            tuck: 0.7,
            y: -2,
            fl: [70, 120],
            bl: [60, 120],
            fa: [70, 60],
            ba: [50, 60],
            coat: 20,
            weapon: 170,
        })),
    },
    roll: {
        fps: 24,
        loop: false,
        poses: [0, 1, 2, 3, 4, 5, 6].map((i) => ({
            rot: (i * 360) / 7,
            tuck: 1,
            y: 5,
            fl: [80, 140],
            bl: [70, 140],
            fa: [70, 70],
            ba: [60, 60],
            coat: 10,
            weapon: 170,
        })),
    },
    attack: {
        fps: 30,
        loop: false,
        poses: [
            { lean: 12, fl: [26, 10], bl: [-26, 34], fa: [-60, 50], ba: [40, 40], coat: 24, weapon: -140 },
            { lean: 26, x: 2, fl: [34, 12], bl: [-34, 44], fa: [96, 0], ba: [-40, 40], coat: 36, weapon: 0 },
            { lean: 24, x: 2, fl: [34, 12], bl: [-34, 44], fa: [70, 20], ba: [-45, 40], coat: 40, weapon: 50 },
            { lean: 20, x: 1, fl: [30, 14], bl: [-30, 40], fa: [40, 30], ba: [-40, 40], coat: 34, weapon: 95 },
            { lean: 14, fl: [22, 10], bl: [-22, 30], fa: [26, 40], ba: [-20, 30], coat: 24, weapon: 110 },
        ],
    },
    attack_up: {
        fps: 30,
        loop: false,
        poses: [
            { lean: 4, fl: [20, 30], bl: [-20, 40], fa: [40, 60], ba: [-20, 40], coat: 20, weapon: 110 },
            { lean: -8, y: -1, fl: [16, 20], bl: [-24, 50], fa: [172, 0], ba: [-50, 30], coat: 40, weapon: -90 },
            { lean: -6, y: -1, fl: [16, 20], bl: [-24, 50], fa: [150, 10], ba: [-50, 30], coat: 44, weapon: -120 },
            { lean: 0, fl: [16, 20], bl: [-20, 40], fa: [120, 20], ba: [-40, 30], coat: 34, weapon: -160 },
            { lean: 4, fl: [16, 16], bl: [-16, 30], fa: [60, 30], ba: [-20, 30], coat: 24, weapon: 150 },
        ],
    },
    attack_down: {
        fps: 30,
        loop: false,
        poses: [
            { lean: 10, fl: [40, 60], bl: [-10, 50], fa: [140, 20], ba: [40, 40], coat: 30, weapon: -60 },
            { lean: 30, fl: [44, 70], bl: [-6, 60], fa: [40, 0], ba: [-60, 40], coat: 50, weapon: 70 },
            { lean: 30, fl: [44, 70], bl: [-6, 60], fa: [20, 10], ba: [-60, 40], coat: 52, weapon: 100 },
            { lean: 24, fl: [40, 60], bl: [-8, 50], fa: [0, 20], ba: [-50, 40], coat: 44, weapon: 140 },
            { lean: 16, fl: [34, 50], bl: [-10, 40], fa: [10, 30], ba: [-30, 30], coat: 30, weapon: 150 },
        ],
    },
    kick: {
        fps: 24,
        loop: false,
        poses: [
            { lean: -6, fl: [70, 100], bl: [-6, 10], fa: [-30, 40], ba: [40, 40], coat: 20, weapon: 160 },
            { lean: -18, fl: [96, 0], bl: [-8, 8], fa: [-40, 30], ba: [60, 30], coat: 30, weapon: 170 },
            { lean: -16, fl: [92, 4], bl: [-8, 8], fa: [-36, 30], ba: [56, 30], coat: 34, weapon: 170 },
            { lean: -4, fl: [40, 50], bl: [-8, 10], fa: [-10, 30], ba: [20, 30], coat: 20, weapon: 150 },
        ],
    },
    throw: {
        fps: 20,
        loop: false,
        poses: [
            { lean: -4, fl: [20, 10], bl: [-20, 20], fa: [10, 40], ba: [-150, 20], coat: 16, weapon: 130 },
            { lean: 16, fl: [26, 10], bl: [-26, 30], fa: [10, 40], ba: [110, 0], coat: 26, weapon: 130 },
            { lean: 10, fl: [22, 10], bl: [-22, 24], fa: [14, 40], ba: [60, 20], coat: 20, weapon: 120 },
        ],
    },
    hurt: {
        fps: 10,
        loop: true,
        poses: [
            { lean: -30, rot: -25, fl: [34, 30], bl: [56, 50], fa: [150, 30], ba: [170, 20], coat: 60, weapon: 220 },
            { lean: -34, rot: -40, fl: [40, 40], bl: [60, 60], fa: [160, 30], ba: [180, 20], coat: 70, weapon: 230 },
        ],
    },
    dead: {
        fps: 6,
        loop: false,
        settle: true,
        poses: [{ rot: -90, lean: -4, fl: [16, 20], bl: [30, 50], fa: [70, 30], ba: [140, 20], coat: 5, weapon: 60 }],
    },
    walk: {
        fps: 10,
        loop: true,
        poses: cycle(
            [
                { lean: 4, y: 0, fl: [22, 6], bl: [-20, 20], fa: [-14, 20], ba: [16, 20], coat: 10, weapon: 110 },
                { lean: 4, y: -1, fl: [4, 8], bl: [6, 40], fa: [0, 20], ba: [0, 20], coat: 12, weapon: 108 },
                { lean: 4, y: 0, fl: [-20, 20], bl: [22, 6], fa: [14, 20], ba: [-16, 20], coat: 10, weapon: 106 },
                { lean: 4, y: -1, fl: [6, 40], bl: [4, 8], fa: [0, 20], ba: [0, 20], coat: 12, weapon: 108 },
            ],
            8,
        ),
    },
};

// ---------------------------------------------------------------------------
// Security bots: suits, Shiba masks, glowing eyes.

const MASK = [
    ".e....e.",
    "eEe..eEe",
    "emmmmmme",
    "mmmwmmmw",
    "mmmmmmnn",
    ".mcccccc",
    "..cccc..",
    "..tt....",
] as const;

const MASK_COLORS = { e: "#a8845f", E: "#6a4a3a", m: "#c9a27a", w: PAL.hot, n: "#2a1f2a", c: "#efe2c6", t: "#d8d4ea" };

const botLook = (weapon: Look["weapon"], suit: string, suitHi: string, suitLo: string, tie: string, bulk = 0): Look => ({
    thigh: 6,
    shin: 7,
    torso: 9 + bulk,
    upper: 5,
    fore: 5,
    legW: 3 + bulk * 0.5,
    armW: 2 + bulk * 0.5,
    coatLen: 3,
    coatFlare: 0,
    shoulderW: 3 + bulk,
    colors: {
        coat: suit,
        coatHi: suitHi,
        coatLo: suitLo,
        pants: suitLo,
        pantsLo: "#0f0d18",
        boot: "#07060c",
        glove: "#0f0d18",
        shirt: "#d8d4ea",
        tie,
        outline: PAL.ink,
        rim: "#8a86b0",
    },
    head: MASK,
    headColors: MASK_COLORS,
    headOffset: [-4, -8],
    weapon,
});

export const BOTS = {
    bouncer: botLook("fists", "#332a42", "#5e5178", "#211a2d", PAL.hot, 1),
    guard: botLook("pistol", "#2a2540", "#524a74", "#1b172b", PAL.hot),
    enforcer: botLook("shotgun", "#3a2838", "#664c63", "#241822", PAL.amber),
    firewall: botLook("shield", "#232b4a", "#46558c", "#171d34", PAL.cyan),
};

const BOT_STRIDE: Pose[] = [
    { lean: 12, fl: [30, 8], bl: [-30, 45], fa: [-35, 50], ba: [35, 50] },
    { lean: 12, y: 1, fl: [10, 20], bl: [-15, 70], fa: [-15, 50], ba: [20, 50] },
    { lean: 12, fl: [-10, 10], bl: [15, 80], fa: [10, 50], ba: [-10, 50] },
    { lean: 12, y: -1, fl: [-28, 30], bl: [36, 30], fa: [30, 50], ba: [-30, 50] },
];

const botWalk: Pose[] = [
    { lean: 2, fl: [18, 4], bl: [-16, 16], fa: [-12, 16], ba: [14, 16] },
    { lean: 2, y: -1, fl: [2, 6], bl: [4, 36], fa: [0, 16], ba: [0, 16] },
    { lean: 2, fl: [-16, 16], bl: [18, 4], fa: [14, 16], ba: [-12, 16] },
    { lean: 2, y: -1, fl: [4, 36], bl: [2, 6], fa: [0, 16], ba: [0, 16] },
];

// The arm (and gun) aims at 9 angles from straight up (-90) to straight down (90)
export const AIM_STEPS = 9;
export const aimFrame = (angleFromForward: number) => {
    const d = Math.max(-90, Math.min(90, (angleFromForward * 180) / Math.PI));
    return Math.round((d + 90) / (180 / (AIM_STEPS - 1)));
};

export const botAnims = (kind: keyof typeof BOTS): Record<string, Anim> => {
    const shield = kind === "firewall";
    const fists = kind === "bouncer";
    const idleArm: [number, number] = shield ? [60, 40] : fists ? [20, 60] : [10, 30];
    const gunAngle = kind === "enforcer" ? 30 : 60;
    return {
        idle: {
            fps: 6,
            loop: true,
            poses: [0, 0, 1, 1].map((y) => ({ y, lean: 2, fl: [6, 2], bl: [-6, 2], fa: idleArm, ba: [-6, 14], weapon: shield ? undefined : gunAngle })),
        },
        walk: { fps: 9, loop: true, poses: cycle([...botWalk], 8).map((p) => ({ ...p, fa: shield ? idleArm : p.fa, weapon: gunAngle })) },
        run: {
            fps: 16,
            loop: true,
            poses: cycle([...BOT_STRIDE, ...BOT_STRIDE.map(swapSides)], 8).map((p) => ({ ...p, fa: shield ? idleArm : p.fa, weapon: gunAngle })),
        },
        alert: {
            fps: 8,
            loop: false,
            poses: [{ lean: -8, y: -1, fl: [10, 4], bl: [-12, 6], fa: [50, 70], ba: [-40, 60], headY: -1, weapon: shield ? undefined : 20 }],
        },
        aim: {
            fps: 0,
            loop: false,
            poses: Array.from({ length: AIM_STEPS }, (_, i) => {
                const phi = -90 + (i * 180) / (AIM_STEPS - 1);
                return { lean: 0, fl: [12, 4], bl: [-14, 6], fa: [90 - phi, 0] as [number, number], ba: [30, 60] as [number, number], weapon: phi };
            }),
        },
        windup: {
            fps: 8,
            loop: false,
            poses: shield
                ? [{ lean: -12, fl: [10, 4], bl: [-20, 20], fa: [30, 40], ba: [-20, 20] }]
                : [{ lean: -10, y: 1, fl: [14, 10], bl: [-22, 30], fa: [-70, 90], ba: [40, 60] }],
        },
        strike: {
            fps: 12,
            loop: false,
            poses: shield
                ? [{ lean: 22, x: 2, fl: [30, 10], bl: [-30, 30], fa: [80, 0], ba: [-20, 30] }]
                : [{ lean: 20, x: 2, fl: [30, 10], bl: [-30, 36], fa: [96, 0], ba: [-30, 50] }],
        },
        block: { fps: 8, loop: false, poses: [{ lean: -14, x: -1, fl: [16, 6], bl: [-20, 20], fa: shield ? [70, 30] : [50, 60], ba: [-30, 40] }] },
        stun: {
            fps: 6,
            loop: true,
            poses: [
                { lean: -18, fl: [16, 20], bl: [-20, 30], fa: [150, 20], ba: [-60, 60], headY: 1 },
                { lean: -20, fl: [18, 22], bl: [-22, 30], fa: [155, 20], ba: [-55, 60], headY: 1 },
            ],
        },
        leap: { fps: 8, loop: false, poses: [{ lean: 10, fl: [40, 60], bl: [-20, 40], fa: [-40, 40], ba: [40, 40] }] },
        hurt: {
            fps: 10,
            loop: true,
            poses: [
                { lean: -20, fl: [40, 40], bl: [-10, 60], fa: [150, 30], ba: [-150, 20], weapon: 200 },
                { lean: -24, fl: [50, 50], bl: [-6, 70], fa: [160, 30], ba: [-160, 20], weapon: 210 },
            ],
        },
        dead: {
            fps: 4,
            loop: false,
            settle: true,
            poses: [{ rot: -90, lean: 0, fl: [10, 20], bl: [30, 60], fa: [60, 40], ba: [150, 20], weapon: 60, headY: 0 }],
        },
    };
};

export type { Anim };

// ---------------------------------------------------------------------------
// DogeKing: hoodie, crown, Shiba mask, and a guitar. Unmasked at the end.

const CROWNED = [
    ".y.y.y..",
    ".yYyYy..",
    ".e....e.",
    "eEe..eEe",
    "emmmmmme",
    "mmmwmmmw",
    "mmmmmmnn",
    ".mcccccc",
    "..cccc..",
    "..hh....",
] as const;

const MINH = [
    "..hhhh..",
    ".hhhhhhh",
    "hhhhhhhh",
    "hhhHssss",
    "hhssesse",
    ".hssssss",
    "..sssm..",
    "..hh....",
] as const;

const dogeLook = (unmasked: boolean): Look => ({
    thigh: 6,
    shin: 7,
    torso: 9,
    upper: 5,
    fore: 5,
    legW: 3,
    armW: 2,
    coatLen: 4,
    coatFlare: 0,
    shoulderW: 3,
    colors: {
        coat: "#3a2350",
        coatHi: "#7a5aa0",
        coatLo: "#241634",
        pants: "#1d2340",
        pantsLo: "#141830",
        boot: "#ece8ff",
        glove: "#dcae96",
        outline: PAL.ink,
        rim: "#b09ae0",
    },
    head: unmasked ? MINH : CROWNED,
    headColors: unmasked
        ? { h: "#15101f", H: "#2a2140", s: "#dcae96", e: "#1d1838", m: "#b0786a" }
        : { ...MASK_COLORS, y: PAL.amber, Y: "#c99a4a", h: "#3a2350" },
    headOffset: unmasked ? [-4, -8] : [-4, -10],
    weapon: "guitar",
});

export const DOGE = dogeLook(false);
export const MINH_LOOK = dogeLook(true);

export const DOGE_ANIMS: Record<string, Anim> = {
    idle: {
        fps: 6,
        loop: true,
        poses: [0, 0, 1, 1].map((y) => ({ y, lean: 2, fl: [8, 4], bl: [-8, 4], fa: [40, 60], ba: [20, 50], weapon: -30 })),
    },
    run: {
        fps: 16,
        loop: true,
        poses: cycle([...BOT_STRIDE, ...BOT_STRIDE.map(swapSides)], 8).map((p) => ({ ...p, lean: 16, fa: [40, 60], weapon: -30 })),
    },
    windup: {
        fps: 8,
        loop: true,
        poses: [
            { lean: -10, y: 3, fl: [40, 80], bl: [-30, 60], fa: [-60, 40], ba: [-40, 40], weapon: -150 },
            { lean: -12, y: 3, fl: [42, 84], bl: [-32, 62], fa: [-64, 40], ba: [-44, 40], weapon: -155 },
        ],
    },
    dash: {
        fps: 12,
        loop: true,
        poses: [{ lean: 30, y: 2, fl: [50, 30], bl: [-50, 40], fa: [96, 0], ba: [-60, 30], weapon: 0 }],
    },
    throw: {
        fps: 10,
        loop: false,
        poses: [
            { lean: -6, fl: [14, 6], bl: [-16, 10], fa: [40, 60], ba: [-150, 20], weapon: -30 },
            { lean: 14, fl: [20, 6], bl: [-20, 16], fa: [40, 60], ba: [100, 0], weapon: -30 },
        ],
    },
    strum: {
        fps: 8,
        loop: true,
        poses: [
            { lean: -4, fl: [16, 6], bl: [-16, 6], fa: [60, 70], ba: [40, 60], weapon: -20 },
            { lean: -2, y: 1, fl: [16, 8], bl: [-16, 8], fa: [70, 40], ba: [40, 60], weapon: -20 },
        ],
    },
    hurt: {
        fps: 10,
        loop: true,
        poses: [{ lean: -24, fl: [30, 30], bl: [-10, 40], fa: [140, 30], ba: [-140, 20], weapon: -120 }],
    },
    kneel: {
        fps: 4,
        loop: false,
        poses: [{ lean: 18, y: 7, fl: [70, 120], bl: [-20, 110], fa: [20, 20], ba: [-10, 20], weapon: 80 }],
    },
};
