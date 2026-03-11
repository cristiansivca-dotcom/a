"use client";

import { useState } from "react";
import { Archive, ArrowDownRight, ArrowUpRight, History, Package, Plus, Search, Trash2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import TransactionModal from "./TransactionModal";
import { deleteInventoryItem } from "./actions";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

type Item = {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unit_price_usd: number;
    material_height: number;
    material_width: number;
    min_quantity: number;
    category?: { name: string };
}

type Category = {
    id: string;
    name: string;
}

export default function InventoryClient({ initialItems, categories }: { initialItems: Item[], categories: Category[] }) {
    const { success, error: toastError } = useToast();
    const { confirm } = useConfirm();
    const [searchQuery, setSearchQuery] = useState("");
    const [items, setItems] = useState<Item[]>(initialItems);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [transactionType, setTransactionType] = useState<'IN' | 'OUT'>('OUT');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openTransaction = (item: Item, type: 'IN' | 'OUT') => {
        setSelectedItem(item);
        setTransactionType(type);
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: "¿Eliminar artículo?",
            message: `¿Estás seguro de que deseas eliminar "${name}" del inventario ? Esta acción no se puede deshacer y podría fallar si el artículo tiene historial de movimientos.`,
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            variant: "danger"
        });

        if (confirmed) {
            setIsDeleting(id);
            const result = await deleteInventoryItem(id);
            if (result.error) {
                toastError("Error al eliminar el artículo: " + result.error + ". Si el artículo tiene historial, no puede ser eliminado por seguridad.");
            } else {
                success("Artículo eliminado con éxito.");
                setItems(items.filter(i => i.id !== id));
            }
            setIsDeleting(null);
        }
    };

    return (
        <div className="space-y-10">
            {/* Header Stats */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight">Inventario Global</h1>
                    <p className="text-gray-400 mt-1 font-medium italic">Gestión y control de activos del ecosistema SIVCA.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/admin/inventory/categories" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white rounded-xl px-4 py-2 text-sm font-bold border border-white/10 transition-all">
                        <Archive className="w-4 h-4" />
                        Categorías
                    </Link>
                    <Link href="/admin/inventory/history" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white rounded-xl px-4 py-2 text-sm font-bold border border-white/10 transition-all">
                        <History className="w-4 h-4" />
                        Historial
                    </Link>
                    <Link href="/admin/inventory/add" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all">
                        <Plus className="w-4 h-4" />
                        Nuevo Artículo
                    </Link>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass p-6 rounded-3xl border border-white/5 glass-hover group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500 text-blue-500">
                            <Package className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Total Artículos</p>
                        <h3 className="text-3xl font-black mt-1 text-gradient">{initialItems.length}</h3>
                    </div>
                </div>
                <div className="glass p-6 rounded-3xl border border-white/5 glass-hover group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500 text-purple-500">
                            <Archive className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Categorías</p>
                        <h3 className="text-3xl font-black mt-1 text-gradient">{categories.length}</h3>
                    </div>
                </div>

                <div className="glass p-6 rounded-3xl border border-white/5 glass-hover group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500 text-red-500">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Stock Bajo</p>
                        <h3 className="text-3xl font-black mt-1 text-red-500">
                            {initialItems.filter(i => i.quantity <= i.min_quantity).length}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Inventory List */}
            <div className="glass rounded-[2rem] p-8 border border-white/5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <h2 className="text-xl font-black tracking-tight">Artículos Registrados</h2>

                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar material..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="pb-4 pt-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Artículo</th>
                                <th className="pb-4 pt-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Categoría</th>
                                <th className="pb-4 pt-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Precio ($)</th>
                                <th className="pb-4 pt-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Stock Actual</th>
                                <th className="pb-4 pt-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredItems.length > 0 ? filteredItems.map((item) => {
                                const isLowStock = item.quantity <= item.min_quantity;
                                return (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{item.name}</p>
                                                    <div className="flex gap-2">
                                                        {isLowStock && <span className="text-[10px] text-red-400 font-bold uppercase">Stock Bajo</span>}
                                                        {(item.material_height > 0 && item.material_width > 0) && (
                                                            <span className="text-[10px] text-blue-400 font-bold uppercase">
                                                                {item.material_height}m x {item.material_width}m
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-400">
                                            <span className="px-2.5 py-1 bg-white/5 rounded-full text-xs font-medium border border-white/10">
                                                {item.category?.name || "Sin Categoría"}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-white text-sm">
                                                    ${(item.unit_price_usd || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={cn("font-black text-lg", isLowStock ? "text-red-400" : "text-white")}>
                                                    {item.quantity}
                                                </span>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openTransaction(item, 'IN')}
                                                    className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors tooltip-trigger"
                                                    title="Registrar Entrada"
                                                >
                                                    <ArrowDownRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openTransaction(item, 'OUT')}
                                                    className="p-2 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors tooltip-trigger"
                                                    title="Registrar Salida/Uso"
                                                >
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id, item.name)}
                                                    disabled={isDeleting === item.id}
                                                    className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors tooltip-trigger disabled:opacity-50"
                                                    title="Eliminar Artículo"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-gray-500">
                                        No se encontraron artículos en el inventario.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {
                selectedItem && (
                    <TransactionModal
                        item={selectedItem}
                        type={transactionType}
                        onClose={() => setSelectedItem(null)}
                    />
                )
            }
        </div >
    );
}
