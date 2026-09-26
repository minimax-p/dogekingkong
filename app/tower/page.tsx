import type { Metadata } from "next";
import TowerRoot from "@/components/tower/TowerRoot";

export const metadata: Metadata = {
    title: "DogeKing Tower",
    description: "A secret level: climb the tower as the Headhunter and find out who DogeKing really is.",
};

export default function TowerPage() {
    return <TowerRoot />;
}
