/**
 * Utility to fetch the official exchange rate from BCV (Central Bank of Venezuela)
 * via the ve.dolarapi.com service.
 */

export interface ExchangeRateData {
    fuente: string;
    nombre: string;
    compra: number | null;
    venta: number | null;
    promedio: number;
    fechaActualizacion: string;
}

export async function fetchBCVRate(): Promise<number> {
    try {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (!response.ok) {
            throw new Error('Failed to fetch BCV rate');
        }
        const data: ExchangeRateData = await response.json();
        return data.promedio;
    } catch (error) {
        console.error('Error fetching BCV rate:', error);
        // Fallback to a reasonable default or throw to be handled by the UI
        throw error;
    }
}
