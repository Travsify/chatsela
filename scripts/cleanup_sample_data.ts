import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupSampleData() {
  console.log("🧹 Starting Database Cleanup (Sample Data Eradication)...");

  const tables = ['shipping_rates', 'products', 'ai_knowledge_base'];

  for (const table of tables) {
    console.log(`Checking ${table} for sample data...`);
    
    // We'll delete anything that has "sample", "test", or "example" in its columns
    // This is a broad check for this specific task.
    const { data: allData, error: fetchErr } = await supabase.from(table).select('*');
    
    if (fetchErr) {
      console.error(`Error fetching ${table}:`, fetchErr.message);
      continue;
    }

    const toDelete = allData.filter(row => {
      const str = JSON.stringify(row).toLowerCase();
      return str.includes('sample') || str.includes('test route') || str.includes('example');
    });

    if (toDelete.length > 0) {
      console.log(`🗑️ Deleting ${toDelete.length} records from ${table}...`);
      for (const row of toDelete) {
        const { error: delErr } = await supabase.from(table).delete().eq('id', row.id);
        if (delErr) console.error(`Failed to delete record ${row.id}:`, delErr.message);
      }
    } else {
      console.log(`✅ No sample data found in ${table}.`);
    }
  }

  console.log("🧹 Cleanup Complete.");
}

cleanupSampleData();
