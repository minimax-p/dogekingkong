import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "DogeKing Tower · Minh Pham",
    description: "Minh Pham's portfolio, as a game. Climb the tower as the Headhunter, one job per floor, and find out who DogeKing really is.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
