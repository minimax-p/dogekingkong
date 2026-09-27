// Pixel skeletons. A pose is a handful of joint angles; drawing it lays down
// shaded pixel limbs, an outfit (coat, suit, tee, vest, armor or hoodie) and a
// hand-drawn head, then a rim light and an outline. Every animation frame is
// a pose, baked once at load.
import { circle, grid, limb, makeBuf, outline, poly, px, rgba, rim, type Buf } from "@/game/art/pixels";

export type Pose = {
    x?: number; // pelvis offset
    y?: number;
    lean?: number; // torso, degrees from vertical, + forward
    head?: number; // head offset along the facing direction
    headY?: number;
    fl?: [number, number]; // front leg: hip angle (+ forward), knee bend
    bl?: [number, number];
    fa?: [number, number]; // front arm: shoulder angle from straight down (+ forward), elbow bend (+ forward)
    ba?: [number, number];
    rot?: number; // whole body, degrees (flips, rolls)
    coat?: number; // coat tail swing, degrees backward
    weapon?: number; // held weapon angle, degrees from pointing forward (+ down); undefined = along the forearm
    tuck?: number; // pull the limbs in (rolls)
};

export type Weapon = "blade" | "pistol" | "shotgun" | "shield" | "fists" | "guitar" | "none";

export type Outfit = "coat" | "suit" | "tee" | "vest" | "armor" | "hoodie";

export type Look = {
    thigh: number;
    shin: number;
    torso: number;
    upper: number;
    fore: number;
    legW: number;
    armW: number;
    coatLen: number; // how far the coat or jacket hangs below the hips
    coatFlare: number; // extra width at the hem
    shoulderW: number;
    chest?: number; // extra depth at the chest (bulky builds)
    outfit: Outfit;
    colors: {
        coat: string;
        coatHi: string;
        coatLo: string;
        pants: string;
        pantsLo: string;
        boot: string;
        bootHi?: string;
        glove: string;
        sleeve?: string; // arms, if not the coat color (robot arms, bare arms)
        sleeveLo?: string;
        sleeveHi?: string;
        shirt?: string;
        tie?: string;
        belt?: string;
        trim?: string; // stripes, straps, plate edges
        outline: string;
        rim: string;
    };
    head: readonly string[];
    headColors: Record<string, string>;
    headOffset: [number, number]; // from the neck to the grid's top-left, facing right
    weapon: Weapon;
    pads?: boolean; // armored shoulder pads
    collar?: boolean; // tall coat collar behind the head
    hood?: boolean; // hood hanging behind the head
    big?: boolean; // bigger fists and boots
};

export const CELL = 60;
export const ORIGIN_X = 30;
export const ORIGIN_Y = 53;

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (deg: number): [number, number] => [Math.sin(rad(deg)), Math.cos(rad(deg))];

type Pt = [number, number];

// Light comes from the upper left
const LX = -0.6;
const LY = -0.8;

