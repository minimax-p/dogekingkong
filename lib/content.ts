// Everything the site says lives here — edit this file to update your portfolio.
// Content comes from minh-pham-portfolio (the simpler site) and public/resume.pdf.

export type SectionId = "projects" | "work" | "about" | "contact";

export const SECTION_ORDER: SectionId[] = ["projects", "work", "about", "contact"];

export const SECTION_TITLES: Record<SectionId, string> = {
    projects: "Projects",
    work: "Work",
    about: "About",
    contact: "Contact",
};

export const PROFILE = {
    tagline: "Data Science Student @ Fei Tian College",
    photo: "/assets/photos/profile.jpg",
};

export const RESUME_URL = "/resume.pdf";

export const SOCIALS = {
    email: "phamhuunhatminh221b@gmail.com",
    instagram: "https://www.instagram.com/minter_fam/",
    linkedin: "https://www.linkedin.com/in/minh-pham-b256ba273/",
    github: "https://github.com/minimax-p",
};

export type Link = { label: string; href: string };
// `gif` (optional) is a short clip that follows the cursor while the link is hovered
export type HoverLink = Link & { gif?: string };

export const ABOUT = {
    intro: [
        "I'm a Data Science major with extensive software development experience spanning mobile app development, test automation, and full-stack technologies.",
        "With four internship experiences including recent roles as a Software Engineer at Stealth and Mobile Developer at Ticketingbox Inc, I specialize in cross-platform development, automated testing frameworks, and API integration. I have built complete mobile applications from scratch and implemented enterprise-level testing infrastructure.",
    ],
    // Rendered as: before + link + after
    outside: {
        before: "Outside of tech, I'm",
        link: {
            label: "founder and team captain",
            href: "https://www.linkedin.com/feed/update/urn:li:activity:7312539809267257347/",
            gif: "/assets/gifs/badminton-smash.webp",
        } as HoverLink,
        after: "for our college badminton team and enjoy staying active at the gym. I also play classical guitar and clarinet, love karaoke, and am always up for good boba.",
    },
    education: {
        school: "Fei Tian College",
        url: "https://feitian.edu/",
        degree: "B.S. in Data Science",
        dates: "Fall 2023 – Spring 2026",
        highlights: ["GPA 3.59", "Dean's List · 4 consecutive semesters"],
        coursework: [
            "Machine Learning (ongoing)",
            "Data Mining",
            "Data Inference",
            "Data Visualization",
            "Probability Theory and Methods",
            "Data Structures and Algorithms",
            "Database Systems",
            "Front-End Web Development",
        ],
        leadership: [
            "Founder & Team Captain, Badminton Team",
            "Co-Founder & Vice President, Badminton Club",
        ],
    },
    skills: [
        { group: "Core competencies", items: ["Software Engineering", "Mobile Development", "Data Science", "Machine Learning", "Statistical Analysis", "UI/UX Design"] },
        { group: "Languages", items: ["Python", "JavaScript", "R", "Java", "Swift", "Dart", "SQL", "HTML", "CSS"] },
        { group: "Data science & ML", items: ["Pandas", "NumPy", "Matplotlib"] },
        { group: "Mobile & web", items: ["React Native", "Flutter"] },
        { group: "Cloud, DevOps & testing", items: ["Git", "GitHub", "Docker", "AWS", "Playwright"] },
        { group: "Databases", items: ["MySQL", "SQLite"] },
        { group: "Design", items: ["Figma", "Adobe Illustrator"] },
    ],
};

export type WorkEntry = {
    role: string;
    org: string;
    orgUrl?: string;
    location?: string;
    dates: string;
    points: string[];
};

export const WORK: WorkEntry[] = [
    {
        role: "Software Engineer Intern",
        org: "Stealth",
        location: "Middletown, NY",
        dates: "Jun – Aug 2025",
        points: [
            "Built a Playwright testing pipeline automating 87 tests across 8 platforms and 8 languages, enabling daily testing that would take 30+ hours by hand.",
            "Deployed it on a Linux server with scheduled 4am runs, automated reporting, and email notifications delivered before the team arrived.",
            "Caught 3 critical production bugs undetectable through manual QA.",
        ],
    },
    {
        role: "Mobile Developer Intern",
        org: "Ticketingbox Inc.",
        orgUrl: "https://www.ticketingbox.com/",
        location: "Remote",
        dates: "Oct 2024 – Mar 2025",
        points: [
            "Built a complete mobile app from scratch in 5 months after the legacy Ionic system failed.",
            "Integrated 15+ deprecated API endpoints with manager guidance, resolving JSON-RPC gateway issues.",
            "Designed an offline-capable SQLite database enabling real-time barcode validation without internet connectivity.",
            "Implemented a multi-format barcode scanner supporting QR codes, Code 128, and UPC with real-time ticket validation.",
        ],
    },
    {
        role: "Team Lead Intern",
        org: "NASA",
        orgUrl: "https://www.nasa.gov/",
        location: "Middletown, NY",
        dates: "Jun – Aug 2023",
        points: [
            "Led a 6-person development team through a 5-week Flutter project, coordinating the Git workflow and managing development and test phases.",
            "Performed 80% of testing and resolved 30% of critical bugs.",
            "Designed and prototyped the app in Figma.",
        ],
    },
    {
        role: "Full-stack Engineer Intern",
        org: "NASA",
        orgUrl: "https://www.nasa.gov/",
        location: "Middletown, NY",
        dates: "Jun – Aug 2022",
        points: [
            "Designed a SQL database for user authentication and secured a legacy codebase by parameterizing 40+ SQL calls against injection attacks.",
            "Implemented a server-side OTP authentication API to strengthen two-factor authentication.",
            "Built a dashboard displaying real-time magnetometer data using NASA's WorldWind, dygraphs, and Bootstrap.",
        ],
    },
];

export type Project = {
    name: string;
    year: string;
    blurb: string;
    tags: string[];
    link?: Link;
};

export const PROJECTS: Project[] = [
    {
        name: "Nightly E2E Test Pipeline",
        year: "2025",
        blurb: "87 Playwright tests across 8 platforms and 8 languages, run every morning at 4am on a Linux server with automated reports and email alerts. It caught 3 critical production bugs that manual QA missed.",
        tags: ["Playwright", "Linux", "Automation"],
    },
    {
        name: "Ticketingbox Scanner App",
        year: "2024 – 25",
        blurb: "A mobile ticketing app rebuilt from scratch after the legacy Ionic system failed — offline SQLite storage and real-time validation of QR, Code 128 and UPC barcodes.",
        tags: ["React Native", "SQLite", "Barcode scanning"],
    },
    {
        name: "ESP Mobile",
        year: "2023",
        blurb: "NASA's Earthquake Signal Precursor website brought to mobile — designed in Figma and built in Flutter by a six-person team I led.",
        tags: ["Flutter", "FlutterFlow", "Figma"],
    },
    {
        name: "ESP Magnetometer Dashboard",
        year: "2022",
        blurb: "A real-time dashboard for magnetometer readings from earthquake-precursor stations, mapped with NASA WorldWind.",
        tags: ["JavaScript", "NASA WorldWind", "dygraphs", "SQL"],
    },
    {
        name: "This Room",
        year: "2024 – 26",
        blurb: "My portfolio — a hand-illustrated room where every piece of furniture opens a part of my life.",
        tags: ["Next.js", "React", "Illustrator"],
        link: { label: "Source", href: "https://github.com/minimax-p/dogekingkong" },
    },
];

export const CONTACT = {
    intro: "Thanks for the visit! Email is the best way to reach me — or find me on LinkedIn and GitHub.",
};
