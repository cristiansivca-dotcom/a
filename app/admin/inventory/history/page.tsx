export const dynamic = "force-dynamic";

import { getInventoryTransactions } from "../actions";
import HistoryClient from "./HistoryClient";

export default async function HistoryPage() {
    const { data: transactions } = await getInventoryTransactions();
    return <HistoryClient initialTransactions={transactions || []} />;
}
