import { Clock, ArrowRight } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // If somehow the user got a role, bounce them back to the admin page
    const role = user.user_metadata?.role;
    if (role && role !== 'pending') {
        redirect("/admin/talents");
    }

    const userName = user.user_metadata?.full_name || "Usuario";

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                <div className="glass rounded-[2.5rem] p-6 sm:p-10 border border-white/5 shadow-2xl text-center relative overflow-hidden bg-black/40 backdrop-blur-xl">

                    <div className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mb-8 mx-auto border border-amber-500/20 shadow-2xl shadow-amber-500/20">
                        <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
                    </div>

                    <h1 className="text-3xl font-black tracking-tighter text-white mb-2">Cuenta Pendiente</h1>
                    <p className="text-gray-400 font-medium leading-relaxed mb-8">
                        Hola <span className="text-white font-bold">{userName}</span>, tu solicitud de acceso ha sido recibida y está <span className="text-amber-500 font-bold">pendiente de revisión</span> por un administrador.
                    </p>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 text-left">
                        <h3 className="text-sm font-bold text-white mb-2">¿Qué sigue?</h3>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li className="flex gap-2">
                                <ArrowRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>Un administrador evaluará tu solcitud y asignará el rol correspondiente.</span>
                            </li>
                            <li className="flex gap-2">
                                <ArrowRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>Intenta iniciar sesión nuevamente más tarde.</span>
                            </li>
                        </ul>
                    </div>

                    <form action={logout}>
                        <button
                            type="submit"
                            className="w-full bg-white/5 text-white hover:bg-white/10 hover:text-red-400 rounded-2xl px-6 py-4 font-bold text-sm transition-all shadow-lg shadow-white/5"
                        >
                            Cerrar Sesión
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
