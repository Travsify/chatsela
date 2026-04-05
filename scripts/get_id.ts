import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function getChannelId() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('whapi_channel_id')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error fetching Channel ID:', error.message);
    process.exit(1);
  }

  console.log('CHANNEL_ID:' + data.whapi_channel_id);
}

getChannelId();
