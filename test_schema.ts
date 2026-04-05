
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_schema_info') || 
    await supabase.from('whatsapp_sessions').select('*').limit(1);
    
  console.log("Error:", error);
}

checkSchema()
