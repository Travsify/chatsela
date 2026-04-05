
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testInsert() {
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users.users[0];

  const { error: upsertErr } = await supabase.from('whatsapp_sessions').upsert({
    user_id: user.id,
    whapi_token: 'test_token_123',
    whapi_channel_id: 'test_channel_123'
  }, { onConflict: 'user_id' });

  if (upsertErr) {
    fs.writeFileSync('test_upsert_2.json', JSON.stringify({ error: upsertErr }))
  } else {
    fs.writeFileSync('test_upsert_2.json', JSON.stringify({ success: true }))
  }
}

testInsert()
