// Small hand-drawn sprites: bugs, drones, turrets, props you can throw, icons.
import { PAL } from "@/game/art/palette";
import { grid, makeBuf, outline, rgba, type Buf } from "@/game/art/pixels";

type Small = { frames: Buf[]; fps: number; loop: boolean; ox: number; oy: number };

const make = (rowsList: (readonly string[])[], colors: Record<string, string>, opts: { fps?: number; loop?: boolean; pad?: number; ox?: number; oy?: number; line?: boolean } = {}): Small => {
    const pad = opts.pad ?? 1;
    const w = Math.max(...rowsList.flatMap((r) => r.map((s) => s.length))) + pad * 2;
    const h = Math.max(...rowsList.map((r) => r.length)) + pad * 2;
    const frames = rowsList.map((rows) => {
        const b = makeBuf(w, h);
        grid(b, rows, pad, pad, colors);
        if (opts.line !== false) outline(b, rgba(PAL.ink));
        return b;
    });
    return { frames, fps: opts.fps ?? 8, loop: opts.loop ?? true, ox: opts.ox ?? Math.floor(w / 2), oy: opts.oy ?? h - pad };
};

const BUG_C = { a: PAL.peri, b: "#2b2550", B: "#4a3f8a", p: PAL.hot, P: PAL.hotLight, e: PAL.pass, l: "#3d3570" };

const bugBody = ["..a....a..", "...a..a...", "..bbbbbbb.", ".bBBppBBBe", ".bBpPPpBBb", "..bbbbbbb."];

const FLOPPY_C = { o: PAL.peri, O: "#5b6bd6", l: PAL.paper, s: "#2b2550", h: PAL.hot };

