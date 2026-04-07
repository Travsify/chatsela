import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findSource() {
  console.log("🔍 Searching for '$226' or 'Beans' or 'Manchester' in DB...");

  const tables = ['shipping_rates', 'quote_settings', 'ai_knowledge_base', 'products', 'bots'];

  for (const table of tables) {
    console.log(`\n--- Checking ${table} ---`);
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) {
      console.error(`Error reading ${table}:`, error.message);
      continue;
    }

    const matches = data.filter(row => JSON.stringify(row).includes('226') || JSON.stringify(row).toLowerCase().includes('beans') || JSON.stringify(row).toLowerCase().includes('manchester'));
    
    if (matches.length > 0) {
      console.log(`✅ Found ${matches.length} matches in ${table}:`);
      console.log(JSON.stringify(matches, null, 2));
    } else {
      console.log(`No matches in ${table}.`);
    }
  }
}

findSource();
