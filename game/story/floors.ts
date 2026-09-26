// The tower, bottom to top. Each floor's role, company and dates come from
// lib/content.ts, so they stay in step with the main site.
import { ABOUT, PROFILE, WORK, type WorkEntry } from "@/lib/content";
import { TEST_STAGE } from "@/game/story/stages/test";
import { RECEPTION, SECURITY } from "@/game/story/stages/lobby";
import { SENSOR_LAB, VAULT } from "@/game/story/stages/seismic";
import { LAUNCH, STANDUP } from "@/game/story/stages/command";
import { LEGACY, TURNSTILES } from "@/game/story/stages/boxoffice";
import { CLOSET, SUITE } from "@/game/story/stages/suite";
import { CONTEXT, RACKS } from "@/game/story/stages/localhost";
import { COURT, STAGE } from "@/game/story/stages/afterhours";
import { LAIR, UNMASK } from "@/game/story/stages/penthouse";
import type { FloorDef } from "@/game/story/types";

const job = (org: string, role: string) => WORK.find((w) => w.org.startsWith(org) && w.role.startsWith(role));
const sub = (j: WorkEntry | undefined, fallback: string) => (j ? `${j.role} · ${j.org} · ${j.dates}` : fallback);

export const TEST_FLOOR: FloorDef = {
    id: "T",
    num: "00",
    name: "Test room",
    vi: "TẦNG 00",
    sub: "Tuning the feel",
    stages: [TEST_STAGE],
    dossier: "test",
    music: 0,
};

