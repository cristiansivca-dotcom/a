'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Save,
    Info,
    Maximize2,
    Layout,
    Zap,
    Loader2,
    Building2,
    Hash,
    MapPin
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/toast';
import Link from 'next/link';

interface FachadaFormData {
    dimensions_height: string;
    dimensions_width: string;
    design_details: string;
    structure_type: string;
    material_specs: string;
    observations: string;
}

interface BillingRequest {
    id: string;
    customer_name: string;
    customer_id_number: string;
    customer_address: string;
    customer_business_area: string;
    request_type: string;
    status: string;
}

export default function FachadaInspectionPage() {
    const { id } = useParams();
    const router = useRouter();
    const { success: toastSuccess, error: toastError } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [request, setRequest] = useState<BillingRequest | null>(null);
    const supabase = createClient();

    const { register, handleSubmit, formState: { errors } } = useForm<FachadaFormData>();

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const { data, error } = await supabase
                    .from('billing_requests')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error('No se encontró la solicitud.');

                setRequest(data);
            } catch (error: any) {
                console.error('Error fetching request:', error);
                toastError('Error al cargar la solicitud: ' + error.message);
                router.push('/admin/billing');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchRequest();
    }, [id, router, toastError, supabase]);

    const onSubmit = async (formData: FachadaFormData) => {
        setIsSaving(true);
        try {
            // 1. Create inspection record
            const { error: inspectionError } = await supabase
                .from('fachada_inspections')
                .insert([{
                    request_id: id,
                    dimensions_height: parseFloat(formData.dimensions_height),
                    dimensions_width: parseFloat(formData.dimensions_width),
                    design_details: formData.design_details,
                    structure_type: formData.structure_type,
                    material_specs: formData.material_specs,
                    observations: formData.observations
                }]);

            if (inspectionError) throw inspectionError;

            // 2. Update request status
            const { error: requestError } = await supabase
                .from('billing_requests')
                .update({ status: 'pending_invoice' })
                .eq('id', id);

            if (requestError) throw requestError;

            toastSuccess('Inspección guardada correctamente');
            // Redirect to invoice generation (Step 4 of plan)
            router.push(`/admin/billing/fachada/${id}/invoice`);
        } catch (error: any) {
            console.error('Error saving inspection:', error);
            toastError('Error al guardar la inspección: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 size={40} className="animate-spin text-blue-500" />
                <p className="text-gray-500 font-medium animate-pulse">Cargando datos de la solicitud...</p>
            </div>
        );
    }

    if (!request) return null;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-32">
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
                        <h1 className="text-3xl font-black tracking-tighter text-white">Inspección de Fachada</h1>
                        <p className="text-gray-500 text-sm font-medium">Registro técnico para la solicitud #{id?.slice(0, 8)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        form="fachada-form"
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/20 font-bold transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        Guardar Inspección
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Info Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                                <Info size={20} />
                            </div>
                            <h2 className="text-xl font-black text-white">Datos del Cliente</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Razón Social</label>
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                                    <Building2 size={16} className="text-gray-500" />
                                    <span className="text-white font-medium">{request.customer_name}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">RIF / Cédula</label>
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                                    <Hash size={16} className="text-gray-500" />
                                    <span className="text-white font-mono">{request.customer_id_number}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Área de Negocio</label>
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                                    <MapPin size={16} className="text-gray-500" />
                                    <span className="text-white font-medium">{request.customer_business_area}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 space-y-3">
                        <div className="flex items-center gap-2 text-amber-500">
                            <Zap size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Importante</span>
                        </div>
                        <p className="text-xs text-amber-200/60 leading-relaxed italic">
                            Asegúrese de tomar medidas precisas. Estos datos serán utilizados para el cálculo final del presupuesto y la factura.
                        </p>
                    </div>
                </div>

                {/* Form Section */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="glass p-8 rounded-[3rem] border border-white/5">
                        <form id="fachada-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                            {/* Dimensions Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                                    <Maximize2 size={18} className="text-indigo-400" />
                                    <h3 className="text-lg font-bold text-white tracking-tight">Dimensiones de la Fachada</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Alto (Metros)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...register('dimensions_height', { required: true })}
                                            className={cn(
                                                "w-full bg-white/5 border rounded-2xl py-3.5 px-4 text-white outline-none focus:border-indigo-500/50 transition-all font-mono font-bold",
                                                errors.dimensions_height ? "border-red-500/50" : "border-white/10"
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Ancho (Metros)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...register('dimensions_width', { required: true })}
                                            className={cn(
                                                "w-full bg-white/5 border rounded-2xl py-3.5 px-4 text-white outline-none focus:border-indigo-500/50 transition-all font-mono font-bold",
                                                errors.dimensions_width ? "border-red-500/50" : "border-white/10"
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Technical Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                                    <Layout size={18} className="text-purple-400" />
                                    <h3 className="text-lg font-bold text-white tracking-tight">Especificaciones Técnicas</h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Tipo de Estructura</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Cerchas de aluminio, Estructura de hierro..."
                                            {...register('structure_type', { required: true })}
                                            className={cn(
                                                "w-full bg-white/5 border rounded-2xl py-3.5 px-4 text-white outline-none focus:border-purple-500/50 transition-all font-medium",
                                                errors.structure_type ? "border-red-500/50" : "border-white/10"
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Materiales Específicos</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Detalle los materiales a utilizar (Lonas, Vinilos, Pintura...)"
                                            {...register('material_specs', { required: true })}
                                            className={cn(
                                                "w-full bg-white/5 border rounded-2xl py-3.5 px-4 text-white outline-none focus:border-purple-500/50 transition-all font-medium resize-none",
                                                errors.material_specs ? "border-red-500/50" : "border-white/10"
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Detalles de Diseño</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Describa el arte, colores y elementos visuales..."
                                            {...register('design_details', { required: true })}
                                            className={cn(
                                                "w-full bg-white/5 border rounded-2xl py-3.5 px-4 text-white outline-none focus:border-purple-500/50 transition-all font-medium resize-none",
                                                errors.design_details ? "border-red-500/50" : "border-white/10"
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Observations */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Observaciones Adicionales</label>
                                <textarea
                                    rows={2}
                                    placeholder="Cualquier nota adicional relevante para la facturación..."
                                    {...register('observations')}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium resize-none"
                                />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
