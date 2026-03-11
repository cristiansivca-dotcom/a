"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Plus, Search, Trash2, Edit2, ArrowLeft,
    RefreshCw, X, MapPin, Hash, Phone
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

interface Customer {
    id: string;
    name: string;
    id_number: string;
    address: string;
    phone: string;
    created_at?: string;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        id_number: "",
        address: "",
        phone: ""
    });

    const supabase = createClient();
    const { success, error: toastError } = useToast();
    const { confirm } = useConfirm();

    const fetchCustomers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('billing_customers')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setCustomers(data || []);
        } catch (error: unknown) {
            const err = error as { message?: string };
            console.error("Error fetching customers:", err.message, error);
            toastError("Error al cargar los clientes.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, toastError]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const openModal = (customer: Customer | null = null) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                name: customer.name,
                id_number: customer.id_number,
                address: customer.address,
                phone: customer.phone
            });
        } else {
            setEditingCustomer(null);
            setFormData({
                name: "",
                id_number: "",
                address: "",
                phone: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.id_number) {
            toastError("Nombre y RIF/Cédula son obligatorios.");
            return;
        }

        setIsSaving(true);
        try {
            if (editingCustomer) {
                // Update
                const { error } = await supabase
                    .from('billing_customers')
                    .update({
                        name: formData.name,
                        id_number: formData.id_number,
                        address: formData.address,
                        phone: formData.phone
                    })
                    .eq('id', editingCustomer.id);

                if (error) throw error;
                success("Cliente actualizado correctamente.");
            } else {
                // Insert
                // To avoid the unique constraint issue if it exists (or doesn't), 
                // we'll follow our "check-then-save" pattern if we want to be safe, 
                // but since this is a dedicated page, standard insert is fine if we expect the user to fix the DB.
                // However, let's be resilient as we promised in the plan.

                const { data: existing } = await supabase
                    .from('billing_customers')
                    .select('id')
                    .eq('id_number', formData.id_number)
                    .maybeSingle();

                if (existing) {
                    toastError("Ya existe un cliente con ese RIF/Cédula.");
                    setIsSaving(false);
                    return;
                }

                const { error } = await supabase
                    .from('billing_customers')
                    .insert([formData]);

                if (error) throw error;
                success("Cliente creado correctamente.");
            }

            setIsModalOpen(false);
            fetchCustomers();
        } catch (error: unknown) {
            const err = error as { message?: string };
            console.error("Error saving customer:", err.message, error);
            toastError(`Error al guardar: ${err.message || 'Error desconocido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Eliminar Cliente",
            message: "¿Estás seguro de eliminar este cliente? No se podrán emitir facturas a su nombre fácilmente después.",
            confirmText: "Eliminar",
            variant: "danger"
        });

        if (!isConfirmed) return;

        try {
            const { error } = await supabase
                .from('billing_customers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setCustomers(customers.filter(c => c.id !== id));
            success("Cliente eliminado correctamente.");
        } catch (error: unknown) {
            const err = error as { message?: string };
            console.error("Error deleting customer:", err.message, error);
            toastError("Error al eliminar el cliente.");
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
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
                        <h1 className="text-3xl font-black tracking-tighter text-white">Gestionar Clientes</h1>
                        <p className="text-gray-500 text-sm font-medium">Administra tu base de datos de clientes.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/20 font-bold transition-all"
                    >
                        <Plus size={18} />
                        Nuevo Cliente
                    </motion.button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative group px-2">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o RIF/Cédula..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-2xl py-4 pl-14 pr-4 text-white outline-none transition-all placeholder:text-gray-600 font-medium"
                />
            </div>

            {/* Customers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        <div className="col-span-full flex justify-center py-20">
                            <RefreshCw size={40} className="animate-spin text-gray-700 opacity-20" />
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full text-center py-20 glass rounded-[3rem] border border-white/5"
                        >
                            <User className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-20" />
                            <p className="text-gray-500 font-bold">No se encontraron clientes.</p>
                        </motion.div>
                    ) : (
                        filteredCustomers.map((customer, idx) => (
                            <motion.div
                                key={customer.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group glass p-8 rounded-[2.5rem] border border-white/5 hover:border-blue-500/20 transition-all flex flex-col justify-between"
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-blue-500 border border-white/10 group-hover:scale-110 transition-transform">
                                            <User size={24} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openModal(customer)}
                                                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white border border-white/5 transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer.id)}
                                                className="p-2.5 bg-red-500/5 hover:bg-red-500/10 rounded-xl text-red-500/50 hover:text-red-500 border border-red-500/10 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors truncate">
                                            {customer.name}
                                        </h3>
                                        <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mt-1">
                                            {customer.id_number}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 pt-2">
                                        <div className="flex items-start gap-3 text-sm text-gray-400">
                                            <MapPin size={16} className="text-gray-600 mt-0.5" />
                                            <p className="line-clamp-2">{customer.address || "Sin dirección fiscal registrada"}</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-400">
                                            <Phone size={16} className="text-gray-600" />
                                            <p>{customer.phone || "Sin teléfono"}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg glass p-8 rounded-[3rem] border border-white/10 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-white">
                                    {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Nombre o Razón Social</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                        <input
                                            type="text"
                                            placeholder="Ej: Inversiones SIVCA, C.A."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">RIF / Cédula</label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                        <input
                                            type="text"
                                            placeholder="J-12345678-0"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                                            value={formData.id_number}
                                            onChange={e => setFormData({ ...formData, id_number: e.target.value })}
                                            disabled={!!editingCustomer}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Teléfono</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                        <input
                                            type="text"
                                            placeholder="+58 ..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Dirección Fiscal</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-4 w-4 h-4 text-gray-600" />
                                        <textarea
                                            placeholder="Dirección completa..."
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium resize-none"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-bold transition-all border border-white/5"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/20 font-bold transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                                        {editingCustomer ? "Guardar Cambios" : "Crear Cliente"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
