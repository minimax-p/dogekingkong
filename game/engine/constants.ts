// Screen and simulation constants. Everything in the game is measured in
// low-res pixels (480×270) and simulation steps (60 per second of game time).

export const W = 480;
export const H = 270;
export const TILE = 16;
export const STEP_MS = 1000 / 60;

// Slow motion ("Focus"): the world drops to 0.2×, the Headhunter to 0.45×.
export const FOCUS_WORLD = 0.2;
export const FOCUS_PLAYER = 0.45;
export const FOCUS_IN_STEPS = 6; // real steps to reach full slow motion
export const FOCUS_OUT_STEPS = 8;
export const BATTERY_CELLS = 11;
export const BATTERY_DRAIN = BATTERY_CELLS / 360; // full battery lasts 6 real seconds
export const BATTERY_FILL = BATTERY_CELLS / 360; // and refills in 6
export const BATTERY_FILL_DELAY = 30; // real steps before refilling starts

// Hit-stop, in real steps
export const STOP_KILL = 5;
export const STOP_DEFLECT = 4;
export const STOP_DOOR = 3;
export const STOP_DEATH = 14;
