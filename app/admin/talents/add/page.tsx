"use client";

import TalentForm from "@/components/TalentForm";
import { addTalent } from "./actions";

export default function AddTalentPage() {
    return <TalentForm mode="add" onSubmit={addTalent} />;
}
