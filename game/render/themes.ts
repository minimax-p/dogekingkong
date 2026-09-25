// Per-floor colors for walls, floors, light and the skyline outside.
import type { ThemeId } from "@/game/world/stage";

export type Theme = {
    wall: string; // back wall
    wallHi: string;
    wallLo: string;
    pattern: "panels" | "brick" | "tiles" | "stripes" | "racks" | "wood" | "concrete";
    solid: string; // floors and walls you can stand on
    solidHi: string; // their top edge
    solidLo: string;
    solidLine: string;
    plat: string;
    platHi: string;
    light: string; // lamp glow
    accent: string; // neon
    sky: [string, string];
    city: [string, string, string]; // far, mid, near building colors
    windowLit: string[];
    rain: boolean;
};

const BASE: Theme = {
    wall: "#15122b",
    wallHi: "#1f1a3d",
    wallLo: "#0f0c20",
    pattern: "panels",
    solid: "#1d1838",
    solidHi: "#5b4f9a",
    solidLo: "#110e24",
    solidLine: "#2c2754",
    plat: "#2c2754",
    platHi: "#8c9eff",
    light: "#8c9eff",
    accent: "#ff3d7f",
    sky: ["#0c0a1a", "#2a1c4a"],
    city: ["#241c44", "#181433", "#0d0b1e"],
    windowLit: ["#ffcf6b", "#8c9eff", "#ff8fb4", "#54e3ff"],
    rain: true,
};

export const THEMES: Record<ThemeId, Theme> = {
    test: BASE,
    lobby: {
        ...BASE,
        wall: "#1a1432",
        wallHi: "#261e48",
        wallLo: "#120e25",
        pattern: "stripes",
        solid: "#221b40",
        solidHi: "#8c9eff",
        light: "#ffcf6b",
        accent: "#ff3d7f",
    },
    seismic: {
        ...BASE,
        wall: "#101a2b",
        wallHi: "#18263d",
        wallLo: "#0a111e",
        pattern: "tiles",
        solid: "#16213a",
        solidHi: "#54e3ff",
        solidLine: "#223252",
        plat: "#223252",
        platHi: "#54e3ff",
        light: "#54e3ff",
        accent: "#5cf2b8",
        sky: ["#08101c", "#152a44"],
        city: ["#14243a", "#0f1b2e", "#08101c"],
    },
    command: {
        ...BASE,
        wall: "#14162e",
        wallHi: "#1e2244",
        pattern: "panels",
        solid: "#1b1f3d",
        solidHi: "#8c9eff",
        light: "#8c9eff",
        accent: "#54e3ff",
    },
    boxoffice: {
        ...BASE,
        wall: "#1a1026",
        wallHi: "#261838",
        wallLo: "#110a1a",
        pattern: "brick",
        solid: "#22142f",
        solidHi: "#ff3d7f",
        solidLine: "#351f47",
        plat: "#351f47",
        platHi: "#ff8fb4",
        light: "#ff3d7f",
        accent: "#ffcf6b",
        sky: ["#12081a", "#3a1640"],
        city: ["#2a1438", "#1c0f28", "#0f0716"],
    },
    suite: {
        ...BASE,
        wall: "#0e1422",
        wallHi: "#162034",
        wallLo: "#090d17",
        pattern: "panels",
        solid: "#141c30",
        solidHi: "#5cf2b8",
        solidLine: "#1e2a44",
        plat: "#1e2a44",
        platHi: "#5cf2b8",
        light: "#5cf2b8",
        accent: "#ff3d7f",
        sky: ["#050810", "#10203a"],
        city: ["#0f1a2e", "#0a1222", "#050810"],
        rain: false,
    },
    localhost: {
        ...BASE,
        wall: "#0d0f1c",
        wallHi: "#151a2e",
        wallLo: "#080a14",
        pattern: "racks",
        solid: "#131629",
        solidHi: "#54e3ff",
        solidLine: "#1d2240",
        plat: "#1d2240",
        platHi: "#54e3ff",
        light: "#54e3ff",
        accent: "#8c9eff",
        sky: ["#04050a", "#0c1020"],
        city: ["#0c1020", "#080b16", "#04050a"],
        rain: false,
    },
    afterhours: {
        ...BASE,
        wall: "#1c0f2a",
        wallHi: "#2a1840",
        wallLo: "#12081c",
        pattern: "wood",
        solid: "#26143a",
        solidHi: "#ff8fb4",
        solidLine: "#3a2050",
        plat: "#3a2050",
        platHi: "#ff8fb4",
        light: "#ff3d7f",
        accent: "#5cf2b8",
        sky: ["#12061c", "#4a1a4a"],
        city: ["#2e1440", "#1e0c2c", "#10061a"],
    },
    penthouse: {
        ...BASE,
        wall: "#120e24",
        wallHi: "#1c1638",
        pattern: "concrete",
        solid: "#1a1532",
        solidHi: "#ffcf6b",
        light: "#ffcf6b",
        accent: "#ff3d7f",
        sky: ["#060412", "#2a1650"],
    },
};
