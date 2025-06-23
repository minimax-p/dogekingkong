"use client"

import { useEffect, useState } from "react"
import { useMobile } from "@/hooks/use-mobile"

export default function MobileWarning() {
    const isMobile = useMobile()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    if (!isMobile) return null

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-4 text-center text-white">
            <h2 className="mb-4 text-2xl font-bold">Not Available on Mobile</h2>
            <p className="max-w-md">
                This portfolio experience is designed for larger screens. Please visit on a desktop or tablet device.
            </p>
        </div>
    )
}

