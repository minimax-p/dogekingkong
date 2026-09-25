// The world is plain data (no classes), so it can be cloned for rewinds and
// compared in tests. Behavior lives in functions that take the world.
import type { Rng } from "@/game/engine/rng";
import type { Stage } from "@/game/world/stage";

export type Face = 1 | -1;

export type Body = {
    x: number; // center
    y: number; // feet
    vx: number;
    vy: number;
    w: number;
    h: number;
    ground: boolean;
};

export type ItemKind = "mug" | "duck" | "keyboard" | "dumbbell" | "boba" | "scanner" | "bottle";

export type PlayerState = "move" | "roll" | "attack" | "kick" | "dead" | "cutscene";

export type Point = { x: number; y: number; px: number; py: number };

export type Ghost = { x: number; y: number; anim: string; frame: number; face: Face; life: number };

export type Player = Body & {
    face: Face;
    state: PlayerState;
    t: number; // frames in the current state (player time)
    coyote: number;
    jumpBuf: number;
    atkBuf: number;
    throwBuf: number;
    jumpCut: boolean;
    wall: -1 | 0 | 1; // wall touched while airborne
    wallSlide: boolean;
    wallLock: number;
    flipT: number;
    atkCd: number;
    airAtk: number;
    aim: number; // radians, 0 = right, positive = down
    atkHits: number[];
    crouch: boolean;
    dropT: number;
    rollCd: number;
    held: ItemKind | null;
    throwT: number;
    landT: number;
    anim: string;
    animT: number;
    stepT: number;
    scarf: Point[];
    ghosts: Ghost[];
    ghostT: number;
    killedBy: string;
};

export type EnemyKind = "bouncer" | "guard" | "enforcer" | "firewall" | "bug" | "drone" | "launcher" | "sentry" | "boss";

export type EnemyState =
    | "idle"
    | "patrol"
    | "alert"
    | "chase"
    | "aim"
    | "fire"
    | "windup"
    | "strike"
    | "recover"
    | "stun"
    | "block"
    | "leap"
    | "dead";

export type Enemy = Body & {
    id: number;
    kind: EnemyKind;
    face: Face;
    state: EnemyState;
    t: number;
    aware: boolean; // has seen or heard the Headhunter
    hearT: number; // frames until a heard noise turns into awareness
    aim: number;
    cd: number;
    lostT: number; // frames without line of sight
    patrol: [number, number] | null;
    pauseT: number;
    anim: string;
    animT: number;
    flash: number;
    spin: number;
    rot: number;
    counts: boolean; // must die for the stage to clear
    hp: number;
    phase: number;
    data: Record<string, number>;
    wire: number; // laser tripwire that wakes a sentry (-1 for none)
};

export type BulletKind = "bullet" | "pellet" | "shuttle" | "note" | "bracket";

export type Bullet = {
    id: number;
    kind: BulletKind;
    x: number;
    y: number;
    px: number;
    py: number;
    vx: number;
    vy: number;
    grav: number;
    owner: "enemy" | "player";
    life: number;
    from: number; // enemy id that fired it (so it can't hit itself on the way out)
};

export type Item = {
    id: number;
    kind: ItemKind;
    x: number;
    y: number;
    vx: number;
    vy: number;
    state: "ground" | "thrown";
    rot: number;
};

export type Door = {
    id: number;
    tx: number; // tile column
    ty: number; // top tile row
    h: number; // height in tiles
    open: boolean;
    dir: Face; // which way it swung
    t: number;
};

export type Laser = {
    id: number;
    kind: "gate" | "wire";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    period: number; // frames per cycle (gates)
    onFor: number; // frames the gate is on in each cycle
    offset: number;
    on: boolean;
    warn: boolean;
    tripped: number; // frames since tripped (wires), -1 if never
    disabled: boolean;
};

export type ParticleKind = "oil" | "spark" | "dust" | "shell" | "splinter" | "shard" | "smoke" | "ember";

export type Particle = {
    kind: ParticleKind;
    x: number;
    y: number;
    vx: number;
    vy: number;
    g: number;
    life: number;
    max: number;
    c: number; // palette index into the kind's colors
    stick: boolean; // becomes a decal where it lands
};

export type Decal = { x: number; y: number; kind: "oil" | "splat" | "scorch" | "crack"; v: number; r: number };

export type FxKind = "slash" | "muzzle" | "clang" | "ring" | "flash" | "deflect";

export type Fx = { kind: FxKind; x: number; y: number; a: number; t: number; max: number; follow: boolean };

export type EventType =
    | "slash"
    | "kill"
    | "deflect"
    | "shot"
    | "shotgun"
    | "jump"
    | "walljump"
    | "land"
    | "roll"
    | "step"
    | "door"
    | "throw"
    | "pickup"
    | "break"
    | "alert"
    | "focusOn"
    | "focusOff"
    | "focusEmpty"
    | "death"
    | "clear"
    | "clang"
    | "punch"
    | "laser"
    | "sentry"
    | "bugHatch"
    | "ricochet"
    | "win";

export type GameEvent = { type: EventType; x: number; y: number; v?: number };

export type World = {
    stage: Stage; // static data, shared by clones
    seed: number;
    rng: Rng;
    fxRng: Rng;
    step: number;
    nextId: number;
    player: Player;
    enemies: Enemy[];
    bullets: Bullet[];
    items: Item[];
    doors: Door[];
    lasers: Laser[];
    particles: Particle[];
    decals: Decal[];
    fx: Fx[];
    focus: number; // 0..1, eased
    focusHeld: boolean;
    battery: number;
    batteryIdle: number;
    scale: number; // world time scale this step
    pscale: number; // the Headhunter's time scale this step
    hitstop: number;
    time: number; // game seconds elapsed
    timeLimit: number;
    cam: { x: number; y: number; shake: number; sx: number; sy: number; kick: number; ka: number };
    cleared: boolean;
    won: boolean;
    dead: boolean;
    deadT: number;
    deathCause: string;
    events: GameEvent[];
    flash: number;
    ca: number; // extra chromatic aberration from impacts
    kills: number;
    deflects: number;
    flags: Record<string, number>;
    invincible: boolean;
};
