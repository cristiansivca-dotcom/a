import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const { data, error } = await supabase.from('service_requests').select('*').limit(1);
    console.log("service_requests:", data ? 'exists' : error?.message);

    const { data: d2, error: e2 } = await supabase.from('solicitudes').select('*').limit(1);
    console.log("solicitudes:", d2 ? 'exists' : e2?.message);
}

checkTables();
