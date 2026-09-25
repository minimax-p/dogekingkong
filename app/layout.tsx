import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Minh Pham",
    description: "Minh Pham — data science student and developer. Step into a hand-drawn room to see my projects, work and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
