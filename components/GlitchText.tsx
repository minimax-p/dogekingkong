"use client";
import React, { useEffect, useRef } from "react";

interface GlitchTextProps {
    text: string;
    className?: string;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Scrambles the letters on hover, then resolves back to `text` left to right.
const GlitchText: React.FC<GlitchTextProps> = ({ text, className = "" }) => {
    const textRef = useRef<HTMLHeadingElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, []);

    const glitch = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        let iteration = 0;
        intervalRef.current = setInterval(() => {
            if (!textRef.current) return;
            textRef.current.innerText = text
                .split("")
                .map((letter, index) => {
                    if (letter === " ") return " ";
                    if (index < iteration) return text[index];
                    return LETTERS[Math.floor(Math.random() * LETTERS.length)];
                })
                .join("");

            if (iteration >= text.length && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            iteration += 1 / 3;
        }, 40);
    };

    return (
        <h1 ref={textRef} className={`glitch ${className}`} onMouseOver={glitch}>
            {text}
        </h1>
    );
};

export default GlitchText;
