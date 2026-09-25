"use client";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";

// The game only runs in the browser, and only loads on this page
const TowerGame = dynamic(() => import("@/components/tower/TowerGame"), { ssr: false });
const SpriteSheet = dynamic(() => import("@/components/tower/SpriteSheet"), { ssr: false });

const TowerRoot: React.FC = () => {
    const [debug, setDebug] = useState<string | null>(null);
    useEffect(() => {
        setDebug(new URLSearchParams(window.location.search).get("debug"));
    }, []);
    if (debug === "sprites") return <SpriteSheet />;
    return <TowerGame />;
};

export default TowerRoot;
