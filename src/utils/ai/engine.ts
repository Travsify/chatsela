import { createClient } from '@supabase/supabase-js';
import { buildSystemPrompt } from './prompts';
import { getPaymentStatus } from '@/app/dashboard/bot/actions';

const WHAPI_BASE_URL = 'https://gate.whapi.cloud';
const CHATSZELA_CORE_KEY = process.env.OPENAI_API_KEY;

// ═══════════════════════════════════════════════════════
// UI Visibility & Logging (The Live Board)
// ═══════════════════════════════════════════════════════

async function logBotActivity(supabase: any, userId: string, eventType: string, message: string, contactPhone?: string, metadata: any = {}) {
  try {
    await supabase.from('bot_activity').insert({
      user_id: userId,
      event_type: eventType,
      message,
      contact_phone: contactPhone,
      metadata
    });
  } catch (e) {
    console.error('⚠️ [Activity Log] Failed:', e);
  }
}

// ═══════════════════════════════════════════════════════
// External Integration Helpers
// ═══════════════════════════════════════════════════════

async function fetchExternalTracking(supabase: any, userId: string, trackingId: string): Promise<string | null> {
  const { data: connector } = await supabase
    .from('external_connectors')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!connector) return null;

  try {
    if (connector.platform === 'shopify') {
      const url = `https://${connector.store_url.replace(/^https?:\/\//, '')}/admin/api/2024-01/orders.json?name=${trackingId.replace('#', '')}&status=any`;
      const resp = await fetch(url, { headers: { 'X-Shopify-Access-Token': connector.access_token } });
      if (resp.ok) {
        const { orders } = await resp.json();
        if (orders?.length > 0) {
          const o = orders[0];
          const status = o.fulfillment_status === 'fulfilled' ? '✅ Shipped & On Route' : '⏳ Processing';
          return `📦 *Order ${o.name} Status*: ${status}\n\nTrack here: ${o.order_status_url}`;
        }
      }
    } else if (connector.platform === 'woocommerce') {
      const auth = btoa(`${connector.access_token}:${connector.client_secret}`);
      const url = `${connector.store_url.replace(/\/+$/, '')}/wp-json/wc/v3/orders?search=${trackingId}`;
      const resp = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
      if (resp.ok) {
        const orders = await resp.json();
        if (orders?.length > 0) {
          const o = orders[0];
          return `📦 *Order #${o.id} Status*: ${o.status.toUpperCase()}\n\nTotal: ${o.currency} ${o.total}`;
        }
      }
    }
  } catch (e) {
    console.error('[External Tracking] Failed:', e);
  }
  return null;
}

export async function searchWebIntelligence(url: string, supabase?: any, userId?: string): Promise<string | null> {
  const API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-f2fa4106f2eb47b4bd23b8e981eb97bc';
  const targetUrl = url.startsWith('http') ? url : `https://${url}`;
  
  if (supabase && userId) {
    await logBotActivity(supabase, userId, 'scrape', `🔎 Scanning website for intelligence: ${targetUrl}`);
  }

  try {
    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: targetUrl, formats: ['markdown'] })
    });

    if (resp.ok) {
      const data = await resp.json();
      return data.data?.markdown || null;
    }
  } catch (err) {}

  try {
    const directResp = await fetch(targetUrl, { signal: AbortSignal.timeout(15000) });
    if (!directResp.ok) return null;
    const html = await directResp.text();
    return html.replace(/<[^>]+>/g, ' ').trim().substring(0, 5000);
  } catch (err) {
    return null;
  }
}

export async function handleMediaAIResponse(sender: string, mediaUrl: string, mediaType: string, botId: string): Promise<string> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: bot } = await supabase.from('bots').select('*, profiles(*)').eq('id', botId).single();
  if (!bot) return 'Bot not found.';
  
  const userId = bot.user_id;
  const profile = bot.profiles;

  try {
    const payload = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are the Assistant for ${profile?.business_name}. Analyze this ${mediaType}. Industry: ${profile?.industry}.`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analyze this ${mediaType}` },
            { type: 'image_url', image_url: { url: mediaUrl } }
          ]
        }
      ]
    };

    const response = await executeChatSelaIntelligence(payload);
    const aiAnalysis = response.choices[0].message.content;

    await supabase.from('ai_knowledge_base').insert({
      user_id: userId,
      content: `[MEDIA_ANALYSIS] ${mediaType} from ${sender}: ${aiAnalysis}`,
      category: 'media_insight',
      source: mediaUrl
    });

    return aiAnalysis;
  } catch (err) {
    return 'I received your file but had an issue reading it. My humans will check it soon! ✅';
  }
}

export async function executeChatSelaIntelligence(payload: any) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CHATSZELA_CORE_KEY?.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return await resp.json();
}

export async function executeChatSelaEmbedding(text: string) {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CHATSZELA_CORE_KEY?.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  });
  const body = await resp.json();
  return body.data[0].embedding;
}

// ═══════════════════════════════════════════════════════
// Main Intelligence Logic (OMNICHANNEL BRAIN)
// ═══════════════════════════════════════════════════════

export async function generateAIResponseOnly(sender: string, message: string, botId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: bot } = await supabase.from('bots').select('*').eq('id', botId).single();
  if (!bot) return 'Bot configuration missing.';

  const userId = bot.user_id;

  try {
    // 📚 Fetch Context
    const [profile, products, faqs, services, historyData] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('products').select('*').eq('user_id', userId).eq('is_active', true).limit(20),
      supabase.from('faqs').select('*').eq('user_id', userId).limit(20),
      supabase.from('services').select('*').eq('user_id', userId).eq('is_active', true),
      supabase.from('chat_memory').select('role, content').eq('customer_phone', sender).order('created_at', { ascending: false }).limit(10)
    ]);

    const chatHistory = (historyData.data || []).reverse();
    const chatMessages = chatHistory.map(h => ({ role: h.role, content: h.content }));
    chatMessages.push({ role: 'user', content: message });

    const systemPrompt = buildSystemPrompt(
      bot.name || profile.data?.business_name || 'Business',
      products.data || [],
      faqs.data || [],
      [],
      bot.prompt || '',
      profile.data?.is_autonomous,
      profile.data?.autonomous_instruction,
      profile.data?.website_url
    );

    const payload = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...chatMessages]
    };

    const response = await executeChatSelaIntelligence(payload);
    return response.choices[0].message.content;
  } catch (err: any) {
    console.error('🔥 [AI Brain] Execution Failed:', err.message);
    return 'I am processing your message, but my brain feels a bit foggy. Can you repeat that?';
  }
}

export async function handleAIResponse(sender: string, message: string, botId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: bot } = await supabase.from('bots').select('*').eq('id', botId).single();
  if (!bot) return null;

  try {
    const { data: session } = await supabase.from('whatsapp_sessions').select('*').eq('user_id', bot.user_id).single();
    if (!session?.whapi_token) return null;

    const finalContent = await generateAIResponseOnly(sender, message, botId);

    if (finalContent) {
      await fetch(`${WHAPI_BASE_URL}/messages/text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.whapi_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: sender, body: finalContent })
      });

      await supabase.from('chat_memory').insert([
        { channel_id: session.whapi_channel_id, customer_phone: sender, role: 'user', content: message },
        { channel_id: session.whapi_channel_id, customer_phone: sender, role: 'assistant', content: finalContent }
      ]);
    }
    return finalContent;
  } catch (err: any) {
    console.error('🔥 [WhatsApp Bridge] Failed:', err.message);
    return null;
  }
}
