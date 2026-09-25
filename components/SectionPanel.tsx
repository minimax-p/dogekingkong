/* eslint-disable @next/next/no-img-element -- hand-drawn SVG illustrations; next/image adds nothing for SVGs */
"use client";
import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    ABOUT,
    PROJECTS,
    RESUME_URL,
    SECTION_ORDER,
    SECTION_TITLES,
    SOCIALS,
    WORK,
    type SectionId,
} from "@/lib/content";

interface SectionPanelProps {
    section: SectionId | null;
    onClose: () => void;
}

const AboutContent = () => (
    <>
        {ABOUT.intro.map((p) => (
            <p key={p} className="panel-lead">{p}</p>
        ))}
        <p className="panel-muted">{ABOUT.offline}</p>

        <h3 className="panel-heading">Education</h3>
        <div className="entry">
            <div className="entry-top">
                <span className="entry-title">{ABOUT.education.school}</span>
                <span className="entry-date">{ABOUT.education.dates}</span>
            </div>
            <div className="entry-sub">{ABOUT.education.degree}</div>
            <ul className="entry-points">
                {ABOUT.education.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
        </div>

        <h3 className="panel-heading">Toolbox</h3>
        {ABOUT.skills.map(({ group, items }) => (
            <div key={group} className="skill-group">
                <div className="skill-label">{group}</div>
                <ul className="chips">
                    {items.map((s) => <li key={s} className="chip">{s}</li>)}
                </ul>
            </div>
        ))}
    </>
);

const WorkContent = () => (
    <ol className="timeline">
        {WORK.map((job) => (
            <li key={`${job.org}-${job.dates}`} className="entry">
                <div className="entry-top">
                    <span className="entry-title">{job.org}</span>
                    <span className="entry-date">{job.dates}</span>
                </div>
                <div className="entry-sub">{job.role} · {job.location}</div>
                <div className="entry-headline">{job.headline}</div>
                <ul className="entry-points">
                    {job.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
            </li>
        ))}
    </ol>
);

const ProjectsContent = () => (
    <ul className="project-grid">
        {PROJECTS.map((project) => (
            <li key={project.name} className="project-card">
                <div className="entry-top">
                    <span className="entry-title">{project.name}</span>
                    <span className="entry-date">{project.year}</span>
                </div>
                <p>{project.blurb}</p>
                <ul className="chips">
                    {project.tags.map((t) => <li key={t} className="chip">{t}</li>)}
                </ul>
                {project.link && (
                    <a className="text-link" href={project.link.href} target="_blank" rel="noopener noreferrer">
                        {project.link.label} ↗
                    </a>
                )}
            </li>
        ))}
    </ul>
);

const ContactContent = () => (
    <>
        <p className="panel-lead">
            Have a project, a role, or just want to talk music and data? My inbox is open.
        </p>
        <a className="contact-email" href={`mailto:${SOCIALS.email}`}>{SOCIALS.email}</a>
        <ul className="contact-links">
            <li><a className="text-link" href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></li>
            <li><a className="text-link" href={SOCIALS.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a></li>
            <li><a className="text-link" href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a></li>
        </ul>
        <a className="resume-button" href={RESUME_URL} download="Minh Pham - Resume.pdf">Download résumé</a>
    </>
);

const CONTENT: Record<SectionId, React.FC> = {
    about: AboutContent,
    work: WorkContent,
    projects: ProjectsContent,
    contact: ContactContent,
};

const SectionPanel: React.FC<SectionPanelProps> = ({ section, onClose }) => {
    const closeRef = useRef<HTMLButtonElement>(null);

    // Esc closes; focus moves into the panel and back to where it came from.
    useEffect(() => {
        if (!section) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            previouslyFocused?.focus?.();
        };
    }, [section, onClose]);

    const Content = section ? CONTENT[section] : null;
    const index = section ? SECTION_ORDER.indexOf(section) + 1 : 0;

    return (
        <AnimatePresence>
            {section && Content && (
                <motion.div
                    key="panel-root"
                    className="panel-root"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <div className="panel-backdrop" onClick={onClose} />
                    <motion.section
                        key={section}
                        className="panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="panel-title"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.45 }}
                    >
                        <header className="panel-header">
                            <div>
                                <div className="panel-eyebrow">0{index} / 0{SECTION_ORDER.length}</div>
                                <h2 id="panel-title" className="panel-title">{SECTION_TITLES[section]}</h2>
                            </div>
                            <img className={`panel-art panel-art-${section}`} src={`/assets/${section}-colored.svg`} alt="" />
                            <button ref={closeRef} type="button" className="panel-close" onClick={onClose} aria-label="Close">
                                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                                    <path d="M3 3 L17 17 M17 3 L3 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </header>
                        <div className="panel-body">
                            <Content />
                        </div>
                    </motion.section>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SectionPanel;
