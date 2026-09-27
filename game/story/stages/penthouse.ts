// R · Penthouse: the hand-drawn room from the main site, at night. DogeKing.
import type { Script } from "@/game/story/types";
import type { StageDef } from "@/game/world/stage";

const MEET: Script = [
    { who: "doge", text: "So. You're the headhunter." },
    { who: "doge", text: "Seven floors. Most recruiters stop at the lobby.", interrupt: { label: "Can we skip the fight?", goto: "skip" } },
    { who: "doge", text: "Let's see if you're worth my email.", end: true },
    { id: "skip", who: "doge", text: "No. But that was a very recruiter thing to say. En garde.", end: true },
];

export const UNMASK: Script = [
    { who: "doge", text: "Okay. Okay! You win." },
    { who: "system", text: "The mask comes off.", action: "unmask" },
    {
        who: "doge",
        portrait: "minh",
        text: "Minh Pham. Nice to meet you. You're not here to take me out, are you?",
        choices: [
            { label: "I'm here to hire you.", goto: "hire" },
            { label: "Why the tower?", goto: "why" },
            { label: "Just give me your email.", goto: "contact" },
        ],
    },
    { id: "why", who: "doge", portrait: "minh", text: "A portfolio should be fun to visit. The quiet version is downstairs, if you'd rather read.", goto: "hire2" },
    { id: "hire", who: "doge", portrait: "minh", text: "Ha. I figured. Your file said headhunter.", goto: "hire2" },
    { id: "hire2", who: "doge", portrait: "minh", text: "Here's how to reach me. Email's fastest." , goto: "contact" },
    { id: "contact", who: "doge", portrait: "minh", text: "Thanks for climbing all the way up. Seriously.", end: true },
];

export const LAIR: StageDef = {
    id: "R-1",
    title: "The room",
    theme: "penthouse",
    time: 150,
    boss: true,
    talk: [{ x: 1, script: MEET }],
    map: [
        "########################################",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#.........=====........................#",
        "#.......................=====..........#",
        "#......................................#",
        "#..%%%%%.....................%%%.......#",
        "#..%%%%%.%...................%%%.......#",
        "#@.%%%%%.%......%%%%%%%......%%%...k...#",
        "########################################",
        "########################################",
        "########################################",
    ],
    props: [
        { kind: "window", x: 2, y: 10, w: 8, h: 6 },
        { kind: "window", x: 24, y: 8, w: 13, h: 5 },
        { kind: "lamp", x: 19, y: 1, h: 2, w: 5, text: "#ffcf6b" },
        { kind: "neon", x: 14.5, y: 3, text: "PENTHOUSE", flip: true },
        // The room from the old site, now furniture you can fight on
        { kind: "rug", x: 14, y: 14, w: 10 },
        { kind: "cabinet", x: 3, y: 14, w: 5, h: 3 },
        { kind: "speaker", x: 9, y: 14, w: 1, h: 2 },
        { kind: "wallphone", x: 11.5, y: 7.4 },
        { kind: "cushion", x: 14.6, y: 14, w: 1.2 },
        { kind: "lowtable", x: 16, y: 14, w: 7, h: 1 },
        { kind: "cushion", x: 23.1, y: 14, w: 1.2 },
        { kind: "ball", x: 27.4, y: 14 },
        { kind: "ampstack", x: 29, y: 14, w: 3, h: 3 },
        { kind: "guitar", x: 33.5, y: 14 },
    ],
};
