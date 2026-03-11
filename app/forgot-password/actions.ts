"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getBaseUrlFromHeaders } from "@/lib/url";

export async function resetPassword(formData: FormData) {
    const supabase = await createClient();
    const headersList = await headers();
    const host = headersList.get("host");
    const baseUrl = getBaseUrlFromHeaders(host);

    const email = formData.get("email") as string;

    if (!email) {
        return { error: "Por favor, ingresa un correo electrónico." };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/update-password`,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}
