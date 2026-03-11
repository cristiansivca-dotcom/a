"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

interface TalentForm {
    nombre: string;
    genero: string;
    altura: string;
    experiencia: string;
    especialidad: string;
    descripcion: string;
    rating: string; // Recibimos como string del formulario, convertimos a numero si es necesario
    fotosFiles?: File[];
    tags: string[];
}

export async function addTalent(formData: TalentForm) {
    // Prefer using the Service Role key on the server to bypass RLS for admin actions.
    // Ensure SUPABASE_SERVICE_ROLE_KEY is set in your server env (never expose it to the client).
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        : await createClient();

    const uploadedUrls: string[] = [];

    // Solo subir archivos locales
    if (formData.fotosFiles && formData.fotosFiles.length > 0) {
        for (const file of formData.fotosFiles) {
            const ext = file.name.split(".").pop() ?? "jpg";
            const key = `talents/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("talent-photos")
                .upload(key, file, { cacheControl: "3600", upsert: false });

            if (uploadError) {
                console.error("Upload Error:", uploadError);
                return { success: false, error: uploadError.message };
            }

            // Get public URL (bucket must be public) — if bucket is private, use createSignedUrl instead
            const { data: publicData } = await supabase.storage.from("talent-photos").getPublicUrl(key);
            if (publicData && publicData.publicUrl) {
                uploadedUrls.push(publicData.publicUrl);
            }
        }
    }

    const fotosToStore = uploadedUrls;
    const mainPhoto = fotosToStore.length > 0 ? fotosToStore[0] : null;

    const { error } = await supabase.from("talents").insert([
        {
            nombre: formData.nombre,
            genero: formData.genero,
            altura: formData.altura,
            experiencia: formData.experiencia,
            especialidad: formData.especialidad,
            descripcion: formData.descripcion,
            rating: parseFloat(formData.rating) || 0,
            foto: mainPhoto,
            fotos: fotosToStore,
            tags: formData.tags,
            active: true,
        },
    ]);

    if (error) {
        console.error("Supabase Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/talents");
    return { success: true };
}

export async function updateTalent(id: string, formData: TalentForm & { existingPhotos?: string[] }) {
    console.log("Updating talent:", id);
    console.log("Form data:", JSON.stringify(formData, null, 2));

    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        : await createClient();

    const uploadedUrls: string[] = [];

    // 1. Upload new files if any
    if (formData.fotosFiles && formData.fotosFiles.length > 0) {
        for (const file of formData.fotosFiles) {
            const ext = file.name.split(".").pop() ?? "jpg";
            const key = `talents/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("talent-photos")
                .upload(key, file, { cacheControl: "3600", upsert: false });

            if (uploadError) {
                console.error("Upload Error:", uploadError);
                return { success: false, error: uploadError.message };
            }

            const { data: publicData } = await supabase.storage.from("talent-photos").getPublicUrl(key);
            if (publicData?.publicUrl) {
                uploadedUrls.push(publicData.publicUrl);
            }
        }
    }

    // 2. Combine existing photos + new photos
    // formData.existingPhotos should be an array of strings (URLs) sent from the client
    const existingPhotos = formData.existingPhotos || [];
    const finalPhotos = [...existingPhotos, ...uploadedUrls];
    const mainPhoto = finalPhotos.length > 0 ? finalPhotos[0] : null;

    // 3. Update database
    console.log("Final photos to store:", finalPhotos);

    const { data: updatedData, error } = await supabase
        .from("talents")
        .update({
            nombre: formData.nombre,
            genero: formData.genero,
            altura: formData.altura,
            experiencia: formData.experiencia,
            especialidad: formData.especialidad,
            descripcion: formData.descripcion,
            rating: parseFloat(formData.rating) || 0,
            foto: mainPhoto,
            fotos: finalPhotos,
            tags: formData.tags,
            // active: true // usually we don't reset active status on edit unless specified
        })
        .eq("id", id)
        .select();

    console.log("Update database result:", { updatedData, error });

    if (error) {
        console.error("Update Error:", error);
        return { success: false, error: error.message };
    }

    if (!updatedData || updatedData.length === 0) {
        console.warn("No rows updated. Check if ID is correct:", id);
        return { success: false, error: "No se encontró el talento o no hubo cambios" };
    }

    revalidatePath("/admin/talents");
    revalidatePath(`/admin/talents/${id}`);
    revalidatePath(`/admin/talents/${id}/edit`);

    return { success: true };
}

export async function deleteTalent(id: string) {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        : await createClient();

    // 1. Get talent to find photos to delete
    const { data: talent, error: fetchError } = await supabase
        .from("talents")
        .select("fotos")
        .eq("id", id)
        .single();

    if (fetchError) {
        console.error("Fetch Error:", fetchError);
        return { success: false, error: fetchError.message };
    }

    // 2. Delete photos from storage
    if (talent?.fotos && talent.fotos.length > 0) {
        const pathsToDelete = talent.fotos
            .map((url: string) => {
                const parts = url.split("/talent-photos/");
                return parts.length > 1 ? parts[1] : null;
            })
            .filter(Boolean) as string[];

        if (pathsToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
                .from("talent-photos")
                .remove(pathsToDelete);

            if (storageError) {
                console.error("Storage Delete Error:", storageError);
                // We continue even if storage delete fails to ensure DB is cleaned up, 
                // but we log it.
            }
        }
    }

    // 3. Delete from database
    const { error: deleteError } = await supabase
        .from("talents")
        .delete()
        .eq("id", id);

    if (deleteError) {
        console.error("Delete Error:", deleteError);
        return { success: false, error: deleteError.message };
    }

    revalidatePath("/admin/talents");
    return { success: true };
}

export async function toggleTalentStatus(id: string, currentStatus: boolean) {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        : await createClient();

    const { error } = await supabase
        .from("talents")
        .update({ active: !currentStatus })
        .eq("id", id);

    if (error) {
        console.error("Toggle Status Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/talents");
    revalidatePath("/admin"); // For dashboard metrics
    return { success: true };
}
