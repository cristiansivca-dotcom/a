'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Save,
    Eye,
    Calculator,
    Loader2,
    Plus,
    Trash2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { CurrencyInputInline } from '@/components/ui/CurrencyInput';
import { formatBs } from '@/lib/utils/currency';
import { useToast } from '@/lib/toast';
import InvoiceDocument from '@/components/InvoiceDocument';
import { fetchBCVRate } from '@/lib/utils/exchange-rate';
import Link from 'next/link';

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
    total: number;
    product_id?: string;
}

interface BillingProduct {
    id: string;
    name: string;
    price_usd: number;
    unit: string;
}

interface Invoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_id: string;
    customer_address: string;
    customer_phone?: string;
    business_area?: string;
    total_bs: number;
    exchange_rate: number;
    created_at: string;
    document_type?: string;
}

export default function DebitNotePage() {
    const { id } = useParams();
    const router = useRouter();
    const { success: toastSuccess, error: toastError } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [parentInvoice, setParentInvoice] = useState<Invoice | null>(null);

    // State
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [exchangeRate, setExchangeRate] = useState<number>(42.50);
    const [reason, setReason] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [printMode, setPrintMode] = useState<'digital' | 'print'>('digital');
    const [billingProducts, setBillingProducts] = useState<BillingProduct[]>([]);
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchLastNoteNumber = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('billing_invoices')
                .select('invoice_number')
                .eq('document_type', 'Nota de Débito')
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
                    setInvoiceNumber("ND-0001");
                }
            } else {
                setInvoiceNumber("ND-0001");
            }
        } catch (error) {
            console.error("Error fetching last note number:", error);
            setInvoiceNumber("ND-0001");
        }
    }, [supabase]);

    const updateExchangeRate = useCallback(async () => {
        try {
            const rate = await fetchBCVRate();
            if (rate) setExchangeRate(rate);
        } catch (err) {
            console.error("Error fetching rate:", err);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch parent invoice
                const { data: inv, error: invError } = await supabase
                    .from('billing_invoices')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (invError) throw invError;
                setParentInvoice(inv);
                setExchangeRate(inv.exchange_rate || 42.50);

                // Fetch parent items
                const { data: invItems, error: itemsError } = await supabase
                    .from('billing_invoice_items')
                    .select('*')
                    .eq('invoice_id', id);

                if (itemsError) throw itemsError;

                // Fetch billing products
                const { data: products, error: productsError } = await supabase
                    .from('billing_products')
                    .select('*')
                    .order('name');

                if (productsError) throw productsError;
                setBillingProducts(products || []);

                if (invItems && invItems.length > 0) {
                    setItems(invItems.map(item => ({
                        id: crypto.randomUUID(),
                        description: `AJUSTE A FACTURA ${inv.invoice_number}: ${item.description}`,
                        quantity: item.quantity,
                        price: 0,
                        total: 0
                    })));
                }

                await fetchLastNoteNumber();
                await updateExchangeRate();
            } catch (error: unknown) {
                console.error('Error fetching data:', error);
                toastError('Error al cargar factura original');
                router.push('/admin/billing');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchData();
    }, [id, router, toastError, supabase, fetchLastNoteNumber, updateExchangeRate]);

    const totals = useMemo(() => {
        const subtotal = Math.round(items.reduce((acc, item) => acc + (item.quantity * item.price), 0) * 100) / 100;
        const iva = Math.round(subtotal * 0.16 * 100) / 100;
        const total = Math.round((subtotal + iva) * 100) / 100;
        const totalUSD = Math.round((total / exchangeRate) * 100) / 100;
        return { subtotal, iva, total, totalUSD };
    }, [items, exchangeRate]);

    const handleAddItem = () => {
        setItems([...items, {
            id: crypto.randomUUID(),
            description: "",
            quantity: 1,
            price: 0,
            total: 0
        }]);
    };

    const handleRemoveItem = (itemId: string) => {
        setItems(items.filter(i => i.id !== itemId));
    };

    const handleUpdateItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
        setItems(items.map(i => {
            if (i.id === itemId) {
                const updated = { ...i, [field]: value };

                // If product_id is changed, update description and price
                if (field === 'product_id' && value) {
                    const product = billingProducts.find(p => p.id === value);
                    if (product) {
                        updated.description = `AJUSTE: ${product.name.toUpperCase()}`;
                        updated.price = product.price_usd * exchangeRate;
                    }
                }

                if (field === 'quantity' || field === 'price' || field === 'product_id') {
                    updated.total = Math.round(updated.quantity * updated.price * 100) / 100;
                }
                return updated;
            }
            return i;
        }));
    };

    const handleSave = async () => {
        if (!invoiceNumber || totals.total <= 0) {
            toastError("Por favor complete el número y el monto.");
            return;
        }

        setIsSaving(true);
        try {
            const { data: newNote, error: invError } = await supabase
                .from('billing_invoices')
                .insert({
                    invoice_number: invoiceNumber,
                    customer_name: parentInvoice?.customer_name,
                    customer_id: parentInvoice?.customer_id,
                    customer_address: parentInvoice?.customer_address,
                    customer_phone: parentInvoice?.customer_phone,
                    business_area: parentInvoice?.business_area,
                    created_at: new Date(customDate).toISOString(),
                    subtotal_bs: totals.subtotal,
                    iva_bs: totals.iva,
                    total_bs: totals.total,
                    total_usd: totals.totalUSD,
                    exchange_rate: exchangeRate,
                    status: 'pending',
                    document_type: 'Nota de Débito',
                    parent_id: id,
                    reason: reason,
                    request_id: (parentInvoice as { request_id?: string }).request_id
                })
                .select()
                .single();

            if (invError) throw invError;

            // Save items
            const noteItems = items.map(item => ({
                invoice_id: newNote.id,
                description: item.description,
                quantity: item.quantity,
                price_bs: item.price,
                total_bs: item.quantity * item.price
            }));

            const { error: itemsError } = await supabase
                .from('billing_invoice_items')
                .insert(noteItems);

            if (itemsError) throw itemsError;

            toastSuccess(`Nota de Débito generada correctamente`);
            router.push('/admin/billing');
        } catch (error: unknown) {
            console.error("Error saving debit note:", error);
            const msg = error instanceof Error ? error.message : "Error desconocido";
            toastError("Error al guardar: " + msg);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 size={40} className="animate-spin text-purple-500" />
                <p className="text-gray-500 font-medium animate-pulse">Preparando Nota de Débito...</p>
            </div>
        );
    }

    if (!parentInvoice) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32">
            {/* Header */}
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
                        <h1 className="text-3xl font-black tracking-tighter text-white">Nueva Nota de Débito</h1>
                        <p className="text-purple-400 text-sm font-bold uppercase tracking-widest">
                            Vinculada a Factura: {parentInvoice.invoice_number}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 font-bold transition-all"
                    >
                        {showPreview ? <Calculator size={18} /> : <Eye size={18} />}
                        {showPreview ? "Editar" : "Vista Previa"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl shadow-xl shadow-purple-500/20 font-bold transition-all disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Guardar Nota
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4">
                {/* Editor */}
                <div className={cn(
                    "lg:col-span-12 space-y-6 transition-all",
                    showPreview ? "hidden" : "block"
                )}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass p-6 rounded-[2rem] border border-white/5 space-y-4 col-span-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Conceptos del Ajuste</h3>
                                <button
                                    onClick={handleAddItem}
                                    className="p-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-xl border border-purple-500/20 transition-all flex items-center gap-2 text-xs font-bold"
                                >
                                    <Plus size={16} /> Agregar Fila
                                </button>
                            </div>

                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="space-y-3 p-4 bg-white/5 border border-white/5 rounded-2xl group">
                                        <div className="grid grid-cols-12 gap-3 items-start">
                                            <div className="col-span-8">
                                                <select
                                                    value={item.product_id || ""}
                                                    onChange={(e) => handleUpdateItem(item.id, 'product_id', e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-purple-500/50 mb-2"
                                                >
                                                    <option value="" className="bg-slate-900">Seleccionar producto del catálogo...</option>
                                                    {billingProducts.map(p => (
                                                        <option key={p.id} value={p.id} className="bg-slate-900">
                                                            {p.name} (${p.price_usd.toFixed(2)})
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                                    placeholder="Descripción personalizada..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white outline-none focus:border-purple-500/50 text-sm"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[8px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Cant.</label>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white outline-none focus:border-purple-500/50 text-sm text-center"
                                                />
                                            </div>
                                            <div className="col-span-2 flex items-start gap-2 pt-5">
                                                <button
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="p-2.5 text-gray-500 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-12 gap-3">
                                            <div className="col-span-6">
                                                <label className="text-[8px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Precio Unitario (Bs)</label>
                                                <CurrencyInputInline
                                                    value={item.price}
                                                    onChange={(val) => handleUpdateItem(item.id, 'price', val)}
                                                />
                                            </div>
                                            <div className="col-span-6 flex items-end justify-end pb-2">
                                                <p className="text-xs font-black text-purple-400">
                                                    Total: {formatBs(Math.round(item.total * 100) / 100)} Bs
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass p-6 rounded-[2rem] border border-white/5 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nº Nota de Débito</label>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white outline-none focus:border-purple-500/50 transition-all font-mono font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha</label>
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white outline-none focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Motivo / Observaciones</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Ej: Diferencia en metros cuadrados reportada..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white outline-none focus:border-purple-500/50 transition-all text-sm h-24 resize-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-2">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Subtotal Bs</span>
                                    <span>{totals.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>IVA 16%</span>
                                    <span>{totals.iva.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-black text-white text-lg">
                                    <span>TOTAL BS</span>
                                    <span>{totals.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className={cn(
                    "col-span-12 transition-all",
                    !showPreview && "hidden"
                )}>
                    <div className="flex items-center justify-between glass p-2 rounded-2xl border border-white/5 mb-4 max-w-sm mx-auto">
                        <div className="flex p-1 bg-white/5 rounded-xl w-full">
                            <button
                                onClick={() => setPrintMode('digital')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                    printMode === 'digital' ? "bg-purple-600 text-white shadow-lg" : "text-gray-500"
                                )}
                            >
                                Digital
                            </button>
                            <button
                                onClick={() => setPrintMode('print')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                    printMode === 'print' ? "bg-white text-black" : "text-gray-500"
                                )}
                            >
                                Pre-impreso
                            </button>
                        </div>
                    </div>

                    <div className="scale-90 origin-top">
                        <InvoiceDocument
                            customer={{
                                name: parentInvoice.customer_name,
                                idNumber: parentInvoice.customer_id,
                                address: parentInvoice.customer_address,
                                phone: parentInvoice.customer_phone
                            }}
                            items={items}
                            invoiceNumber={invoiceNumber}
                            businessArea={parentInvoice.business_area}
                            date={new Date(customDate).toLocaleDateString()}
                            mode={printMode}
                            title="Nota de Débito"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
