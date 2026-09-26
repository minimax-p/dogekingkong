// One step of player input. The simulation only ever sees these, so a list of
// them (a "tape") is enough to replay a stage exactly.

export type Input = {
    mx: number; // -1, 0 or 1
    up: boolean;
    down: boolean;
    downPressed: boolean;
    jump: boolean; // pressed this step
    jumpHeld: boolean;
    attack: boolean; // pressed this step
    throw: boolean; // pressed this step
    focus: boolean; // held
    ax: number; // aim, as an offset from the Headhunter's chest in world pixels
    ay: number;
};

export const emptyInput = (): Input => ({
    mx: 0,
    up: false,
    down: false,
    downPressed: false,
    jump: false,
    jumpHeld: false,
    attack: false,
    throw: false,
    focus: false,
    ax: 40,
    ay: 0,
});
