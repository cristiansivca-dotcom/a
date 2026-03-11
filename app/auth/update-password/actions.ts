"use server";

import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
    const supabase = await createClient();

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || password.length < 6) {
        return { error: "La contraseña debe tener al menos 6 caracteres." };
    }

    if (password !== confirmPassword) {
        return { error: "Las contraseñas no coinciden." };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}
