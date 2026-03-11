import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTriggers() {
    const { data, error } = await supabase.rpc('get_triggers_info'); // if rpc exists, else we can't do this with anon key
    if (error) {
        console.log("RPC get_triggers_info not found or access denied, let's try a direct query using postgrest on pg_trigger if exposed...");
        const { data: trigData, error: trigError } = await supabase.from('pg_trigger').select('*');
        if (trigError) {
            console.log("Cannot query pg_trigger directly via API:", trigError.message);
        } else {
            console.log("Triggers:", trigData);
        }
    } else {
        console.log("Triggers:", data);
    }
}

checkTriggers();
