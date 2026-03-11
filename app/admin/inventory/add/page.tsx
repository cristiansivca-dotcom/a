export const dynamic = "force-dynamic";

import { getInventoryCategories } from "../actions";
import AddItemClient from "./AddItemClient";

export default async function AddItemPage() {
    const { data: categories } = await getInventoryCategories();
    return <AddItemClient categories={categories || []} />;
}
