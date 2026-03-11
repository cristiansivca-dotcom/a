"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast";

export default function NotificationListener() {
    const { success } = useToast();
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase
            .channel("public:talents")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "talents",
                },
                (payload) => {
                    const newTalent = payload.new as { nombre: string };
                    success(`¡Nuevo talento registrado! ${newTalent.nombre} se ha unido al catálogo.`);

                    // Trigger a custom event for local components to react
                    window.dispatchEvent(new CustomEvent("new-talent-registration", {
                        detail: payload.new
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, success]);

    return null; // This component doesn't render anything UI-wise
}
