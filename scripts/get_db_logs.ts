import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Fetching recent messages...");
  const { data: msgs, error: msgsErr } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (msgsErr) console.error("Message Error:", msgsErr);
  else console.log(JSON.stringify(msgs, null, 2));

  console.log("Fetching recent bot activity...");
  const { data: acts, error: actsErr } = await supabase
    .from('bot_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (actsErr) console.error("Activity Error:", actsErr);
  else console.log(JSON.stringify(acts, null, 2));
}

run();
