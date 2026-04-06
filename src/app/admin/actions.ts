'use server';

import { createClient } from '@/utils/supabase/server';

// ═══════════════════════════════════════════════════════
// Admin Authorization Check
// ═══════════════════════════════════════════════════════

export async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return { isAdmin: profile?.is_admin === true, userId: user.id };
}

// ═══════════════════════════════════════════════════════
// Global Platform Metrics
// ═══════════════════════════════════════════════════════

export async function getGlobalMetrics() {
  const supabase = await createClient();
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  const [
    { count: totalUsers },
    { count: totalBots },
    { count: totalSessions },
    { count: totalMessages },
    { count: totalKBFacts },
    { count: totalGapsPending },
    { count: totalGapsResolved },
    { count: totalServices },
    { count: totalPayments },
    { data: insightsData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('bots').select('*', { count: 'exact', head: true }),
    supabase.from('whatsapp_sessions').select('*', { count: 'exact', head: true }),
    supabase.from('chat_memory').select('*', { count: 'exact', head: true }),
    supabase.from('ai_knowledge_base').select('*', { count: 'exact', head: true }),
    supabase.from('knowledge_gaps').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('knowledge_gaps').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
    supabase.from('services').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('*', { count: 'exact', head: true }),
    supabase.from('chat_insights').select('value_estimate, sentiment, intent'),
  ]);

  const totalPipelineValue = (insightsData || []).reduce((sum: number, i: any) => sum + (i.value_estimate || 0), 0);
  const sentimentBreakdown = {
    positive: (insightsData || []).filter((i: any) => i.sentiment === 'positive').length,
    neutral: (insightsData || []).filter((i: any) => i.sentiment === 'neutral').length,
    negative: (insightsData || []).filter((i: any) => i.sentiment === 'negative').length,
  };

  return {
    success: true,
    metrics: {
      totalUsers: totalUsers || 0,
      totalBots: totalBots || 0,
      activeSessions: totalSessions || 0,
      totalMessages: totalMessages || 0,
      totalKBFacts: totalKBFacts || 0,
      pendingGaps: totalGapsPending || 0,
      resolvedGaps: totalGapsResolved || 0,
      totalServices: totalServices || 0,
      totalPayments: totalPayments || 0,
      totalPipelineValue,
      sentimentBreakdown,
    }
  };
}

// ═══════════════════════════════════════════════════════
// Tenant Management (User List)
// ═══════════════════════════════════════════════════════

export async function getAllTenants() {
  const supabase = await createClient();
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, business_name, full_name, base_currency, billing_tier, is_admin, created_at')
    .order('created_at', { ascending: false });

  if (!profiles) return { success: true, tenants: [] };

  // Enrich each tenant with their bot and session status
  const enriched = await Promise.all(
    profiles.map(async (p: any) => {
      const [botResult, sessionResult, kbCount, msgCount] = await Promise.all([
        supabase.from('bots').select('id, name, status').eq('user_id', p.id).single(),
        supabase.from('whatsapp_sessions').select('id, whapi_channel_id').eq('user_id', p.id).single(),
        supabase.from('ai_knowledge_base').select('*', { count: 'exact', head: true }).eq('user_id', p.id),
        supabase.from('chat_memory').select('*', { count: 'exact', head: true }).eq('user_id', p.id.replace(/-/g, '')).or(`customer_phone.neq.null`),
      ]);

      // Get message count properly
      const { count: realMsgCount } = await supabase
        .from('chat_memory')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', sessionResult.data?.whapi_channel_id || 'none');

      return {
        ...p,
        bot: botResult.data || null,
        whatsappConnected: !!sessionResult.data,
        kbFactCount: kbCount.count || 0,
        messageCount: realMsgCount || 0,
      };
    })
  );

  return { success: true, tenants: enriched };
}

// ═══════════════════════════════════════════════════════
// Recent Activity Feed
// ═══════════════════════════════════════════════════════

export async function getRecentActivity() {
  const supabase = await createClient();
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  const [gapsResult, insightsResult] = await Promise.all([
    supabase.from('knowledge_gaps').select('*, profiles!inner(business_name)').order('created_at', { ascending: false }).limit(15),
    supabase.from('chat_insights').select('*, profiles!inner(business_name)').order('last_interaction_at', { ascending: false }).limit(15),
  ]);

  return {
    success: true,
    recentGaps: gapsResult.data || [],
    recentInsights: insightsResult.data || [],
  };
}
