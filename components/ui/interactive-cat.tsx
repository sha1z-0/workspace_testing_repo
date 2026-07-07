"use client"

import { useEffect, useRef, useState } from "react"

export function InteractiveCat({ isSecretRevealed = false }: { isSecretRevealed?: boolean }) {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0, eyeX: 0, eyeY: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Calculate mouse position relative to window center for head tilt
            const headX = (e.clientX - window.innerWidth / 2) / 30
            const headY = (e.clientY - window.innerHeight / 2) / 30

            // Calculate eye pupil position
            // This is a simplified "look at" logic.
            // Ideally we'd calculate angle per eye, but a global offset works well for this flat/2.5D style
            const eyeX = (e.clientX - window.innerWidth / 2) / 15
            const eyeY = (e.clientY - window.innerHeight / 2) / 15

            // Limit eye movement range
            const limit = 12
            const limitedEyeX = Math.max(Math.min(eyeX, limit), -limit)
            const limitedEyeY = Math.max(Math.min(eyeY, limit), -limit)

            setMousePosition({ x: headX, y: headY, eyeX: limitedEyeX, eyeY: limitedEyeY })
        }

        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [])

    return (
        <div ref={containerRef} className="relative w-full h-full flex items-center justify-center perspective-[1000px]">

            {/* Cat Head Container - Tilts with mouse */}
            <div
                className="relative w-64 h-56 transition-transform duration-100 ease-out transform-style-3d"
                style={{
                    transform: `rotateX(${-mousePosition.y}deg) rotateY(${mousePosition.x}deg)`
                }}
            >
                {/* Ears */}
                <div className="absolute -top-10 left-4 w-20 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl transform -rotate-12 border border-white/20 translate-z-[-10px]" />
                <div className="absolute -top-10 right-4 w-20 h-24 bg-gradient-to-bl from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl transform rotate-12 border border-white/20 translate-z-[-10px]" />

                {/* Inner Ear accents */}
                <div className="absolute -top-6 left-8 w-12 h-16 bg-blue-400/20 rounded-xl transform -rotate-12 blur-sm" />
                <div className="absolute -top-6 right-8 w-12 h-16 bg-blue-400/20 rounded-xl transform rotate-12 blur-sm" />

                {/* Head Shape - Glassmorphism */}
                <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-[3rem] border border-white/30 shadow-[0_15px_35px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center overflow-hidden">
                    {/* Glossy reflection */}
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/20 to-transparent rounded-[3rem] pointer-events-none" />
                </div>

                {/* Face Elements Container */}
                <div className="absolute inset-0 flex flex-col items-center justify-center translate-z-[20px]">

                    {/* Eyes Container */}
                    <div className="flex gap-8 mb-4">
                        {/* Left Eye */}
                        <div className="relative w-16 h-16 bg-white/90 rounded-full shadow-inner flex items-center justify-center overflow-hidden border-2 border-blue-100/50">
                            {/* Pupil */}
                            <div
                                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-full shadow-lg relative transition-transform duration-75"
                                style={{ transform: `translate(${mousePosition.eyeX}px, ${mousePosition.eyeY}px)` }}
                            >
                                {/* Highlight in pupil */}
                                <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full opacity-80" />
                            </div>

                            {/* Eyelid for Closing Animation */}
                            <div
                                className={`absolute top-0 left-0 w-full bg-blue-100/90 transition-all duration-300 ease-in-out z-10 border-b-2 border-blue-200 ${isSecretRevealed ? 'h-full' : 'h-0'}`}
                            />
                        </div>

                        {/* Right Eye */}
                        <div className="relative w-16 h-16 bg-white/90 rounded-full shadow-inner flex items-center justify-center overflow-hidden border-2 border-blue-100/50">
                            {/* Pupil */}
                            <div
                                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-full shadow-lg relative transition-transform duration-75"
                                style={{ transform: `translate(${mousePosition.eyeX}px, ${mousePosition.eyeY}px)` }}
                            >
                                {/* Highlight in pupil */}
                                <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full opacity-80" />
                            </div>

                            {/* Eyelid for Closing Animation */}
                            <div
                                className={`absolute top-0 left-0 w-full bg-blue-100/90 transition-all duration-300 ease-in-out z-10 border-b-2 border-blue-200 ${isSecretRevealed ? 'h-full' : 'h-0'}`}
                            />
                        </div>
                    </div>

                    {/* Nose */}
                    <div className="w-8 h-5 bg-pink-300/80 rounded-full mb-2 blur-[1px] shadow-sm transform translate-y-1" />

                    {/* Whiskers */}
                    <div className="relative w-full h-10">
                        <div className="absolute left-8 top-2 w-16 h-0.5 bg-white/30 rotate-[5deg] rounded-full" />
                        <div className="absolute left-8 top-5 w-16 h-0.5 bg-white/30 rotate-[0deg] rounded-full" />
                        <div className="absolute left-8 top-8 w-16 h-0.5 bg-white/30 rotate-[-5deg] rounded-full" />

                        <div className="absolute right-8 top-2 w-16 h-0.5 bg-white/30 rotate-[-5deg] rounded-full" />
                        <div className="absolute right-8 top-5 w-16 h-0.5 bg-white/30 rotate-[0deg] rounded-full" />
                        <div className="absolute right-8 top-8 w-16 h-0.5 bg-white/30 rotate-[5deg] rounded-full" />
                    </div>
                </div>
            </div>

            {/* Floating Paws/Hands holding the card (optional cute detail) - represented as glass orbs */}
            <div
                className="absolute bottom-[-20px] left-10 w-16 h-12 bg-white/20 backdrop-blur-md rounded-full border border-white/20 transition-transform duration-300 transform translate-z-[30px]"
                style={{ transform: `translate(${mousePosition.x * -0.5}px, ${mousePosition.y * -0.5}px)` }}
            />
            <div
                className="absolute bottom-[-20px] right-10 w-16 h-12 bg-white/20 backdrop-blur-md rounded-full border border-white/20 transition-transform duration-300 transform translate-z-[30px]"
                style={{ transform: `translate(${mousePosition.x * -0.5}px, ${mousePosition.y * -0.5}px)` }}
            />

            {/* Styles */}
            <style jsx>{`
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .perspective-[1000px] {
          perspective: 1000px;
        }
        .translate-z-\[-10px\] {
          transform: translateZ(-10px);
        }
        .translate-z-\[20px\] {
          transform: translateZ(20px);
        }
        .translate-z-\[30px\] {
          transform: translateZ(30px);
        }
      `}</style>
        </div>
    )
}
