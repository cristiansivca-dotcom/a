"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SearchResult {
    id: string;
    nombre: string;
    especialidad: string;
    genero: string;
}

export default function GlobalSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            const { data } = await supabase
                .from("talents")
                .select("id, nombre, especialidad, genero")
                .or(`nombre.ilike.%${query}%,especialidad.ilike.%${query}%,tags.cs.{${query}}`)
                .limit(5);

            setResults(data as SearchResult[] || []);
            setLoading(false);
            setIsOpen(true);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, supabase]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (id: string) => {
        setIsOpen(false);
        setQuery("");
        router.push(`/admin/talents/${id}/edit`);
    };

    return (
        <div className="relative w-full max-w-xl" ref={searchRef}>
            <div className="relative w-full group">
                <Search className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                    loading ? "text-blue-500" : "text-gray-500 group-focus-within:text-white"
                )} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    placeholder="Buscar talentos, especialidades o etiquetas..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-12 py-3 text-sm outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all font-light"
                />
                {loading && (
                    <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                )}
                {query && !loading && (
                    <button
                        onClick={() => setQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isOpen && query.length >= 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        className="absolute w-full mt-2 glass border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                    >
                        {results.length > 0 ? (
                            <div className="py-2">
                                {results.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelect(result.id)}
                                        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/10 group-hover:bg-blue-600/20">
                                            <User className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{result.nombre}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{result.especialidad || result.genero}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500 italic text-sm">
                                No se encontraron talentos con &quot;{query}&quot;
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
