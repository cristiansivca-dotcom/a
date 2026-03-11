"use client";

import { useState } from "react";
import { resetPassword } from "./actions";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ email?: boolean }>({});

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;

        const newErrors: { email?: boolean } = {};
        if (!email) newErrors.email = true;

        if (Object.keys(newErrors).length > 0) {
            setFieldErrors(newErrors);
            setTimeout(() => setFieldErrors({}), 500);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        const result = await resetPassword(formData);

        if (result?.error) {
            setError(result.error);
        } else if (result?.success) {
            setSuccess(true);
        }

        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

            <Link href="/login" className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-white transition-colors group z-20">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium tracking-wide">Volver</span>
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[420px] relative z-10"
            >
                <div className="glass rounded-[2rem] p-10 border border-white/[0.08] shadow-2xl bg-black/40 backdrop-blur-xl relative">

                    {/* Header */}
                    <div className="flex flex-col items-center justify-center gap-5 mb-10 text-center">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: -5 }}
                            className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-white/10"
                        >
                            <Sparkles className="w-8 h-8 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white mb-2">Recuperar Contraseña</h1>
                            <p className="text-sm font-medium text-gray-400 max-w-[280px] leading-relaxed mx-auto">
                                Ingresa la dirección de correo asociada a tu cuenta y te enviaremos un enlace para restablecerla.
                            </p>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success-message"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col items-center justify-center text-center space-y-4 py-8"
                            >
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">¡Enlace Enviado!</h3>
                                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                    Hemos enviado las instrucciones a tu correo electrónico. Por favor, revisa tu bandeja de entrada (y la carpeta de spam).
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full"
                            >
                                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
                                            Correo Electrónico
                                        </label>
                                        <motion.div
                                            animate={fieldErrors.email ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
                                            transition={{ duration: 0.4 }}
                                            className="relative"
                                        >
                                            <Mail className={cn(
                                                "absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors duration-300",
                                                fieldErrors.email ? "text-red-400" : "text-gray-500 focus-within:text-blue-400"
                                            )} />
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                className={cn(
                                                    "w-full bg-black/40 border rounded-2xl px-11 py-4 text-sm outline-none transition-all placeholder:text-gray-600 font-medium text-white shadow-inner",
                                                    fieldErrors.email
                                                        ? "border-red-500/50 focus:border-red-500/50 bg-red-500/5"
                                                        : "border-white/10 focus:border-blue-500/50 hover:border-white/20"
                                                )}
                                                placeholder="tu@email.com"
                                            />
                                        </motion.div>
                                    </div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-semibold flex items-center gap-2.5 mt-2">
                                                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
                                                    {error}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-blue-600 hover:from-blue-500 to-indigo-600 hover:to-indigo-500 text-white rounded-2xl px-6 py-4 font-bold text-sm shadow-[0_4px_24px_rgba(79,70,229,0.25)] hover:shadow-[0_4px_32px_rgba(79,70,229,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 group"
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Enviando...</span>
                                            </div>
                                        ) : (
                                            <>
                                                Enviar Enlace
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
