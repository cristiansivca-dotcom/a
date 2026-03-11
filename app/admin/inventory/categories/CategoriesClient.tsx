"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, Plus, Search, ArrowLeft, Trash2, Edit2, Check, X, Tag } from "lucide-react";
import Link from "next/link";
import { createInventoryCategory, updateInventoryCategory, deleteInventoryCategory } from "../actions";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

type Category = {
    id: string;
    name: string;
};

export default function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
    const { success, error: toastError } = useToast();
    const { confirm } = useConfirm();
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [newName, setNewName] = useState("");
    const [loading, setLoading] = useState<string | boolean>(false);

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setLoading(true);
        const res = await createInventoryCategory(newName.trim());
        if (res.error) {
            toastError("Error: " + res.error);
        } else if (res.data) {
            success("Categoría creada con éxito.");
            setCategories([...categories, res.data]);
            setNewName("");
            setIsAdding(false);
        }
        setLoading(false);
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        setLoading(id);
        const res = await updateInventoryCategory(id, editName.trim());
        if (res.error) {
            toastError("Error al actualizar: " + res.error);
        } else if (res.data) {
            success("Categoría actualizada.");
            setCategories(categories.map(c => c.id === id ? res.data : c));
            setEditingId(null);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: "¿Eliminar categoría?",
            message: `¿Estás seguro de que deseas eliminar la categoría "${name}"?\nEsta acción puede fallar si existen artículos usándola.`,
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            variant: "danger"
        });

        if (confirmed) {
            setLoading(id);
            const res = await deleteInventoryCategory(id);
            if (res.error) {
                toastError("Error al eliminar: " + res.error + "\n\n(Es probable que haya artículos usando esta categoría).");
            } else {
                success("Categoría eliminada con éxito.");
                setCategories(categories.filter(c => c.id !== id));
            }
            setLoading(false);
        }
    };

    const startEditing = (cat: Category) => {
        setEditingId(cat.id);
        setEditName(cat.name);
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/inventory" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight">Categorías</h1>
                        <p className="text-gray-400 mt-1 font-medium italic">Administra los grupos de materiales del inventario.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Categoría
                    </button>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[2rem] border border-white/5 overflow-hidden p-6"
            >
                <div className="flex items-center gap-4 mb-6 relative">
                    <Search className="absolute left-4 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar categoría..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:border-purple-500/50 outline-none transition-all placeholder:text-gray-600 text-white"
                    />
                </div>

                <div className="space-y-3">
                    <AnimatePresence>
                        {isAdding && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                className="flex items-center gap-3 bg-white/[0.03] border border-white/10 p-3 rounded-2xl"
                            >
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                    <Tag className="w-4 h-4" />
                                </div>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Nombre de la nueva categoría"
                                    className="flex-1 bg-transparent border-none outline-none text-white font-medium text-sm placeholder:text-gray-600"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCreate}
                                        disabled={loading === true || !newName.trim()}
                                        className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { setIsAdding(false); setNewName(""); }}
                                        className="p-2 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {filteredCategories.length === 0 && !isAdding ? (
                            <div className="text-center py-12 text-gray-500 text-sm font-medium">
                                No se encontraron categorías.
                            </div>
                        ) : (
                            filteredCategories.map(cat => (
                                <motion.div
                                    key={cat.id}
                                    layout
                                    className="group flex items-center justify-between gap-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 p-3 rounded-2xl transition-all"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="p-2 rounded-xl bg-white/5 text-gray-400 border border-white/5 group-hover:text-purple-400 group-hover:bg-purple-500/10 group-hover:border-purple-500/20 transition-all">
                                            <Archive className="w-4 h-4" />
                                        </div>

                                        {editingId === cat.id ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 bg-white/5 border border-purple-500/50 rounded-lg px-3 py-1 outline-none text-white font-bold text-sm"
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                                            />
                                        ) : (
                                            <span className="font-bold text-gray-200 group-hover:text-white transition-colors">{cat.name}</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                                        {editingId === cat.id ? (
                                            <>
                                                <button
                                                    onClick={() => handleUpdate(cat.id)}
                                                    disabled={loading === cat.id || !editName.trim()}
                                                    className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => startEditing(cat)}
                                                    disabled={loading === cat.id}
                                                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id, cat.name)}
                                                    disabled={loading === cat.id}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
