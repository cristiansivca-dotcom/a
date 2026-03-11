"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Search, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Format date helper
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
};

export default function HistoryClient({ initialTransactions }: { initialTransactions: any[] }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredTransactions = initialTransactions.filter(tx =>
        tx.item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/inventory" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight">Historial de Movimientos</h1>
                        <p className="text-gray-400 mt-1 font-medium italic">Registro detallado de entradas y salidas de inventario.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar en el historial..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all w-full md:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Content Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[2rem] border border-white/5 overflow-hidden"
            >
                {filteredTransactions.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No se encontraron movimientos</h3>
                        <p className="text-gray-400 text-sm max-w-md">
                            Aún no se han registrado entradas o salidas de material, o tu búsqueda no arrojó resultados.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="p-4 pl-6 text-[10px] font-black tracking-widest uppercase text-gray-500 whitespace-nowrap">Fecha y Hora</th>
                                    <th className="p-4 text-[10px] font-black tracking-widest uppercase text-gray-500 whitespace-nowrap">Tipo</th>
                                    <th className="p-4 text-[10px] font-black tracking-widest uppercase text-gray-500 whitespace-nowrap">Artículo</th>
                                    <th className="p-4 text-[10px] font-black tracking-widest uppercase text-gray-500 whitespace-nowrap">Cantidad</th>
                                    <th className="p-4 pr-6 text-[10px] font-black tracking-widest uppercase text-gray-500">Descripción / Motivo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4 pl-6 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-gray-300 font-medium tracking-tight">
                                                <Calendar className="w-4 h-4 text-gray-500" />
                                                {formatDate(tx.created_at)}
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            {tx.transaction_type === 'IN' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold uppercase tracking-wider">
                                                    <ArrowDownRight className="w-3.5 h-3.5" /> Entrada
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold uppercase tracking-wider">
                                                    <ArrowUpRight className="w-3.5 h-3.5" /> Salida
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className="text-white font-bold">{tx.item?.name || 'Artículo Eliminado'}</span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={cn(
                                                "font-black text-lg font-mono",
                                                tx.transaction_type === 'IN' ? "text-green-400" : "text-orange-400"
                                            )}>
                                                {tx.transaction_type === 'IN' ? '+' : '-'}{tx.quantity}
                                            </span>
                                            <span className="text-xs text-gray-500 uppercase font-bold ml-1">{tx.item?.unit}</span>
                                        </td>
                                        <td className="p-4 pr-6">
                                            <p className="text-sm text-gray-400 font-medium line-clamp-2">
                                                {tx.description || <span className="text-gray-600 italic">Sin descripción</span>}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
