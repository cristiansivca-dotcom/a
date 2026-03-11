"use client";

import { useState, useEffect } from "react";
import { updatePassword } from "./actions";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ password?: boolean; confirmPassword?: boolean }>({});
    const [sessionReady, setSessionReady] = useState<boolean | 'checking'>('checking');

    useEffect(() => {
        const supabase = createClient();

        const checkInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setSessionReady(true);
            } else {
                // Wait for onAuthStateChange or timeout
                setTimeout(() => {
                    setSessionReady(current => {
                        if (current === 'checking') {
                            setError("No se detectó un token de recuperación válido. Por favor, asegúrate de entrar desde el enlace de tu correo o solicita uno nuevo.");
                            return false;
                        }
                        return current;
                    });
                }, 3000);
            }
        };

        checkInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" || session) {
                setSessionReady(true);
                setError(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (sessionReady !== true) {
            setError("No hay una sesión activa para cambiar la contraseña. Vuelve a solicitar el enlace.");
            return;
        }

        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        const newErrors: { password?: boolean; confirmPassword?: boolean } = {};
        if (!password || password.length < 6) newErrors.password = true;
        if (password !== confirmPassword) newErrors.confirmPassword = true;

        if (Object.keys(newErrors).length > 0) {
            setFieldErrors(newErrors);
            setTimeout(() => setFieldErrors({}), 500);
            return;
        }

        setLoading(true);
        setError(null);

        const result = await updatePassword(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else if (result?.success) {
            router.push("/admin");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
            <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[420px] relative z-10"
            >
                <div className="glass rounded-[2rem] p-10 border border-white/[0.08] shadow-2xl bg-black/40 backdrop-blur-xl relative">

                    <div className="flex flex-col items-center justify-center gap-5 mb-10 text-center">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: -5 }}
                            className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-white/10"
                        >
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white mb-2">Nueva Contraseña</h1>
                            <p className="text-sm font-medium text-gray-400 max-w-[280px] leading-relaxed mx-auto">
                                Ingresa tu nueva contraseña para acceder al sistema.
                            </p>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {sessionReady === 'checking' ? (
                            <motion.div
                                key="checking"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-12 space-y-4"
                            >
                                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                <p className="text-sm font-medium text-gray-400">Verificando enlace...</p>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onSubmit={handleSubmit}
                                className="space-y-6"
                                noValidate
                            >
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
                                        Nueva Contraseña
                                    </label>
                                    <motion.div
                                        animate={fieldErrors.password ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
                                        className="relative"
                                    >
                                        <Lock className={cn(
                                            "absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors",
                                            fieldErrors.password ? "text-red-400" : "text-gray-500 focus-within:text-blue-400"
                                        )} />
                                        <input
                                            name="password"
                                            type="password"
                                            className={cn(
                                                "w-full bg-black/40 border rounded-2xl px-11 py-4 text-sm outline-none transition-all placeholder:text-gray-600 font-medium text-white",
                                                fieldErrors.password ? "border-red-500/50" : "border-white/10 focus:border-blue-500/50"
                                            )}
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </motion.div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
                                        Confirmar Contraseña
                                    </label>
                                    <motion.div
                                        animate={fieldErrors.confirmPassword ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
                                        className="relative"
                                    >
                                        <Lock className={cn(
                                            "absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors",
                                            fieldErrors.confirmPassword ? "text-red-400" : "text-gray-500 focus-within:text-blue-400"
                                        )} />
                                        <input
                                            name="confirmPassword"
                                            type="password"
                                            className={cn(
                                                "w-full bg-black/40 border rounded-2xl px-11 py-4 text-sm outline-none transition-all placeholder:text-gray-600 font-medium text-white",
                                                fieldErrors.confirmPassword ? "border-red-500/50" : "border-white/10 focus:border-blue-500/50"
                                            )}
                                            placeholder="Repite tu contraseña"
                                        />
                                    </motion.div>
                                </div>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                        >
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-semibold flex items-center gap-2.5">
                                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                                                {error}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-emerald-500 hover:from-emerald-400 to-blue-600 hover:to-blue-500 text-white rounded-2xl px-6 py-4 font-bold text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Actualizando...</span>
                                        </div>
                                    ) : (
                                        <>
                                            Actualizar Contraseña
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
