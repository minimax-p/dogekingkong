// DogeKing, the penthouse boss. Filled in with the Penthouse floor.
import { killEnemy } from "@/game/world/common";
import type { Enemy, World } from "@/game/world/types";

export const hitBoss = (w: World, e: Enemy, a: number) => {
    killEnemy(w, e, a);
};

export const updateBoss = (w: World, e: Enemy, dt: number) => {
    void w;
    void e;
    void dt;
};
