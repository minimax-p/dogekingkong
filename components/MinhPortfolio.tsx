"use client";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import GlitchText from "@/components/GlitchText";
import Navigation from "@/components/Navigation";
import Room from "@/components/Room";
import SectionPanel from "@/components/SectionPanel";
import { PROFILE, SECTION_ORDER, SECTION_TITLES, type SectionId } from "@/lib/content";

const MinhPortfolio: React.FC = () => {
    const [navOpen, setNavOpen] = useState(false);
    const [section, setSection] = useState<SectionId | null>(null);
    const blobRef = useRef<HTMLDivElement>(null);

    // Soft glow that trails the cursor
    useEffect(() => {
        const handleMove = ({ clientX, clientY }: PointerEvent) => {
            blobRef.current?.animate(
                { left: `${clientX}px`, top: `${clientY}px` },
                { duration: 1000, fill: "forwards" },
            );
        };
        document.body.addEventListener("pointermove", handleMove);
        return () => document.body.removeEventListener("pointermove", handleMove);
    }, []);

    const openSection = useCallback((id: SectionId) => {
        setNavOpen(false);
        setSection(id);
    }, []);
    const closeSection = useCallback(() => setSection(null), []);
    const toggleNav = useCallback(() => setNavOpen((open) => !open), []);

    return (
        <main className="stage">
            <div id="blob" ref={blobRef} aria-hidden="true" />

            <Navigation isOpen={navOpen} onToggle={toggleNav} onSelect={openSection} />

            <div id="overlay" onClick={toggleNav} className={navOpen ? "active" : ""} aria-hidden="true" />

            <div id="hero">
                <p className="hero-hello">Hello, my name is</p>
                <GlitchText text="Minh Pham" />
                <p className="hero-tagline">{PROFILE.tagline}</p>
                {/* On small screens the room is hidden, so offer plain links instead */}
                <ul className="hero-links">
                    {SECTION_ORDER.map((id) => (
                        <li key={id}>
                            <button type="button" onClick={() => openSection(id)}>{SECTION_TITLES[id]}</button>
                        </li>
                    ))}
                </ul>
                <Link href="/tower" className="hero-secret">▲ Going up?</Link>
            </div>

            <Room onOpen={openSection} />

            <SectionPanel section={section} onClose={closeSection} />
        </main>
    );
};

export default MinhPortfolio;
