import { getInventoryItems, getInventoryCategories } from "./actions";
import { checkRole } from "@/lib/supabase/rbac";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
    await checkRole(['admin', 'inventario']);
    const { data: items } = await getInventoryItems();
    const { data: categories } = await getInventoryCategories();

    return (
        <InventoryClient
            initialItems={items || []}
            categories={categories || []}
        />
    );
}