export const FLOORS: FloorDef[] = [
    {
        id: "G",
        num: "G",
        name: "Lobby",
        vi: "TẦNG TRỆT",
        sub: `${PROFILE.tagline} · ${ABOUT.education.degree}, ${ABOUT.education.school}`,
        stages: [RECEPTION, SECURITY],
        dossier: "lobby",
        music: 0,
        intro: [
            { who: "client", text: "You're in. Ground floor of DogeKing Tower." },
            {
                who: "client",
                text: "One candidate. Codename DogeKing. Real name Minh Pham. Software engineer at a stealth startup.",
                interrupt: { label: "Just send me his résumé.", goto: "resume" },
            },
            { who: "client", text: "Every recruiter who went up those stairs came back empty-handed. You won't.", goto: "ask" },
            { id: "resume", who: "client", text: "It's in your Dossier. Press Esc, any time. But you didn't take this job to read.", goto: "ask" },
            {
                id: "ask",
                who: "client",
                text: "Questions?",
                choices: [
                    { label: "Why all the security?", goto: "sec" },
                    { label: "What's on each floor?", goto: "floors" },
                    { label: "No. Let's go.", goto: "phones" },
                ],
            },
            { id: "sec", who: "client", text: "Robots in suits and Shiba masks. His idea of a joke. One hit and they're scrap. So are you.", goto: "phones" },
            { id: "floors", who: "client", text: "Every floor is a job he's done. NASA, Ticketingbox, Stealth. Grab the files as you go.", goto: "phones" },
            {
                id: "phones",
                who: "client",
                text: "One more thing. Put your headphones on.",
                choices: [
                    { label: "Put them on", action: "music", goto: "go" },
                    { label: "Work in silence", action: "nomusic", goto: "go" },
                ],
            },
            { id: "go", who: "client", text: "Go get him. And if it goes wrong... rewind.", end: true },
        ],
        ride: [
            { who: "doge", text: "Huh. A visitor. Most people just send an email.", interrupt: { label: "Then give me your email.", goto: "email" } },
            { who: "doge", text: "Floor one was my first internship. NASA. Mind the lasers.", end: true },
            { id: "email", who: "doge", text: "Top floor. Come and get it. Floor one first: NASA. Mind the lasers.", end: true },
        ],
    },
    {
        id: "1",
        num: "01",
        name: "Seismic",
        vi: "TẦNG 1",
        sub: sub(job("NASA", "Full-stack"), "NASA · 2022"),
        stages: [SENSOR_LAB, VAULT],
        dossier: "seismic",
        music: 1,
        intro: [{ who: "client", text: "Earthquake research. The floor shakes on its own. The lasers are just rude." }],
        ride: [
            { who: "doge", text: "I locked down their old codebase. Forty-plus SQL calls, all parameterized. You're welcome, NASA." },
            { who: "doge", text: "Next summer they made me team lead. Six people, five weeks. Floor two.", end: true },
        ],
    },
    {
        id: "2",
        num: "02",
        name: "Command",
        vi: "TẦNG 2",
        sub: sub(job("NASA", "Team Lead"), "NASA · 2023"),
        stages: [STANDUP, LAUNCH],
        dossier: "command",
        music: 2,
        intro: [{ who: "client", text: "His old team is still here. Holograms. Walk past their desks. They talk." }],
        ride: [
            { who: "doge", text: "We shipped. Then I went mobile." },
            {
                who: "doge",
                text: "Floor three is Ticketingbox. Their old app gave out, so I rebuilt it from scratch.",
                interrupt: { label: "In how long?", goto: "fast" },
            },
            { who: "doge", text: "The lights are off. Don't trip.", end: true },
            { id: "fast", who: "doge", text: "Five months. The lights are off down there, by the way. Don't trip.", end: true },
        ],
    },
    {
        id: "3",
        num: "03",
        name: "Box Office",
        vi: "TẦNG 3",
        sub: sub(job("Ticketingbox", "Mobile"), "Ticketingbox · 2024–25"),
        stages: [TURNSTILES, LEGACY],
        dossier: "boxoffice",
        music: 3,
        intro: [{ who: "client", text: "Power's out. The turnstiles still work. He made sure they'd validate tickets offline." }],
        ride: [
            { who: "doge", text: "Summer 2025. A stealth startup wanted tests." },
            {
                who: "doge",
                text: "I gave them 87. Eight platforms, eight languages. Every night at four in the morning.",
                interrupt: { label: "Who's awake at 4 a.m.?", goto: "four" },
            },
            { who: "doge", text: "Three of those tests caught bugs nobody else could. You'll meet them.", end: true },
            { id: "four", who: "doge", text: "The tests. That was the point. The report was in everyone's inbox before they woke up.", end: true },
        ],
    },
    {
        id: "4",
        num: "04",
        name: "04:00 AM",
        vi: "TẦNG 4",
        sub: sub(job("Stealth", "Software Engineer Intern"), "Stealth · 2025"),
        stages: [CLOSET, SUITE],
        dossier: "suite",
        music: 4,
        clock: "3:59:40",
        intro: [{ who: "client", text: "It's 3:59 in the morning on this floor. Something happens at four." }],
        ride: [
            { who: "doge", text: "They liked the tests. They hired me." },
            { who: "doge", text: "Floor five runs on its own hardware. No internet. Don't bother calling for backup.", end: true },
        ],
    },
    {
        id: "5",
        num: "05",
        name: "Local Host",
        vi: "TẦNG 5",
        sub: sub(
            WORK.find((w) => w.org === "Stealth" && w.role === "Software Engineer"),
            "Stealth · 2025 – now",
        ),
        stages: [RACKS, CONTEXT],
        dossier: "localhost",
        music: 5,
        intro: [{ who: "client", text: "I just lost your signal. You're on your own. Talk to the terminal." }],
        ride: [
            {
                who: "doge",
                text: "That's the day job. Want to know what I do after hours?",
                choices: [
                    { label: "Not really.", goto: "no" },
                    { label: "Go on.", goto: "yes" },
                ],
            },
            { id: "no", who: "doge", text: "Tough. The elevator only goes up.", end: true },
            { id: "yes", who: "doge", text: "Badminton, band practice, the gym, boba. Not always in that order.", end: true },
        ],
    },
    {
        id: "6",
        num: "06",
        name: "After Hours",
        vi: "TẦNG 6",
        sub: "Lead guitar · clarinet · badminton · the gym · boba",
        stages: [COURT, STAGE],
        dossier: "afterhours",
        music: 6,
        intro: [{ who: "client", text: "Badminton court. The machines serve fast. Smash them back." }],
        ride: [{ who: "doge", text: "Top floor. Come on up. I'll put the kettle on.", end: true }],
    },
    {
        id: "R",
        num: "R",
        name: "Penthouse",
        vi: "TẦNG THƯỢNG",
        sub: "DogeKing",
        stages: [LAIR],
        dossier: "penthouse",
        music: 7,
        intro: [{ who: "client", text: "Penthouse. His room. He's waiting for you." }],
        outro: UNMASK,
    },
];
