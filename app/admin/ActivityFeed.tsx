"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TalentActivity {
    id: string;
    nombre: string;
    created_at: string;
    active: boolean;
}

interface ActivityFeedProps {
    initialTalents: TalentActivity[];
}

export default function ActivityFeed({ initialTalents }: ActivityFeedProps) {
    const [activities, setActivities] = useState<TalentActivity[]>(initialTalents);
    const supabase = createClient();

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `Hace ${diffInHours} h`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `Hace ${diffInDays} d`;
    };

    useEffect(() => {
        const channel = supabase
            .channel("dashboard_activity")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "talents",
                },
                (payload) => {
                    const newTalent = payload.new as TalentActivity;
                    setActivities((prev) => [newTalent, ...prev].slice(0, 4));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    return (
        <div className="space-y-4">
            {activities.length > 0 ? (
                activities.map((talent) => (
                    <div key={talent.id} className="flex items-center gap-5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors group cursor-pointer">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center overflow-hidden">
                            <Users className="w-6 h-6 text-gray-600 group-hover:text-blue-500/50 transition-colors" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm tracking-tight group-hover:text-blue-400 transition-colors">
                                Registro de {talent.nombre}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 font-medium italic">
                                Nuevo talento en Catálogo • {formatTimeAgo(talent.created_at)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-600 uppercase">Status</p>
                            <p className={cn(
                                "text-[10px] font-bold uppercase",
                                talent.active ? "text-blue-500" : "text-gray-500"
                            )}>
                                {talent.active ? "Activo" : "Inactivo"}
                            </p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-10 text-gray-500 font-medium italic">
                    No hay actividad reciente para mostrar.
                </div>
            )}
        </div>
    );
}
