import type { StageDef } from "@/game/world/stage";

export type Speaker = "client" | "doge" | "headhunter" | "chatbot" | "crew" | "barista" | "sign" | "system";

// One line of dialogue. `interrupt` is a red option you can pick while the
// line is still being typed; `choices` appear once it's done.
export type Line = {
    id?: string;
    who: Speaker;
    text: string;
    interrupt?: { label: string; goto?: string; action?: string };
    choices?: { label: string; goto?: string; action?: string }[];
    goto?: string; // jump after this line
    action?: string; // fire after this line (e.g. "music", "email")
    end?: boolean;
    portrait?: "minh"; // show his photo in the dialogue box
};

export type Script = Line[];

export type FloorDef = {
    id: string; // "G", "1"…"6", "R"
    num: string; // "04"
    name: string; // "04:00 AM"
    vi: string; // "TẦNG 04"
    sub: string; // role · org · dates
    stages: StageDef[];
    intro?: Script; // before the first stage
    ride?: Script; // in the elevator, after the last stage
    outro?: Script; // after the last stage, where there's no elevator (the penthouse)
    dossier: string; // dossier entry unlocked here
    music: number; // synth track index
    clock?: string; // on-screen time for the tape
};
