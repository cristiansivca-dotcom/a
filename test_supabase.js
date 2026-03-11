const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ecymkdlpklithkhopxmx.supabase.co';
const supabaseKey = 'sb_publishable_gjLYfIOdnRdOFXb7JSmMCw_TgWmC9zV';

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Client created successfully");
} catch (e) {
  console.error("Error creating client:", e.message);
}
