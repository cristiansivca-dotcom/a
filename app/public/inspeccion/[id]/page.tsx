'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
    Save,
    Info,
    Maximize2,
    Layout,
    Zap,
    Loader2,
    Building2,
    Hash,
    MapPin,
    CheckCircle2,
    Plus,
    Trash2
} from 'lucide-react';
import Image from "next/image";
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/toast';
import AnimatedBackground from "@/components/AnimatedBackground";
import { notifyNewInspection } from './actions';

interface InspectionItem {
    id: string;
    description: string;
    height: string;
    width: string;
}

interface FachadaFormData {
    inspector_name: string;
    inspector_surname: string;
    razon_social: string;
    rif: string;
    design_details: string;
    structure_type: string;
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

interface BillingProduct {
    id: string;
    name: string;
}

export default function PublicInspectionPage() {
    const { id } = useParams();
    const { success: toastSuccess, error: toastError } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [existingInspectionId, setExistingInspectionId] = useState<string | null>(null);
    const [request, setRequest] = useState<BillingRequest | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [billingProducts, setBillingProducts] = useState<BillingProduct[]>([]);
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
    const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([
        { id: Math.random().toString(36).substring(2, 9), description: '', height: '', width: '' }
    ]);
    const supabase = createClient();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FachadaFormData>();

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const { data, error } = await supabase
                    .from('billing_requests')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                if (error) {
                    console.error('Supabase error:', error);
                    setFetchError(error.message || 'Error al cargar la solicitud');
                    return;
                }

                if (!data) {
                    setFetchError('Solicitud no encontrada. Verifique el enlace.');
                    return;
                }

                // Block ONLY when the request/invoice is fully paid
                if (data.status === 'paid') {
                    setIsCompleted(true);
                }

                setRequest(data);

                // Fetch products for materials
                const { data: products } = await supabase
                    .from('billing_products')
                    .select('id, name')
                    .order('name');

                if (products) setBillingProducts(products);

                // Check if an inspection already exists — pre-fill if so
                const { data: existing } = await supabase
                    .from('fachada_inspections')
                    .select('*')
                    .eq('request_id', id)
                    .maybeSingle();

                if (existing) {
                    setExistingInspectionId(existing.id);
                    reset({
                        inspector_name: existing.inspector_name || '',
                        inspector_surname: existing.inspector_surname || '',
                        razon_social: existing.razon_social || '',
                        rif: existing.rif || '',
                        design_details: existing.design_details || '',
                        structure_type: existing.structure_type || '',
                        observations: existing.observations || '',
                    });
                    // Pre-fill materials
                    if (existing.material_specs) {
                        setSelectedMaterials(existing.material_specs.split(', ').filter(Boolean));
                    }
                    // Pre-fill items
                    if (existing.items && existing.items.length > 0) {
                        setInspectionItems(existing.items.map((item: { description: string; height: number; width: number }) => ({
                            id: Math.random().toString(36).substring(2, 9),
                            description: item.description || '',
                            height: String(item.height || ''),
                            width: String(item.width || ''),
                        })));
                    }
                }

            } catch (err: unknown) {
                console.error('Error fetching request:', err);
                const message = err instanceof Error ? err.message : 'Error desconocido';
                setFetchError(message);
                toastError('Error al cargar la solicitud. Verifique el enlace.');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchRequest();
    }, [id, toastError, supabase, reset]);

    const addItem = () => {
        setInspectionItems([...inspectionItems, { id: Math.random().toString(36).substring(2, 9), description: '', height: '', width: '' }]);
    };

    const removeItem = (id: string) => {
        if (inspectionItems.length > 1) {
            setInspectionItems(inspectionItems.filter(item => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof InspectionItem, value: string) => {
        setInspectionItems(inspectionItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const onSubmit = async (formData: FachadaFormData) => {
        if (selectedMaterials.length === 0) {
            toastError('Por favor selecciona al menos un material.');
            return;
        }
        setIsSaving(true);
        try {
            const inspectionPayload = {
                request_id: id,
                inspector_name: formData.inspector_name,
                inspector_surname: formData.inspector_surname,
                razon_social: formData.razon_social,
                rif: formData.rif,
                design_details: formData.design_details,
                structure_type: formData.structure_type,
                material_specs: selectedMaterials.join(', '),
                observations: formData.observations,
                items: inspectionItems.map(item => ({
                    description: item.description,
                    height: parseFloat(item.height) || 0,
                    width: parseFloat(item.width) || 0,
                    area: (parseFloat(item.height) || 0) * (parseFloat(item.width) || 0)
                })),
                dimensions_height: parseFloat(inspectionItems[0]?.height) || 0,
                dimensions_width: parseFloat(inspectionItems[0]?.width) || 0
            };

            if (existingInspectionId) {
                // UPDATE existing inspection
                const { error: updateError } = await supabase
                    .from('fachada_inspections')
                    .update(inspectionPayload)
                    .eq('id', existingInspectionId);
                if (updateError) throw updateError;
            } else {
                // INSERT new inspection
                const { error: insertError } = await supabase
                    .from('fachada_inspections')
                    .insert([inspectionPayload]);
                if (insertError) throw insertError;
            }

            // Update request status to pending_invoice if not already
            if (request?.status === 'pending_inspection') {
                const { error: requestError } = await supabase
                    .from('billing_requests')
                    .update({ status: 'pending_invoice' })
                    .eq('id', id);
                if (requestError) throw requestError;
            }

            // Send notification only on first save
            if (!existingInspectionId) {
                notifyNewInspection(id as string, formData.inspector_name, formData.inspector_surname)
                    .catch(err => console.error("Failed to send notification email:", err));
            }

            toastSuccess(existingInspectionId ? 'Inspección actualizada correctamente' : 'Inspección guardada correctamente');
            setExistingInspectionId(existingInspectionId || 'updated'); // Keep in edit mode
        } catch (err: unknown) {
            console.error('Error saving inspection:', err);
            const message = err instanceof Error ? err.message : 'Error de permisos (RLS)';
            toastError('Error al guardar la inspección: ' + message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] gap-4">
                <AnimatedBackground />
                <Loader2 size={40} className="animate-spin text-blue-500 relative z-10" />
                <p className="text-gray-500 font-medium animate-pulse relative z-10">Cargando formulario de inspección...</p>
            </div>
        );
    }

    if (isCompleted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] p-4">
                <AnimatedBackground />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full glass p-10 rounded-[3rem] border border-green-500/20 text-center space-y-6 relative z-10"
                >
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto border border-green-500/20">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Inspección Completada</h2>
                    <p className="text-gray-400 font-medium leading-relaxed">
                        Los datos han sido registrados exitosamente en el sistema. Ya puede cerrar esta ventana.
                    </p>
                </motion.div>
            </div>
        );
    }

    if (fetchError || !request) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] p-4 text-center">
                <AnimatedBackground />
                <div className="glass p-10 rounded-[3rem] border border-red-500/20 max-w-md relative z-10 space-y-4">
                    <p className="text-red-500 font-black text-xl uppercase tracking-tighter">Enlace no válido o expirado</p>
                    <p className="text-gray-500 text-sm">
                        {fetchError === 'JSON object requested, multiple (or no) rows returned'
                            ? 'No se encontró la solicitud especificada.'
                            : 'Es posible que necesite configurar las políticas de acceso (RLS) en Supabase para permitir el acceso público.'}
                    </p>
                    {fetchError && (
                        <div className="mt-4 p-2 bg-red-500/5 rounded-lg border border-red-500/10">
                            <p className="text-[10px] font-mono text-red-400/50 break-all">{fetchError}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] relative overflow-hidden flex flex-col">
            <AnimatedBackground />

            {/* Public Header */}
            <header className="relative z-10 w-full py-8 px-6 flex justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-black/50 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
                        <Image src="/logo_sivca.png" alt="SIVCA Logo" width={45} height={45} className="object-contain" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-black text-white tracking-tighter">SIVCA <span className="text-blue-500 font-black">Inspecciones</span></h1>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Módulo Técnico Externo</p>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Info Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass p-8 rounded-[3rem] border border-white/5 space-y-6"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                                    <Info size={20} />
                                </div>
                                <h2 className="text-xl font-black text-white">Datos de Solicitud</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Cliente</label>
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
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Ubicación / Área</label>
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                                        <MapPin size={16} className="text-gray-500" />
                                        <span className="text-white font-medium">{request.customer_address || "Área asignada"}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 space-y-3">
                            <div className="flex items-center gap-2 text-amber-500">
                                <Zap size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Aviso Técnico</span>
                            </div>
                            <p className="text-xs text-amber-200/60 leading-relaxed italic">
                                Una vez guardado el formulario, no podrá ser editado desde este enlace. Verifique las medidas antes de enviar.
                            </p>
                        </div>
                    </div>

                    {/* Form Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-2 space-y-8"
                    >
                        <div className="glass p-8 rounded-[3rem] border border-white/5">
                            <form id="fachada-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                                        <Building2 size={18} className="text-blue-400" />
                                        <h3 className="text-lg font-bold text-white tracking-tight">Datos del Inspector</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Nombre</label>
                                            <input
                                                type="text"
                                                placeholder="Su nombre"
                                                {...register('inspector_name', { required: true })}
                                                className={cn(
                                                    "w-full bg-white/5 border rounded-2xl py-3.5 px-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium",
                                                    errors.inspector_name ? "border-red-500/50" : "border-white/10"
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Apellido</label>
                                            <input
                                                type="text"
                                                placeholder="Su apellido"
                                                {...register('inspector_surname', { required: true })}
                                                className={cn(
                                                    "w-full bg-white/5 border rounded-2xl py-3.5 px-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium",
                                                    errors.inspector_surname ? "border-red-500/50" : "border-white/10"
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Razón Social del Cliente</label>
                                            <input
                                                type="text"
                                                placeholder="Nombre de empresa o persona..."
                                                {...register('razon_social', { required: true })}
                                                className={cn(
                                                    "w-full bg-white/5 border rounded-2xl py-3.5 px-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium",
                                                    errors.razon_social ? "border-red-500/50" : "border-white/10"
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">RIF / Cédula del Cliente</label>
                                            <input
                                                type="text"
                                                placeholder="J-12345678-9 o V-12345678"
                                                {...register('rif', { required: true })}
                                                className={cn(
                                                    "w-full bg-white/5 border rounded-2xl py-3.5 px-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium font-mono",
                                                    errors.rif ? "border-red-500/50" : "border-white/10"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Items list Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                        <div className="flex items-center gap-3">
                                            <Maximize2 size={18} className="text-indigo-400" />
                                            <h3 className="text-lg font-bold text-white tracking-tight">Items de Inspección</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 transition-all flex items-center gap-2"
                                        >
                                            <Plus size={14} />
                                            Añadir Item
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {inspectionItems.map((item, index) => (
                                            <div key={item.id} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 relative group">
                                                {inspectionItems.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}

                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-black text-indigo-500/50 uppercase tracking-widest">Item #{index + 1}</span>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Descripción del Item (Ej: Puerta, Ventana Izq...)</label>
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                        placeholder="Descripción breve..."
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white outline-none focus:border-indigo-500/50 transition-all font-medium"
                                                        required
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Alto (Metros)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.height}
                                                            onChange={(e) => updateItem(item.id, 'height', e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white outline-none focus:border-indigo-500/50 transition-all font-mono font-bold"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Ancho (Metros)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.width}
                                                            onChange={(e) => updateItem(item.id, 'width', e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white outline-none focus:border-indigo-500/50 transition-all font-mono font-bold"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                {(parseFloat(item.height) > 0 && parseFloat(item.width) > 0) && (
                                                    <div className="pt-2 flex justify-end">
                                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                                            Área Aproximada: <span className="text-white">{(parseFloat(item.height) * parseFloat(item.width)).toFixed(2)} m²</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {inspectionItems.length > 0 && (
                                            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Área a Facturar</span>
                                                <span className="text-lg font-black text-white">
                                                    {inspectionItems.reduce((acc, item) => acc + (parseFloat(item.height) || 0) * (parseFloat(item.width) || 0), 0).toFixed(2)} m²
                                                </span>
                                            </div>
                                        )}
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
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Materiales Específicos <span className="text-blue-400 normal-case">(selecciona uno o varios)</span></label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {billingProducts.map(p => {
                                                    const isSelected = selectedMaterials.includes(p.name);
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedMaterials(prev =>
                                                                    isSelected
                                                                        ? prev.filter(m => m !== p.name)
                                                                        : [...prev, p.name]
                                                                );
                                                            }}
                                                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all font-medium text-sm ${isSelected
                                                                ? 'bg-blue-600/20 border-blue-500/50 text-white'
                                                                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:bg-white/[0.07] hover:border-white/20'
                                                                }`}
                                                        >
                                                            <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-400' : 'border-gray-600'
                                                                }`}>
                                                                {isSelected && (
                                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </span>
                                                            {p.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {selectedMaterials.length > 0 && (
                                                <p className="text-[10px] text-blue-400 font-bold px-1 mt-1">
                                                    Seleccionado(s): {selectedMaterials.join(' • ')}
                                                </p>
                                            )}
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
                                        placeholder="Cualquier nota adicional..."
                                        {...register('observations')}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`w-full flex items-center justify-center gap-2 px-8 py-4 text-white rounded-[2rem] shadow-2xl font-black uppercase tracking-widest transition-all disabled:opacity-50 ${existingInspectionId
                                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30'
                                        : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'
                                        }`}
                                >
                                    {isSaving ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={24} />
                                            {existingInspectionId ? 'Actualizar Inspección' : 'Enviar Reporte de Inspección'}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </main>

            <footer className="relative z-10 py-10 text-center">
                <p className="text-gray-600 text-xs font-bold uppercase tracking-[0.2em]">© 2026 SIVCA • Sistema de Gestión de Fachadas</p>
            </footer>
        </div>
    );
}
