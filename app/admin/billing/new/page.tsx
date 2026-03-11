"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Printer, FileText, User, MapPin, Hash, Calculator, X, Eye, RefreshCw, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import InvoiceDocument from "@/components/InvoiceDocument";
import { fetchBCVRate } from "@/lib/utils/exchange-rate";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/lib/toast";
import { getBaseUrl } from "@/lib/url";
import { CurrencyInputInline } from "@/components/ui/CurrencyInput";
import { formatBs } from "@/lib/utils/currency";

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
}

interface SavedCustomer {
    id: string;
    name: string;
    id_number: string;
    address: string;
    phone: string;
    business_area: string;
}

function NewInvoiceContent() {
    const [customer, setCustomer] = useState({
        name: "",
        idNumber: "",
        address: "",
        phone: "",
        businessArea: "Punto Fijo - Falcón"
    });

    const [requestType, setRequestType] = useState<"Impulsadora" | "Especial" | "Fachada">("Impulsadora");

    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

    const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [saveNewCustomer, setSaveNewCustomer] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

    const [items, setItems] = useState<InvoiceItem[]>([
        { id: "1", description: "", quantity: 1, price: 0 }
    ]);

    const [showPreview, setShowPreview] = useState(false);
    const [printMode, setPrintMode] = useState<'digital' | 'print'>('digital');
    const [exchangeRate, setExchangeRate] = useState<number>(42.50);
    const [isFetchingRate, setIsFetchingRate] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [isFetchingLastNumber, setIsFetchingLastNumber] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestId = searchParams.get('requestId');
    const { success, error: toastError } = useToast();

    const fetchLastInvoiceNumber = useCallback(async () => {
        setIsFetchingLastNumber(true);
        try {
            const { data, error } = await supabase
                .from('billing_invoices')
                .select('invoice_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data?.invoice_number) {
                // Try to extract number from formats like "#IV-2026-1234" or just "1234"
                const matches = data.invoice_number.match(/\d+$/);
                if (matches) {
                    const lastNum = parseInt(matches[0]);
                    const nextNum = (lastNum + 1).toString().padStart(matches[0].length, '0');
                    // Reconstruct with prefix if it had one
                    const prefix = data.invoice_number.substring(0, data.invoice_number.length - matches[0].length);
                    setInvoiceNumber(`${prefix}${nextNum}`);
                } else {
                    setInvoiceNumber("");
                }
            } else {
                setInvoiceNumber("0001");
            }
        } catch (error) {
            console.error("Error fetching last invoice number:", error);
        } finally {
            setIsFetchingLastNumber(false);
        }
    }, [supabase]);

    const fetchCustomers = useCallback(async () => {
        setIsLoadingCustomers(true);
        try {
            const { data, error } = await supabase
                .from('billing_customers')
                .select('*')
                .order('name', { ascending: true });

            if (data) setSavedCustomers(data);
            if (error) console.error("Error fetching customers:", error);
        } catch (error) {
            console.error("Error fetching customers:", error);
        } finally {
            setIsLoadingCustomers(false);
        }
    }, [supabase]);

    // Fetch rate and customers on mount
    useEffect(() => {
        handleFetchRate();
        fetchCustomers();
        fetchLastInvoiceNumber();
    }, [fetchCustomers, fetchLastInvoiceNumber]);

    useEffect(() => {
        if (requestId) {
            const fetchRequestDetails = async () => {
                try {
                    const { data, error } = await supabase
                        .from('billing_requests')
                        .select('*')
                        .eq('id', requestId)
                        .maybeSingle();

                    if (data && !error) {
                        setCustomer({
                            name: data.customer_name || "",
                            idNumber: data.customer_id_number || "",
                            address: data.customer_address || "",
                            phone: data.customer_phone || "",
                            businessArea: data.business_area || "Punto Fijo - Falcón"
                        });
                        setRequestType((data.request_type as "Impulsadora" | "Especial" | "Fachada") || "Impulsadora");
                        if (data.customer_id) {
                            setSelectedCustomerId(data.customer_id);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching request details", err);
                }
            };
            fetchRequestDetails();
        }
    }, [requestId, supabase]);

    const handleFetchRate = async () => {
        setIsFetchingRate(true);
        try {
            const rate = await fetchBCVRate();
            setExchangeRate(rate);
        } catch (error) {
            console.error("Error setting exchange rate:", error);
        } finally {
            setIsFetchingRate(false);
        }
    };

    // Item Management
    const addItem = () => {
        setItems([...items, { id: Date.now().toString(), description: "", quantity: 1, price: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    // Calculations
    const totals = useMemo(() => {
        const subtotal = Math.round(items.reduce((acc, item) => acc + (item.quantity * item.price), 0) * 100) / 100;
        const iva = Math.round(subtotal * 0.16 * 100) / 100;
        const total = Math.round((subtotal + iva) * 100) / 100;
        const totalUSD = exchangeRate > 0 ? Math.round((total / exchangeRate) * 100) / 100 : 0;

        return { subtotal, iva, total, totalUSD };
    }, [items, exchangeRate]);

    const handleCustomerChange = (customerId: string) => {
        setSelectedCustomerId(customerId);
        if (customerId === "new") {
            setCustomer({
                name: "",
                idNumber: "",
                address: "",
                phone: "",
                businessArea: "Punto Fijo - Falcón"
            });
            return;
        }

        const selected = savedCustomers.find(c => c.id === customerId);
        if (selected) {
            setCustomer({
                name: selected.name ?? '',
                idNumber: selected.id_number ?? '',
                address: selected.address ?? '',
                phone: selected.phone ?? '',
                businessArea: selected.business_area ?? ''
            });
        }
    };

    const handleSaveInvoice = async () => {
        if (!customer.name || (requestType !== "Fachada" && (!invoiceNumber || items.some(item => !item.description || item.price <= 0)))) {
            toastError("Por favor complete todos los datos correctamente.");
            return;
        }

        setIsSaving(true);
        try {
            // STEP 0: Get Current User Email
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const createdByEmail = authUser?.email || null;

            let currentRequestId = requestId;

            if (!currentRequestId) {
                // STEP 1: Create the Solicitud (billing_requests)
                console.log("Insertando solicitud en billing_requests...");
                const { data: request, error: reqError } = await supabase
                    .from('billing_requests')
                    .insert({
                        customer_name: customer.name,
                        customer_id: selectedCustomerId && selectedCustomerId !== "new" ? selectedCustomerId : null,
                        customer_id_number: customer.idNumber,
                        customer_address: customer.address,
                        customer_phone: customer.phone,
                        business_area: customer.businessArea,
                        request_type: requestType,
                        status: requestType === "Fachada" ? 'pending_inspection' : 'completed',
                        created_at: new Date(customDate).toISOString(),
                        created_by_email: createdByEmail
                    })
                    .select()
                    .single();

                if (reqError) {
                    console.error("Error en inserción de solicitud:", reqError.message, reqError);
                    throw reqError;
                }
                currentRequestId = request.id;

                if (requestType === "Fachada") {
                    const publicUrl = `${getBaseUrl()}/public/inspeccion/${request.id}`;

                    // Copy to clipboard automatically for convenience
                    try {
                        await navigator.clipboard.writeText(publicUrl);
                        success("Solicitud registrada. Link de inspección copiado al portapapeles.");
                    } catch (err) {
                        console.error("No se pudo copiar el enlace al portapapeles:", err);
                        success("Solicitud registrada.");
                    }

                    // Show a confirmation before redirecting or just redirect to a view that shows the link
                    router.push(`/admin/billing?showLink=${request.id}`);
                    return;
                }
            } else {
                // Actualizar la solicitud existente a completada
                console.log("Actualizando solicitud existente a completada...");
                const { error: reqUpdateErr } = await supabase
                    .from('billing_requests')
                    .update({ status: 'completed' })
                    .eq('id', currentRequestId);

                if (reqUpdateErr) {
                    console.error("Error actualizando solicitud:", reqUpdateErr.message);
                    throw reqUpdateErr;
                }
            }

            // For other types, continue to create invoice immediately
            console.log("Insertando factura en billing_invoices...");
            const { data: invoice, error: invError } = await supabase
                .from('billing_invoices')
                .insert({
                    invoice_number: invoiceNumber,
                    customer_name: customer.name,
                    customer_id: customer.idNumber,
                    customer_address: customer.address,
                    customer_phone: customer.phone,
                    business_area: customer.businessArea,
                    created_at: new Date(customDate).toISOString(),
                    subtotal_bs: totals.subtotal,
                    iva_bs: totals.iva,
                    total_bs: totals.total,
                    total_usd: totals.totalUSD,
                    exchange_rate: exchangeRate,
                    status: 'pending',
                    request_id: currentRequestId
                })
                .select()
                .single();

            if (invError) {
                console.error("Error en inserción de factura:", invError.message, invError);
                throw invError;
            }

            if (!invoice) {
                console.error("No se recibieron datos de la factura insertada");
                throw new Error("No se pudo obtener el ID de la factura guardada.");
            }

            console.log("Factura creada con ID:", invoice.id);

            // Optional: Save/Update customer
            if (saveNewCustomer) {
                console.log("Upserting cliente en billing_customers...", {
                    name: customer.name,
                    id_number: customer.idNumber
                });

                if (!customer.idNumber) {
                    console.warn("No se puede guardar cliente sin RIF/Cédula");
                    toastError("Para guardar el cliente se requiere el RIF o Cédula.");
                } else {
                    // First, check if the customer exists by id_number
                    const { data: existingCustomer, error: findError } = await supabase
                        .from('billing_customers')
                        .select('id')
                        .eq('id_number', customer.idNumber)
                        .maybeSingle();

                    let custError = findError;

                    if (!findError) {
                        if (existingCustomer) {
                            // Update existing
                            console.log("Actualizando cliente existente...");
                            const { error: updateError } = await supabase
                                .from('billing_customers')
                                .update({
                                    name: customer.name,
                                    address: customer.address,
                                })
                                .eq('id', existingCustomer.id);
                            custError = updateError;
                        } else {
                            // Insert new
                            console.log("Insertando nuevo cliente...");
                            const { error: insertError } = await supabase
                                .from('billing_customers')
                                .insert({
                                    name: customer.name,
                                    id_number: customer.idNumber,
                                    address: customer.address,
                                });
                            custError = insertError;
                        }
                    }

                    if (custError) {
                        console.error("Error al guardar cliente:", custError.message, custError);
                        toastError(`No se guardó el cliente: ${custError.message}`);
                    } else {
                        console.log("Cliente guardado/actualizado con éxito");
                    }
                }
            }

            const invoiceItems = items.map(item => ({
                invoice_id: invoice.id,
                description: item.description,
                quantity: item.quantity,
                price_bs: item.price,
                total_bs: item.quantity * item.price
            }));

            console.log("Insertando items de la factura...");
            const { error: itemsError } = await supabase
                .from('billing_invoice_items')
                .insert(invoiceItems);

            if (itemsError) {
                console.error("Error en inserción de items:", itemsError.message, itemsError);
                throw itemsError;
            }

            console.log("¡Todo guardado exitosamente!");
            success("Factura guardada exitosamente.");
            router.push("/admin/billing");
        } catch (error: unknown) {
            console.error("Error completo atrapado:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            if (errorStack) console.error("Stack trace:", errorStack);

            const msg = errorMessage || "Error desconocido";
            toastError(`Error al guardar la factura: ${msg}`);
        } finally {
            setIsSaving(false);
        }
    };

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
                        <h1 className="text-3xl font-black tracking-tighter text-white">Generar Factura</h1>
                        <p className="text-gray-500 text-sm font-medium">Complete los campos para emitir el documento.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setPrintMode('digital'); setShowPreview(true); }}
                        className="hidden md:flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl border border-white/5 font-bold transition-all"
                    >
                        <Eye size={18} />
                        Vista Previa
                    </button>
                    <button
                        onClick={handleSaveInvoice}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/20 font-bold transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : (
                            <Printer size={18} />
                        )}
                        Emitir y Guardar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Side */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Customer Section */}
                    <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                                    <User size={20} />
                                </div>
                                <h2 className="text-xl font-black text-white">Datos de la Solicitud</h2>
                            </div>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                {(["Impulsadora", "Especial", "Fachada"] as const).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setRequestType(type)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            requestType === type ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Seleccionar Cliente Guardado</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium appearance-none disabled:opacity-50"
                                        value={selectedCustomerId}
                                        onChange={e => handleCustomerChange(e.target.value)}
                                        disabled={isLoadingCustomers}
                                    >
                                        <option value="" className="bg-[#1a1a1a]">
                                            {isLoadingCustomers ? "Cargando clientes..." : "-- Seleccionar o Nuevo Cliente --"}
                                        </option>
                                        {savedCustomers.map(c => (
                                            <option key={c.id} value={c.id} className="bg-[#1a1a1a]">
                                                {c.name} ({c.id_number})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        {isLoadingCustomers ? (
                                            <RefreshCw size={16} className="animate-spin" />
                                        ) : (
                                            <Plus size={16} />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Nombre o Razón Social</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="text"
                                        placeholder="Ej: Inversiones SIVCA, C.A."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium placeholder:text-gray-700"
                                        value={customer.name}
                                        onChange={e => setCustomer({ ...customer, name: e.target.value })}
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
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium placeholder:text-gray-700"
                                        value={customer.idNumber}
                                        onChange={e => setCustomer({ ...customer, idNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Área de Negocio</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="text"
                                        placeholder="Ej: Punto Fijo - Falcón"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium placeholder:text-gray-700"
                                        value={customer.businessArea ?? ''}
                                        onChange={e => setCustomer({ ...customer, businessArea: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Nota Debito Nº</label>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="text"
                                        placeholder="Ej: 0001"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                                        value={invoiceNumber}
                                        onChange={e => setInvoiceNumber(e.target.value)}
                                    />
                                    {isFetchingLastNumber && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <RefreshCw size={14} className="animate-spin text-blue-500" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Fecha Factura</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="date"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                                        value={customDate}
                                        onChange={e => setCustomDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Dirección Fiscal</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-gray-600" />
                                    <textarea
                                        placeholder="Dirección completa del cliente..."
                                        rows={2}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium placeholder:text-gray-700 resize-none"
                                        value={customer.address}
                                        onChange={e => setCustomer({ ...customer, address: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 flex items-center gap-3 pl-1 pt-2">
                                <input
                                    type="checkbox"
                                    id="save-customer"
                                    checked={saveNewCustomer}
                                    onChange={e => setSaveNewCustomer(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0 transition-all cursor-pointer"
                                />
                                <label htmlFor="save-customer" className="text-xs font-bold text-gray-400 cursor-pointer hover:text-white transition-all">
                                    Guardar o actualizar datos de este cliente para futuras facturas
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Items Section - Only if not Fachada */}
                    {requestType !== "Fachada" && (
                        <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                                        <FileText size={20} />
                                    </div>
                                    <h2 className="text-xl font-black text-white">Detalle de Factura</h2>
                                </div>
                                <button
                                    onClick={addItem}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-indigo-400 rounded-xl border border-white/5 transition-all"
                                >
                                    <Plus size={14} /> Añadir Item
                                </button>
                            </div>

                            <div className="space-y-4">
                                {items.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 group relative"
                                    >
                                        <div className="flex-[3] space-y-1">
                                            <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-1">Descripción</label>
                                            <input
                                                type="text"
                                                placeholder="Descripción del producto o servicio..."
                                                className="w-full bg-transparent border-none p-0 text-white outline-none font-medium placeholder:text-gray-800"
                                                value={item.description}
                                                onChange={e => updateItem(item.id, "description", e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-1">Cant.</label>
                                            <input
                                                type="number"
                                                className="w-full bg-transparent border-none p-0 text-white outline-none font-medium text-center"
                                                value={item.quantity}
                                                onChange={e => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1 text-right">
                                            <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mr-1">P. Unitario</label>
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-gray-600 text-[10px] font-bold">Bs.</span>
                                                <CurrencyInputInline
                                                    value={item.price}
                                                    onChange={(val) => updateItem(item.id, "price", val)}
                                                    className="w-28 bg-transparent border-none py-0 px-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1 text-right hidden md:block border-l border-white/5 pl-4">
                                            <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mr-1">Total</label>
                                            <p className="font-bold text-white text-sm mt-1">Bs. {(item.quantity * item.price).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                                        </div>

                                        {items.length > 1 && (
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="absolute md:relative -top-2 -right-2 md:top-auto md:right-auto p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg md:opacity-0 group-hover:opacity-100 transition-all border border-red-500/20"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary Side - Only if not Fachada */}
                <div className={cn("space-y-6", requestType === "Fachada" && "hidden lg:block opacity-20 pointer-events-none")}>
                    <div className="glass p-8 rounded-[3rem] border border-white/5 sticky top-24">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                                <Calculator size={20} />
                            </div>
                            <h2 className="text-xl font-black text-white">Resumen</h2>
                        </div>

                        <div className="space-y-5">
                            {/* Exchange Rate Input */}
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 mb-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tasa BCV (1$ = ? Bs.)</label>
                                    <button
                                        onClick={handleFetchRate}
                                        disabled={isFetchingRate}
                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        <RefreshCw size={12} className={cn(isFetchingRate && "animate-spin")} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 font-bold text-sm">Bs.</span>
                                    <CurrencyInputInline
                                        value={exchangeRate}
                                        onChange={(val) => setExchangeRate(val)}
                                        className="bg-transparent border-none py-0 px-0 text-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center px-2">
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Subtotal</span>
                                <span className="text-white font-bold font-mono">Bs. {formatBs(totals.subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center px-2 group cursor-help">
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    IVA (16%)
                                    <div className="w-1 h-1 rounded-full bg-gray-700" />
                                </span>
                                <span className="text-white font-bold font-mono">Bs. {formatBs(totals.iva)}</span>
                            </div>

                            <div className="pt-6 mt-2 border-t border-white/10">
                                <div className="flex justify-between items-end px-2">
                                    <div>
                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Total a Pagar</span>
                                        <div className="space-y-1 mt-1">
                                            <p className="text-4xl font-black text-white tracking-tighter">Bs. {totals.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                                            <p className="text-sm font-bold text-blue-400/80 font-mono">Ref. USD ${totals.totalUSD.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="pb-1">
                                        <p className="text-[10px] font-mono text-gray-500 text-right uppercase italic leading-none">Ventas <br /> Sujetas</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Nota Legal</p>
                                <p className="text-[10px] text-gray-400 leading-relaxed italic">
                                    Este documento se rige bajo la normativa del SENIAT. El cálculo del IGTF se aplica sobre pagos en moneda extranjera.
                                </p>
                            </div>
                        </div>

                        <div className="glass p-6 rounded-[2rem] border border-white/5 opacity-50 mt-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                                    <Hash size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nº Factura Sugerido</p>
                                    <p className="text-sm font-mono font-bold text-white">#IV-2024-0004</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8 no-print"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[#1a1a1a] w-full max-w-5xl h-[90vh] rounded-[3rem] overflow-hidden border border-white/10 flex flex-col shadow-2xl print:bg-white print:border-none print:h-auto print:rounded-none"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20 no-print">
                                <div className="flex items-center gap-4">
                                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                        <button
                                            onClick={() => setPrintMode('digital')}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                printMode === 'digital' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                                            )}
                                        >
                                            Digital (PDF)
                                        </button>
                                        <button
                                            onClick={() => setPrintMode('print')}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                printMode === 'print' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                                            )}
                                        >
                                            Papel Pre-impreso
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-medium hidden sm:block">
                                        {printMode === 'digital'
                                            ? "Se exportará el diseño completo de la factura."
                                            : "Se imprimirán solo los datos ajustados a su formato físico."}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
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
                                        className="bg-white text-black px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-all"
                                    >
                                        <Printer size={16} /> Imprimir
                                    </button>
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="p-2 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-xl transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body - Scrollable Preview */}
                            <div className="flex-1 overflow-auto p-8 md:p-12 bg-[#141414] print:p-0 print:overflow-visible print:bg-white">
                                <div className="print:m-0 shadow-2xl shadow-black/50 print:shadow-none">
                                    <InvoiceDocument
                                        customer={customer}
                                        items={items}
                                        invoiceNumber={invoiceNumber}
                                        date={new Date(customDate).toLocaleDateString('es-VE')}
                                        businessArea={customer.businessArea}
                                        mode={printMode}
                                        exchangeRate={exchangeRate}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function NewInvoicePage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <RefreshCw size={40} className="animate-spin text-blue-500" />
                <p className="text-gray-500 font-medium animate-pulse">Cargando...</p>
            </div>
        }>
            <NewInvoiceContent />
        </Suspense>
    );
}
