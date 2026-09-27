// The tower, bottom to top. Each floor's role, company and dates come from
// lib/content.ts, so they stay in step with the rest of the site. The jokes
// don't; they're all ours.
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
            { who: "client", text: "You're in. Ground floor of DogeKing Tower. Try not to bleed on the carpet. It's rented." },
            {
                who: "client",
                text: "The target: one software engineer. Codename DogeKing. Real name Minh Pham. Stealth startup. Allergic to cover letters.",
                interrupt: { label: "Just send me his résumé.", goto: "resume" },
            },
            {
                who: "client",
                text: "Twelve recruiters went up those stairs. Eleven came back with a LinkedIn connection and a thousand-yard stare. The twelfth is still in the elevator.",
                goto: "ask",
            },
            {
                id: "resume",
                who: "client",
                text: "It's in your Dossier. Hit Esc. But nobody hires off a PDF anymore. We do this the old way. With violence.",
                goto: "ask",
            },
            {
                id: "ask",
                who: "client",
                text: "Questions?",
                choices: [
                    { label: "Why all the security?", goto: "sec" },
                    { label: "What's on each floor?", goto: "floors" },
                    { label: "Why me?", goto: "why" },
                    { label: "No. Let's go.", goto: "phones" },
                ],
            },
            { id: "sec", who: "client", text: "Robots. In suits. In Shiba masks. It's either a bit or a cry for help. My money's on both.", goto: "phones" },
            { id: "floors", who: "client", text: "Every floor is a job he's done. NASA, Ticketingbox, a stealth startup. Grab the files as you go. HR loves a paper trail.", goto: "phones" },
            { id: "why", who: "client", text: "You're a headhunter. It says 'hunt' right there in the title. Don't make this weird.", goto: "phones" },
            {
                id: "phones",
                who: "client",
                text: "Last thing. Put your headphones on. The tower has a soundtrack. Of course it does.",
                choices: [
                    { label: "Put them on", action: "music", goto: "go" },
                    { label: "Work in silence", action: "nomusic", goto: "go" },
                ],
            },
            { id: "go", who: "client", text: "Good. If you die, rewind. The budget doesn't cover funerals.", end: true },
        ],
        ride: [
            { who: "doge", text: "Wow. Such visitor. Very trespass." },
            {
                who: "doge",
                text: "Most people just send an email, you absolute maniac.",
                interrupt: { label: "Then give me your email.", goto: "email" },
            },
            { who: "doge", text: "Floor one was my first internship. NASA. The lasers are real. Allegedly.", end: true },
            { id: "email", who: "doge", text: "Top floor. Where all the good stuff is. Floor one first: NASA. The lasers are real. Allegedly.", end: true },
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
            {
                who: "doge",
                text: "I locked down their legacy code. Forty-plus SQL calls, all parameterized. Little Bobby Tables can go cry about it.",
            },
            { who: "doge", text: "Next summer they made me team lead. Six people. Five weeks. Nobody died. Floor two.", end: true },
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
        intro: [{ who: "client", text: "His old team is still up here. As holograms. Don't ask. Walk past their desks and they talk." }],
        ride: [
            { who: "doge", text: "We shipped. Then I went mobile." },
            {
                who: "doge",
                text: "Floor three is Ticketingbox. Their old app died, so I built them a new one from scratch.",
                interrupt: { label: "In how long?", goto: "fast" },
            },
            { who: "doge", text: "The lights are out down there. Watch your step. And your back.", end: true },
            { id: "fast", who: "doge", text: "Five months. And the lights are out down there, so. Good luck with that.", end: true },
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
        intro: [
            {
                who: "client",
                text: "Power's out. The turnstiles still work, because he made them validate tickets offline. The man trusts Wi-Fi less than I trust Mondays.",
            },
        ],
        ride: [
            { who: "doge", text: "Summer '25. A stealth startup wanted tests." },
            {
                who: "doge",
                text: "I gave them eighty-seven. Eight platforms, eight languages, every single night at four in the morning.",
                interrupt: { label: "Who the hell is awake at 4 a.m.?", goto: "four" },
            },
            { who: "doge", text: "Three of them caught bugs nobody else could. You're about to meet them. They bite.", end: true },
            {
                id: "four",
                who: "doge",
                text: "The tests. That's the point. The report hits everyone's inbox before their alarm goes off. Like a tiny, sadistic newspaper.",
                end: true,
            },
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
        intro: [{ who: "client", text: "It's 3:59 a.m. on this floor. Something happens at four. Nothing good has ever happened at four." }],
        ride: [
            { who: "doge", text: "They liked the tests so much they hired me. Full time. Real badge and everything." },
            { who: "doge", text: "Floor five runs on its own hardware. No internet. Scream all you want, nobody's streaming it.", end: true },
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
        intro: [{ who: "client", text: "...signal's gone. Local network only. You're on your own. Talk to the terminal. It's friendly. Too friendly." }],
        ride: [
            {
                who: "doge",
                text: "That's the day job. You want to know what I do after hours?",
                choices: [
                    { label: "Not really.", goto: "no" },
                    { label: "Go on.", goto: "yes" },
                ],
            },
            { id: "no", who: "doge", text: "Tough. The elevator only goes up. I designed it that way.", end: true },
            { id: "yes", who: "doge", text: "Badminton. Band practice. The gym. Boba. It's a lifestyle, not a phase, Mom.", end: true },
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
        intro: [{ who: "client", text: "Badminton court. The machines serve like they're getting paid for it. Smash them back or eat feathers." }],
        ride: [{ who: "doge", text: "Top floor. Come on up. I'll put the kettle on. Or the boss music. One of the two.", end: true }],
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
        intro: [{ who: "client", text: "Penthouse. His room. He's in there. Probably with a guitar. God help us." }],
        outro: UNMASK,
    },
];
