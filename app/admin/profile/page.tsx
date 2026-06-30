"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Lock, Mail, Save, ArrowLeft, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { updateProfileName, updatePassword, updateEmail } from "./actions";
import { useToast } from "@/lib/toast";
import { type User as SupabaseUser } from "@supabase/supabase-js";

export default function ProfilePage() {
    const { success, error: toastError } = useToast();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Form states
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        async function fetchUser() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                setFullName(user.user_metadata?.full_name || "");
                setEmail(user.email || "");
            }
            setLoading(false);
        }
        fetchUser();
    }, []);

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim()) return;

        setActionLoading("name");
        const result = await updateProfileName(fullName);
        if (result.success) {
            success("Nombre actualizado con éxito.");
        } else {
            toastError(result.error || "Error al actualizar el nombre");
        }
        setActionLoading(null);
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            toastError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        if (password !== confirmPassword) {
            toastError("Las contraseñas no coinciden.");
            return;
        }

        setActionLoading("password");
        const result = await updatePassword(password);
        if (result.success) {
            success("Contraseña actualizada con éxito.");
            setPassword("");
            setConfirmPassword("");
        } else {
            toastError(result.error || "Error al actualizar la contraseña");
        }
        setActionLoading(null);
    };

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || email === user?.email) return;

        setActionLoading("email");
        const result = await updateEmail(email);
        if (result.success) {
            success("Solicitud enviada. Revisa tus correos electrónicos.");
        } else {
            toastError(result.error || "Error al actualizar el correo");
        }
        setActionLoading(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight flex items-center gap-3">
                        Configuración <Image src="/logo_sivca.png" alt="SIVCA" width={32} height={32} className="object-contain opacity-50" />
                    </h1>
                    <p className="text-gray-400 mt-1 font-medium italic">Gestiona tu identidad y seguridad en el sistema.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass rounded-[2rem] border border-white/5 p-8 flex flex-col items-center text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 blur-2xl -z-10" />

                        <div className="relative group">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-1 shadow-2xl shadow-blue-500/20">
                                <div className="w-full h-full rounded-[22px] overflow-hidden bg-black/40 flex items-center justify-center relative">
                                    {user?.user_metadata?.avatar_url ? (
                                        <img src={user.user_metadata.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-10 h-10 text-white/20" />
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-white text-black p-2 rounded-xl border border-white/10 shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
                                <Camera className="w-4 h-4" />
                            </div>
                        </div>

                        <h2 className="mt-6 text-xl font-bold tracking-tight text-white">{fullName}</h2>
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                            {user?.user_metadata?.role || "Administrador"}
                        </p>

                        <div className="w-full mt-8 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-500 bg-white/5 p-3 rounded-2xl border border-white/5">
                                <Mail className="w-4 h-4 text-blue-500" />
                                <span className="truncate">{email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-blue-500/60 font-medium px-4">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Cuenta Verificada con {user?.app_metadata?.provider === 'github' ? 'GitHub' : 'Email'}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Forms Section */}
                <div className="md:col-span-2 space-y-6">
                    {/* General Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass rounded-[2rem] border border-white/5 p-8"
                    >
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                            Información General <div className="h-1 flex-1 bg-white/5 rounded-full" />
                        </h3>
                        <form onSubmit={handleUpdateName} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-12 py-4 text-sm outline-none focus:border-blue-500/50 transition-all font-medium text-white"
                                        placeholder="Tu nombre"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={actionLoading === "name"}
                                    className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {actionLoading === "name" ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </motion.div>

                    {/* Security Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass rounded-[2rem] border border-white/5 p-8"
                    >
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                            Seguridad <div className="h-1 flex-1 bg-white/5 rounded-full" />
                        </h3>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-12 py-4 text-sm outline-none focus:border-blue-500/50 transition-all font-medium text-white"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-12 py-4 text-sm outline-none focus:border-blue-500/50 transition-all font-medium text-white"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl">
                                <div className="flex items-center gap-3 text-xs text-blue-400 font-medium">
                                    <AlertCircle className="w-4 h-4" />
                                    Se cerrarán otras sesiones activas por seguridad.
                                </div>
                                <button
                                    type="submit"
                                    disabled={actionLoading === "password"}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                >
                                    {actionLoading === "password" ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
                                    Actualizar
                                </button>
                            </div>
                        </form>
                    </motion.div>

                    {/* Email Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass rounded-[2rem] border border-white/5 p-8"
                    >
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                            Correo de Acceso <div className="h-1 flex-1 bg-white/5 rounded-full" />
                        </h3>
                        <form onSubmit={handleUpdateEmail} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-12 py-4 text-sm outline-none focus:border-blue-500/50 transition-all font-medium text-white"
                                        placeholder="tu@email.com"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={actionLoading === "email" || email === user?.email}
                                    className="bg-white/5 text-white border border-white/10 px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {actionLoading === "email" ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Mail className="w-4 h-4" />}
                                    Cambiar Correo
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div >
    );
}
