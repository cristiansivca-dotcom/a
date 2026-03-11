"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

export async function updateProfileName(fullName: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "No se encontró una sesión activa." };
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
            ...user.user_metadata,
            full_name: fullName
        }
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/admin/profile");
    revalidatePath("/admin"); // For the header

    // Notify user
    await createNotification({
        userId: user.id,
        title: "Perfil Actualizado",
        message: `Tu nombre ha sido cambiado a: ${fullName}`,
        type: 'success'
    });

    return { success: true };
}

export async function updatePassword(password: string) {
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
        password: password
    });

    if (error) {
        return { error: error.message };
    }

    // Notify user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await createNotification({
            userId: user.id,
            title: "Seguridad",
            message: "Tu contraseña ha sido actualizada correctamente.",
            type: 'success'
        });
    }

    return { success: true };
}

export async function updateEmail(newEmail: string) {
    const supabase = await createClient();

    // This will send two confirmation emails (to old and new addresses) by default in Supabase
    const { error } = await supabase.auth.updateUser({
        email: newEmail
    });

    if (error) {
        return { error: error.message };
    }

    // Notify user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await createNotification({
            userId: user.id,
            title: "Seguridad",
            message: `Se ha solicitado un cambio de correo a: ${newEmail}`,
            type: 'info'
        });
    }

    return { success: true, message: "Se han enviado correos de confirmación a ambas direcciones." };
}
