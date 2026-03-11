"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Tag, ArrowLeft, Save, Scale, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createInventoryItem } from "../actions";
import { cn } from "@/lib/utils";

export default function AddItemClient({ categories }: { categories: { id: string, name: string }[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ name?: boolean, category?: boolean, quantity?: boolean, unit?: boolean }>({});
    const [selectedUnit, setSelectedUnit] = useState("");
    const [pieces, setPieces] = useState<number>(0);
    const [mHeight, setMHeight] = useState<number>(0);
    const [mWidth, setMWidth] = useState<number>(0);
    const [totalQuantity, setTotalQuantity] = useState<string>("0");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const name = formData.get("name") as string;
        const category_id = formData.get("category_id") as string;
        const quantity = formData.get("quantity") as string;
        const unit = formData.get("unit") as string;

        const newErrors: Record<string, boolean> = {};
        if (!name) newErrors.name = true;
        if (!category_id) newErrors.category = true;
        if (!quantity) newErrors.quantity = true;
        if (!unit) newErrors.unit = true;

        if (Object.keys(newErrors).length > 0) {
            setFieldErrors(newErrors);
            setTimeout(() => setFieldErrors({}), 500);
            return;
        }

        setLoading(true);
        setError(null);

        const result = await createInventoryItem(formData);

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push("/admin/inventory");
        }
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/inventory" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight">Materia Prima</h1>
                        <p className="text-gray-400 mt-1 font-medium italic">Alta de nuevo material en el inventario SIVCA.</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[2rem] p-8 border border-white/5 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <form onSubmit={handleSubmit} className="relative z-10 space-y-8" noValidate>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Material Info */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                                <Package className="w-5 h-5 text-blue-500" />
                                Detalles del Material
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        Nombre del Producto
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            className={cn(
                                                "w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all font-medium text-white placeholder:text-gray-600",
                                                fieldErrors.name && "border-red-500/50 bg-red-500/5"
                                            )}
                                            placeholder="Ej: Vinil Banner 13oz Brillante"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="category_id" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        Categoría
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="category_id"
                                            name="category_id"
                                            defaultValue=""
                                            className={cn(
                                                "w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 pr-10 text-sm outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all font-medium appearance-none",
                                                fieldErrors.category ? "border-red-500/50 text-white" : "text-white"
                                            )}
                                        >
                                            <option value="" disabled className="bg-[#050505] text-gray-500">Seleccionar Categoría...</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id} className="bg-[#050505] text-white">
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                        <Tag className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stock Info */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                                <Scale className="w-5 h-5 text-purple-500" />
                                Control de Stock
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-4 col-span-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="quantity" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                                Stock Inicial (Total)
                                            </label>
                                            <input
                                                id="quantity"
                                                name="quantity"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={totalQuantity}
                                                onChange={(e) => setTotalQuantity(e.target.value)}
                                                className={cn(
                                                    "w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all font-medium text-white",
                                                    fieldErrors.quantity && "border-red-500/50 bg-red-500/5"
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="unit" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                                Unidad de Medida
                                            </label>
                                            <select
                                                id="unit"
                                                name="unit"
                                                defaultValue=""
                                                onChange={(e) => setSelectedUnit(e.target.value)}
                                                className={cn(
                                                    "w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all font-medium appearance-none",
                                                    fieldErrors.unit ? "border-red-500/50 text-white" : "text-white"
                                                )}
                                            >
                                                <option value="" disabled className="bg-[#050505] text-gray-500">Medida...</option>
                                                <option value="unidades" className="bg-[#050505] text-white">Unidades (uds)</option>
                                                <option value="m2" className="bg-[#050505] text-white">Metros Cuadrados (m²)</option>
                                                <option value="metros" className="bg-[#050505] text-white">Metros Lineales (m)</option>
                                                <option value="litros" className="bg-[#050505] text-white">Litros (l)</option>
                                                <option value="kg" className="bg-[#050505] text-white">Kilogramos (kg)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Dimensiones para m2 */}
                                    <AnimatePresence>
                                        {selectedUnit === 'm2' && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="grid grid-cols-3 gap-4 p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10"
                                            >
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Piezas/Rollos</label>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        onChange={(e) => {
                                                            const v = parseFloat(e.target.value) || 0;
                                                            setPieces(v);
                                                            setTotalQuantity((v * mHeight * mWidth).toFixed(2));
                                                        }}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Alto (m)</label>
                                                    <input
                                                        name="material_height"
                                                        type="number"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        onChange={(e) => {
                                                            const v = parseFloat(e.target.value) || 0;
                                                            setMHeight(v);
                                                            setTotalQuantity((pieces * v * mWidth).toFixed(2));
                                                        }}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Ancho (m)</label>
                                                    <input
                                                        name="material_width"
                                                        type="number"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        onChange={(e) => {
                                                            const v = parseFloat(e.target.value) || 0;
                                                            setMWidth(v);
                                                            setTotalQuantity((pieces * mHeight * v).toFixed(2));
                                                        }}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                                    />
                                                </div>
                                                <p className="col-span-3 text-[10px] text-blue-400 font-bold italic px-1">
                                                    * Se calculará el stock total multiplicando: Piezas x Alto x Ancho.
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="unit_price_usd" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        Precio Unitario (USD $)
                                    </label>
                                    <input
                                        id="unit_price_usd"
                                        name="unit_price_usd"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all font-medium text-white"
                                    />
                                    <p className="text-[10px] text-gray-500 font-medium px-2">Este precio se usará para auto-calcular las facturas.</p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="min_quantity" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        Alerta de Stock Bajo (Min)
                                    </label>
                                    <input
                                        id="min_quantity"
                                        name="min_quantity"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        defaultValue="0"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all font-medium text-white"
                                    />
                                    <p className="text-[10px] text-gray-500 font-medium px-2">Recibirás alertas cuando el stock baje de este número.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-xs font-bold flex items-center gap-3 mt-6"
                            >
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="pt-8 mt-8 border-t border-white/5 flex justify-end gap-4">
                        <Link
                            href="/admin/inventory"
                            className="px-6 py-4 rounded-xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/20 group"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Guardar Material
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
