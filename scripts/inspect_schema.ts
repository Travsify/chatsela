import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectSchema() {
  console.log("--- PROFILES ---");
  const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
  console.log(JSON.stringify(profiles?.[0] || {}, null, 2));

  console.log("\n--- QUOTE SETTINGS ---");
  const { data: quoteSettings } = await supabase.from('quote_settings').select('*').limit(1);
  console.log(JSON.stringify(quoteSettings?.[0] || {}, null, 2));

  console.log("\n--- EXTERNAL CONNECTORS ---");
  const { data: connectors } = await supabase.from('external_connectors').select('*');
  console.log(JSON.stringify(connectors || [], null, 2));
}

inspectSchema();
