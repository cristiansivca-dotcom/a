import { getUsers } from "./actions";
import UsersClient from "./UsersClient";
import { checkRole } from "@/lib/supabase/rbac";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    await checkRole(['admin']);
    const { users, error } = await getUsers();

    if (error) {
        return (
            <div className="p-8 text-red-500 glass rounded-[2rem] border border-red-500/20 max-w-4xl mx-auto">
                No se pudo cargar la lista de usuarios. Error: {error}
            </div>
        );
    }

    // Adapt user data for the client component
    const mappedUsers = users.map(user => ({
        id: user.id,
        email: user.email || "Sin Email",
        name: user.user_metadata?.full_name || "Sin Nombre",
        role: user.user_metadata?.role || "pending",
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: user.created_at,
    }));

    return <UsersClient initialUsers={mappedUsers} />;
}
