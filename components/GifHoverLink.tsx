/* eslint-disable @next/next/no-img-element -- pre-sized animated WebP; next/image adds nothing here */
"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface GifHoverLinkProps {
    href: string;
    gif: string;
    className?: string;
    children: React.ReactNode;
}

const HALF_WIDTH = 104; // half the clip's width plus a margin, to keep it on screen

// A link that shows a short looping clip above the cursor while hovered.
const GifHoverLink: React.FC<GifHoverLinkProps> = ({ href, gif, className, children }) => {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

    // Start downloading the clip as soon as the link is on screen, so it's ready on hover
    useEffect(() => {
        const img = new Image();
        img.src = gif;
    }, [gif]);

    const track = (e: React.MouseEvent) => ({
        x: Math.min(Math.max(e.clientX, HALF_WIDTH), window.innerWidth - HALF_WIDTH),
        y: e.clientY,
    });

    const show = (e: React.MouseEvent) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        setPos(track(e));
    };

    return (
        <>
            <a
                className={className}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={show}
                onMouseMove={(e) => setPos((p) => p && track(e))}
                onMouseLeave={() => setPos(null)}
            >
                {children}
            </a>
            {/* Portal to <body> so the panel's slide-in transform can't offset the fixed position */}
            {pos && createPortal(
                <img className="gif-hover" src={gif} alt="" aria-hidden="true" style={{ left: pos.x, top: pos.y }} />,
                document.body,
            )}
        </>
    );
};

export default GifHoverLink;
