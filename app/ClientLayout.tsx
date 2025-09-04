"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ThemeProvider } from "@/components/theme-provider"

export default function ClientLayout({
                                         children,
                                     }: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    useEffect(() => {}, [pathname])

    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
            <AnimatePresence mode="wait">
                <motion.div
                    key={pathname}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="min-h-screen"
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </ThemeProvider>
    )
}

