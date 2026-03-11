"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowDownRight, ArrowUpRight, Save, AlertCircle } from "lucide-react";
import { createTransaction } from "./actions";
import { cn } from "@/lib/utils";

type ModalProps = {
    item: { id: string; name: string; quantity: number; unit: string };
    type: 'IN' | 'OUT';
    onClose: () => void;
};

export default function TransactionModal({ item, type, onClose }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isOut = type === 'OUT';

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        formData.append("item_id", item.id);
        formData.append("transaction_type", type);

        const qStr = formData.get("quantity") as string;
        const qNum = parseFloat(qStr);

        if (isOut && qNum > item.quantity) {
            setError(`No puedes registrar la salida de más cantidad de la que hay disponible (${item.quantity} ${item.unit}).`);
            setLoading(false);
            return;
        }

        const result = await createTransaction(formData);

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            onClose();
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-md glass rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden"
                >
                    <div className={cn(
                        "absolute top-0 left-0 right-0 h-1",
                        isOut ? "bg-orange-500" : "bg-green-500"
                    )} />

                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center border",
                                isOut
                                    ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                    : "bg-green-500/10 text-green-500 border-green-500/20"
                            )}>
                                {isOut ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight">
                                    {isOut ? "Registrar Salida/Uso" : "Registrar Entrada"}
                                </h3>
                                <p className="text-xs text-gray-400 font-medium">
                                    Artículo: <span className="text-white font-bold">{item.name}</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                            <span className="text-sm text-gray-400 font-medium">Stock Actual Disponible</span>
                            <div className="text-right">
                                <span className="text-2xl font-black text-white">{item.quantity}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest font-bold ml-1">{item.unit}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                    Cantidad a {isOut ? "Restar" : "Sumar"}
                                </label>
                                <div className="relative">
                                    <input
                                        name="quantity"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 pr-16 text-sm outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all font-medium text-white placeholder:text-gray-600"
                                        placeholder={`Ej: ${isOut ? "9" : "50"}`}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 uppercase">
                                        {item.unit}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                    Descripción / Motivo
                                </label>
                                <input
                                    name="description"
                                    type="text"
                                    required
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all font-medium text-white placeholder:text-gray-600"
                                    placeholder={isOut ? "Ej: Lona publicitaria para evento corporativo" : "Ej: Compra de nuevo rollo al proveedor X"}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-medium flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg",
                                    isOut
                                        ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                                        : "bg-green-500 hover:bg-green-600 shadow-green-500/20"
                                )}
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Confirmar
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
