"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

export async function getInventoryItems() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_items')
        .select(`
            *,
            category:inventory_categories(name)
        `)
        .order('name');

    return { data, error };
}

export async function getInventoryCategories() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name');

    return { data, error };
}

export async function getInventoryTransactions() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
            *,
            item:inventory_items(name, unit)
        `)
        .order('created_at', { ascending: false });

    return { data, error };
}

export async function createInventoryItem(formData: FormData) {
    const supabase = await createClient();

    const name = formData.get("name") as string;
    const category_id = formData.get("category_id") as string;
    const quantity = parseFloat(formData.get("quantity") as string);
    const unit = formData.get("unit") as string;
    const unit_price_usd = parseFloat(formData.get("unit_price_usd") as string) || 0;
    const min_quantity = parseFloat(formData.get("min_quantity") as string) || 0;
    const material_height = parseFloat(formData.get("material_height") as string) || 0;
    const material_width = parseFloat(formData.get("material_width") as string) || 0;

    const { data, error } = await supabase
        .from('inventory_items')
        .insert([{
            name,
            category_id,
            quantity,
            unit,
            unit_price_usd,
            min_quantity,
            material_height,
            material_width
        }])
        .select()
        .single();

    if (!error && data) {
        // Log initial stock as a transaction
        await supabase.from('inventory_transactions').insert([{
            item_id: data.id,
            transaction_type: 'IN',
            quantity: quantity,
            description: 'Inventario inicial'
        }]);
        // Notify inventory managers
        await createNotification({
            role: 'inventario',
            title: "Nuevo Artículo",
            message: `Se ha añadido "${name}" al inventario con ${quantity} ${unit}.`,
            type: 'success'
        });
    }

    revalidatePath("/admin/inventory");
    return { data, error: error?.message };
}

export async function createTransaction(formData: FormData) {
    const supabase = await createClient();

    const item_id = formData.get("item_id") as string;
    const transaction_type = formData.get("transaction_type") as string; // 'IN' or 'OUT'
    const quantity = parseFloat(formData.get("quantity") as string);
    const description = formData.get("description") as string;

    // First save the transaction
    const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert([{
            item_id,
            transaction_type,
            quantity,
            description
        }]);

    if (txError) {
        return { error: txError.message };
    }

    // Then update the item's total quantity
    const { data: item } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', item_id)
        .single();

    if (item) {
        const newQuantity = transaction_type === 'IN'
            ? Number(item.quantity) + quantity
            : Number(item.quantity) - quantity;

        const { error: updateError } = await supabase
            .from('inventory_items')
            .update({ quantity: newQuantity })
            .eq('id', item_id);

        if (updateError) {
            return { error: updateError.message };
        }

        // Notify inventory managers of stock changes
        const { data: itemData } = await supabase
            .from('inventory_items')
            .select('name, unit')
            .eq('id', item_id)
            .single();

        if (itemData) {
            await createNotification({
                role: 'inventario',
                title: transaction_type === 'IN' ? "Entrada de Stock" : "Salida de Stock",
                message: `${transaction_type === 'IN' ? 'Entrada' : 'Salida'} de ${quantity} ${itemData.unit} de "${itemData.name}".`,
                type: transaction_type === 'IN' ? 'success' : 'warning'
            });
        }
    }

    revalidatePath("/admin/inventory");
    return { success: true };
}

export async function createInventoryCategory(name: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_categories')
        .insert([{ name }])
        .select()
        .single();

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/categories");
    return { data, error: error?.message };
}

export async function updateInventoryCategory(id: string, name: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/categories");
    return { data, error: error?.message };
}

export async function deleteInventoryCategory(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('inventory_categories')
        .delete()
        .eq('id', id);

    if (error) {
        return { error: error?.message };
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/categories");
    return { success: true };
}

export async function deleteInventoryItem(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

    if (error) {
        return { error: error?.message };
    }

    // Notify inventory managers
    await createNotification({
        role: 'inventario',
        title: "Artículo Eliminado",
        message: "Se ha eliminado un artículo del inventario.",
        type: 'error'
    });

    revalidatePath("/admin/inventory");
    return { success: true };
}
