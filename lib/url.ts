/**
 * Utility to get the base URL of the application dynamically.
 * Works in both client and server environments.
 */
export function getBaseUrl() {
    // 1. Priority: Defined environment variable
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL;
    }

    // 2. Priority: Vercel automatic deployment URL
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // 3. Priority: Client-side detection
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    // 4. Fallback for server-side if nothing else is available
    // Note: In Next.js Server Actions or Route Handlers, you should ideally 
    // pass the headers to a specialized version of this function.
    return 'http://localhost:3000';
}

/**
 * Server-side specific version that can use request headers for better accuracy.
 * @param host The 'host' or 'x-forwarded-host' header value.
 */
export function getBaseUrlFromHeaders(host?: string | null) {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

    if (host) {
        const protocol = host.includes('localhost') ? 'http' : 'https';
        return `${protocol}://${host}`;
    }

    return 'http://localhost:3000';
}
