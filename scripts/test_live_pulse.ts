import { handleAIResponse } from '@/utils/ai/engine';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLivePulse() {
  const SENDER = '2348000000000'; // Test sender
  const BOT_ID = '90069502-861f-4f65-8dbf-ae77995133b3'; // GlobalLine Bot ID
  
  console.log("🚀 [Test] Starting Live Pulse Verification...");
  
  // 1. Ask about pricing (should trigger search_web_intelligence or internal query)
  console.log("\n--- TEST 1: Pricing Inquiry (Live Verification) ---");
  const resp1 = await handleAIResponse(SENDER, "What is your current shipping rate to London? I heard it changed today.", BOT_ID);
  console.log("Bot Response:", resp1);

  // 2. Ask about an internal detail (should trigger query_internal_logistics_system)
  console.log("\n--- TEST 2: Internal Detail (Warehouse Status) ---");
  const resp2 = await handleAIResponse(SENDER, "Is the Lagos warehouse open today?", BOT_ID);
  console.log("Bot Response:", resp2);
}

testLivePulse();
