"use client"

import { useEffect, useRef, useState } from "react"

export function FloatingShapes() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                // Calculate mouse position relative to window center
                const x = (e.clientX - window.innerWidth / 2) / 25
                const y = (e.clientY - window.innerHeight / 2) / 25
                setMousePosition({ x, y })
            }
        }

        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [])

    return (
        <div ref={containerRef} className="relative w-full h-full flex items-center justify-center perspective-[1000px] overflow-hidden">

            {/* Central Rotating Cube structure */}
            <div
                className="relative w-64 h-64 transition-transform duration-100 ease-out transform-style-3d"
                style={{
                    transform: `rotateX(${-mousePosition.y}deg) rotateY(${mousePosition.x}deg)`
                }}
            >
                {/* Glass Cube Faces */}
                <div className="absolute inset-0 border border-white/30 bg-white/5 backdrop-blur-sm rounded-2xl shadow-[0_0_50px_rgba(56,189,248,0.3)] transform translate-z-[50px] animate-pulse-slow" />
                <div className="absolute inset-0 border border-white/20 bg-blue-500/10 backdrop-blur-md rounded-2xl transform translate-z-[-50px] scale-90" />

                {/* Inner glowing core */}
                <div className="absolute top-1/2 left-1/2 w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/30 blur-2xl animate-pulse" />
            </div>

            {/* Floating Orbital Shapes with Parallax */}

            {/* Top Left Sphere */}
            <div
                className="absolute top-1/4 left-1/4 w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/40 to-transparent blur-md transition-transform duration-300 ease-out"
                style={{ transform: `translate(${mousePosition.x * -1.5}px, ${mousePosition.y * -1.5}px)` }}
            />

            {/* Bottom Right Cube */}
            <div
                className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-3xl border border-white/10 bg-purple-500/10 backdrop-blur-sm rotate-12 transition-transform duration-500 ease-out"
                style={{ transform: `translate(${mousePosition.x * -2}px, ${mousePosition.y * -2}px) rotate(12deg)` }}
            />

            {/* Foreground Element */}
            <div
                className="absolute bottom-1/3 left-1/3 w-12 h-12 rounded-full bg-white/20 blur-sm transition-transform duration-200 ease-out"
                style={{ transform: `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2}px)` }}
            />

            {/* CSS for 3D transforms that Tailwind might miss */}
            <style jsx>{`
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .perspective-[1000px] {
          perspective: 1000px;
        }
        .translate-z-\[50px\] {
          transform: translateZ(50px);
        }
        .translate-z-\[-50px\] {
          transform: translateZ(-50px);
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
        </div>
    )
}
