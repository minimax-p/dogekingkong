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
    talk: [{ x: 4, script: MEET }],
    map: [
        "########################################",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......................................#",
        "#......=======............=======......#",
        "#......................................#",
        "#...@.........................k........#",
        "########################################",
        "########################################",
        "########################################",
    ],
    props: [
        { kind: "window", x: 2, y: 9, w: 9, h: 6 },
        { kind: "window", x: 29, y: 9, w: 9, h: 6 },
        { kind: "lamp", x: 20, y: 1, h: 2, w: 5, text: "#ffcf6b" },
        { kind: "neon", x: 14.5, y: 3, text: "PENTHOUSE", flip: true },
        // The room from the main site: record cabinet, low table, amp corner, wall phone
        { kind: "furniture", x: 1.5, y: 14, w: 7.5, text: "projects" },
        { kind: "furniture", x: 15, y: 14, w: 10.5, text: "work" },
        { kind: "furniture", x: 30, y: 14, w: 7.5, text: "about" },
        { kind: "furniture", x: 11, y: 12, w: 1.2, text: "contact" },
    ],
};
