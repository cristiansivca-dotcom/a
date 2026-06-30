"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Users, UserPlus, LogOut, Package, ShieldCheck, Menu, X, Settings, ClipboardList } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { logout } from "./actions";
import { createClient } from "@/lib/supabase/client";

import HeaderNotifications from "@/components/HeaderNotifications";
import GlobalSearch from "@/components/GlobalSearch";
import SecurityMonitor from "@/components/SecurityMonitor";

interface NavItemProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
    active: boolean;
    onClick?: () => void;
}

const NavItem = ({ icon: Icon, label, href, active, onClick }: NavItemProps) => (
    <Link href={href} onClick={onClick}>
        <div
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer group",
                active
                    ? "bg-blue-600/10 text-blue-500 border border-blue-500/10 shadow-lg shadow-blue-500/5"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
        >
            <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", active && "animate-pulse")} />
            <span className="font-medium">{label}</span>
        </div>
    </Link>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Usuario");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        async function fetchUser() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                setUserRole(user.user_metadata?.role || 'catalogo');
                setUserName(user.user_metadata?.full_name || 'Usuario');
                setAvatarUrl(user.user_metadata?.avatar_url || null);
            }
        }
        fetchUser();
    }, []);

    // Close sidebar on route change
    useEffect(() => {
        const timer = setTimeout(() => setIsSidebarOpen(false), 0);
        return () => clearTimeout(timer);
    }, [pathname]);

    return (
        <div className="min-h-screen flex bg-[#000000] relative">
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={cn(
                "w-72 border-r border-white/5 p-6 flex flex-col gap-8 glass sticky top-0 h-screen transition-transform duration-300 z-50",
                "fixed md:sticky left-0 md:translate-x-0 bg-black md:bg-transparent",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shadow-lg border border-white/10 overflow-hidden">
                            <Image
                                src="/logo_sivca.png"
                                alt="SIVCA Logo"
                                width={28}
                                height={28}
                                className="object-contain"
                            />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-gradient">SIVCA Admin</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-2 text-gray-400 hover:text-white md:hidden"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 flex flex-col gap-2">
                    {(userRole === 'admin' || userRole === 'catalogo') && (
                        <>
                            <NavItem
                                icon={LayoutDashboard}
                                label="Resumen"
                                href="/admin"
                                active={pathname === "/admin"}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                            <NavItem
                                icon={Users}
                                label="Catálogo"
                                href="/admin/talents"
                                active={pathname === "/admin/talents"}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                            <NavItem
                                icon={UserPlus}
                                label="Agregar Talento"
                                href="/admin/talents/add"
                                active={pathname === "/admin/talents/add"}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                        </>
                    )}
                    {(userRole === 'admin' || userRole === 'inventario') && (
                        <>
                            <NavItem
                                icon={Package}
                                label="Inventario"
                                href="/admin/inventory"
                                active={pathname === "/admin/inventory"}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                        </>
                    )}
                    {(userRole === 'admin' || userRole === 'billing') && (
                        <>
                            <NavItem
                                icon={ClipboardList}
                                label="Inspecciones"
                                href="/admin/billing"
                                active={pathname.startsWith("/admin/billing")}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                        </>
                    )}
                    {userRole === 'admin' && (
                        <>
                            <NavItem
                                icon={ShieldCheck}
                                label="Usuarios"
                                href="/admin/users"
                                active={pathname === "/admin/users"}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                        </>
                    )}
                    <div className="h-px bg-white/5 my-2" />
                    <NavItem
                        icon={Settings}
                        label="Mi Cuenta"
                        href="/admin/profile"
                        active={pathname === "/admin/profile"}
                        onClick={() => setIsSidebarOpen(false)}
                    />
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5">
                    <button
                        onClick={async () => {
                            const supabase = createClient();
                            await supabase.auth.signOut();
                            window.location.href = "/login";
                        }}
                        className="flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
                    >
                        <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <header className="h-20 border-b border-white/5 px-4 md:px-8 flex items-center justify-between glass sticky top-0 z-30">
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 text-gray-400 hover:text-white md:hidden bg-white/5 rounded-xl border border-white/10"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <GlobalSearch />
                    </div>

                    <div className="flex items-center gap-6">
                        <HeaderNotifications userRole={userRole} userId={userId} />
                        <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-white/5">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold tracking-tight">{userName}</p>
                                <p className="text-[10px] text-blue-500 font-mono uppercase tracking-widest">
                                    {userRole === 'inventario' ? 'Inventario' :
                                        userRole === 'billing' ? 'Facturación' :
                                            userRole === 'catalogo' ? 'Catálogo' : 'Administrador'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 border border-white/10 shadow-lg p-0.5">
                                <div className="w-full h-full rounded-[14px] overflow-hidden bg-black/40 flex items-center justify-center relative">
                                    {avatarUrl ? (
                                        <Image
                                            src={avatarUrl}
                                            alt={userName}
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-cover"
                                            onError={() => setAvatarUrl(null)}
                                        />
                                    ) : (
                                        <ShieldCheck className="w-4 h-4 text-white/50" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.99 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
            <SecurityMonitor />
        </div>
    );
}
