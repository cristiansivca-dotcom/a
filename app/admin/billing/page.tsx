"use client";

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText, Plus, Search, Printer, Trash2,
    Calculator, Calendar, Clock, AlertTriangle, RefreshCw, Eye, User, ChevronRight,
    Copy, ExternalLink, TrendingUp,
    Package
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getBaseUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import InvoiceDocument from "@/components/InvoiceDocument";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

const BillingChart = ({ paid, pending, overdue }: { paid: number; pending: number; overdue: number }) => {
    const total = paid + pending + overdue;
    const segments = [
        { label: "Pagadas", value: paid, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
        { label: "Pendientes", value: pending, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
        { label: "Vencidas", value: overdue, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" }
    ];

    return (
        <div className="glass p-8 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center gap-12">
            <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {total === 0 ? (
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                    ) : (
                        segments.map((s, i) => {
                            let offset = 0;
                            for (let j = 0; j < i; j++) offset += (segments[j].value / total) * 251.2;
                            const strokeDasharray = `${(s.value / total) * 251.2} 251.2`;
                            return (
                                <motion.circle
                                    key={i}
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke={s.color}
                                    strokeWidth="12"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={-offset}
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.5, delay: i * 0.2, ease: "easeOut" }}
                                />
                            );
                        })
                    )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</p>
                    <p className="text-xl font-black text-white">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                {segments.map((s, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-white/5 space-y-2" style={{ backgroundColor: s.bg }}>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</span>
                        </div>
                        <p className="text-xl font-black text-white">
                            ${s.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: total > 0 ? `${(s.value / total) * 100}%` : 0 }}
                                transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: s.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
    total: number;
}

interface Invoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_id: string;
    customer_address: string;
    customer_phone?: string;
    total_bs: number;
    exchange_rate: number;
    created_at: string;
    status: string;
    business_area?: string;
    control_number?: string;
    items?: InvoiceItem[];
    document_type?: string;
    parent_id?: string;
    reason?: string;
}

interface BillingRequest {
    id: string;
    customer_name: string;
    customer_id_number: string;
    request_type: string;
    status: string;
    created_at: string;
}

function BillingContent() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [requests, setRequests] = useState<BillingRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState("all");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showDocument, setShowDocument] = useState(false);
    const [printMode, setPrintMode] = useState<'digital' | 'print'>('print');
    const [showPrintAction, setShowPrintAction] = useState(false);
    const supabase = createClient();
    const { success, error: toastError } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { confirm } = useConfirm();

    const fetchBillingData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [invoicesRes, requestsRes] = await Promise.all([
                supabase
                    .from('billing_invoices')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('billing_requests')
                    .select('*')
                    .neq('status', 'completed')
                    .neq('status', 'cancelled')
                    .neq('status', 'paid')
                    .order('created_at', { ascending: false })
            ]);

            if (invoicesRes.error) throw invoicesRes.error;
            if (requestsRes.error) throw requestsRes.error;

            setInvoices(invoicesRes.data || []);
            setRequests(requestsRes.data || []);
        } catch (error) {
            console.error("Error fetching billing data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchBillingData();
    }, [fetchBillingData]);

    const hasShownToast = useRef(false);

    useEffect(() => {
        const showLink = searchParams.get('showLink');
        if (showLink && !hasShownToast.current) {
            success("Solicitud creada. El link de inspección ha sido compartido.");
            hasShownToast.current = true;
            // Clean up the URL
            const newUrl = window.location.pathname;
            router.replace(newUrl);
        } else if (!showLink) {
            hasShownToast.current = false;
        }
    }, [searchParams, success, router]);

    const handleViewInvoice = async (invoice: Invoice, showPrint: boolean = false) => {
        try {
            setShowPrintAction(showPrint);
            setPrintMode('print'); // Default to paper mode for both view and print as requested
            const { data: items, error } = await supabase
                .from('billing_invoice_items')
                .select('*')
                .eq('invoice_id', invoice.id);

            if (error) throw error;

            setSelectedInvoice({
                ...invoice,
                items: items.map(item => ({
                    id: item.id,
                    description: item.description,
                    quantity: item.quantity,
                    price: item.price_bs,
                    total: item.total_bs
                }))
            });
            setShowDocument(true);
        } catch (error) {
            console.error("Error fetching invoice items:", error);
            toastError("Error al cargar los detalles de la factura.");
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Eliminar Factura",
            message: "¿Estás seguro de eliminar esta factura? Esta acción no se puede deshacer.",
            confirmText: "Eliminar",
            variant: "danger"
        });

        if (!isConfirmed) return;

        try {
            const { error } = await supabase
                .from('billing_invoices')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setInvoices(invoices.filter(inv => inv.id !== id));
            success("Factura eliminada correctamente.");
        } catch (error) {
            console.error("Error deleting invoice:", error);
            toastError("Error al eliminar la factura.");
        }
    };

    const handleDeleteRequest = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Eliminar Solicitud",
            message: "¿Estás seguro de eliminar esta solicitud? Si es de Fachada, se eliminarán también sus inspecciones. Esta acción no se puede deshacer.",
            confirmText: "Eliminar",
            variant: "danger"
        });

        if (!isConfirmed) return;

        try {
            const { error } = await supabase
                .from('billing_requests')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setRequests(requests.filter(req => req.id !== id));
            success("Solicitud eliminada correctamente.");
        } catch (error) {
            console.error("Error deleting request:", error);
            toastError("Error al eliminar la solicitud.");
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('billing_invoices')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // If marking as paid, also update the request status so the public link locks
            if (newStatus === 'paid') {
                const invoice = invoices.find(inv => inv.id === id);
                if (invoice) {
                    // Fetch the invoice's request_id
                    const { data: invData } = await supabase
                        .from('billing_invoices')
                        .select('request_id')
                        .eq('id', id)
                        .maybeSingle();

                    if (invData?.request_id) {
                        await supabase
                            .from('billing_requests')
                            .update({ status: 'paid' })
                            .eq('id', invData.request_id);

                        // If it was somehow still in local state, remove it
                        setRequests(prev => prev.filter(req => req.id !== invData.request_id));
                    }
                }
            }

            setInvoices(invoices.map(inv =>
                inv.id === id ? { ...inv, status: newStatus } : inv
            ));
            success("Estado actualizado con éxito.");
        } catch (error) {
            console.error("Error updating status:", error);
            toastError("Error al actualizar el estado.");
        }
    };

    const stats = useMemo(() => {
        const total = invoices.reduce((acc, inv) => acc + (inv.total_bs / (inv.exchange_rate || 1)), 0);
        const paid = invoices.filter(inv => inv.status === "paid").reduce((acc, inv) => acc + (inv.total_bs / (inv.exchange_rate || 1)), 0);
        const pending = invoices.filter(inv => inv.status === "pending").reduce((acc, inv) => acc + (inv.total_bs / (inv.exchange_rate || 1)), 0);
        const overdue = invoices.filter(inv => inv.status === "overdue").reduce((acc, inv) => acc + (inv.total_bs / (inv.exchange_rate || 1)), 0);

        return { total, paid, pending, overdue };
    }, [invoices]);

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === "all" || inv.status === filter;
        return matchesSearch && matchesFilter;
    });

    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-600/10 rounded-lg border border-blue-500/20 text-blue-500">
                            <Calculator size={20} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-gradient leading-tight">
                            Sistema de Facturación
                        </h1>
                    </div>
                    <p className="text-gray-400 font-medium italic">
                        Gestiona, emite e imprime tus facturas profesionales.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/admin/billing/customers">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 border border-white/10 transition-all"
                        >
                            <User size={18} />
                            Gestionar Clientes
                        </motion.button>
                    </Link>
                    <Link href="/admin/billing/products">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 border border-white/10 transition-all"
                        >
                            <Package size={18} />
                            Catálogo de Precios
                        </motion.button>
                    </Link>
                    <Link href="/admin/billing/inspecciones">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 border border-white/10 transition-all"
                        >
                            <ChevronRight size={18} />
                            Inspecciones
                        </motion.button>
                    </Link>
                    <Link href="/admin/billing/new">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-500/20 transition-all"
                        >
                            <Plus size={18} />
                            Nueva Factura
                        </motion.button>
                    </Link>
                </div>
            </div>

            {/* Dashboard Visuals */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-2"
            >
                <BillingChart paid={stats.paid} pending={stats.pending} overdue={stats.overdue} />
            </motion.div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Total Facturado", value: stats.total, icon: FileText, color: "blue" },
                    { label: "Pendientes Cobro", value: stats.pending, icon: Clock, color: "amber" },
                    { label: "Vencidas", value: stats.overdue, icon: AlertTriangle, color: "red" }
                ].map((stat, i) => (
                    <div key={i} className="glass p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                        <div className={cn(
                            "absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none",
                            `text-${stat.color}-500`
                        )}>
                            <stat.icon size={120} />
                        </div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-3xl font-black tracking-tighter text-white">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stat.value)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 px-2">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente o nº de factura..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-2xl py-4 pl-12 pr-4 text-white outline-none transition-all placeholder:text-gray-600 font-medium"
                    />
                </div>
                <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
                    {["all", "paid", "pending", "overdue"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                filter === f
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {f === "all" ? "Todas" : f === "paid" ? "Pagadas" : f === "pending" ? "Pendientes" : "Vencidas"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pending Requests Section */}
            {requests.length > 0 && filter === "all" && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                        <h2 className="text-xl font-black text-white tracking-tight uppercase">Solicitudes en Proceso</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                        {filteredRequests.map((req) => (
                            <motion.div
                                key={req.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass p-5 rounded-[2rem] border border-blue-500/10 flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">
                                            {req.request_type} • {req.status === 'pending_inspection' ? 'Esperando Inspección' : 'Esperando Factura'}
                                        </p>
                                        <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase truncate max-w-[200px]">
                                            {req.customer_name}
                                        </h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {req.request_type === 'Fachada' && req.status === 'pending_inspection' && (
                                        <button
                                            onClick={() => {
                                                const url = `${getBaseUrl()}/public/inspeccion/${req.id}`;
                                                navigator.clipboard.writeText(url);
                                                success("Link de inspección copiado.");
                                            }}
                                            className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5"
                                            title="Copiar link de inspección"
                                        >
                                            <Copy size={18} />
                                        </button>
                                    )}
                                    {req.request_type === 'Fachada' && req.status === 'pending_inspection' && (
                                        <a
                                            href={`/public/inspeccion/${req.id}`}
                                            target="_blank"
                                            className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5"
                                            title="Abrir link de inspección"
                                        >
                                            <ExternalLink size={18} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleDeleteRequest(req.id)}
                                        className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/10"
                                        title="Eliminar solicitud"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <Link href={
                                        req.request_type === 'Fachada'
                                            ? (req.status === 'pending_inspection' ? `/admin/billing/fachada/${req.id}` : `/admin/billing/fachada/${req.id}/invoice`)
                                            : `/admin/billing/new?requestId=${req.id}`
                                    }>
                                        <button className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all">
                                            <ChevronRight size={18} />
                                        </button>
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Invoices List */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <RefreshCw size={40} className="animate-spin text-gray-700 opacity-20" />
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20 glass rounded-[3rem] border border-white/5"
                        >
                            <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-20" />
                            <p className="text-gray-500 font-bold">No se encontraron facturas.</p>
                        </motion.div>
                    ) : (
                        filteredInvoices.map((inv, idx) => (
                            <motion.div
                                key={inv.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group glass p-6 rounded-[2.5rem] border border-white/5 hover:border-blue-500/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg",
                                        inv.status === "paid" ? "bg-green-500/10 border-green-500/20 text-green-500" :
                                            inv.status === "pending" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                                "bg-red-500/10 border-red-500/20 text-red-500"
                                    )}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono font-bold text-blue-500/80 tracking-widest uppercase">
                                                {inv.document_type || "Factura"} {inv.invoice_number}
                                            </span>
                                            {inv.parent_id && (
                                                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-widest border border-purple-500/20">
                                                    Ref: {invoices.find(parent => parent.id === inv.parent_id)?.invoice_number || "Factura"}
                                                </span>
                                            )}
                                            <select
                                                value={inv.status}
                                                onChange={(e) => handleStatusUpdate(inv.id, e.target.value)}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border bg-transparent cursor-pointer outline-none transition-all",
                                                    inv.status === "paid" ? "border-green-500/20 text-green-500 hover:bg-green-500/5" :
                                                        inv.status === "pending" ? "border-amber-500/20 text-amber-500 hover:bg-amber-500/5" :
                                                            "border-red-500/20 text-red-500 hover:bg-red-500/5"
                                                )}
                                            >
                                                <option value="pending" className="bg-[#0a0a0a] text-amber-500">Pendiente</option>
                                                <option value="paid" className="bg-[#0a0a0a] text-green-500">Pagada</option>
                                                <option value="overdue" className="bg-[#0a0a0a] text-red-500">Vencida</option>
                                            </select>
                                        </div>
                                        <h3 className="text-xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors">
                                            {inv.customer_name}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" /> Fecha Emisión
                                        </p>
                                        <p className="text-sm font-bold text-gray-300">{new Date(inv.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <Calculator className="w-3 h-3" /> Monto Total
                                        </p>
                                        <p className="text-lg font-black text-white">Bs. {inv.total_bs.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-100 md:opacity-50 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => handleViewInvoice(inv, false)}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white border border-white/5 transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleViewInvoice(inv, true)}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white border border-white/5 transition-colors"
                                            title="Imprimir"
                                        >
                                            <Printer className="w-4 h-4" />
                                        </button>
                                        {(inv.document_type === "Factura" || !inv.document_type) && (
                                            <Link href={`/admin/billing/debit-note/${inv.id}`}>
                                                <button
                                                    className="p-3 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl text-purple-400 hover:text-purple-300 border border-purple-500/10 transition-colors"
                                                    title="Generar Nota de Débito"
                                                >
                                                    <TrendingUp className="w-4 h-4" />
                                                </button>
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => handleDelete(inv.id)}
                                            className="p-3 bg-red-500/5 hover:bg-red-500/10 rounded-xl text-red-500/50 hover:text-red-500 border border-red-500/10 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Document Preview Modal */}
            <AnimatePresence>
                {showDocument && selectedInvoice && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDocument(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm no-print"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto glass p-8 rounded-[3rem] border border-white/10 shadow-2xl print:bg-white print:border-none print:max-h-none print:overflow-visible print:rounded-none print:shadow-none"
                        >
                            <div className="flex justify-between items-center mb-6 no-print">
                                <h2 className="text-2xl font-black text-white">Detalles de Factura</h2>
                                <button
                                    onClick={() => setShowDocument(false)}
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                >
                                    <Plus className="w-6 h-6 rotate-45" />
                                </button>
                            </div>

                            <div className="flex justify-center mb-8 no-print">
                                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl">
                                    <button
                                        onClick={() => setPrintMode('digital')}
                                        className={cn(
                                            "flex items-center gap-2.5 px-6 py-2.5 rounded-xl transition-all duration-500 font-bold text-[11px] uppercase tracking-wider",
                                            printMode === 'digital'
                                                ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-100"
                                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5 scale-95"
                                        )}
                                    >
                                        <FileText size={14} className={cn("transition-transform duration-500", printMode === 'digital' && "rotate-12")} />
                                        Digital (PDF)
                                    </button>
                                    <button
                                        onClick={() => setPrintMode('print')}
                                        className={cn(
                                            "flex items-center gap-2.5 px-6 py-2.5 rounded-xl transition-all duration-500 font-bold text-[11px] uppercase tracking-wider",
                                            printMode === 'print'
                                                ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-100"
                                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5 scale-95"
                                        )}
                                    >
                                        <Printer size={14} className={cn("transition-transform duration-500", printMode === 'print' && "rotate-12")} />
                                        Papel Pre-impreso
                                    </button>
                                </div>
                            </div>

                            <InvoiceDocument
                                customer={{
                                    name: selectedInvoice.customer_name,
                                    idNumber: selectedInvoice.customer_id,
                                    address: selectedInvoice.customer_address,
                                    phone: selectedInvoice.customer_phone
                                }}
                                items={selectedInvoice.items || []}
                                exchangeRate={selectedInvoice.exchange_rate}
                                businessArea={selectedInvoice.business_area}
                                mode={printMode}
                                invoiceNumber={selectedInvoice.invoice_number}
                                date={new Date(selectedInvoice.created_at).toLocaleDateString()}
                                title={selectedInvoice.document_type}
                            />

                            <div className="mt-8 flex justify-end gap-4 no-print">
                                {showPrintAction && (
                                    <button
                                        onClick={() => {
                                            const printContent = document.getElementById('invoice-document');
                                            if (!printContent) return;

                                            const iframe = document.createElement('iframe');
                                            iframe.style.position = 'absolute';
                                            iframe.style.top = '-10000px';
                                            iframe.style.left = '-10000px';
                                            document.body.appendChild(iframe);

                                            const iframeDoc = iframe.contentWindow?.document;
                                            if (!iframeDoc) return;

                                            const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                                                .map(s => s.outerHTML)
                                                .join('\n');

                                            iframeDoc.open();
                                            iframeDoc.write(`
                                                <html>
                                                    <head>
                                                        <title>Factura - SIVCA</title>
                                                        ${styles}
                                                        <style>
                                                            @media print {
                                                                @page { size: letter; margin: 0; }
                                                                body { background: white !important; }
                                                            }
                                                            body { background: white !important; margin: 0; padding: 0; }
                                                            .invoice-container {
                                                                margin: 0 !important;
                                                                box-shadow: none !important;
                                                                background: white !important;
                                                            }
                                                        </style>
                                                    </head>
                                                    <body>
                                                        ${printContent.outerHTML}
                                                        <script>
                                                            window.onload = () => {
                                                                setTimeout(() => {
                                                                    window.print();
                                                                    setTimeout(() => {
                                                                        window.frameElement.remove();
                                                                    }, 500);
                                                                }, 500);
                                                            };
                                                        </script>
                                                    </body>
                                                </html>
                                            `);
                                            iframeDoc.close();
                                        }}
                                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
                                    >
                                        Imprimir
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDocument(false)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function BillingPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <RefreshCw size={40} className="animate-spin text-gray-700 opacity-20" />
            </div>
        }>
            <BillingContent />
        </Suspense>
    );
}
