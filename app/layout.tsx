import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Minh Pham Portfolio',
    description: 'Creative developer portfolio',
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    )
}