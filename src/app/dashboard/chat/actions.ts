'use server';

import { createClient } from '@/utils/supabase/server';

export async function getActiveSessions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // 1. Get the user's Whapi channel_id
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('whapi_channel_id')
    .eq('user_id', user.id)
    .single();

  if (!session?.whapi_channel_id) return { success: true, sessions: [] };

  // 2. Fetch the latest state for each customer
  // We use a complex query to get unique customers and their most recent message/state
  const { data, error } = await supabase
    .from('chat_memory')
    .select('*')
    .eq('channel_id', session.whapi_channel_id)
    .order('customer_phone', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getActiveSessions] error:', error);
    return { success: false, error: error.message };
  }

  // 3. Group by customer manually (standard JS grouping since DISTINCT ON is tricky via JS SDK sometimes)
  const latestSessions: Record<string, any> = {};
  data.forEach((entry) => {
    if (!latestSessions[entry.customer_phone]) {
      latestSessions[entry.customer_phone] = entry;
    }
  });

  return { 
    success: true, 
    sessions: Object.values(latestSessions).sort((a,b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) 
  };
}

export async function toggleBotForCustomer(phone: string, enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from('handoff_status')
    .upsert({
      user_id: user.id,
      contact_phone: phone,
      bot_enabled: enabled
    }, { onConflict: 'user_id, contact_phone' });

  return { success: !error };
}
