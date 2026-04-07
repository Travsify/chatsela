import { handleAIResponse } from '../src/utils/ai/engine';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Fetching bot ID for test...");
  const { data: bot } = await supabase.from('bots').select('id, user_id').limit(1).single();
  if (!bot) {
    console.error("No bot found in DB.");
    return;
  }
  console.log("Found bot:", bot.id, "User ID:", bot.user_id);
  
  const senderNumber = "1234567890@s.whatsapp.net";
  const message = "Hi";

  console.log(`Sending message "${message}" to bot...`);
  try {
    const result = await handleAIResponse(senderNumber, message, bot.id);
    console.log("==== AI RESPONSE ====");
    console.log(result);
    console.log("=====================");
  } catch (err: any) {
    console.error("Error executing handleAIResponse:", err.message);
  }
}

run();
