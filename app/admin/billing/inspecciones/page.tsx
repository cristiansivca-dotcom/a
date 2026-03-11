'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardList,
    Building2,
    Hash,
    Ruler,
    Layers,
    User,
    ChevronDown,
    ChevronUp,
    Search,
    ArrowLeft,
    Calendar,
    Package,
    Pencil,
    Trash2,
    X,
    Save,
    Loader2,
    Plus
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/lib/confirm';

interface InspectionItem {
    description: string;
    height: number;
    width: number;
    area: number;
}

interface FachadaInspection {
    id: string;
    created_at: string;
    request_id: string;
    inspector_name: string;
    inspector_surname: string;
    razon_social: string;
    rif: string;
    structure_type: string;
    material_specs: string;
    design_details: string;
    observations: string;
    dimensions_height: number;
    dimensions_width: number;
    items: InspectionItem[] | null;
    billing_requests: {
        customer_name: string;
        customer_id_number: string;
        customer_address: string;
        status: string;
    } | null;
}

interface EditForm {
    inspector_name: string;
    inspector_surname: string;
    razon_social: string;
    rif: string;
    structure_type: string;
    material_specs: string;
    design_details: string;
    observations: string;
    items: { description: string; height: string; width: string }[];
}

export default function InspeccionesAdminPage() {
    const supabase = createClient();
    const { success: toastSuccess, error: toastError } = useToast();
    const { confirm } = useConfirm();
    const [inspections, setInspections] = useState<FachadaInspection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditForm | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchInspections = async () => {
        const { data, error } = await supabase
            .from('fachada_inspections')
            .select(`
                *,
                billing_requests (
                    customer_name,
                    customer_id_number,
                    customer_address,
                    status
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching inspections:', error);
        } else {
            setInspections(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchInspections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openEdit = (insp: FachadaInspection) => {
        setEditForm({
            inspector_name: insp.inspector_name || '',
            inspector_surname: insp.inspector_surname || '',
            razon_social: insp.razon_social || '',
            rif: insp.rif || '',
            structure_type: insp.structure_type || '',
            material_specs: insp.material_specs || '',
            design_details: insp.design_details || '',
            observations: insp.observations || '',
            items: insp.items && insp.items.length > 0
                ? insp.items.map(it => ({ description: it.description, height: String(it.height), width: String(it.width) }))
                : [{ description: '', height: '', width: '' }]
        });
        setEditingId(insp.id);
    };

    const saveEdit = async () => {
        if (!editForm || !editingId) return;
        setIsSaving(true);
        try {
            const items = editForm.items.map(it => ({
                description: it.description,
                height: parseFloat(it.height) || 0,
                width: parseFloat(it.width) || 0,
                area: (parseFloat(it.height) || 0) * (parseFloat(it.width) || 0),
            }));

            const { error } = await supabase
                .from('fachada_inspections')
                .update({
                    inspector_name: editForm.inspector_name,
                    inspector_surname: editForm.inspector_surname,
                    razon_social: editForm.razon_social,
                    rif: editForm.rif,
                    structure_type: editForm.structure_type,
                    material_specs: editForm.material_specs,
                    design_details: editForm.design_details,
                    observations: editForm.observations,
                    items,
                    dimensions_height: parseFloat(editForm.items[0]?.height) || 0,
                    dimensions_width: parseFloat(editForm.items[0]?.width) || 0,
                })
                .eq('id', editingId);

            if (error) throw error;
            toastSuccess('Inspección actualizada correctamente');
            setEditingId(null);
            setEditForm(null);
            await fetchInspections();
        } catch (err: unknown) {
            toastError('Error al actualizar: ' + (err instanceof Error ? err.message : 'Desconocido'));
        } finally {
            setIsSaving(false);
        }
    };

    const deleteInspection = async (insp: FachadaInspection) => {
        const ok = await confirm({
            title: 'Eliminar Inspección',
            message: `¿Estás seguro de eliminar la inspección de ${insp.razon_social || insp.inspector_name}? Esta acción no se puede deshacer.`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
        });
        if (!ok) return;

        const { error } = await supabase.from('fachada_inspections').delete().eq('id', insp.id);
        if (error) {
            toastError('Error al eliminar: ' + error.message);
        } else {
            toastSuccess('Inspección eliminada');
            setInspections(prev => prev.filter(i => i.id !== insp.id));
        }
    };

    const filtered = inspections.filter(insp => {
        const q = search.toLowerCase();
        return (
            insp.inspector_name?.toLowerCase().includes(q) ||
            insp.inspector_surname?.toLowerCase().includes(q) ||
            insp.razon_social?.toLowerCase().includes(q) ||
            insp.rif?.toLowerCase().includes(q) ||
            insp.billing_requests?.customer_name?.toLowerCase().includes(q) ||
            insp.material_specs?.toLowerCase().includes(q)
        );
    });

    const totalArea = (insp: FachadaInspection) => {
        if (insp.items && insp.items.length > 0) {
            return insp.items.reduce((acc, item) => acc + (item.area || 0), 0);
        }
        return (insp.dimensions_height || 0) * (insp.dimensions_width || 0);
    };

    const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-blue-500/50 transition-all";

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/billing" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight">Inspecciones</h1>
                        <p className="text-gray-400 mt-1 font-medium italic">Todos los reportes técnicos registrados por los inspectores.</p>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar inspector, cliente, RIF..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full sm:w-72 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-all text-white"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="glass p-5 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-3xl font-black text-white">{inspections.length}</p>
                </div>
                <div className="glass p-5 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Filtradas</p>
                    <p className="text-3xl font-black text-blue-400">{filtered.length}</p>
                </div>
                <div className="glass p-5 rounded-3xl border border-white/5 col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total m² Inspeccionados</p>
                    <p className="text-3xl font-black text-purple-400">
                        {filtered.reduce((acc, insp) => acc + totalArea(insp), 0).toFixed(2)} m²
                    </p>
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass p-16 rounded-[3rem] border border-white/5 text-center">
                    <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No se encontraron inspecciones.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((insp) => {
                        const isExpanded = expandedId === insp.id;
                        const area = totalArea(insp);

                        return (
                            <motion.div key={insp.id} layout className="glass rounded-3xl border border-white/5 overflow-hidden">
                                {/* Row header */}
                                <div className="flex items-center justify-between p-6 gap-4">
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : insp.id)}
                                        className="flex items-center gap-4 flex-wrap flex-1 text-left"
                                    >
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 shrink-0">
                                            <ClipboardList className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-black text-white">
                                                {insp.razon_social || insp.billing_requests?.customer_name || 'Sin cliente'}
                                            </p>
                                            <p className="text-[11px] text-gray-500 font-medium">
                                                Inspector: {insp.inspector_name} {insp.inspector_surname} &bull;{' '}
                                                RIF: <span className="font-mono text-gray-400">{insp.rif || '—'}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap ml-2">
                                            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-400 uppercase">
                                                {area.toFixed(2)} m²
                                            </span>
                                            <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium text-gray-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(insp.created_at).toLocaleDateString('es-ES')}
                                            </span>
                                        </div>
                                    </button>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => openEdit(insp)}
                                            title="Editar inspección"
                                            className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteInspection(insp)}
                                            title="Eliminar inspección"
                                            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : insp.id)}
                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-all"
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded detail view */}
                                {isExpanded && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="px-6 pb-6 space-y-6 border-t border-white/5 pt-6"
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {[
                                                { icon: <Building2 className="w-3 h-3" />, label: 'Razón Social', value: insp.razon_social },
                                                { icon: <Hash className="w-3 h-3" />, label: 'RIF / Cédula', value: insp.rif, mono: true },
                                                { icon: <User className="w-3 h-3" />, label: 'Inspector', value: `${insp.inspector_name} ${insp.inspector_surname}` },
                                                { icon: <Package className="w-3 h-3" />, label: 'Material', value: insp.material_specs },
                                            ].map(({ icon, label, value, mono }) => (
                                                <div key={label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1">{icon} {label}</p>
                                                    <p className={`text-white font-bold text-sm ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1"><Layers className="w-3 h-3" /> Tipo de Estructura</p>
                                                <p className="text-white text-sm">{insp.structure_type || '—'}</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Detalles de Diseño</p>
                                                <p className="text-gray-300 text-sm leading-relaxed">{insp.design_details || '—'}</p>
                                            </div>
                                        </div>

                                        {insp.items && insp.items.length > 0 && (
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1"><Ruler className="w-3 h-3" /> Items Medidos</p>
                                                <div className="overflow-x-auto rounded-2xl border border-white/5">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                                                <th className="py-3 px-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción</th>
                                                                <th className="py-3 px-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Alto (m)</th>
                                                                <th className="py-3 px-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Ancho (m)</th>
                                                                <th className="py-3 px-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Área (m²)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {insp.items.map((item, i) => (
                                                                <tr key={i} className="hover:bg-white/[0.02]">
                                                                    <td className="py-3 px-4 text-white font-medium">{item.description}</td>
                                                                    <td className="py-3 px-4 text-right font-mono text-gray-300">{item.height}</td>
                                                                    <td className="py-3 px-4 text-right font-mono text-gray-300">{item.width}</td>
                                                                    <td className="py-3 px-4 text-right font-mono font-black text-indigo-400">{(item.area || 0).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr className="border-t border-white/10 bg-white/[0.03]">
                                                                <td colSpan={3} className="py-3 px-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</td>
                                                                <td className="py-3 px-4 text-right font-mono font-black text-white text-base">{area.toFixed(2)} m²</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {insp.observations && (
                                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Observaciones</p>
                                                <p className="text-amber-200/70 text-sm leading-relaxed">{insp.observations}</p>
                                            </div>
                                        )}

                                        <div className="flex justify-end">
                                            <Link
                                                href={`/admin/billing/fachada/${insp.request_id}/invoice`}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 rounded-2xl text-sm font-bold transition-all"
                                            >
                                                Ver / Generar Factura →
                                            </Link>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Edit Modal */}
            <AnimatePresence>
                {editingId && editForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 pt-10"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            className="w-full max-w-3xl glass rounded-[2.5rem] border border-white/10 p-8 space-y-6 my-8"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter">Editar Inspección</h2>
                                    <p className="text-gray-500 text-sm mt-1">Modifica los datos del reporte técnico.</p>
                                </div>
                                <button onClick={() => { setEditingId(null); setEditForm(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Inspector info */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Datos del Inspector</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input className={inputCls} placeholder="Nombre" value={editForm.inspector_name} onChange={e => setEditForm({ ...editForm, inspector_name: e.target.value })} />
                                    <input className={inputCls} placeholder="Apellido" value={editForm.inspector_surname} onChange={e => setEditForm({ ...editForm, inspector_surname: e.target.value })} />
                                    <input className={inputCls} placeholder="Razón Social del Cliente" value={editForm.razon_social} onChange={e => setEditForm({ ...editForm, razon_social: e.target.value })} />
                                    <input className={`${inputCls} font-mono`} placeholder="RIF / Cédula" value={editForm.rif} onChange={e => setEditForm({ ...editForm, rif: e.target.value })} />
                                </div>
                            </div>

                            {/* Technical */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Especificaciones Técnicas</p>
                                <input className={inputCls} placeholder="Tipo de Estructura" value={editForm.structure_type} onChange={e => setEditForm({ ...editForm, structure_type: e.target.value })} />
                                <input className={inputCls} placeholder="Materiales (ej: Banner 13oz, Vinil)" value={editForm.material_specs} onChange={e => setEditForm({ ...editForm, material_specs: e.target.value })} />
                                <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Detalles de Diseño" value={editForm.design_details} onChange={e => setEditForm({ ...editForm, design_details: e.target.value })} />
                                <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Observaciones" value={editForm.observations} onChange={e => setEditForm({ ...editForm, observations: e.target.value })} />
                            </div>

                            {/* Items */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Items Medidos</p>
                                    <button
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, items: [...editForm.items, { description: '', height: '', width: '' }] })}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600/30 transition-all"
                                    >
                                        <Plus className="w-3 h-3" /> Añadir
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {editForm.items.map((item, i) => (
                                        <div key={i} className="grid grid-cols-5 gap-2 items-center">
                                            <input
                                                className={`${inputCls} col-span-3`}
                                                placeholder="Descripción"
                                                value={item.description}
                                                onChange={e => {
                                                    const updated = [...editForm.items];
                                                    updated[i] = { ...updated[i], description: e.target.value };
                                                    setEditForm({ ...editForm, items: updated });
                                                }}
                                            />
                                            <input
                                                className={`${inputCls} font-mono`}
                                                placeholder="Alto"
                                                type="number"
                                                step="0.01"
                                                value={item.height}
                                                onChange={e => {
                                                    const updated = [...editForm.items];
                                                    updated[i] = { ...updated[i], height: e.target.value };
                                                    setEditForm({ ...editForm, items: updated });
                                                }}
                                            />
                                            <div className="flex gap-1">
                                                <input
                                                    className={`${inputCls} font-mono`}
                                                    placeholder="Ancho"
                                                    type="number"
                                                    step="0.01"
                                                    value={item.width}
                                                    onChange={e => {
                                                        const updated = [...editForm.items];
                                                        updated[i] = { ...updated[i], width: e.target.value };
                                                        setEditForm({ ...editForm, items: updated });
                                                    }}
                                                />
                                                {editForm.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditForm({ ...editForm, items: editForm.items.filter((_, idx) => idx !== i) })}
                                                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => { setEditingId(null); setEditForm(null); }}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-bold border border-white/10 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveEdit}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-7 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