export const SMALL_SPRITES: Record<string, Small> = {
    "bug.run": make(
        [
            [...bugBody, ".l.l..l.l.", "l...l...l."],
            [...bugBody, "..l.l..l.l", ".l...l...l"],
            [...bugBody, ".l..l.l..l", "l..l...l.."],
        ],
        BUG_C,
        { fps: 16 },
    ),
    "bug.idle": make([[...bugBody, ".l.l..l.l.", "l...l...l."], [...bugBody.map((r, i) => (i < 2 ? r.replace(/a/g, ".") : r)), ".l.l..l.l.", "l...l...l."]], BUG_C, { fps: 4 }),
    "bug.leap": make([[...bugBody, "l.l....l.l", "..........."]], BUG_C, { fps: 1 }),
    "bug.dead": make([["..........", "..........", "..bbbbbbb.", ".bBBppBBBb", ".lBpPPpBBl", "l.bbbbbbb.l"]], BUG_C, { fps: 1, loop: false }),

    "drone.idle": make(
        [
            ["rrrrrr..rrrrrr", "...t......t...", "..dddddddddd..", ".dDDDDDDDDDDd.", ".dDwwDDDDEEDd.", "..dddddddddd..", "....g....g...."],
            [".rrrr....rrrr.", "...t......t...", "..dddddddddd..", ".dDDDDDDDDDDd.", ".dDwwDDDDEEDd.", "..dddddddddd..", "....g....g...."],
        ],
        { r: "#8c9eff66", t: "#3d3570", d: "#2b2550", D: "#4a3f8a", w: PAL.peri, E: PAL.hot, g: "#1d1838" },
        { fps: 20 },
    ),
    "drone.dead": make(
        [["..............", "...t......t...", "..dddddddddd..", ".dDDDDDDDDDDd.", ".dDwwDDDDddDd.", "..dddddddddd..", "....g....g...."]],
        { t: "#3d3570", d: "#2b2550", D: "#4a3f8a", w: PAL.peri, g: "#1d1838" },
        { fps: 1, loop: false },
    ),

    "sentry.idle": make(
        [["hhhhhhhhhhhh", "....hhhh....", "....ssss....", "..sSSSSSSs..", ".sSSSSSSSSs.", ".sSSEEEESSs.", "..sSSSSSSs..", "...ssssss..."]],
        { h: "#2c2754", s: "#2b2550", S: "#4a3f8a", E: "#6b2a4a" },
        { fps: 1, oy: 0 },
    ),
    "sentry.active": make(
        [
            ["hhhhhhhhhhhh", "....hhhh....", "....ssss....", "..sSSSSSSs..", ".sSSSSSSSSs.", ".sSSEEEESSs.", "..sSSSSSSs..", "...ssssss..."],
            ["hhhhhhhhhhhh", "....hhhh....", "....ssss....", "..sSSSSSSs..", ".sSSSSSSSSs.", ".sSSeeeeSSs.", "..sSSSSSSs..", "...ssssss..."],
        ],
        { h: "#2c2754", s: "#2b2550", S: "#4a3f8a", E: PAL.hot, e: PAL.hotLight },
        { fps: 8, oy: 0 },
    ),
    "sentry.dead": make(
        [["hhhhhhhhhhhh", "....hhhh....", "....ssss....", "..sSSsSSSs..", ".sSS..SSSSs.", ".sSSs..SSs..", "..sS...Ss...", "...s....s..."]],
        { h: "#2c2754", s: "#2b2550", S: "#3d3570" },
        { fps: 1, oy: 0, loop: false },
    ),

    "launcher.idle": make(
        [
            [
                "......tttt......",
                ".....tTTTTt.....",
                ".....tTwwTt.....",
                ".....tTTTTt.....",
                "......tTTt......",
                "...bbbbbbbbbb...",
                "..bBBBBBBBBBBb..",
                "..bBpPBBBBBBBb..",
                "..bBPpBBBsssBb..",
                "..bBBBBBBBBBBb..",
                "..bbbbbbbbbbbb..",
                "...k........k...",
                "..kKk......kKk..",
                "...k........k...",
            ],
        ],
        { t: "#3d3570", T: "#5b4f9a", w: PAL.paper, b: "#1d1838", B: "#2b2550", p: PAL.pass, P: "#2a8a6a", s: PAL.peri, k: "#141022", K: "#3d3570" },
        { fps: 1 },
    ),
    "launcher.fire": make(
        [
            [
                "......tttt......",
                ".....tTTTTt.....",
                ".....tTwwTt.....",
                ".....tTTTTt.....",
                "......tTTt......",
                "...bbbbbbbbbb...",
                "..bBBBBBBBBBBb..",
                "..bBPpBBBBBBBb..",
                "..bBpPBBBsssBb..",
                "..bBBBBBBBBBBb..",
                "..bbbbbbbbbbbb..",
                "...k........k...",
                "..kKk......kKk..",
                "...k........k...",
            ],
        ],
        { t: "#3d3570", T: "#8c9eff", w: PAL.paper, b: "#1d1838", B: "#2b2550", p: PAL.pass, P: "#2a8a6a", s: PAL.hot, k: "#141022", K: "#3d3570" },
        { fps: 1 },
    ),
    "launcher.dead": make(
        [
            [
                "................",
                "................",
                "................",
                "................",
                "......tT........",
                "...bbbbbbb.bb...",
                "..bBBBB.BBBBBb..",
                "..bBBB...BBBBb..",
                "..bBBBBBBBsssb..",
                "..bBBBBBBBBBBb..",
                "..bbbbbbbbbbbb..",
                "...k........k...",
                "..kKk......kKk..",
                "...k........k...",
            ],
        ],
        { t: "#3d3570", T: "#5b4f9a", b: "#1d1838", B: "#2b2550", s: "#3d3570", k: "#141022", K: "#3d3570" },
        { fps: 1, loop: false },
    ),

    // Throwables
    "item.mug": make([["wwwww.", "wWWWww", "wWWWw.w", "wWWWww", "wwwww."]], { w: PAL.paper, W: PAL.mist }),
    "item.duck": make([[".yy...", "yyyo..", ".yy...", "yyyyy.", ".yyy.."]], { y: PAL.amber, o: PAL.hot }),
    "item.keyboard": make([["kkkkkkkkkk", "kKkKkKkKkk", "kkKKKKKKkk"]], { k: "#2c2754", K: PAL.mist }),
    "item.dumbbell": make([["dd....dd", "ddhhhhdd", "dd....dd"]], { d: "#3d3570", h: PAL.mist }),
    "item.boba": make([["...s", "..s.", "cccc", "cmmc", "cmmc", "cppc", ".cc."]], { s: PAL.hot, c: PAL.paper, m: "#c9a27a", p: "#1d1838" }),
    "item.scanner": make([["gggg..", "gRRgg.", "gggggg", "..gg..", "..gg.."]], { g: "#2c2754", R: PAL.hot }),
    "item.bottle": make([[".g.", ".g.", "ggg", "gGg", "gGg", "ggg"]], { g: "#2a8a6a", G: PAL.pass }),
    "item.shuttle": make([["ff.", "fffk", "ff."]], { f: PAL.paper, k: "#1d1838" }, { line: false }),

    // Intel: a floppy disk with a hot label
    intel: make(
        [
            ["oooooooo", "oOllllOo", "oOllllOo", "oOOOOOOo", "oOssssOo", "oOsshsOo", "oooooooo"],
            ["oooooooo", "oOllllOo", "oOllllOo", "oOOOOOOo", "oOssssOo", "oOshssOo", "oooooooo"],
        ],
        FLOPPY_C,
        { fps: 3 },
    ),

    alert: make([[".hh.", "hHHh", "hHHh", ".hh.", ".hh.", "....", ".hh.", ".hh."]], { h: PAL.hot, H: PAL.paper }, { fps: 1 }),
    question: make([[".hhh.", "h...h", "...h.", "..h..", "..h..", ".....", "..h.."]], { h: PAL.peri }, { fps: 1 }),
};
