import { createClient } from "@/lib/supabase/server";
import TalentForm from "@/components/TalentForm";
import { updateTalent } from "../../add/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditTalentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: talent, error } = await supabase
        .from("talents")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !talent) {
        redirect("/admin/talents");
    }

    // Pass the ID to the update action using bind
    const handleUpdateWithId = updateTalent.bind(null, id);

    return <TalentForm initialData={talent} mode="edit" onSubmit={handleUpdateWithId} />;
}
