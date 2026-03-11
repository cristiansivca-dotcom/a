import { createClient } from "./server";
import { redirect } from "next/navigation";

export type UserRole = 'admin' | 'catalogo' | 'inventario' | 'billing';

export async function checkRole(allowedRoles: UserRole[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    if (user.user_metadata?.blocked) {
        redirect("/login?error=blocked");
    }

    if (!user.email_confirmed_at) {
        redirect("/login?error=unconfirmed");
    }

    const role = user.user_metadata?.role as UserRole | 'pending' | undefined;

    if (!role || role === 'pending') {
        redirect("/pending");
    }

    if (!allowedRoles.includes(role as UserRole)) {
        // Redirect to their default allowed page or login if they have no access
        if (role === 'inventario') {
            redirect("/admin/inventory");
        } else if (role === 'catalogo') {
            redirect("/admin/talents");
        } else {
            redirect("/login");
        }
    }

    return user;
}

export async function getUserRole(): Promise<UserRole | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return (user?.user_metadata?.role as UserRole) || null;
}
