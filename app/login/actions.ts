"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function login(formData: FormData) {
    const supabase = await createClient();
    const cookieStore = await cookies();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    const user = authData.user;
    if (user) {
        // Generate a unique session ID
        const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);

        // Save Session ID in a secure cookie
        cookieStore.set("sb-session-id", sessionId, {
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7 // 1 week
        });

        // Update user metadata with the current session ID using Admin Client
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                current_session_id: sessionId
            }
        });
    }

    const role = authData.user?.user_metadata?.role;

    if (!role || role === 'pending') {
        redirect("/pending");
    }

    if (role === 'inventario') {
        redirect("/admin/inventory");
    } else {
        redirect("/admin/talents");
    }
}

export async function signInWithGoogle() {
    const supabase = await createClient();

    // Get origin for redirect URL
    const origin = (await (await import("next/headers")).headers()).get("origin") || "";

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });

    if (error) {
        console.error('Google Auth Error:', error.message);
        return { error: error.message };
    }

    if (data.url) {
        redirect(data.url);
    }
}

export async function signInWithGitHub() {
    const supabase = await createClient();

    // Get origin for redirect URL
    const origin = (await (await import("next/headers")).headers()).get("origin") || "";

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        console.error('GitHub Auth Error:', error.message);
        return { error: error.message };
    }

    if (data.url) {
        redirect(data.url);
    }
}
