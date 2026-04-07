import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyBotSelection(userId: string) {
  console.log(`🔍 Checking bot selection for user: ${userId}`);
  
  const { data: bots, error } = await supabase
    .from('bots')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ Error fetching bots:", error.message);
    return;
  }

  console.log("🤖 Found Bots (Sorted by Latest):");
  bots?.forEach((b, i) => {
    console.log(`${i + 1}. [${b.id}] ${b.name || 'Unnamed'} - Created: ${b.created_at}`);
  });

  if (bots && bots.length > 0) {
    console.log(`✅ Webhook will now correctly pick Bot ID: ${bots[0].id}`);
  } else {
    console.log("⚠️ No bots found for this user.");
  }
}

// Replace with a valid user ID from your DB to test
const TEST_USER_ID = '90069502-861f-4f65-8dbf-ae77995133b3'; 
verifyBotSelection(TEST_USER_ID);
