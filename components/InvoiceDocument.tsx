"use client";

import { useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
}

interface InvoiceDocumentProps {
    customer: {
        name: string;
        idNumber: string;
        address: string;
        phone?: string;
    };
    items: InvoiceItem[];
    invoiceNumber: string;
    businessArea?: string;
    date: string;
    mode: 'digital' | 'print';
    exchangeRate?: number;
    title?: string;
}

export default function InvoiceDocument({
    customer,
    items,
    invoiceNumber,
    businessArea,
    date,
    mode,
    title = "Factura"
}: InvoiceDocumentProps) {

    const totals = useMemo(() => {
        const subtotal = Math.round(items.reduce((acc, item) => acc + (item.quantity * item.price), 0) * 100) / 100;
        const iva = Math.round(subtotal * 0.16 * 100) / 100;
        const total = Math.round((subtotal + iva) * 100) / 100;
        return { subtotal, iva, total };
    }, [items]);

    // Color azul/verde oscuro de la imprenta en la foto
    const printBlue = "#1a3a5f";

    return (
        <div id="invoice-document" className={cn(
            "w-[215.9mm] min-h-[279.4mm] mx-auto p-[12mm] font-sans relative invoice-container",
            mode === 'digital' ? "bg-[#fefce8] shadow-2xl" : "bg-white"
        )}>
            <style jsx global>{`
        @media print {
          @page { size: letter; margin: 0; }
          body { 
            -webkit-print-color-adjust: exact; 
            background: white !important;
          }
          #invoice-document {
            width: 215.9mm !important;
            height: 279.4mm !important;
            padding: 12mm !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
          }
          .invoice-container {
            background: white !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>


            <div className={cn(
                "flex justify-between items-start mb-2 transition-opacity",
                mode === 'print' ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
                <div className="w-[20%]">
                    <Image
                        src="/logo_sivca.png"
                        alt="SIVCA Logo"
                        width={190}
                        height={70}
                        className="object-contain"
                    />
                </div>

                <div className="w-[100%] text-center" style={{ color: printBlue }}>
                    <h1 className="text-[18px] font-bold tracking-tight uppercase leading-none">
                        SERVICIOS INTEGRALES DE VENEZUELA SIVCA, C.A.
                    </h1>
                    <p className="text-[10px] leading-tight mt-1 font-semibold">
                        Calle Buchivacoa, entre calle Cristal y Sierralta, Local SIVCA, Sector Chimpire,<br />
                        Santa Ana de Coro, Edo. Falcón - Zona Postal 4101<br />
                        Telfs: (0268) 252.61.14 / 0412-125.97.44 - E-mail: admi.sivca@gmail.com<br />
                        <span className="text-[12px]">RIF: J-404496483</span>
                    </p>
                </div>
            </div>

            <div className="text-right mb-4">
                <h2 className="text-[13px] font-bold" style={{ color: printBlue }}>
                    {title} Nº {invoiceNumber}
                </h2>
            </div>

            {/* --- DATOS DEL CLIENTE --- */}
            <div className="text-[11px] uppercase font-semibold space-y-2 mb-6" style={{ color: printBlue }}>
                <div className="flex justify-between border-b border-transparent">
                    <div className="flex gap-2">
                        <span>NOMBRE O RAZÓN SOCIAL:</span>
                        <span className="text-black font-bold border-b border-dotted border-gray-400 min-w-[300px]">{customer.name}</span>
                    </div>
                    <div className="flex gap-2">
                        <span>FECHA:</span>
                        <span className="text-black font-bold">{date}</span>
                    </div>
                </div>

                <div className="flex justify-between">
                    <div className="flex gap-2">
                        <span>RIF:</span>
                        <span className="text-black font-bold">{customer.idNumber}</span>
                    </div>
                    <div className="flex gap-2">
                        <span>Área de Negocio:</span>
                        <span className="text-black">{businessArea || "Punto Fijo - Falcón"}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <span>DIRECCIÓN FISCAL:</span>
                    <span className="text-black font-bold text-[10px] leading-tight">{customer.address}</span>
                </div>
            </div>

            {/* --- CUERPO DE FACTURA --- */}
            <div className="min-h-[550px]">
                <table className="w-full text-[11px] uppercase border-collapse">
                    <thead>
                        <tr className="border-y-2 border-gray-300" style={{ color: printBlue }}>
                            <th className="py-2 text-left w-[8%]">CANT.</th>
                            <th className="py-2 text-left w-[62%]">DESCRIPCIÓN</th>
                            <th className="py-2 text-right w-[15%]">P. UNITARIO</th>
                            <th className="py-2 text-right w-[15%]">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="text-black font-bold">
                        {items.map((item, i) => (
                            <tr key={i} className="align-top">
                                <td className="py-2 text-center">{item.quantity}</td>
                                <td className="py-2 px-2 whitespace-pre-wrap leading-tight">{item.description}</td>
                                <td className="py-2 text-right">{item.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-2 text-right">{(Math.round(item.quantity * item.price * 100) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- TOTALES Y RECIBÍ CONFORME --- */}
            <div className="mt-4 flex justify-between items-end border-t-2 border-gray-300 pt-6">
                <div className="w-1/2">
                    <div className="text-[11px] font-bold" style={{ color: printBlue }}>RECIBÍ CONFORME</div>
                    <div className="mt-8 border-t border-black w-[200px]"></div>
                </div>

                <div className="w-[40%] text-[12px] font-bold uppercase space-y-1" style={{ color: printBlue }}>
                    <div className="flex justify-between">
                        <span>SUB-TOTAL</span>
                        <span className="text-black">{totals.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} Bs</span>
                    </div>
                    <div className="flex justify-between">
                        <span>IVA 16 %</span>
                        <span className="text-black">{totals.iva.toLocaleString('de-DE', { minimumFractionDigits: 2 })} Bs</span>
                    </div>
                    <div className="flex justify-between text-[14px] border-t-2 border-black pt-1">
                        <span>TOTAL A PAGAR</span>
                        <span className="text-black">{totals.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} Bs</span>
                    </div>
                </div>
            </div>


            <div className={cn(
                "absolute bottom-6 left-0 right-0 text-center uppercase transition-opacity",
                mode === 'print' ? "opacity-0 pointer-events-none" : "opacity-100"
            )} style={{ color: printBlue }}>
                <p className="text-[10px] font-bold italic mb-2">
                    {"\"ESTE DOCUMENTO VA SIN TACHADURA NI ENMENDADURA\""}
                </p>
                <div className="text-[8px] leading-tight font-medium">
                    TECNO IMPRESOS, C.A. - RIF. J-08502356-9 - Calle Ampies 38-2 - Telf. 0268-2512252 - CORO - PROVIDENCIA: SENIAT/03/00269 - 19/02/2008 - Región Centro Occidental
                    <br />
                    Nº de Control DESDE EL Nº 00 - 00000751 HASTA EL Nº 00 - 00001250 - Fecha de elaboración: 20-11-2024
                </div>
                <div className="mt-2 text-[10px] font-bold">
                    Copia Sin Derecho a Credito Fiscal
                </div>
            </div>
        </div>
    );
}