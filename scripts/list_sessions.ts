import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Listing all whatsapp_sessions...");
  const { data, error } = await supabase.from('whatsapp_sessions').select('*');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();
