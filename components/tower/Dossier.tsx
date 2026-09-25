"use client";
// The plain-text file on DogeKing. Files you've recovered are open; the rest
// show their title and open with one click, so nothing is ever locked away.
import React, { useState } from "react";
import { DOSSIER, type DossierEntry } from "@/game/story/dossier";

const Dossier: React.FC<{ found: string[]; onClose: () => void }> = ({ found, onClose }) => {
    const [opened, setOpened] = useState<string[]>([]);
    return (
        <div className="tw-panel tw-dossier">
            <div className="tw-dossier-head">
                <p className="tw-panel-kicker">DOSSIER · SUBJECT: DOGEKING (MINH PHAM)</p>
                <button type="button" onClick={onClose}>
                    ← Back
                </button>
            </div>
            <p className="tw-dossier-count">
                {DOSSIER.filter((d) => found.includes(d.key)).length} of {DOSSIER.length} files recovered
            </p>
            <div className="tw-dossier-body">
                {DOSSIER.map((d) => {
                    const open = found.includes(d.key) || opened.includes(d.key);
                    return (
                        <section key={d.key} className={`tw-file ${open ? "" : "is-sealed"}`}>
                            <header>
                                <span className="tw-file-floor">{d.floor}</span>
                                <div>
                                    <h3>{d.title}</h3>
                                    <p>{d.kicker}</p>
                                </div>
                                {!found.includes(d.key) && <span className="tw-file-state">{open ? "Opened early" : "Not recovered"}</span>}
                            </header>
                            {open ? (
                                <FileBody d={d} />
                            ) : (
                                <button type="button" className="tw-file-open" onClick={() => setOpened([...opened, d.key])}>
                                    Read it anyway
                                </button>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

const FileBody: React.FC<{ d: DossierEntry }> = ({ d }) => (
    <div className="tw-file-body">
        {d.paragraphs?.map((p) => <p key={p}>{p}</p>)}
        {d.rich && (
            <p>
                {d.rich.map((part, i) =>
                    typeof part === "string" ? (
                        <React.Fragment key={i}>{part}</React.Fragment>
                    ) : part.href ? (
                        <a key={i} href={part.href} target="_blank" rel="noopener noreferrer">
                            {part.label}
                        </a>
                    ) : (
                        <React.Fragment key={i}>{part.label}</React.Fragment>
                    ),
                )}
            </p>
        )}
        {d.work && (
            <div className="tw-file-job">
                <p className="tw-file-role">
                    {d.work.role} ·{" "}
                    {d.work.orgUrl ? (
                        <a href={d.work.orgUrl} target="_blank" rel="noopener noreferrer">
                            {d.work.org}
                        </a>
                    ) : (
                        d.work.org
                    )}
                    <span>
                        {d.work.location ? `${d.work.location} · ` : ""}
                        {d.work.dates}
                    </span>
                </p>
                <ul>
                    {d.work.points.map((p) => (
                        <li key={p}>{p}</li>
                    ))}
                </ul>
            </div>
        )}
        {d.projects?.map((p) => (
            <div key={p.name} className="tw-file-project">
                <p className="tw-file-role">
                    {p.name}
                    <span>{p.year}</span>
                </p>
                <p>{p.blurb}</p>
                <p className="tw-tags">{p.tags.join(" · ")}</p>
                {p.link && (
                    <a href={p.link.href} target="_blank" rel="noopener noreferrer">
                        {p.link.label} ↗
                    </a>
                )}
            </div>
        ))}
        {d.lists?.map((l) => (
            <div key={l.label} className="tw-file-list">
                <p className="tw-file-label">{l.label}</p>
                <p>{l.items.join(" · ")}</p>
            </div>
        ))}
        {d.links && (
            <ul className="tw-file-links">
                {d.links.map((l) => (
                    <li key={l.href}>
                        <a href={l.href} target={l.href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">
                            {l.label}
                        </a>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

export default Dossier;
