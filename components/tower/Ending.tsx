"use client";
// The top of the tower: his contact card, then the credits.
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ABOUT, PROFILE, RESUME_URL, SOCIALS, WORK } from "@/lib/content";

const Ending: React.FC = () => {
    const [copied, setCopied] = useState(false);
    const [credits, setCredits] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(t);
    }, [copied]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(SOCIALS.email);
            setCopied(true);
        } catch {
            window.location.href = `mailto:${SOCIALS.email}`;
        }
    };

    if (credits) return <Credits onBack={() => setCredits(false)} />;

    return (
        <div className="tw-ending">
            <div className="tw-contact">
                {/* eslint-disable-next-line @next/next/no-img-element -- a small, pre-sized photo */}
                <img src={PROFILE.photo} alt="Minh Pham" width={96} height={96} />
                <div>
                    <p className="tw-panel-kicker">CONTRACT COMPLETE · TARGET FOUND</p>
                    <h2>Minh Pham</h2>
                    <p className="tw-contact-tag">{PROFILE.tagline}</p>
                    <div className="tw-contact-email">
                        <a href={`mailto:${SOCIALS.email}`}>{SOCIALS.email}</a>
                        <button type="button" onClick={copy}>
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                    <ul className="tw-contact-links">
                        <li>
                            <a href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer">
                                LinkedIn ↗
                            </a>
                        </li>
                        <li>
                            <a href={SOCIALS.github} target="_blank" rel="noopener noreferrer">
                                GitHub ↗
                            </a>
                        </li>
                        <li>
                            <a href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer">
                                Instagram ↗
                            </a>
                        </li>
                        <li>
                            <a href={RESUME_URL} download="Minh Pham - Resume.pdf">
                                Résumé ↓
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="tw-ending-actions">
                <button type="button" onClick={() => setCredits(true)}>
                    Roll credits
                </button>
                <Link href="/">Back to the room</Link>
                <button type="button" onClick={() => window.location.reload()}>
                    Climb again
                </button>
            </div>
        </div>
    );
};

const Credits: React.FC<{ onBack: () => void }> = ({ onBack }) => (
    <div className="tw-credits" onClick={onBack}>
        <div className="tw-credits-roll">
            <p className="tw-panel-kicker">DOGEKING TOWER</p>
            <h3>Cast</h3>
            <p>
                The Headhunter <span>You</span>
            </p>
            <p>
                DogeKing <span>Minh Pham</span>
            </p>
            <p>
                The Client <span>A hiring manager with a deadline</span>
            </p>
            <p>
                local-bot <span>Itself</span>
            </p>
            <h3>Floors</h3>
            {WORK.slice()
                .reverse()
                .map((w) => (
                    <p key={`${w.org}-${w.dates}`}>
                        {w.role} <span>{w.org} · {w.dates}</span>
                    </p>
                ))}
            <h3>Known weapons</h3>
            {ABOUT.skills.map((s) => (
                <p key={s.group}>
                    {s.group} <span>{s.items.join(" · ")}</span>
                </p>
            ))}
            <h3>Made with</h3>
            <p>
                Engine <span>TypeScript, Canvas and WebGL</span>
            </p>
            <p>
                Music and sound <span>Synthesized live with Web Audio</span>
            </p>
            <p>
                Inspired by <span>Katana Zero</span>
            </p>
            <p className="tw-credits-end">Thanks for playing. Click to go back.</p>
        </div>
    </div>
);

export default Ending;
