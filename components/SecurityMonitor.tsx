"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { logout } from "@/app/admin/actions";

const INACTIVITY_TIMEOUT = 120; // 120 seconds limit
const WARNING_THRESHOLD = 30; // 30 seconds warning

export default function SecurityMonitor() {
    const [timeLeft, setTimeLeft] = useState(INACTIVITY_TIMEOUT);
    const router = useRouter();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isWarningRef = useRef(false);

    const showWarning = timeLeft <= WARNING_THRESHOLD;

    useEffect(() => {
        isWarningRef.current = showWarning;
    }, [showWarning]);

    const resetTimer = useCallback(() => {
        setTimeLeft(INACTIVITY_TIMEOUT);
    }, []);

    const handleLogout = useCallback(async () => {
        await logout();
        router.push("/login?error=session_expired");
    }, [router]);

    // Handle logout side-effect when time runs out
    useEffect(() => {
        if (timeLeft <= 0) {
            handleLogout();
        }
    }, [timeLeft, handleLogout]);

    useEffect(() => {
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        const handleActivity = () => {
            // Only reset if we are NOT in the warning state yet.
            // If in warning, user must click 'Continue' explicitly.
            if (!isWarningRef.current) {
                setTimeLeft(INACTIVITY_TIMEOUT);
            }
        };

        events.forEach(event => window.addEventListener(event, handleActivity));

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return (
        <>
            <AnimatePresence>
                {showWarning && (
                    <div key="session-warning-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="glass max-w-md w-full p-8 rounded-[2.5rem] border border-yellow-500/20 shadow-2xl shadow-yellow-500/10 text-center relative overflow-hidden"
                        >
                            {/* Background Decoration */}
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Timer size={120} className="text-yellow-500" />
                            </div>

                            <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mb-6 mx-auto border border-yellow-500/20 shadow-xl shadow-yellow-500/5">
                                <AlertTriangle className="w-10 h-10 text-yellow-500" />
                            </div>

                            <h2 className="text-2xl font-black tracking-tight text-white mb-3">Sesión por Expirar</h2>
                            <p className="text-gray-400 font-medium mb-8">
                                Por seguridad, tu sesión se cerrará en <span className="text-yellow-500 font-black">{timeLeft}s</span> debido a inactividad. ¿Deseas continuar?
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={resetTimer}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-yellow-500 text-black font-black rounded-2xl hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    CONTINUAR SESIÓN
                                </button>
                                <form action={logout}>
                                    <button
                                        type="submit"
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/5 text-gray-400 font-bold rounded-2xl hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        Cerrar ahora
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Minimal debug/status indicator in bottom corner (optional, can be removed) */}
            <div className="fixed bottom-4 left-4 z-50 pointer-events-none opacity-20 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 px-3 py-1 bg-black/50 backdrop-blur-xl border border-white/5 rounded-full text-[10px] text-gray-500 font-mono">
                    <ShieldCheck size={10} className="text-blue-500" />
                    SECURE SESSION: {timeLeft}s
                </div>
            </div>
        </>
    );
}
