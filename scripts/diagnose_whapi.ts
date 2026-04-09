import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHAPI_BASE_URL = 'https://gate.whapi.cloud';

async function diagnoseWhapi() {
  console.log("🔍 Starting Whapi Diagnostic System...");
  
  // 1. Get current session
  const { data: sessions, error: sessionErr } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .limit(5);

  if (sessionErr || !sessions || sessions.length === 0) {
    console.error("❌ No active WhatsApp sessions found in DB.");
    return;
  }

  for (const session of sessions) {
    console.log(`\n--- Session for User ${session.user_id} ---`);
    console.log(`Token: ${session.whapi_token?.substring(0, 10)}...`);
    console.log(`Channel ID: ${session.whapi_channel_id}`);

    try {
      const resp = await fetch(`${WHAPI_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${session.whapi_token}` }
      });
      
      const data = await resp.json();
      console.log(`Status Code: ${resp.status}`);
      console.log(`Health Check Response:`, JSON.stringify(data, null, 2));

      const isAuth = 
        data.authenticated === true || 
        data.status?.value === 'AUTH' || 
        data.status?.text === 'AUTH' ||
        data.status === 'AUTH' ||
        resp.status === 200;

      if (isAuth) {
        console.log("✅ SESSION AUTHENTICATED");
      } else {
        console.log("❌ SESSION NOT AUTHENTICATED");
      }
    } catch (err: any) {
      console.error(`❌ Connection Error: ${err.message}`);
    }
  }
}

diagnoseWhapi();
