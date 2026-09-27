import type { Metadata } from "next";
import TowerRoot from "@/components/tower/TowerRoot";

export const metadata: Metadata = {
    title: "DogeKing Tower",
    description: "Minh Pham's portfolio, as a game. Climb the tower as the Headhunter, one job per floor, and find out who DogeKing really is.",
};

export default function TowerPage() {
    return <TowerRoot />;
}
