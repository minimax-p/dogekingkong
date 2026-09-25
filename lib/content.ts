// Everything the site says lives here — edit this file to update your portfolio.
// Content was drafted from the resume in /public; tweak wording freely.

export type SectionId = "projects" | "work" | "about" | "contact";

export const SECTION_ORDER: SectionId[] = ["projects", "work", "about", "contact"];

export const SECTION_TITLES: Record<SectionId, string> = {
    projects: "Projects",
    work: "Work",
    about: "About",
    contact: "Contact",
};

export const RESUME_URL = "/Minh%20Pham%20-%20Resume%203_8_2025.pdf";

export const SOCIALS = {
    email: "phamhuunhatminh221b@gmail.com",
    instagram: "https://www.instagram.com/minter_fam/",
    linkedin: "https://www.linkedin.com/in/minh-pham-b256ba273/",
    github: "https://github.com/minimax-p",
};

export const ABOUT = {
    intro: [
        "I'm a Data Science major with a software development background and a soft spot for UI/UX design.",
        "Two internships and a startup later, I've worked across front-end, back-end and databases — and led a team of six to ship a mobile app.",
    ],
    offline: "Off the keyboard you'll usually find me with a guitar or a basketball.",
    education: {
        school: "Fei Tian College Middletown",
        degree: "B.S. in Data Science",
        dates: "Sep 2023 – May 2026",
        details: [
            "GPA 3.58 · Dean's List (Fall 2023, Spring 2024, Fall 2024)",
            "Data Mining, Data Inference, Data Visualization, Data Structures & Algorithms, Database Systems, Front-End Web Development",
        ],
    },
    skills: [
        { group: "Languages & frameworks", items: ["React Native", "Python", "R", "JavaScript", "SQL", "HTML", "CSS", "Java", "Dart", "Swift"] },
        { group: "Tools", items: ["Git / GitHub", "VS Code", "IntelliJ", "Xcode", "MySQL Workbench"] },
        { group: "Design", items: ["Figma", "Adobe Illustrator"] },
    ],
};

export type WorkEntry = {
    role: string;
    org: string;
    location: string;
    dates: string;
    headline: string;
    points: string[];
};

export const WORK: WorkEntry[] = [
    {
        role: "Independent Study Program",
        org: "Stealth Startup",
        location: "Middletown, NY",
        dates: "Oct 2024 – Present",
        headline: "Building a cross-platform app with React Native / Expo",
        points: [
            "Led the front-end migration from Ionic to React Native/Expo, implementing 80% of features including barcode scanning and SQLite integration.",
            "Designed cross-platform UI components and the app's state architecture without dedicated design resources.",
            "Adopted Git best practices for tracking changes and collaborating efficiently.",
        ],
    },
    {
        role: "NASA Research Associate — Team Lead",
        org: "Northern Horizon",
        location: "Middletown, NY",
        dates: "May – Jul 2024",
        headline: "Brought the ESP website to mobile with Flutter",
        points: [
            "Led a team of 6: assigned tasks, mentored juniors on FlutterFlow and kept development and testing inside a 3-week timeline.",
            "Built 3 custom Flutter widgets, ran 80% of the tests and fixed 30% of the bugs.",
            "Designed and prototyped the app in Figma and Illustrator.",
        ],
    },
    {
        role: "NASA Research Associate",
        org: "Northern Horizon",
        location: "Middletown, NY",
        dates: "May – Jul 2023",
        headline: "Earthquake Signal Precursor (ESP) web platform",
        points: [
            "Built a dashboard visualising real-time magnetometer data with NASA WorldWind, dygraphs and Bootstrap.",
            "Parameterised 40+ SQL calls to prevent injection and consolidated 20+ server routes.",
            "Moved two-factor auth server-side with an OTP session API, and designed the SQL schema for users and settings.",
        ],
    },
];

export type Project = {
    name: string;
    year: string;
    blurb: string;
    tags: string[];
    link?: { label: string; href: string };
};

export const PROJECTS: Project[] = [
    {
        name: "ESP Magnetometer Dashboard",
        year: "2023",
        blurb: "A real-time dashboard for magnetometer readings from earthquake-precursor stations, mapped with NASA WorldWind.",
        tags: ["JavaScript", "NASA WorldWind", "dygraphs", "SQL"],
    },
    {
        name: "ESP Mobile",
        year: "2024",
        blurb: "The ESP website rebuilt as a mobile app — designed in Figma, built in Flutter by a team of six in three weeks.",
        tags: ["Flutter", "FlutterFlow", "Figma"],
    },
    {
        name: "Cross-Platform Startup App",
        year: "2024 – now",
        blurb: "A cross-platform app with barcode scanning and offline SQLite storage, migrated from Ionic to React Native.",
        tags: ["React Native", "Expo", "SQLite"],
    },
    {
        name: "This Room",
        year: "2025",
        blurb: "My portfolio — a hand-illustrated room where every piece of furniture opens a part of my life.",
        tags: ["Next.js", "React", "Illustrator"],
        link: { label: "Source", href: "https://github.com/minimax-p/dogekingkong" },
    },
];
