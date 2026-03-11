"use server";

import { sendInspectionNotification } from "@/lib/email";
import { headers } from "next/headers";
import { getBaseUrlFromHeaders } from "@/lib/url";
import { createAdminClient } from "@/lib/supabase/admin";

export async function notifyNewInspection(requestId: string, name: string, surname: string) {
    try {
        const supabaseAdmin = createAdminClient();

        // Fetch the request to get the creator's email
        const { data: request, error: fetchError } = await supabaseAdmin
            .from('billing_requests')
            .select('created_by_email')
            .eq('id', requestId)
            .single();

        if (fetchError || !request?.created_by_email) {
            console.error("Could not find requester email:", fetchError);
            // Fallback to admin if requester email is not found
            const adminEmail = process.env.GMAIL_USER || "";
            const headersList = await headers();
            const host = headersList.get("host");
            const baseUrl = getBaseUrlFromHeaders(host);
            await sendInspectionNotification(requestId, name, surname, adminEmail, baseUrl);
            return { success: true };
        }

        const headersList = await headers();
        const host = headersList.get("host");
        const baseUrl = getBaseUrlFromHeaders(host);

        await sendInspectionNotification(requestId, name, surname, request.created_by_email, baseUrl);
        return { success: true };
    } catch (error) {
        console.error("Error in notifyNewInspection action:", error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
