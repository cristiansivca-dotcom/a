"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Sparkles, X, AlertCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    created_at: string;
    read: boolean;
    user_id?: string | null;
    role?: string | null;
}

interface HeaderNotificationsProps {
    userRole?: string | null;
    userId?: string | null;
}

export default function HeaderNotifications({ userRole, userId }: HeaderNotificationsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchInitial = async () => {
            let query = supabase
                .from("notifications")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10);

            // Apply filters: (my userId) OR (my role AND no specific userId) OR (no role AND no specific userId)
            const filters = [];
            if (userId) filters.push(`user_id.eq.${userId}`);
            if (userRole) filters.push(`and(role.eq.${userRole},user_id.is.null)`);
            filters.push('and(user_id.is.null,role.is.null)'); // Global

            query = query.or(filters.join(','));

            const { data, error } = await query;
            if (error) {
                console.error("Error fetching notifications:", error);
            }
            if (data) {
                setNotifications(data as Notification[]);
                const unread = (data as Notification[]).filter(n => !n.read).length;
                setUnreadCount(unread);
            }
        };

        fetchInitial();

        const channel = supabase
            .channel("header_notifications")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newNotif = payload.new as Notification;
                        const isForMe = !newNotif.user_id && !newNotif.role ||
                            newNotif.user_id === userId ||
                            newNotif.role === userRole;

                        if (isForMe) {
                            setNotifications(prev => [newNotif, ...prev].slice(0, 10));
                            setUnreadCount(prev => prev + 1);
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const oldId = (payload.old as { id: string }).id;
                        setNotifications(prev => prev.filter(n => n.id !== oldId));
                    }
                }
            )
            .subscribe();

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [supabase, userId, userRole]);

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'ahora';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;
        return `${Math.floor(diffInHours / 24)}d`;
    };

    const handleOpen = async () => {
        setIsOpen(!isOpen);
        if (!isOpen && unreadCount > 0) {
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));

            if (userId) {
                await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('user_id', userId)
                    .eq('read', false);
            }
        }
    };

    const markSingleAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);
    };

    const handleDelete = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => {
            const notif = notifications.find(n => n.id === id);
            return (notif && !notif.read) ? Math.max(0, prev - 1) : prev;
        });
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting notification:", error);
            // Optionally revert local state if it's critical, but usually for deletion we stay optimistic
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleOpen}
                className={cn(
                    "relative text-gray-400 hover:text-white transition-all duration-300 p-2.5 rounded-2xl hover:bg-white/5 active:scale-95",
                    isOpen && "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                )}
            >
                <Bell className={cn("w-5 h-5 transition-transform", isOpen && "scale-110")} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#030303] shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 15, scale: 0.95, filter: "blur(10px)" }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="absolute right-[-1rem] sm:right-0 mt-4 w-[calc(100vw-2rem)] sm:w-[360px] glass-iphone border border-white/20 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] z-[100] overflow-hidden"
                    >
                        <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div>
                                <h3 className="text-lg font-bold tracking-tight text-white">Notificaciones</h3>
                                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                                    {unreadCount} nuevas hoy
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="max-h-[450px] overflow-y-auto custom-scrollbar p-2">
                            {notifications.length > 0 ? (
                                <div className="space-y-1">
                                    {notifications.map((notification) => (
                                        <div key={notification.id} className="relative group overflow-hidden rounded-[1.5rem]">
                                            {/* Delete Action Background */}
                                            <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-[1.5rem]">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(notification.id);
                                                    }}
                                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors pointer-events-auto"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <motion.div
                                                drag="x"
                                                dragConstraints={{ left: -80, right: 0 }}
                                                dragElastic={0.1}
                                                onDragEnd={(e, info) => {
                                                    if (info.offset.x < -60) {
                                                        handleDelete(notification.id);
                                                    }
                                                }}
                                                onClick={() => markSingleAsRead(notification.id)}
                                                className={cn(
                                                    "p-4 rounded-[1.5rem] flex gap-4 transition-all duration-300 cursor-pointer relative z-10",
                                                    !notification.read
                                                        ? "bg-[#111111] border border-white/10 hover:bg-[#161616]"
                                                        : "bg-[#0a0a0a] border border-white/5 hover:bg-[#0f0f0f]"
                                                )}
                                                style={{ x: 0 }}
                                            >
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-inner transition-transform group-hover:scale-105",
                                                    notification.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/5" :
                                                        notification.type === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-500/5" :
                                                            notification.type === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/5" :
                                                                "bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-blue-500/5"
                                                )}>
                                                    {notification.type === 'success' ? <Sparkles className="w-6 h-6" /> :
                                                        notification.type === 'warning' ? <AlertCircle className="w-6 h-6" /> :
                                                            notification.type === 'error' ? <X className="w-6 h-6" /> :
                                                                <Bell className="w-6 h-6" />}
                                                </div>

                                                <div className="flex-1 min-w-0 py-0.5 pointer-events-none">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <p className={cn(
                                                            "text-[13px] font-bold leading-tight transition-colors",
                                                            !notification.read ? "text-white" : "text-gray-300"
                                                        )}>
                                                            {notification.title}
                                                        </p>
                                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap pt-0.5">
                                                            {formatTimeAgo(notification.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className={cn(
                                                        "text-[12px] mt-1 line-clamp-2 leading-snug transition-colors",
                                                        !notification.read ? "text-gray-100" : "text-gray-400"
                                                    )}>
                                                        {notification.message}
                                                    </p>
                                                </div>

                                                {!notification.read && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                                )}
                                            </motion.div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center px-10">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                                        <Bell className="w-8 h-8 text-gray-600 opacity-40" />
                                    </div>
                                    <h4 className="text-white font-bold text-sm">Todo al día</h4>
                                    <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                                        No tienes notificaciones pendientes. Vuelve más tarde para ver las novedades.
                                    </p>
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-4 bg-white/[0.02] border-t border-white/10">
                                <button className="w-full py-3 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95">
                                    Ver todo el historial
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
