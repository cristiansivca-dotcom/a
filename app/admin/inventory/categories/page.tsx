export const dynamic = "force-dynamic";

import { getInventoryCategories } from "../actions";
import CategoriesClient from "./CategoriesClient";

export default async function CategoriesPage() {
    const { data: categories } = await getInventoryCategories();
    return <CategoriesClient initialCategories={categories || []} />;
}
