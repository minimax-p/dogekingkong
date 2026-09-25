// The tower, bottom to top. Each floor's name, role and dates come from
// lib/content.ts, so they stay in step with the main site.
import { TEST_STAGE } from "@/game/story/stages/test";
import type { FloorDef } from "@/game/story/types";

export const TEST_FLOOR: FloorDef = {
    id: "T",
    num: "00",
    name: "Test room",
    vi: "TẦNG 00",
    sub: "Tuning the feel",
    stages: [TEST_STAGE],
    dossier: "test",
    music: 0,
};

export const FLOORS: FloorDef[] = [TEST_FLOOR];
