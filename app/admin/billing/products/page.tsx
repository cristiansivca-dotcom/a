'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Save,
    X,
    Package,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/lib/confirm';
import Link from 'next/link';
import { CurrencyInputInline } from '@/components/ui/CurrencyInput';

interface Product {
    id: string;
    name: string;
    unit: string;
    price_usd: number;
}

export default function BillingProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form states
    const [newProduct, setNewProduct] = useState({ name: "", unit: "m²", price_usd: 0 });

    const supabase = createClient();
    const { success: toastSuccess, error: toastError } = useToast();
    const { confirm } = useConfirm();

    const fetchProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('billing_products')
                .select('*')
                .order('name');

            if (error) throw error;
            setProducts(data || []);
        } catch (err: unknown) {
            console.error("Error fetching products:", err);
            toastError("Error al cargar productos");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, toastError]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleAdd = async () => {
        if (!newProduct.name || newProduct.price_usd <= 0) {
            toastError("Por favor complete el nombre y precio");
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('billing_products')
                .insert([newProduct]);

            if (error) throw error;

            toastSuccess("Producto agregado");
            setIsAdding(false);
            setNewProduct({ name: "", unit: "m²", price_usd: 0 });
            fetchProducts();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error desconocido";
            toastError("Error al guardar: " + msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: "¿Eliminar producto?",
            message: "Esta acción no se puede deshacer.",
            confirmText: "Eliminar",
            cancelText: "Cancelar"
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('billing_products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toastSuccess("Producto eliminado");
            fetchProducts();
        } catch (err: unknown) {
            console.error("Error deleting product:", err);
            toastError("Error al eliminar");
        }
    };

    const handleUpdate = async (product: Product) => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('billing_products')
                .update({
                    name: product.name,
                    unit: product.unit,
                    price_usd: product.price_usd
                })
                .eq('id', product.id);

            if (error) throw error;
            toastSuccess("Producto actualizado");
            setEditingId(null);
            fetchProducts();
        } catch (err: unknown) {
            console.error("Error updating product:", err);
            toastError("Error al actualizar");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/billing">
                        <motion.button
                            whileHover={{ scale: 1.1, x: -2 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all"
                        >
                            <ArrowLeft size={20} />
                        </motion.button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white">Catálogo de Facturación</h1>
                        <p className="text-gray-500 text-sm font-medium">Gestiona los precios de venta independientes del inventario</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-white outline-none focus:border-purple-500/50 transition-all w-64"
                        />
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl shadow-xl shadow-purple-500/20 font-bold transition-all"
                    >
                        <Plus size={18} /> Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="px-4">
                <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Producto / Servicio</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Unidad</th>
                                <th className="px-8 py-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Precio USD</th>
                                <th className="px-8 py-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest text-transparent">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {/* New Product Row */}
                            <AnimatePresence>
                                {isAdding && (
                                    <motion.tr
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="bg-purple-500/5"
                                    >
                                        <td className="px-8 py-6">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Ej: Impresión Banner Front"
                                                value={newProduct.name}
                                                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                                className="w-full bg-white/10 border border-purple-500/30 rounded-xl py-2 px-4 text-white outline-none focus:border-purple-500"
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <select
                                                value={newProduct.unit}
                                                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                                                className="w-full bg-white/10 border border-purple-500/30 rounded-xl py-2 px-4 text-white outline-none"
                                            >
                                                <option value="m²">m²</option>
                                                <option value="m">m</option>
                                                <option value="unidad">Unidad</option>
                                                <option value="global">Global</option>
                                            </select>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-gray-500 font-bold">$</span>
                                                <CurrencyInputInline
                                                    value={newProduct.price_usd}
                                                    onChange={(val) => setNewProduct({ ...newProduct, price_usd: val })}
                                                    className="w-28"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={handleAdd}
                                                    disabled={isSaving}
                                                    className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-all"
                                                >
                                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => setIsAdding(false)}
                                                    className="p-2 bg-white/5 text-gray-400 rounded-xl hover:text-white transition-all"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                )}
                            </AnimatePresence>

                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        {editingId === product.id ? (
                                            <input
                                                type="text"
                                                value={product.name}
                                                onChange={(e) => {
                                                    const updated = [...products];
                                                    const idx = updated.findIndex(p => p.id === product.id);
                                                    updated[idx].name = e.target.value;
                                                    setProducts(updated);
                                                }}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white outline-none"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                                    <Package size={20} />
                                                </div>
                                                <span className="font-bold text-white">{product.name}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-center">
                                            {editingId === product.id ? (
                                                <select
                                                    value={product.unit}
                                                    onChange={(e) => {
                                                        const updated = [...products];
                                                        const idx = updated.findIndex(p => p.id === product.id);
                                                        updated[idx].unit = e.target.value;
                                                        setProducts(updated);
                                                    }}
                                                    className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white outline-none"
                                                >
                                                    <option value="m²">m²</option>
                                                    <option value="m">m</option>
                                                    <option value="unidad">Unidad</option>
                                                    <option value="global">Global</option>
                                                </select>
                                            ) : (
                                                <span className="px-3 py-1 bg-white/5 rounded-lg text-gray-400 text-xs font-black uppercase tracking-widest border border-white/5">
                                                    {product.unit}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-end gap-2 text-right">
                                            {editingId === product.id ? (
                                                <>
                                                    <span className="text-gray-500 font-bold">$</span>
                                                    <CurrencyInputInline
                                                        value={product.price_usd}
                                                        onChange={(val) => {
                                                            const updated = [...products];
                                                            const idx = updated.findIndex(p => p.id === product.id);
                                                            updated[idx].price_usd = val;
                                                            setProducts(updated);
                                                        }}
                                                        className="w-28"
                                                    />
                                                </>
                                            ) : (
                                                <span className="text-xl font-black text-white">
                                                    ${product.price_usd.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {editingId === product.id ? (
                                                <button
                                                    onClick={() => handleUpdate(product)}
                                                    className="p-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-all"
                                                >
                                                    <Save size={18} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingId(product.id)}
                                                    className="p-2 bg-white/5 text-gray-400 rounded-xl hover:text-white transition-all"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 bg-white/5 text-gray-400 rounded-xl hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && !isAdding && !isLoading && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-gray-500">
                                            <Package size={40} strokeWidth={1} />
                                            <p className="font-medium">No hay productos registrados en el catálogo</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {isLoading && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-gray-500">
                                            <Loader2 size={40} className="animate-spin text-purple-500" />
                                            <p className="font-medium animate-pulse">Cargando productos...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
