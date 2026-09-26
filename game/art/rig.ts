// Pixel skeletons. A pose is a handful of joint angles; drawing it lays down
// thick pixel limbs, a coat or jacket polygon and a hand-drawn head, then an
// outline. Every animation frame is a pose, baked once at load.
import { circle, grid, limb, makeBuf, outline, poly, rgba, rim, type Buf } from "@/game/art/pixels";

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
    colors: {
        coat: string;
        coatHi: string;
        coatLo: string;
        pants: string;
        pantsLo: string;
        boot: string;
        glove: string;
        skin?: string;
        shirt?: string;
        tie?: string;
        belt?: string;
        outline: string;
        rim: string;
        scarf?: string;
    };
    head: readonly string[];
    headColors: Record<string, string>;
    headOffset: [number, number]; // from the neck to the grid's top-left, facing right
    weapon: Weapon;
};

export const CELL = 56;
export const ORIGIN_X = 28;
export const ORIGIN_Y = 50;

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (deg: number): [number, number] => [Math.sin(rad(deg)), Math.cos(rad(deg))];

type Pt = [number, number];

export const drawPose = (look: Look, pose: Pose, extra?: (b: Buf, j: Joints) => void): Buf => {
    const b = makeBuf(CELL, CELL);
    const j = joints(look, pose);
    const C = look.colors;
    const col = {
        coat: rgba(C.coat),
        coatHi: rgba(C.coatHi),
        coatLo: rgba(C.coatLo),
        pants: rgba(C.pants),
        pantsLo: rgba(C.pantsLo),
        boot: rgba(C.boot),
        glove: rgba(C.glove),
    };
    const tuck = pose.tuck ?? 0;

    // Back arm, back leg
    arm(b, look, j.shoulder, j.bElbow, j.bHand, col.coatLo, col.glove);
    leg(b, look, j.bHip, j.bKnee, j.bAnkle, col.pantsLo, col.boot, j.rot);

    // Coat / jacket
    const L = look;
    const up: Pt = [Math.sin(rad(j.lean)), -Math.cos(rad(j.lean))];
    const fw: Pt = [Math.cos(rad(j.lean)), Math.sin(rad(j.lean))];
    const R = (p: Pt): Pt => rotate(p, j.center, j.rot);
    const at = (base: Pt, u: number, f: number): Pt => [base[0] + up[0] * u + fw[0] * f, base[1] + up[1] * u + fw[1] * f];
    const pelvis = j.pelvisRaw;
    const neck = j.neckRaw;
    const flare = rad(pose.coat ?? 0);
    const hemLen = L.coatLen * (1 - tuck * 0.6);
    const hemBack: Pt = [pelvis[0] - Math.sin(flare) * hemLen - L.coatFlare - 1, pelvis[1] + Math.cos(flare) * hemLen];
    const hemMid: Pt = [pelvis[0] - Math.sin(flare) * hemLen * 0.6 + 1, pelvis[1] + Math.cos(flare * 0.6) * hemLen];
    const hemFront: Pt = [pelvis[0] + 2 - Math.sin(flare * 0.3) * 2, pelvis[1] + hemLen * 0.7];
    const coatPts: Pt[] = [
        at(neck, 0.5, 1.5),
        at(neck, -2, L.shoulderW - 1),
        at(pelvis, 2, 2.5),
        hemFront,
        hemMid,
        hemBack,
        at(pelvis, 1, -3),
        at(neck, -1, -L.shoulderW + 0.5),
        at(neck, 1, -1),
    ];
    poly(b, coatPts.map(R), col.coat);
    // Shading: a darker back panel and a light front edge
    poly(b, [at(neck, -1, -L.shoulderW + 0.5), at(pelvis, 1, -3), hemBack, hemMid, at(pelvis, 1, -1)].map(R), col.coatLo);
    limb(b, ...R(at(neck, -1, L.shoulderW - 1)), ...R(at(pelvis, 1, 2.5)), 1, 1, col.coatHi);
    if (C.belt) limb(b, ...R(at(pelvis, 2, -2.5)), ...R(at(pelvis, 2, 2.5)), 1, 1, rgba(C.belt));
    if (C.shirt) {
        limb(b, ...R(at(neck, -0.5, 1.5)), ...R(at(neck, -3.5, 2)), 1, 1, rgba(C.shirt));
        if (C.tie) limb(b, ...R(at(neck, -1.5, 2)), ...R(at(neck, -5, 2)), 1, 1, rgba(C.tie));
    }

    // Front leg
    leg(b, look, j.fHip, j.fKnee, j.fAnkle, col.pants, col.boot, j.rot);

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

    // Weapon behind the hand, then the front arm
    const wAngle = pose.weapon !== undefined ? pose.weapon + (pose.rot ?? 0) : null;
    if (look.weapon === "shield") drawShield(b, j, look);
    if (look.weapon !== "shield" && look.weapon !== "fists" && look.weapon !== "none") drawWeapon(b, look.weapon, j.fHand, j.fElbow, wAngle);
    arm(b, look, j.shoulder, j.fElbow, j.fHand, col.coat, col.glove, col.coatHi);
    if (look.weapon === "fists") circle(b, j.fHand[0], j.fHand[1], 1, col.glove);

    extra?.(b, j);
    rim(b, -1, -1, rgba(C.rim), [rgba(C.glove)]);
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
    const shoulderRaw: Pt = [neckRaw[0], neckRaw[1] + 1.5];
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

const leg = (b: Buf, look: Look, hip: Pt, knee: Pt, ankle: Pt, c: number, boot: number, rotDeg: number) => {
    limb(b, hip[0], hip[1], knee[0], knee[1], look.legW, look.legW - 0.5, c);
    limb(b, knee[0], knee[1], ankle[0], ankle[1], look.legW - 0.5, look.legW - 1, c);
    // Boot: a short block pointing along the facing direction
    const a = rad(rotDeg);
    const tx = Math.cos(a);
    const ty = Math.sin(a);
    limb(b, ankle[0] - tx * 0.5, ankle[1] - ty * 0.5, ankle[0] + tx * 2.5, ankle[1] + ty * 2.5, 2, 2, boot);
};

const arm = (b: Buf, look: Look, shoulder: Pt, elbow: Pt, hand: Pt, c: number, glove: number, hi?: number) => {
    limb(b, shoulder[0], shoulder[1], elbow[0], elbow[1], look.armW + 0.5, look.armW, c);
    limb(b, elbow[0], elbow[1], hand[0], hand[1], look.armW, look.armW - 0.5, c);
    if (hi !== undefined) limb(b, shoulder[0], shoulder[1] - 1, shoulder[0], shoulder[1] - 1, 1, 1, hi);
    circle(b, hand[0], hand[1], look.armW > 2 ? 1 : 0, glove);
};

const drawWeapon = (b: Buf, kind: Weapon, hand: Pt, elbow: Pt, angle: number | null) => {
    const a = angle !== null ? rad(angle) : Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) + (kind === "blade" ? Math.PI / 2 : 0);
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    if (kind === "blade") {
        // The letter opener: a short hilt and a bright blade
        limb(b, hand[0] - cx * 2, hand[1] - cy * 2, hand[0] + cx * 1, hand[1] + cy * 1, 1, 1, rgba("#3b3160"));
        limb(b, hand[0] + cx * 2, hand[1] + cy * 2, hand[0] + cx * 12, hand[1] + cy * 12, 1, 1, rgba("#ece8ff"));
        limb(b, hand[0] + cx * 1, hand[1] + cy * 1 - 0, hand[0] + cx * 1, hand[1] + cy * 1, 2, 2, rgba("#8c9eff"));
    } else if (kind === "pistol") {
        limb(b, hand[0], hand[1], hand[0] + cx * 5, hand[1] + cy * 5, 2, 2, rgba("#3a3548"));
        limb(b, hand[0] + cx * 1 - cy * 0.5, hand[1] + cy * 1 + cx * 0.5, hand[0] + cx * 4, hand[1] + cy * 4, 1, 1, rgba("#6d6689"));
        limb(b, hand[0] - cy * 1.5, hand[1] + cx * 1.5, hand[0] - cy * 1.5, hand[1] + cx * 1.5, 1, 1, rgba("#3a3548"));
    } else if (kind === "shotgun") {
        limb(b, hand[0] - cx * 4, hand[1] - cy * 4, hand[0] + cx * 9, hand[1] + cy * 9, 2, 2, rgba("#2e2a3c"));
        limb(b, hand[0] + cx * 2, hand[1] + cy * 2, hand[0] + cx * 9, hand[1] + cy * 9, 1, 1, rgba("#6d6689"));
        limb(b, hand[0] - cx * 4, hand[1] - cy * 4, hand[0] - cx * 2, hand[1] - cy * 2, 3, 3, rgba("#5a3a2a"));
    } else if (kind === "guitar") {
        // Neck along the arm, body at the hip
        limb(b, hand[0] - cx * 3, hand[1] - cy * 3, hand[0] + cx * 9, hand[1] + cy * 9, 1, 1, rgba("#2a2438"));
        circle(b, hand[0] - cx * 6, hand[1] - cy * 6 + 1, 3, rgba("#ff3d7f"));
        circle(b, hand[0] - cx * 6, hand[1] - cy * 6 + 1, 1, rgba("#1d1838"));
    }
};

const drawShield = (b: Buf, j: Joints, look: Look) => {
    void look;
    const x = Math.round(j.fHand[0] + 2);
    const top = Math.round(j.neck[1] - 4);
    const bot = Math.round(j.pelvis[1] + 9);
    for (let y = top; y <= bot; y++) {
        for (let i = 0; i < 4; i++) {
            const edge = i === 3 || y === top || y === bot;
            const c = edge ? rgba("#c9d2ff") : (y + i) % 5 === 0 ? rgba("#b3bfff") : rgba("#6272c9");
            b.d[y * CELL + x + i] = c;
        }
    }
    // A thin window slit
    for (let i = 0; i < 3; i++) b.d[(top + 4) * CELL + x + i] = rgba("#1d1838");
};
