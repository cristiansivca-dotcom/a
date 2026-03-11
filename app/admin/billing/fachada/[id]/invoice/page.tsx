'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import {
    Save,
    RefreshCw,
    Eye,
    Printer,
    ArrowLeft,
    ClipboardList,
    Calculator,
    Calendar,
    Loader2,
    FileText,
    TrendingUp,
    FileCheck,
    Link as LinkIcon,
    Copy,
    ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/toast';
import InvoiceDocument from '@/components/InvoiceDocument';
import { fetchBCVRate } from '@/lib/utils/exchange-rate';
import Link from 'next/link';

interface BillingRequest {
    id: string;
    customer_name: string;
    customer_id_number: string;
    customer_address: string;
    customer_phone: string;
    business_area: string;
    created_at: string;
}

interface FachadaInspection {
    dimensions_height: number;
    dimensions_width: number;
    design_details: string;
    structure_type: string;
    material_specs: string;
    observations: string;
    items?: {
        description: string;
        height: number;
        width: number;
        area: number;
    }[];
}

interface BillingProduct {
    id: string;
    name: string;
    price_usd: number;
    unit: string;
}

const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    // Fallback for server-side rendering, though this component is client-side
    return 'http://localhost:3000'; // Or your default development URL
};

export default function FachadaInvoicePage() {
    const { id } = useParams();
    const router = useRouter();
    const { success: toastSuccess, error: toastError } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [request, setRequest] = useState<BillingRequest | null>(null);
    const [inspection, setInspection] = useState<FachadaInspection | null>(null);

    // Form State
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [docType, setDocType] = useState<"Factura" | "Nota de Débito">("Factura");
    const [quantity, setQuantity] = useState<number>(1);
    const [exchangeRate, setExchangeRate] = useState<number>(42.50);
    const [isFetchingRate, setIsFetchingRate] = useState(false);
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [showPreview, setShowPreview] = useState(false);
    const [printMode, setPrintMode] = useState<'digital' | 'print'>('digital');
    const [billingProducts, setBillingProducts] = useState<BillingProduct[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    const fetchLastInvoiceNumber = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('billing_invoices')
                .select('invoice_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data?.invoice_number) {
                const matches = data.invoice_number.match(/\d+$/);
                if (matches) {
                    const lastNum = parseInt(matches[0]);
                    const nextNum = (lastNum + 1).toString().padStart(matches[0].length, '0');
                    const prefix = data.invoice_number.substring(0, data.invoice_number.length - matches[0].length);
                    setInvoiceNumber(`${prefix}${nextNum}`);
                } else {
                    setInvoiceNumber("0001");
                }
            } else {
                setInvoiceNumber("0001");
            }
        } catch (error) {
            console.error("Error fetching last invoice number:", error);
        }
    }, [supabase]);

    const updateExchangeRate = async () => {
        setIsFetchingRate(true);
        try {
            const rate = await fetchBCVRate();
            if (rate) setExchangeRate(rate);
        } catch (err) {
            console.error("Error fetching rate:", err);
        } finally {
            setIsFetchingRate(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [reqRes, inspRes, invRes] = await Promise.all([
                    supabase.from('billing_requests').select('*').eq('id', id).maybeSingle(),
                    supabase.from('fachada_inspections').select('*').eq('request_id', id).maybeSingle(),
                    supabase.from('billing_products').select('id, name, price_usd, unit')
                ]);

                if (reqRes.error) throw new Error(reqRes.error.message);
                if (invRes.error) throw new Error(invRes.error.message);

                if (!reqRes.data) throw new Error("No se encontró la solicitud de facturación asociada a este ID.");
                // We no longer throw if inspection is missing, we handle it in the UI with a prompt to fill it out
                // if (!inspRes.data) throw new Error("No se encontró la inspección de fachada para esta solicitud.");

                setRequest(reqRes.data);
                setInspection(inspRes.data || null);
                setBillingProducts(invRes.data || []);
                setCustomDate(new Date(reqRes.data.created_at).toISOString().split('T')[0]);

                // Calculate total quantity from inspection items if they exist
                if (inspRes.data?.items && inspRes.data.items.length > 0) {
                    const totalArea = inspRes.data.items.reduce((acc: number, item: { area: number }) => acc + (item.area || 0), 0);
                    setQuantity(totalArea);
                } else if (inspRes.data) {
                    setQuantity((inspRes.data.dimensions_height || 0) * (inspRes.data.dimensions_width || 0) || 1);
                } else {
                    setQuantity(0); // If no inspection data, quantity is 0
                }

                await fetchLastInvoiceNumber();
                await updateExchangeRate();
            } catch (error: unknown) {
                console.error('Error fetching data:', error);
                toastError('Error al cargar datos: ' + (error instanceof Error ? error.message : String(error)));
                router.push('/admin/billing');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchData();
    }, [id, router, toastError, supabase, fetchLastInvoiceNumber]);

    const invoiceItems = useMemo(() => {
        if (!inspection || selectedProductIds.length === 0) return [];

        return selectedProductIds.map((productId, idx) => {
            const product = billingProducts.find(p => p.id === productId);
            const priceBs = product ? Math.round(product.price_usd * exchangeRate * 100) / 100 : 0;

            // Build description
            let description = `SERVICIO TÉCNICO DE FACHADA:\n`;
            if (product) {
                description += `PRODUCTO: ${product.name.toUpperCase()} (Precio base por ${product.unit})\n`;
            }
            if (inspection.items && inspection.items.length > 0) {
                inspection.items.forEach((item) => {
                    description += `- ${item.description}: ${item.height}m x ${item.width}m (${item.area.toFixed(2)}m²)\n`;
                });
            } else {
                description += `- Dimensiones: ${inspection.dimensions_height}m x ${inspection.dimensions_width}m\n`;
            }
            description += `- Estructura: ${inspection.structure_type}\n- Diseño: ${inspection.design_details}`;

            return {
                id: String(idx + 1),
                description,
                quantity,
                price: priceBs
            };
        });
    }, [inspection, quantity, selectedProductIds, billingProducts, exchangeRate]);

    const toggleProduct = (productId: string) => {
        setSelectedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const totals = useMemo(() => {
        const subtotal = Math.round(invoiceItems.reduce((acc, item) => acc + item.quantity * item.price, 0) * 100) / 100;
        const iva = Math.round(subtotal * 0.16 * 100) / 100;
        const total = Math.round((subtotal + iva) * 100) / 100;
        const totalUSD = Math.round((total / exchangeRate) * 100) / 100;
        return { subtotal, iva, total, totalUSD };
    }, [invoiceItems, exchangeRate]);

    const handleSaveInvoice = async () => {
        if (!invoiceNumber || selectedProductIds.length === 0) {
            toastError("Por favor complete el número de documento y seleccione al menos un producto.");
            return;
        }

        setIsSaving(true);
        try {
            const { error: invError } = await supabase
                .from('billing_invoices')
                .insert({
                    invoice_number: invoiceNumber,
                    customer_name: request?.customer_name,
                    customer_id: request?.customer_id_number,
                    customer_address: request?.customer_address,
                    customer_phone: request?.customer_phone,
                    business_area: request?.business_area,
                    created_at: new Date(customDate).toISOString(),
                    subtotal_bs: totals.subtotal,
                    iva_bs: totals.iva,
                    total_bs: totals.total,
                    total_usd: totals.totalUSD,
                    exchange_rate: exchangeRate,
                    status: 'pending',
                    request_id: id,
                    items: invoiceItems, // Storing items as JSON
                    document_type: docType
                });

            if (invError) throw invError;

            // Update request status to completed
            await supabase
                .from('billing_requests')
                .update({ status: 'completed' })
                .eq('id', id);

            toastSuccess(`${docType} generada correctamente`);
            router.push('/admin/billing');
        } catch (error: unknown) {
            console.error("Error saving invoice:", error);
            toastError("Error al guardar: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 size={40} className="animate-spin text-blue-500" />
                <p className="text-gray-500 font-medium animate-pulse">Generando borrador de factura...</p>
            </div>
        );
    }

    if (!request) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/billing/fachada/${id}`}>
                        <motion.button
                            whileHover={{ scale: 1.1, x: -2 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all"
                        >
                            <ArrowLeft size={20} />
                        </motion.button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white">Generar Documento</h1>
                        <p className="text-gray-500 text-sm font-medium">Finalizar proceso de Fachada</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 font-bold transition-all"
                    >
                        {showPreview ? <Calculator size={18} /> : <Eye size={18} />}
                        {showPreview ? "Editar Datos" : "Vista Previa"}
                    </button>
                    <button
                        onClick={handleSaveInvoice}
                        disabled={isSaving || !inspection || selectedProductIds.length === 0}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/20 font-bold transition-all disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Confirmar y Guardar
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* Fallback Screen: When Inspection is Missing */}
                {!inspection ? (
                    <motion.div
                        key="missing-inspection"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass rounded-3xl p-8 border border-white/10 text-center max-w-2xl mx-auto space-y-6 mt-12"
                    >
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 mx-auto">
                            <ClipboardList className="w-8 h-8 text-blue-400" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">Inspección Pendiente</h2>
                            <p className="text-gray-400">Esta solicitud de factura tipo <span className="text-white font-bold">Fachada</span> requiere que primero se completen los datos técnicos mediante el formulario de inspección pública detallado.</p>
                        </div>

                        <div className="bg-[#0f0f0f] border border-white/10 p-6 rounded-2xl text-left space-y-4 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>

                            <p className="text-sm font-bold text-gray-300">Comparta el siguiente enlace con el inspector o cliente responsable para llenar el reporte:</p>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-white/5 border border-white/10 py-3 px-4 rounded-xl flex items-center gap-3">
                                    <LinkIcon className="w-4 h-4 text-gray-500 shrink-0" />
                                    <code className="text-sm text-blue-400 font-mono truncate select-all">
                                        {getBaseUrl()}/public/inspeccion/{id}
                                    </code>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${getBaseUrl()}/public/inspeccion/${id}`);
                                        toastSuccess('Enlace copiado al portapapeles');
                                    }}
                                    className="p-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 rounded-xl transition-all h-full shrink-0"
                                    title="Copiar enlace"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                                <a
                                    href={`${getBaseUrl()}/public/inspeccion/${id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all h-full shrink-0"
                                    title="Abrir enlace"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                            </div>

                            <p className="text-[11px] text-gray-500 italic mt-2">
                                Una vez que el formulario haya sido llenado y guardado desde ese enlace, esta página se actualizará y le permitirá procesar la factura automáticamente según el área estipulada en la inspección.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button
                                onClick={() => router.push('/admin/billing')}
                                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-sm font-bold transition-all mx-auto"
                            >
                                Volver a Facturación
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="invoice-editor"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4"
                    >
                        {/* Editor Side */}
                        <div className={cn(
                            "lg:col-span-5 space-y-6 transition-all",
                            showPreview ? "hidden lg:block opacity-50 pointer-events-none grayscale" : "block"
                        )}>
                            {/* Document Selection */}
                            <div className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Tipo de Documento</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setDocType("Factura")}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                                            docType === "Factura" ? "bg-blue-600/20 border-blue-500/50 text-white" : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
                                        )}
                                    >
                                        <FileText size={20} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Factura</span>
                                    </button>
                                    <button
                                        onClick={() => setDocType("Nota de Débito")}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                                            docType === "Nota de Débito" ? "bg-purple-600/20 border-purple-500/50 text-white" : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
                                        )}
                                    >
                                        <TrendingUp size={20} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Nota Debito</span>
                                    </button>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-8">
                                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                    <h3 className="text-lg font-bold text-white tracking-tight">Cálculo de Importe</h3>
                                    <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Digital</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nº Documento</label>
                                            <input
                                                type="text"
                                                value={invoiceNumber}
                                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                                placeholder="0001"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white outline-none focus:border-blue-500/50 transition-all font-mono font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha Emisión</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                                <input
                                                    type="date"
                                                    value={customDate}
                                                    onChange={(e) => setCustomDate(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Seleccionar Productos (Catálogo)</label>
                                            {selectedProductIds.length > 0 && (
                                                <span className="text-[10px] font-bold text-emerald-400">{selectedProductIds.length} seleccionado(s)</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {billingProducts.map(product => {
                                                const isSelected = selectedProductIds.includes(product.id);
                                                return (
                                                    <button
                                                        key={product.id}
                                                        type="button"
                                                        onClick={() => toggleProduct(product.id)}
                                                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${isSelected
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
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm truncate">{product.name}</p>
                                                            <p className="text-[10px] text-gray-500 font-mono">${product.price_usd.toFixed(2)} / {product.unit}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-medium px-2 italic">
                                            * Cada producto genera una línea separada en la factura. Precio = $ USD × Tasa BCV
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cantidad Total (m²)</label>
                                        <input
                                            type="number"
                                            value={quantity.toFixed(2)}
                                            readOnly
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white outline-none focus:border-blue-500/50 transition-all font-mono font-bold cursor-not-allowed opacity-80"
                                        />
                                        <p className="text-[10px] text-gray-500 font-medium px-2">Basado en inspección</p>
                                    </div>

                                </div>

                                {/* Exchange Rate */}
                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                                            <TrendingUp size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Tasa BCV</p>
                                            <p className="text-sm font-bold text-white">{exchangeRate.toFixed(2)} Bs / USD</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={updateExchangeRate}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
                                        disabled={isFetchingRate}
                                    >
                                        <RefreshCw size={16} className={cn(isFetchingRate && "animate-spin")} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Preview Side */}
                        <div className={cn(
                            "lg:col-span-7 space-y-6 transition-all",
                            !showPreview && "hidden lg:block"
                        )}>
                            {/* Mode Toggle */}
                            <div className="flex items-center justify-between glass p-2 rounded-2xl border border-white/5 mb-4">
                                <div className="flex p-1 bg-white/5 rounded-xl w-full">
                                    <button
                                        onClick={() => setPrintMode('digital')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                                            printMode === 'digital' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        <Eye size={14} />
                                        Digital
                                    </button>
                                    <button
                                        onClick={() => setPrintMode('print')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                                            printMode === 'print' ? "bg-white text-black shadow-lg shadow-white/20" : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        <Printer size={14} />
                                        Pre-impreso
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl relative group">
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10 backdrop-blur-[2px]">
                                    <div className="bg-white/10 border border-white/20 px-6 py-3 rounded-2xl text-white font-bold flex items-center gap-2">
                                        <FileCheck size={20} />
                                        Vista Preliminar
                                    </div>
                                </div>
                                <div className="scale-[0.85] origin-top -mb-[15%]">
                                    <InvoiceDocument
                                        customer={{
                                            name: request.customer_name,
                                            idNumber: request.customer_id_number,
                                            address: request.customer_address,
                                            phone: request.customer_phone
                                        }}
                                        items={invoiceItems}
                                        invoiceNumber={invoiceNumber}
                                        businessArea={request.business_area}
                                        date={new Date(customDate).toLocaleDateString('es-ES')}
                                        mode={printMode}
                                        title={docType}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
