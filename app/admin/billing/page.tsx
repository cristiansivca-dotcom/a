"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ClipboardList, Building2, Hash, Ruler, Layers, User, ChevronDown, ChevronUp,
    Search, Calendar, Package, Pencil, Trash2, X, Save, Loader2, Plus, Copy,
    ExternalLink, CheckCircle2, Clock, MapPin, Phone, AlertCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import { getBaseUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

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

interface BillingRequest {
    id: string;
    customer_name: string;
    customer_id_number: string;
    customer_address?: string;
    customer_phone?: string;
    business_area?: string;
    request_type: string;
    status: string;
    created_at: string;
}

export default function InspectionsManagementPage() {
    const supabase = createClient();
    const { success, error: toastError } = useToast();
    const { confirm } = useConfirm();

    // Data states
    const [inspections, setInspections] = useState<FachadaInspection[]>([]);
    const [requests, setRequests] = useState<BillingRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"completed" | "pending_links">("completed");

    // Modal state for generating new link
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [newLinkData, setNewLinkData] = useState({
        customerName: "",
        customerIdNumber: "",
        customerAddress: "",
        customerPhone: "",
        businessArea: "Punto Fijo - Falcón"
    });
    const [generatedLinkUrl, setGeneratedLinkUrl] = useState<string | null>(null);

    // Accordion and Edit form states
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditForm | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch Completed Inspections and Pending Requests
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [inspectionsRes, requestsRes] = await Promise.all([
                supabase
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
                    .order('created_at', { ascending: false }),
                supabase
                    .from('billing_requests')
                    .select('*')
                    .eq('request_type', 'Fachada')
                    .eq('status', 'pending_inspection')
                    .order('created_at', { ascending: false })
            ]);

            if (inspectionsRes.error) throw inspectionsRes.error;
            if (requestsRes.error) throw requestsRes.error;

            setInspections(inspectionsRes.data || []);
            setRequests(requestsRes.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            toastError("Error al cargar los datos de inspecciones.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, toastError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalArea = (insp: FachadaInspection) => {
        if (insp.items && insp.items.length > 0) {
            return insp.items.reduce((acc, item) => acc + (item.area || 0), 0);
        }
        return (insp.dimensions_height || 0) * (insp.dimensions_width || 0);
    };

    // Generate link handlers
    const handleGenerateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLinkData.customerName.trim()) {
            toastError("Por favor complete al menos la razón social del cliente.");
            return;
        }

        setIsGenerating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const createdByEmail = user?.email || null;

            const { data: request, error: reqError } = await supabase
                .from('billing_requests')
                .insert({
                    customer_name: newLinkData.customerName,
                    customer_id_number: newLinkData.customerIdNumber,
                    customer_address: newLinkData.customerAddress,
                    customer_phone: newLinkData.customerPhone,
                    business_area: newLinkData.businessArea,
                    request_type: 'Fachada',
                    status: 'pending_inspection',
                    created_by_email: createdByEmail
                })
                .select()
                .single();

            if (reqError) throw reqError;

            const publicUrl = `${getBaseUrl()}/public/inspeccion/${request.id}`;
            setGeneratedLinkUrl(publicUrl);

            try {
                await navigator.clipboard.writeText(publicUrl);
                success("¡Enlace copiado al portapapeles automáticamente!");
            } catch (err) {
                console.error("No se pudo copiar automáticamente:", err);
            }

            // Refresh requests list
            fetchData();
        } catch (error) {
            console.error("Error generating link:", error);
            toastError("Error al generar el enlace de inspección.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Mark completed inspection as reviewed
    const handleMarkAsReviewed = async (insp: FachadaInspection) => {
        try {
            const { error } = await supabase
                .from('billing_requests')
                .update({ status: 'reviewed' })
                .eq('id', insp.request_id);

            if (error) throw error;

            success("Inspección marcada como REVISADA con éxito.");
            
            // Update local state
            setInspections(prev => prev.map(i => {
                if (i.id === insp.id && i.billing_requests) {
                    return {
                        ...i,
                        billing_requests: {
                            ...i.billing_requests,
                            status: 'reviewed'
                        }
                    };
                }
                return i;
            }));
        } catch (error) {
            console.error("Error marking reviewed:", error);
            toastError("Error al actualizar el estado de la inspección.");
        }
    };

    // Delete inspection
    const handleDeleteInspection = async (insp: FachadaInspection) => {
        const ok = await confirm({
            title: "Eliminar Inspección",
            message: `¿Estás seguro de eliminar la inspección de ${insp.razon_social || 'este cliente'}? Esta acción no se puede deshacer.`,
            confirmText: "Eliminar",
            variant: "danger"
        });
        if (!ok) return;

        try {
            const { error } = await supabase
                .from('fachada_inspections')
                .delete()
                .eq('id', insp.id);

            if (error) throw error;

            success("Inspección eliminada correctamente.");
            setInspections(prev => prev.filter(i => i.id !== insp.id));
        } catch (error) {
            console.error("Error deleting inspection:", error);
            toastError("Error al eliminar la inspección.");
        }
    };

    // Delete pending link request
    const handleDeleteRequest = async (id: string) => {
        const ok = await confirm({
            title: "Eliminar Enlace de Inspección",
            message: "¿Estás seguro de eliminar esta solicitud de enlace? El supervisor ya no podrá llenarla.",
            confirmText: "Eliminar",
            variant: "danger"
        });
        if (!ok) return;

        try {
            const { error } = await supabase
                .from('billing_requests')
                .delete()
                .eq('id', id);

            if (error) throw error;

            success("Registro de enlace eliminado.");
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error("Error deleting request:", error);
            toastError("Error al eliminar la solicitud.");
        }
    };

    // Open Edit modal
    const openEdit = (insp: FachadaInspection) => {
        setEditForm({
            inspector_name: insp.inspector_name || "",
            inspector_surname: insp.inspector_surname || "",
            razon_social: insp.razon_social || "",
            rif: insp.rif || "",
            structure_type: insp.structure_type || "",
            material_specs: insp.material_specs || "",
            design_details: insp.design_details || "",
            observations: insp.observations || "",
            items: insp.items && insp.items.length > 0
                ? insp.items.map(it => ({ description: it.description, height: String(it.height), width: String(it.width) }))
                : [{ description: "", height: "", width: "" }]
        });
        setEditingId(insp.id);
    };

    // Save Edit Form
    const saveEdit = async () => {
        if (!editForm || !editingId) return;
        setIsSaving(true);
        try {
            const parsedItems = editForm.items.map(it => ({
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
                    items: parsedItems,
                    dimensions_height: parseFloat(editForm.items[0]?.height) || 0,
                    dimensions_width: parseFloat(editForm.items[0]?.width) || 0,
                })
                .eq('id', editingId);

            if (error) throw error;
            success("Inspección actualizada correctamente.");
            setEditingId(null);
            setEditForm(null);
            fetchData();
        } catch (err: unknown) {
            toastError("Error al actualizar: " + (err instanceof Error ? err.message : "Desconocido"));
        } finally {
            setIsSaving(false);
        }
    };

    const filteredInspections = useMemo(() => {
        const q = search.toLowerCase();
        return inspections.filter(insp =>
            insp.inspector_name?.toLowerCase().includes(q) ||
            insp.inspector_surname?.toLowerCase().includes(q) ||
            insp.razon_social?.toLowerCase().includes(q) ||
            insp.rif?.toLowerCase().includes(q) ||
            insp.billing_requests?.customer_name?.toLowerCase().includes(q) ||
            insp.material_specs?.toLowerCase().includes(q)
        );
    }, [inspections, search]);

    const filteredRequests = useMemo(() => {
        const q = search.toLowerCase();
        return requests.filter(req =>
            req.customer_name?.toLowerCase().includes(q) ||
            req.customer_id_number?.toLowerCase().includes(q)
        );
    }, [requests, search]);

    const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-medium";

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-600/10 rounded-lg border border-blue-500/20 text-blue-500">
                            <ClipboardList size={22} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight">
                            Control de Inspecciones
                        </h1>
                    </div>
                    <p className="text-gray-400 font-medium italic">
                        Administra solicitudes de inspección técnica, copia enlaces de supervisors y revisa reportes técnicos.
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        setGeneratedLinkUrl(null);
                        setNewLinkData({
                            customerName: "",
                            customerIdNumber: "",
                            customerAddress: "",
                            customerPhone: "",
                            businessArea: "Punto Fijo - Falcón"
                        });
                        setShowLinkModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-500/20 transition-all"
                >
                    <Plus size={18} />
                    Generar Nuevo Enlace
                </motion.button>
            </div>

            {/* Metrics cards if completed tab is selected */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Inspecciones Listadas</p>
                    <p className="text-3xl font-black text-white">{inspections.length}</p>
                </div>
                <div className="glass p-6 rounded-[2.5rem] border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Enlaces Activos (Supervisor)</p>
                    <p className="text-3xl font-black text-blue-400">{requests.length}</p>
                </div>
                <div className="glass p-6 rounded-[2.5rem] border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Buzón de Revisión Pendiente</p>
                    <p className="text-3xl font-black text-amber-400">
                        {inspections.filter(i => i.billing_requests?.status === 'pending_invoice').length}
                    </p>
                </div>
            </div>

            {/* Tab selector and Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-2">
                <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab("completed")}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all w-1/2 md:w-auto",
                            activeTab === "completed"
                                ? "bg-blue-600 text-white shadow-lg"
                                : "text-gray-500 hover:text-white"
                        )}
                    >
                        Reportes Recibidos ({filteredInspections.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("pending_links")}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all w-1/2 md:w-auto",
                            activeTab === "pending_links"
                                ? "bg-blue-600 text-white shadow-lg"
                                : "text-gray-500 hover:text-white"
                        )}
                    >
                        Enlaces Pendientes ({filteredRequests.length})
                    </button>
                </div>

                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, RIF o supervisor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-2xl py-3 pl-11 pr-4 text-white text-sm outline-none transition-all placeholder:text-gray-600 font-medium"
                    />
                </div>
            </div>

            {/* Content Lists */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                </div>
            ) : activeTab === "completed" ? (
                // COMPLETED INSPECTION LIST WITH DETAIL ACCORDION
                filteredInspections.length === 0 ? (
                    <div className="glass p-16 rounded-[3rem] border border-white/5 text-center">
                        <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No se encontraron reportes técnicos de inspección recibidos.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredInspections.map((insp) => {
                            const isExpanded = expandedId === insp.id;
                            const area = totalArea(insp);
                            const status = insp.billing_requests?.status;

                            return (
                                <motion.div key={insp.id} layout className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                                    {/* Header Row */}
                                    <div className="flex items-center justify-between p-6 gap-4 flex-wrap sm:flex-nowrap">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : insp.id)}
                                            className="flex items-center gap-4 flex-wrap flex-1 text-left"
                                        >
                                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 shrink-0">
                                                <ClipboardList className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-black text-white text-base">
                                                        {insp.razon_social || insp.billing_requests?.customer_name || 'Sin cliente'}
                                                    </p>
                                                    {status === 'reviewed' ? (
                                                        <span className="px-2.5 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Revisado
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-amber-500" /> Pendiente Revisión
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                                    Supervisor: {insp.inspector_name} {insp.inspector_surname} &bull;{' '}
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
                                            {status !== 'reviewed' && (
                                                <button
                                                    onClick={() => handleMarkAsReviewed(insp)}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-green-500/10 flex items-center gap-1.5"
                                                    title="Marcar inspección como revisada"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Revisado
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEdit(insp)}
                                                title="Editar reporte"
                                                className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteInspection(insp)}
                                                title="Eliminar inspección"
                                                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all"
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

                                    {/* Expanded Panel */}
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
                                                    { icon: <User className="w-3 h-3" />, label: 'Supervisor', value: `${insp.inspector_name} ${insp.inspector_surname}` },
                                                    { icon: <Package className="w-3 h-3" />, label: 'Materiales Colocados', value: insp.material_specs },
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

                                            {/* Items Table */}
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
                                        </motion.div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )
            ) : (
                // PENDING LINKS GENERATED (WAITING FOR INSPECTOR)
                filteredRequests.length === 0 ? (
                    <div className="glass p-16 rounded-[3rem] border border-white/5 text-center">
                        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No hay enlaces de inspección activos generados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredRequests.map((req) => (
                            <motion.div
                                key={req.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between gap-4 group"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                            <Clock className="w-3 h-3 text-blue-400" /> Esperando Llenado
                                        </span>
                                        <span className="text-gray-500 text-[10px] font-medium">
                                            Generado: {new Date(req.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-base group-hover:text-blue-400 transition-colors uppercase truncate">
                                            {req.customer_name}
                                        </h4>
                                        <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
                                            RIF: {req.customer_id_number || '—'} &bull; {req.business_area || 'Falcón'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                    <button
                                        onClick={() => {
                                            const url = `${getBaseUrl()}/public/inspeccion/${req.id}`;
                                            navigator.clipboard.writeText(url);
                                            success("¡Enlace de inspección copiado al portapapeles!");
                                        }}
                                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center justify-center gap-2"
                                        title="Copiar link"
                                    >
                                        <Copy size={14} /> Copiar Link
                                    </button>
                                    <a
                                        href={`/public/inspeccion/${req.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5"
                                        title="Visitar link de inspección público"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                    <button
                                        onClick={() => handleDeleteRequest(req.id)}
                                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/10"
                                        title="Eliminar link de inspección"
                                    >
                                        <Trash2 className="w-16 h-4" size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )
            )}

            {/* MODAL: GENERATE LINK */}
            <AnimatePresence>
                {showLinkModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLinkModal(false)}
                            className="absolute inset-0"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="relative w-full max-w-lg glass rounded-[2.5rem] border border-white/10 p-8 space-y-6 shadow-2xl bg-black/90 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter">Generar Enlace de Inspección</h2>
                                    <p className="text-gray-500 text-sm mt-1">Ingresa los datos del cliente para crear un formulario que rellenará el supervisor.</p>
                                </div>
                                <button
                                    onClick={() => setShowLinkModal(false)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-all border border-white/5"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {generatedLinkUrl ? (
                                <div className="space-y-4 py-2">
                                    <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-green-400 text-xs font-bold uppercase tracking-wider">¡Enlace Generado Exitosamente!</h4>
                                            <p className="text-gray-400 text-xs mt-1">El enlace ha sido copiado al portapapeles. Compártelo con el supervisor para registrar la inspección.</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Enlace Público para Supervisor</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={generatedLinkUrl}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-blue-400 font-mono focus:outline-none"
                                            />
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(generatedLinkUrl);
                                                    success("Enlace copiado.");
                                                }}
                                                className="p-2 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 rounded-xl text-blue-400"
                                                title="Copiar enlace"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={() => {
                                                setGeneratedLinkUrl(null);
                                                setNewLinkData({
                                                    customerName: "",
                                                    customerIdNumber: "",
                                                    customerAddress: "",
                                                    customerPhone: "",
                                                    businessArea: "Punto Fijo - Falcón"
                                                });
                                            }}
                                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold border border-white/5 transition-all text-xs"
                                        >
                                            Generar Otro
                                        </button>
                                        <button
                                            onClick={() => setShowLinkModal(false)}
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all text-xs"
                                        >
                                            Listo
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleGenerateLink} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Razón Social del Cliente</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="Ej: Inversiones SIVCA, C.A."
                                                value={newLinkData.customerName}
                                                onChange={e => setNewLinkData({ ...newLinkData, customerName: e.target.value })}
                                                className={`${inputCls} pl-10`}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">RIF / Cédula</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="Ej: J-12345678-0"
                                                value={newLinkData.customerIdNumber}
                                                onChange={e => setNewLinkData({ ...newLinkData, customerIdNumber: e.target.value })}
                                                className={`${inputCls} pl-10 font-mono`}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Teléfono</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    type="tel"
                                                    placeholder="Ej: 0412-1234567"
                                                    value={newLinkData.customerPhone}
                                                    onChange={e => setNewLinkData({ ...newLinkData, customerPhone: e.target.value })}
                                                    className={`${inputCls} pl-10`}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Región / Unidad de Negocio</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Punto Fijo - Falcón"
                                                    value={newLinkData.businessArea}
                                                    onChange={e => setNewLinkData({ ...newLinkData, businessArea: e.target.value })}
                                                    className={`${inputCls} pl-10`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Dirección Fiscal</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                                            <textarea
                                                placeholder="Dirección del cliente..."
                                                rows={2}
                                                value={newLinkData.customerAddress}
                                                onChange={e => setNewLinkData({ ...newLinkData, customerAddress: e.target.value })}
                                                className={`${inputCls} pl-10 resize-none`}
                                            />
                                        </div>
                                    </div>

                                    <div className="py-2 bg-blue-500/5 rounded-2xl border border-blue-500/10 p-4 space-y-1 text-xs">
                                        <p className="font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                                            <AlertCircle className="w-3.5 h-3.5" /> Nota Informativa
                                        </p>
                                        <p className="text-gray-400 leading-relaxed italic">
                                            El formulario generado permite registrar metros cuadrados e items medidos de forma manual sin afectar el stock del inventario.
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowLinkModal(false)}
                                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold border border-white/5 transition-all text-xs"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isGenerating}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-block shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all text-xs"
                                        >
                                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            Generar Enlace
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: EDIT COMPLETED INSPECTION */}
            <AnimatePresence>
                {editingId && editForm && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 pt-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setEditingId(null); setEditForm(null); }}
                            className="absolute inset-0"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            className="relative w-full max-w-3xl glass rounded-[2.5rem] border border-white/10 p-8 space-y-6 my-8 bg-black/95 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter">Editar Reporte de Inspección</h2>
                                    <p className="text-gray-500 text-sm mt-1">Ajusta los datos del reporte técnico completados por el supervisor.</p>
                                </div>
                                <button onClick={() => { setEditingId(null); setEditForm(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-all border border-white/5">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Inspector info */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Datos del Supervisor</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input className={inputCls} placeholder="Nombre Supervisor" value={editForm.inspector_name} onChange={e => setEditForm({ ...editForm, inspector_name: e.target.value })} />
                                    <input className={inputCls} placeholder="Apellido Supervisor" value={editForm.inspector_surname} onChange={e => setEditForm({ ...editForm, inspector_surname: e.target.value })} />
                                    <input className={inputCls} placeholder="Razón Social del Cliente" value={editForm.razon_social} onChange={e => setEditForm({ ...editForm, razon_social: e.target.value })} />
                                    <input className={`${inputCls} font-mono`} placeholder="RIF del Cliente" value={editForm.rif} onChange={e => setEditForm({ ...editForm, rif: e.target.value })} />
                                </div>
                            </div>

                            {/* Technical specifications */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Especificaciones Técnicas</p>
                                <input className={inputCls} placeholder="Tipo de Estructura (Ej: Fachada, Caja de Luz)" value={editForm.structure_type} onChange={e => setEditForm({ ...editForm, structure_type: e.target.value })} />
                                <input className={inputCls} placeholder="Materiales Colocados (Ej: Banner 13oz, Vinil Brillante)" value={editForm.material_specs} onChange={e => setEditForm({ ...editForm, material_specs: e.target.value })} />
                                <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Detalles de Diseño y Rotulación" value={editForm.design_details} onChange={e => setEditForm({ ...editForm, design_details: e.target.value })} />
                                <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Observaciones" value={editForm.observations} onChange={e => setEditForm({ ...editForm, observations: e.target.value })} />
                            </div>

                            {/* Measured Items */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Items Medidos (Alto y Ancho)</p>
                                    <button
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, items: [...editForm.items, { description: '', height: '', width: '' }] })}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600/30 transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Añadir
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {editForm.items.map((item, i) => (
                                        <div key={i} className="grid grid-cols-5 gap-2 items-center">
                                            <input
                                                className={`${inputCls} col-span-3`}
                                                placeholder="Descripción del ítem (Ej: Letras en relieve, Lona)"
                                                value={item.description}
                                                onChange={e => {
                                                    const updated = [...editForm.items];
                                                    updated[i] = { ...updated[i], description: e.target.value };
                                                    setEditForm({ ...editForm, items: updated });
                                                }}
                                            />
                                            <input
                                                className={`${inputCls} font-mono`}
                                                placeholder="Alto (m)"
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
                                                    placeholder="Ancho (m)"
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
                                                        className="p-2 text-red-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Edit Footer */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => { setEditingId(null); setEditForm(null); }}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold border border-white/5 transition-all text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveEdit}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-7 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all text-xs"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
