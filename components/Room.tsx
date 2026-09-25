/* eslint-disable @next/next/no-img-element -- hand-drawn SVG illustrations; next/image adds nothing for SVGs */
"use client";
import React from "react";
import { SECTION_TITLES, type SectionId } from "@/lib/content";

// All numbers below are "design pixels" on a 1440px-wide room.
// The room scales as one piece (see `.room` in globals.css), so labels and
// arrows stay glued to their furniture at every screen size.
//
//  x, bottom, width  – where the furniture sits inside the room
//  title / arrow     – offset from the furniture's top-left corner
//                      (`y` = how far above the furniture's top edge)
type Spot = {
    id: SectionId;
    x: number;
    bottom: number;
    width: number;
    title: { x: number; y: number };
    arrow: { x: number; y: number; width: number };
};

const SPOTS: Spot[] = [
    { id: "contact", x: 64, bottom: 450, width: 45, title: { x: 106, y: 62 }, arrow: { x: 62, y: 30, width: 30 } },
    { id: "projects", x: 160, bottom: 80, width: 285, title: { x: 12, y: 64 }, arrow: { x: 80, y: -10, width: 32 } },
    { id: "work", x: 518, bottom: 32, width: 403, title: { x: 262, y: 70 }, arrow: { x: 160, y: 18, width: 82 } },
    { id: "about", x: 970, bottom: 64, width: 374, title: { x: 200, y: 36 }, arrow: { x: 308, y: -8, width: 66 } },
];

type Vars = React.CSSProperties & Record<`--${string}`, number>;

interface RoomProps {
    onOpen: (id: SectionId) => void;
}

const Room: React.FC<RoomProps> = ({ onOpen }) => (
    <div className="room no-select">
        <img className="room-carpet" src="/assets/carpet.svg" alt="" draggable={false} />

        {SPOTS.map(({ id, x, bottom, width, title, arrow }) => {
            const vars: Vars = {
                "--x": x,
                "--b": bottom,
                "--w": width,
                "--tx": title.x,
                "--ty": title.y,
                "--ax": arrow.x,
                "--ay": arrow.y,
                "--aw": arrow.width,
            };
            return (
                <button
                    key={id}
                    type="button"
                    className={`spot spot-${id}`}
                    style={vars}
                    onClick={() => onOpen(id)}
                    aria-label={`Open ${SECTION_TITLES[id]}`}
                >
                    <img className="spot-outline" src={`/assets/${id}-outline.svg`} alt="" draggable={false} />
                    <img className="spot-colored" src={`/assets/${id}-colored.svg`} alt="" draggable={false} />
                    <span className="spot-title" aria-hidden="true">{SECTION_TITLES[id]}</span>
                    <img className="spot-arrow" src={`/assets/${id}-arrow.svg`} alt="" draggable={false} />
                </button>
            );
        })}
    </div>
);

export default Room;
