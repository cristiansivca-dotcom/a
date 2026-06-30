"use client";

import { Suspense, useState } from "react";
import { login, signInWithGitHub } from "./actions";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import AnimatedBackground from "@/components/AnimatedBackground";

function LoginForm() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [githubLoading, setGithubLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ email?: boolean; password?: boolean }>({});

    const getErrorMessage = () => {
        const errorCode = searchParams.get('error');
        if (errorCode === 'unconfirmed') return "Tu cuenta aún no ha sido activada. Por favor, revisa tu correo y haz clic en el enlace de confirmación.";
        if (errorCode === 'session_expired') return "Tu sesión ha expirado por inactividad. Por favor, ingresa de nuevo.";
        if (errorCode === 'blocked') return "Tu acceso ha sido restringido por un administrador. Contacta al soporte para más información.";
        if (errorCode === 'concurrent_session') return "Se ha iniciado sesión en otro dispositivo. Esta sesión ha sido cerrada.";
        if (errorCode === 'auth_callback_failed') return "Error al autenticar con GitHub o el proveedor. Por favor, intenta de nuevo.";
        return null;
    };

    const [error, setError] = useState<string | null>(getErrorMessage());

    async function handleGitHubLogin() {
        setGithubLoading(true);
        setError(null);
        const result = await signInWithGitHub();
        if (result?.error) {
            setError(result.error);
            setGithubLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const newErrors: { email?: boolean; password?: boolean } = {};
        if (!email) newErrors.email = true;
        if (!password) newErrors.password = true;

        if (Object.keys(newErrors).length > 0) {
            setFieldErrors(newErrors);
            setTimeout(() => setFieldErrors({}), 500);
            return;
        }

        setLoading(true);
        setError(null);

        const result = await login(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
            {/* Premium Animated Background */}
            <AnimatedBackground />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                <div className="glass rounded-[2rem] p-6 sm:p-10 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden bg-black/40">

                    {/* Logo Segment */}
                    <div className="flex flex-col items-center justify-center gap-4 mb-8 relative z-10">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="w-20 h-20 bg-black/50 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 border border-white/10 overflow-hidden"
                        >
                            <Image
                                src="/logo_sivca.png"
                                alt="SIVCA Logo"
                                width={60}
                                height={60}
                                className="object-contain"
                                priority
                            />
                        </motion.div>
                        <div className="text-center">
                            <span className="text-3xl font-black tracking-tighter text-gradient block">SIVCA Admin</span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500/80 mt-1 block">Acceso Administrativo</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10" noValidate>
                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                Identificación de Acceso
                            </label>
                            <motion.div
                                animate={fieldErrors.email ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
                                transition={{ duration: 0.4 }}
                                className="relative"
                            >
                                <Mail className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                                    fieldErrors.email ? "text-red-500" : "text-gray-500"
                                )} />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    suppressHydrationWarning
                                    className={cn(
                                        "w-full bg-white/[0.03] border rounded-2xl px-12 py-4 text-sm outline-none transition-all font-medium",
                                        fieldErrors.email
                                            ? "border-red-500/50 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                                            : "border-white/5 focus:border-blue-500/50 focus:bg-white/[0.07]"
                                    )}
                                    placeholder="admin@sivca.com"
                                />
                            </motion.div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                Clave de Seguridad
                            </label>
                            <motion.div
                                animate={fieldErrors.password ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
                                transition={{ duration: 0.4 }}
                                className="relative"
                            >
                                <Lock className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                                    fieldErrors.password ? "text-red-500" : "text-gray-500"
                                )} />
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    suppressHydrationWarning
                                    className={cn(
                                        "w-full bg-white/[0.03] border rounded-2xl px-12 py-4 text-sm outline-none transition-all font-medium",
                                        fieldErrors.password
                                            ? "border-red-500/50 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                                            : "border-white/5 focus:border-blue-500/50 focus:bg-white/[0.07]"
                                    )}
                                    placeholder="••••••••"
                                />
                            </motion.div>
                            <div className="flex justify-end pt-1">
                                <Link href="/forgot-password" className="text-xs text-blue-500/80 hover:text-blue-400 font-medium transition-colors">
                                    ¿Olvidaste tu clave?
                                </Link>
                            </div>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-xs font-medium flex items-center gap-3"
                                >
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || githubLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-6 py-3 font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                            {loading ? "Iniciando..." : (
                                <>
                                    Iniciar Sesión
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/5"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0b0c10] px-3 text-gray-500 font-bold tracking-widest">O continuar con</span>
                            </div>
                        </div>

                        {/* Social Buttons */}
                        <div className="flex flex-col gap-4">
                            {/* GitHub Button */}
                            <button
                                type="button"
                                onClick={handleGitHubLogin}
                                disabled={loading || githubLoading}
                                className="w-full bg-[#24292e] text-white rounded-xl px-4 py-3 font-bold hover:bg-[#2c3238] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {githubLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                    </svg>
                                )}
                                {githubLoading ? "Conectando..." : "GitHub"}
                            </button>
                        </div>
                    </form>

                </div>
            </motion.div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
