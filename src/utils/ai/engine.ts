import { createClient } from '@supabase/supabase-js';
import { buildSystemPrompt } from './prompts';

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
  
  // 1. Fetch Bot & User Context
  const { data: bot } = await supabase.from('bots').select('*').eq('id', botId).single();
  if (!bot) return 'I encountered an error finding the bot configuration.';
  const userId = bot.user_id;

  try {
    // 2. Fetch Knowledge Context (Products, Services, Profiles)
    const [profileRes, productsRes, servicesRes, faqsRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('products').select('*').eq('user_id', userId).eq('is_active', true),
      supabase.from('services').select('*').eq('user_id', userId).eq('is_active', true),
      supabase.from('faqs').select('*').eq('user_id', userId),
      supabase.from('chat_memory').select('role, content').eq('customer_phone', sender).order('created_at', { ascending: false }).limit(8)
    ]);

    const profile = profileRes.data;
    const products = productsRes.data || [];
    const services = servicesRes.data || [];
    const faqs = faqsRes.data || [];
    const chatHistory = (historyRes.data || []).reverse();

    // 3. Construct System Prompt (Rich Context)
    const productContext = products.map(p => `PRODUCT: ${p.name} | PRICE: ${p.currency} ${p.price} | INFO: ${p.description}`).join('\n');
    const serviceContext = services.map(s => `SERVICE: ${s.name} | PRICE: ${s.currency} ${s.price}/${s.unit || 'unit'} | INFO: ${s.description}`).join('\n');
    const kbContext = faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n');

    const systemPrompt = `
      You are the official AI Assistant for ${profile?.business_name || 'this business'}.
      Industry: ${profile?.industry || 'retail'}.
      Persona: ${bot.name || 'Assistant'}.

      Your Goal: Be helpful, human-like, and professional. 
      NEVER identify as an AI. Keep responses concise and focused on conversion.

      AVAILABLE KNOWLEDGE:
      ${productContext}
      ${serviceContext}
      ${kbContext}

      BUSINESS INSTRUCTIONS:
      ${bot.prompt || 'Help customers with their inquiries.'}

      CONVERSATION RULES:
      - Use natural language (no robotic formatting).
      - If price is unknown, ask the human to wait while you check.
    `;

    // 4. Execute AI
    const chatMessages = chatHistory.map(h => ({ role: h.role, content: h.content }));
    chatMessages.push({ role: 'user', content: message });

    const payload = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...chatMessages]
    };

    const aiResponse = await executeChatSelaIntelligence(payload);
    const finalContent = aiResponse.choices[0].message.content;

    return finalContent;
  } catch (err: any) {
    console.error('🔥 [AI Brain] Execution Failed:', err.message);
    return "I am having a small technical glitch. Let me check that for you in a moment! ✅";
  }
}

export async function handleAIResponse(sender: string, message: string, botId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  // 1. Fetch Bot to get session
  const { data: bot } = await supabase.from('bots').select('*').eq('id', botId).single();
  if (!bot) return null;

  try {
    const { data: session } = await supabase.from('whatsapp_sessions').select('*').eq('user_id', bot.user_id).single();
    if (!session || !session.whapi_token) return null;

    // 2. Generate AI Thinking
    const finalContent = await generateAIResponseOnly(sender, message, botId);

    if (finalContent) {
      // 3. Deliver via WhatsApp
      await fetch(`${WHAPI_BASE_URL}/messages/text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.whapi_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: sender, body: finalContent })
      });

      // 4. Log Memory
      await supabase.from('chat_memory').insert([
        { channel_id: session.whapi_channel_id, customer_phone: sender, role: 'user', content: message },
        { channel_id: session.whapi_channel_id, customer_phone: sender, role: 'assistant', content: finalContent }
      ]);

      await logBotActivity(supabase, bot.user_id, 'ai_responded', `AI responded to ${sender}: ${finalContent.substring(0, 50)}...`, sender);
    }

    return finalContent;
  } catch (err: any) {
    console.error('🔥 [WhatsApp Bridge] Failed:', err.message);
    return null;
  }
}

export async function handleMediaAIResponse(sender: string, mediaUrl: string, mediaType: string, botId: string): Promise<string> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: bot } = await supabase.from('bots').select('*, profiles(*)').eq('id', botId).single();
  if (!bot) return 'Bot not found.';
  
  const profile = bot.profiles;

  try {
    const payload = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are the Assistant for ${profile?.business_name}. Analyze this ${mediaType} from the user. Industry: ${profile?.industry}.`
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
      user_id: bot.user_id,
      content: `[MEDIA_ANALYSIS] ${mediaType} from ${sender}: ${aiAnalysis}`,
      category: 'media_insight',
      source: mediaUrl
    });

    return aiAnalysis;
  } catch (err) {
    return 'I received your file but had an issue reading it. My humans will check it soon! ✅';
  }
}
