"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendApprovalEmail } from "@/lib/email";
import { headers } from "next/headers";
import { getBaseUrlFromHeaders } from "@/lib/url";

export async function getUsers() {
    const supabaseAdmin = createAdminClient();

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        return { error: error.message, users: [] };
    }

    return { users: users, error: null };
}

export async function updateUserRole(userId: string, newRole: string) {
    const supabaseAdmin = createAdminClient();

    // 1. Fetch user to check previous role and get email destination
    const { data: { user }, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchError || !user) {
        return { error: "No se pudo encontrar este usuario.", success: false };
    }

    const previousRole = user.user_metadata?.role || 'pending';
    const userEmail = user.email;

    // Check admin limit if trying to set role to admin
    if (newRole === 'admin') {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) return { error: listError.message, success: false };

        const adminCount = users.filter(u => u.user_metadata?.role === 'admin').length;
        if (adminCount >= 5) {
            return { error: "Límite de administradores alcanzado (máximo 5).", success: false };
        }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { role: newRole }
    });

    if (updateError) {
        return { error: updateError.message, success: false };
    }

    // 2. If transitioning from 'pending' (or null) to an active role, send email
    if (userEmail && (previousRole === 'pending' || !previousRole) && ['admin', 'catalogo', 'inventario'].includes(newRole)) {
        const headersList = await headers();
        const host = headersList.get("host");
        const baseUrl = getBaseUrlFromHeaders(host);
        await sendApprovalEmail(userEmail, newRole, baseUrl);
    }

    revalidatePath('/admin/users');
    return { success: true, error: null };
}

export async function updateUser(userId: string, fullName: string, email: string, newRole: string) {
    const supabaseAdmin = createAdminClient();

    if (!email || !fullName || !newRole) {
        return { error: "Todos los campos (nombre, email, rol) son requeridos.", success: false };
    }

    // 1. Fetch user to check previous role and get current email
    const { data: { user }, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchError || !user) {
        return { error: "No se pudo encontrar este usuario.", success: false };
    }

    const previousRole = user.user_metadata?.role || 'pending';

    // 2. Check admin limit if trying to set role to admin
    if (newRole === 'admin' && previousRole !== 'admin') {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) return { error: listError.message, success: false };

        const adminCount = users.filter(u => u.user_metadata?.role === 'admin').length;
        if (adminCount >= 5) {
            return { error: "Límite de administradores alcanzado (máximo 5).", success: false };
        }
    }

    // 3. Update User Attributes (Email, Metadata)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: email,
        email_confirm: true, // Auto-confirm email change since it's an admin action
        user_metadata: {
            full_name: fullName,
            role: newRole
        }
    });

    if (updateError) {
        return { error: updateError.message, success: false };
    }

    // 4. If transitioning from 'pending' (or null) to an active role, send approval email
    if ((previousRole === 'pending' || !previousRole) && ['admin', 'catalogo', 'inventario'].includes(newRole)) {
        const headersList = await headers();
        const host = headersList.get("host");
        const baseUrl = getBaseUrlFromHeaders(host);
        await sendApprovalEmail(email, newRole, baseUrl);
    }

    revalidatePath('/admin/users');
    return { success: true, error: null };
}

export async function toggleUserBlock(userId: string, currentlyBlocked: boolean) {
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { blocked: !currentlyBlocked }
    });

    if (error) {
        return { error: error.message, success: false };
    }

    revalidatePath('/admin/users');
    return { success: true, error: null };
}

export async function deleteUser(userId: string) {
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
        return { error: error.message, success: false };
    }

    revalidatePath('/admin/users');
    return { success: true, error: null };
}

export async function createUser(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const role = formData.get("role") as string;

    if (!email || !password || !fullName || !role) {
        return { error: "Todos los campos son obligatorios", success: false };
    }

    const supabaseAdmin = createAdminClient();

    // Check admin limit if trying to set role to admin
    if (role === 'admin') {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) return { error: listError.message, success: false };

        const adminCount = users.filter(u => u.user_metadata?.role === 'admin').length;
        if (adminCount >= 5) {
            return { error: "Límite de administradores alcanzado (máximo 5).", success: false };
        }
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            role: role
        }
    });

    if (error) {
        return { error: error.message, success: false };
    }

    revalidatePath('/admin/users');
    return { success: true, error: null };
}
