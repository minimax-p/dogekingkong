// The Dossier: every fact on the main site, filed by the floor it belongs to.
// It reads lib/content.ts, so editing that file updates the game too.
import { ABOUT, PROFILE, PROJECTS, RESUME_URL, SOCIALS, WORK, type Project, type RichText, type WorkEntry } from "@/lib/content";

export type DossierEntry = {
    key: string;
    floor: string; // "G", "1"…
    title: string;
    kicker: string;
    work?: WorkEntry;
    projects?: Project[];
    paragraphs?: string[];
    rich?: RichText;
    lists?: { label: string; items: string[] }[];
    links?: { label: string; href: string }[];
};

const job = (org: string, rolePrefix: string) => WORK.find((w) => w.org.startsWith(org) && w.role.startsWith(rolePrefix));
const proj = (name: string) => PROJECTS.filter((p) => p.name.startsWith(name));

const edu = ABOUT.education;

export const DOSSIER: DossierEntry[] = [
    {
        key: "lobby",
        floor: "G",
        title: "Who he is",
        kicker: PROFILE.tagline,
        paragraphs: ABOUT.intro,
        lists: [
            { label: `${edu.school} · ${edu.degree} · ${edu.dates}`, items: edu.highlights },
            ...ABOUT.skills.map((s) => ({ label: s.group, items: s.items })),
        ],
    },
    {
        key: "seismic",
        floor: "1",
        title: "Seismic",
        kicker: "NASA · 2022",
        work: job("NASA", "Full-stack"),
        projects: proj("ESP Magnetometer"),
    },
    {
        key: "command",
        floor: "2",
        title: "Command",
        kicker: "NASA · 2023",
        work: job("NASA", "Team Lead"),
        projects: proj("ESP Mobile"),
    },
    {
        key: "boxoffice",
        floor: "3",
        title: "Box Office",
        kicker: "Ticketingbox · 2024–25",
        work: job("Ticketingbox", "Mobile"),
        projects: proj("Ticketingbox"),
    },
    {
        key: "suite",
        floor: "4",
        title: "04:00 AM",
        kicker: "Stealth · Summer 2025",
        work: job("Stealth", "Software Engineer Intern"),
        projects: proj("Nightly"),
    },
    {
        key: "localhost",
        floor: "5",
        title: "Local Host",
        kicker: "Stealth · 2025 – now",
        work: WORK.find((w) => w.org === "Stealth" && w.role === "Software Engineer"),
        projects: proj("Local LLM"),
    },
    {
        key: "afterhours",
        floor: "6",
        title: "After Hours",
        kicker: "Life outside work",
        rich: ABOUT.outside,
        lists: [{ label: "Leadership & activities", items: edu.leadership }],
    },
    {
        key: "penthouse",
        floor: "R",
        title: "Contact",
        kicker: "The penthouse",
        paragraphs: ["Email is the best way to reach him — or find him on LinkedIn and GitHub."],
        projects: proj("This Room"),
        links: [
            { label: SOCIALS.email, href: `mailto:${SOCIALS.email}` },
            { label: "LinkedIn", href: SOCIALS.linkedin },
            { label: "GitHub", href: SOCIALS.github },
            { label: "Instagram", href: SOCIALS.instagram },
            { label: "Résumé (PDF)", href: RESUME_URL },
        ],
    },
];