// A tapered limb with a lit side and a shadow side
const shaded = (b: Buf, a: Pt, e: Pt, w1: number, w2: number, base: number, dark: number, light?: number) => {
    const dx = e[0] - a[0];
    const dy = e[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (nx * LX + ny * LY < 0) {
        nx = -nx;
        ny = -ny;
    }
    limb(b, a[0], a[1], e[0], e[1], w1, w2, dark);
    const o = 0.55;
    limb(b, a[0] + nx * o, a[1] + ny * o, e[0] + nx * o, e[1] + ny * o, Math.max(1, w1 - 1), Math.max(1, w2 - 1), base);
    if (light !== undefined && Math.min(w1, w2) >= 3) {
        const l = Math.min(w1, w2) / 2 - 0.3;
        limb(b, a[0] + nx * l, a[1] + ny * l, e[0] + nx * l, e[1] + ny * l, 1, 1, light);
    }
};

export const drawPose = (look: Look, pose: Pose): Buf => {
    const b = makeBuf(CELL, CELL);
    const j = joints(look, pose);
    const C = look.colors;
    const c = (hex: string | undefined, fallback: string) => rgba(hex ?? fallback);
    const col = {
        coat: rgba(C.coat),
        coatHi: rgba(C.coatHi),
        coatLo: rgba(C.coatLo),
        pants: rgba(C.pants),
        pantsLo: rgba(C.pantsLo),
        boot: rgba(C.boot),
        bootHi: c(C.bootHi, C.boot),
        glove: rgba(C.glove),
        sleeve: c(C.sleeve, C.coat),
        sleeveLo: c(C.sleeveLo, C.coatLo),
        sleeveHi: c(C.sleeveHi, C.coatHi),
        trim: c(C.trim, C.coatHi),
    };
    const tuck = pose.tuck ?? 0;
    const L = look;
    const up: Pt = [Math.sin(rad(j.lean - j.rot)), -Math.cos(rad(j.lean - j.rot))];
    const fw: Pt = [Math.cos(rad(j.lean - j.rot)), Math.sin(rad(j.lean - j.rot))];
    const R = (p: Pt): Pt => rotate(p, j.center, j.rot);
    const at = (base: Pt, u: number, f: number): Pt => R([base[0] + up[0] * u + fw[0] * f, base[1] + up[1] * u + fw[1] * f]);
    const pelvis = j.pelvisRaw;
    const neck = j.neckRaw;

    // Hood or tall collar, behind the head
    if (L.hood) poly(b, [at(neck, 1, -3), at(neck, 7, -4), at(neck, 9, -1), at(neck, 4, 1)], col.coatLo);
    if (L.collar) poly(b, [at(neck, -1, -2.5), at(neck, 5, -3), at(neck, 5, -1), at(neck, 0, 1)], col.coatLo);

    // Back arm and back leg, in shadow
    arm(b, L, j.shoulder, j.bElbow, j.bHand, col.sleeveLo, col.sleeveLo, col.glove);
    leg(b, L, j.bHip, j.bKnee, j.bAnkle, col.pantsLo, col.pantsLo, col.boot, col.boot, j.rot, true);

    // The body
    const flare = rad(pose.coat ?? 0);
    const hemLen = L.coatLen * (1 - tuck * 0.6);
    const sw = L.shoulderW;
    const cw = L.chest ?? 0;
    const hemBack = R([pelvis[0] - Math.sin(flare) * hemLen - L.coatFlare - 1.5, pelvis[1] + Math.cos(flare) * hemLen]);
    const hemMid = R([pelvis[0] - Math.sin(flare) * hemLen * 0.6 + 0.5, pelvis[1] + Math.cos(flare * 0.6) * hemLen + 0.5]);
    const hemFront = R([pelvis[0] + 2.5 - Math.sin(flare * 0.3) * 2, pelvis[1] + hemLen * 0.75]);
    const bodyPts: Pt[] = [
        at(neck, 0.5, 1.5),
        at(neck, -1.5, sw - 0.5 + cw),
        at(neck, -4, sw + cw * 0.8),
        at(pelvis, 2, 2.5 + cw * 0.4),
        hemFront,
        hemMid,
        hemBack,
        at(pelvis, 1, -3),
        at(neck, -2, -sw + 0.5),
        at(neck, 1, -1.5),
    ];
    poly(b, bodyPts, col.coat);
    // Back third in shadow, front edge lit
    poly(b, [at(neck, -2, -sw + 0.5), at(neck, -1, -1), at(pelvis, 1, -1), hemMid, hemBack, at(pelvis, 1, -3)], col.coatLo);
    limb(b, ...at(neck, -1.5, sw - 0.5 + cw), ...at(pelvis, 2.5, 2.5 + cw * 0.4), 1, 1, col.coatHi);

    // Outfit details
    const line = (a: Pt, e: Pt, color: number) => limb(b, a[0], a[1], e[0], e[1], 1, 1, color);
    switch (L.outfit) {
        case "coat":
            // Lapel, buttons and a cinched belt
            line(at(neck, -0.5, 1), at(neck, -4.5, 2.5), col.coatHi);
            px(b, ...at(neck, -5.5, 2), col.coatLo);
            px(b, ...at(neck, -7.5, 2), col.coatLo);
            if (C.belt) line(at(pelvis, 1.5, -2.5), at(pelvis, 1.5, 2.8), rgba(C.belt));
            break;
        case "suit":
            if (C.shirt) line(at(neck, -0.5, 1.5), at(neck, -3.5, 2.2), rgba(C.shirt));
            if (C.tie) line(at(neck, -1.2, 2.2), at(neck, -5.5, 2.2), rgba(C.tie));
            line(at(neck, -1, 0.5), at(neck, -4.5, 1.5), col.coatHi);
            break;
        case "tee":
            // A printed band across the chest
            line(at(neck, -3, -sw + 1), at(neck, -3, sw + cw - 0.5), col.trim);
            line(at(neck, -3.8, -sw + 1.2), at(neck, -3.8, sw + cw - 0.8), col.trim);
            break;
        case "vest":
            // Straps and chest pockets
            line(at(neck, 0, 0.5), at(pelvis, 2, 1), col.trim);
            poly(b, [at(neck, -3, 0.5), at(neck, -3, 2.5), at(neck, -5, 2.5), at(neck, -5, 0.5)], col.coatLo);
            px(b, ...at(neck, -3, 1.5), col.coatHi);
            if (C.belt) line(at(pelvis, 1.5, -2.5), at(pelvis, 1.5, 2.8), rgba(C.belt));
            break;
        case "armor":
            // Plates
            line(at(neck, -2.5, -sw + 1), at(neck, -2.5, sw + cw - 0.5), col.trim);
            line(at(neck, -5.5, -sw + 1.5), at(neck, -5.5, sw + cw - 1), col.trim);
            line(at(pelvis, 2, -2), at(pelvis, 2, 2.5), col.trim);
            break;
        case "hoodie":
            // Drawstrings and a kangaroo pocket
            px(b, ...at(neck, -1.5, 1.5), col.trim);
            px(b, ...at(neck, -2.5, 1.5), col.trim);
            px(b, ...at(neck, -1.5, 0.3), col.trim);
            px(b, ...at(neck, -2.5, 0.3), col.trim);
            poly(b, [at(pelvis, 3.5, -1), at(pelvis, 3.5, 2.5), at(pelvis, 1, 2.8), at(pelvis, 1, -1.3)], col.coatLo);
            line(at(pelvis, 3.5, -1), at(pelvis, 3.5, 2.5), col.coatHi);
            break;
    }

    // Front leg
    leg(b, L, j.fHip, j.fKnee, j.fAnkle, col.pants, col.pantsLo, col.boot, col.bootHi, j.rot, false);

    // Back shoulder pad
    if (L.pads) circle(b, j.shoulder[0] - 1, j.shoulder[1], 2, col.coatLo);

    // Weapon behind the hand, then the front arm
    const wAngle = pose.weapon !== undefined ? pose.weapon + (pose.rot ?? 0) : null;
    if (look.weapon === "shield") drawShield(b, j);
    if (look.weapon !== "shield" && look.weapon !== "fists" && look.weapon !== "none") drawWeapon(b, look.weapon, j.fHand, j.fElbow, wAngle);
    arm(b, L, j.shoulder, j.fElbow, j.fHand, col.sleeve, col.sleeveLo, col.glove, col.sleeveHi);
    if (L.pads) {
        circle(b, j.shoulder[0] + 0.5, j.shoulder[1] - 0.5, 2, col.coat);
        px(b, j.shoulder[0] - 0.5, j.shoulder[1] - 2, col.coatHi);
        px(b, j.shoulder[0] + 0.5, j.shoulder[1] - 2, col.coatHi);
    }

    rim(b, -1, -1, rgba(C.rim), [rgba(C.glove), rgba(C.boot), rgba("#ece8ff"), rgba("#54e3ff")]);

    // Head: follows the neck, and turns in quarter steps when the body spins
    const q = (((Math.round((pose.rot ?? 0) / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
    if (q === 0) {
        const hx = Math.round(j.neck[0] + look.headOffset[0] + (pose.head ?? 0));
        const hy = Math.round(j.neck[1] + look.headOffset[1] + (pose.headY ?? 0));
        grid(b, look.head, hx, hy, look.headColors);
    } else {
        const rows = rotateGrid(look.head, q);
        const gw = rows[0].length;
        const gh = rows.length;
        const r = rad(pose.rot ?? 0);
        const hcx = j.neck[0] + Math.sin(r) * 4;
        const hcy = j.neck[1] - Math.cos(r) * 4;
        grid(b, rows, Math.round(hcx - gw / 2), Math.round(hcy - gh / 2), look.headColors);
    }

    outline(b, rgba(C.outline));
    return b;
};

export type Joints = ReturnType<typeof joints>;

// Turn a hand-drawn grid by quarter turns (clockwise)
const rotateGrid = (rows: readonly string[], q: 1 | 2 | 3): string[] => {
    const w = Math.max(...rows.map((r) => r.length));
    const pad = rows.map((r) => r.padEnd(w, "."));
    let out = pad;
    for (let k = 0; k < q; k++) {
        const h = out.length;
        const ww = out[0].length;
        const next: string[] = [];
        for (let x = 0; x < ww; x++) {
            let row = "";
            for (let y = h - 1; y >= 0; y--) row += out[y][x];
            next.push(row);
        }
        out = next;
    }
    return out;
};

const rotate = (p: Pt, c: Pt, deg: number): Pt => {
    if (!deg) return p;
    const a = rad(deg);
    const s = Math.sin(a);
    const co = Math.cos(a);
    const dx = p[0] - c[0];
    const dy = p[1] - c[1];
    return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co];
};

export const joints = (look: Look, pose: Pose) => {
    const tuck = pose.tuck ?? 0;
    const legLen = look.thigh + look.shin;
    const lean = pose.lean ?? 0;
    const pelvisRaw: Pt = [ORIGIN_X + (pose.x ?? 0), ORIGIN_Y - legLen - 1 + (pose.y ?? 0)];
    const neckRaw: Pt = [pelvisRaw[0] + Math.sin(rad(lean)) * look.torso, pelvisRaw[1] - Math.cos(rad(lean)) * look.torso];
    const center: Pt = [pelvisRaw[0], pelvisRaw[1] - 4];
    const rot = pose.rot ?? 0;
    const R = (p: Pt) => rotate(p, center, rot);
    const shoulderRaw: Pt = [neckRaw[0] - Math.cos(rad(lean)) * 0.5, neckRaw[1] + 1.5];
    const legPts = (hip: Pt, a: [number, number]) => {
        const thigh = look.thigh * (1 - tuck * 0.35);
        const shin = look.shin * (1 - tuck * 0.35);
        const [dx1, dy1] = dir(a[0]);
        const knee: Pt = [hip[0] + dx1 * thigh, hip[1] + dy1 * thigh];
        const [dx2, dy2] = dir(a[0] - a[1]);
        const ankle: Pt = [knee[0] + dx2 * shin, knee[1] + dy2 * shin];
        return [knee, ankle];
    };
    const armPts = (a: [number, number]) => {
        const [dx1, dy1] = dir(a[0]);
        const elbow: Pt = [shoulderRaw[0] + dx1 * look.upper, shoulderRaw[1] + dy1 * look.upper];
        const [dx2, dy2] = dir(a[0] + a[1]);
        const hand: Pt = [elbow[0] + dx2 * look.fore, elbow[1] + dy2 * look.fore];
        return [elbow, hand];
    };
    const fHipRaw: Pt = [pelvisRaw[0] + 0.5, pelvisRaw[1]];
    const bHipRaw: Pt = [pelvisRaw[0] - 0.5, pelvisRaw[1]];
    const [fKnee, fAnkle] = legPts(fHipRaw, pose.fl ?? [0, 0]);
    const [bKnee, bAnkle] = legPts(bHipRaw, pose.bl ?? [0, 0]);
    const [fElbow, fHand] = armPts(pose.fa ?? [0, 0]);
    const [bElbow, bHand] = armPts(pose.ba ?? [0, 0]);
    return {
        lean: lean + rot,
        rot,
        center,
        pelvisRaw,
        neckRaw,
        pelvis: R(pelvisRaw),
        neck: R(neckRaw),
        shoulder: R(shoulderRaw),
        fHip: R(fHipRaw),
        bHip: R(bHipRaw),
        fKnee: R(fKnee),
        fAnkle: R(fAnkle),
        bKnee: R(bKnee),
        bAnkle: R(bAnkle),
        fElbow: R(fElbow),
        fHand: R(fHand),
        bElbow: R(bElbow),
        bHand: R(bHand),
    };
};

const leg = (b: Buf, look: Look, hip: Pt, knee: Pt, ankle: Pt, c: number, lo: number, boot: number, bootHi: number, rotDeg: number, back: boolean) => {
    shaded(b, hip, knee, look.legW, look.legW - 0.5, c, lo);
    shaded(b, knee, ankle, look.legW - 0.5, look.legW - 1, c, lo);
    // Boot: a heel and a toe along the facing direction, sole in shadow
    const a = rad(rotDeg);
    const tx = Math.cos(a);
    const ty = Math.sin(a);
    const toe = look.big ? 3.5 : 2.8;
    limb(b, ankle[0] - tx * 0.8, ankle[1] - ty * 0.8, ankle[0] + tx * toe, ankle[1] + ty * toe, look.big ? 3 : 2, 2, boot);
    if (!back) px(b, ankle[0] + tx * 1 - ty * 0.5, ankle[1] + ty * 1 - tx * 0.5 - 0.5, bootHi);
};

const arm = (b: Buf, look: Look, shoulder: Pt, elbow: Pt, hand: Pt, c: number, lo: number, glove: number, hi?: number) => {
    shaded(b, shoulder, elbow, look.armW + 0.5, look.armW, c, lo, hi);
    shaded(b, elbow, hand, look.armW, look.armW - 0.5, c, lo);
    // Gloved hand (a fist for the big ones)
    circle(b, hand[0], hand[1], look.big ? 1.5 : look.armW > 2 ? 1 : 0.6, glove);
};

const drawWeapon = (b: Buf, kind: Weapon, hand: Pt, elbow: Pt, angle: number | null) => {
    const a = angle !== null ? rad(angle) : Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) + (kind === "blade" ? Math.PI / 2 : 0);
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    const L = (d0: number, d1: number, w: number, color: string, off = 0) =>
        limb(b, hand[0] + cx * d0 - cy * off, hand[1] + cy * d0 + cx * off, hand[0] + cx * d1 - cy * off, hand[1] + cy * d1 + cx * off, w, w, rgba(color));
    if (kind === "blade") {
        // The letter opener: wrapped hilt, a guard, and a bright blade with an edge
        L(-2.5, 0.5, 1, "#3b3160");
        L(1, 1, 2, "#8c9eff");
        L(2, 12.5, 1, "#ece8ff");
        L(3, 11, 1, "#a9b6ff", 0.8);
    } else if (kind === "pistol") {
        L(0, 5, 2, "#2f2b3f");
        L(1, 4.5, 1, "#7d77a0", -0.6);
        L(-0.2, -0.2, 2, "#2f2b3f", 1.6);
    } else if (kind === "shotgun") {
        L(-5, 10, 2, "#26222f");
        L(2, 10, 1, "#77719a", -0.7);
        L(-5, -2, 3, "#6a4630");
        L(3, 5, 2, "#4a3a2a", 1);
    } else if (kind === "guitar") {
        // Neck along the arm, headstock, and the body at the hip
        L(-3, 10, 1, "#3a2c20");
        L(10, 12, 2, "#ece8ff");
        circle(b, hand[0] - cx * 6, hand[1] - cy * 6 + 1, 3, rgba("#ff3d7f"));
        circle(b, hand[0] - cx * 6 - 1, hand[1] - cy * 6 + 2, 2, rgba("#c42a62"));
        circle(b, hand[0] - cx * 6, hand[1] - cy * 6 + 1, 0.6, rgba("#1d1838"));
        L(-8, -4, 1, "#ece8ff", 0.5);
    }
};

// A tall riot shield with a viewing slit, held out front
const drawShield = (b: Buf, j: Joints) => {
    const x = Math.round(j.fHand[0] + 1);
    const top = Math.round(j.neck[1] - 6);
    const bot = Math.round(j.pelvis[1] + 10);
    for (let y = top; y <= bot; y++) {
        for (let i = 0; i < 5; i++) {
            const edge = i === 4 || y === top || y === bot;
            const glare = (y - top + i * 2) % 9 === 0;
            const cc = edge ? "#d6ddff" : glare ? "#c3ccff" : i === 0 ? "#3e4a8a" : "#5566b8";
            px(b, x + i, y, rgba(cc));
        }
    }
    for (let i = 0; i < 4; i++) px(b, x + i, top + 4, rgba("#1d1838"));
    for (let y = top + 8; y < bot - 3; y += 6) px(b, x + 2, y, rgba("#ece8ff"));
};
