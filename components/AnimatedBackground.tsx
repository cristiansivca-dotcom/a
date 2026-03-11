"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function AnimatedBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden bg-[#050505] z-0">
            {/* Base Image Layer */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/premium_bg.png"
                    alt="Premium Background"
                    fill
                    priority
                    className="object-cover opacity-60 mix-blend-screen"
                />
            </div>

            {/* Dark elegant grid */}
            <div
                className="absolute inset-0 opacity-[0.10] z-10"
                style={{
                    backgroundImage: `linear-gradient(to right, #4f4f4f 1px, transparent 1px), linear-gradient(to bottom, #4f4f4f 1px, transparent 1px)`,
                    backgroundSize: '4rem 4rem',
                    maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 20%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 20%, transparent 100%)'
                }}
            />

            {/* Animated glowing orbs */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/30 blur-[120px]"
            />

            <motion.div
                animate={{
                    scale: [1, 1.5, 1],
                    x: [0, -100, 0],
                    y: [0, 100, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[150px]"
            />

            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    x: [0, 50, -50, 0],
                    y: [0, 50, 0],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[20%] left-[40%] w-[30%] h-[30%] rounded-full bg-purple-600/30 blur-[100px] z-10 mix-blend-screen"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-[#050505]/40 z-20" />

            {/* Additional Vignette Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] z-20 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
        </div>
    );
}
