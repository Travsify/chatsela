import { createClient } from '@supabase/supabase-js';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject, tool } from 'ai';
import { z } from 'zod';
import { buildSystemPrompt } from './prompts';

const WHAPI_BASE_URL = 'https://gate.whapi.cloud';

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
      const url = `https://${connector.store_url.replace(/^https?:\/\//, '')}/admin/api/2024-01/orders.json?name=${trackingId.replace('#','')}&status=any`;
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

// ═══════════════════════════════════════════════════════
// Automated Checkout Link Generation
// ═══════════════════════════════════════════════════════

async function generateCheckoutLink(supabase: any, userId: string, amount: number, customerPhone: string, channelId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('paystack_secret_enc, stripe_secret_enc, payment_currency')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  try {
    const { decrypt } = await import('../encryption');
    
    // 1. Paystack Logic
    if (profile.paystack_secret_enc && profile.payment_currency === 'NGN') {
      const secret = decrypt(profile.paystack_secret_enc);
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `customer_${customerPhone}@chatsela.com`,
          amount: Math.round(amount * 100),
          currency: 'NGN',
          metadata: { userId, customerPhone, channelId, source: 'whatsapp_bot' }
        }),
      });

      const data = await response.json();
      if (data.status) return data.data.authorization_url;
    }

    // 2. Stripe Logic
    if (profile.stripe_secret_enc) {
      const secret = decrypt(profile.stripe_secret_enc);
      const sessionBody = new URLSearchParams();
      sessionBody.append('payment_method_types[]', 'card');
      sessionBody.append('line_items[0][price_data][currency]', profile.payment_currency || 'usd');
      sessionBody.append('line_items[0][price_data][product_data][name]', 'WhatsApp Order');
      sessionBody.append('line_items[0][price_data][unit_amount]', Math.round(amount * 100).toString());
      sessionBody.append('line_items[0][quantity]', '1');
      sessionBody.append('mode', 'payment');
      sessionBody.append('success_url', `${process.env.NEXT_PUBLIC_SITE_URL}/success`);
      sessionBody.append('cancel_url', `${process.env.NEXT_PUBLIC_SITE_URL}/canceled`);
      sessionBody.append('metadata[userId]', userId);
      sessionBody.append('metadata[customerPhone]', customerPhone);
      sessionBody.append('metadata[channelId]', channelId);
      sessionBody.append('metadata[source]', 'whatsapp_bot');

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: sessionBody.toString(),
      });

      const data = await response.json();
      return data.url || null;
    }
  } catch (err: any) {
    console.error('[generateCheckoutLink] Error:', err.message);
    return null;
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// AI Insights & Lead Sentiment (Background)
// ═══════════════════════════════════════════════════════

async function generateChatInsight(supabase: any, userId: string, phone: string, history: any[]) {
  try {
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: `You are an expert sales analyst. Analyze the following chat history between a business and a customer. 
      Extract the core summary, customer sentiment, their intent, potential deal value, and the very next step the merchant should take.`,
      schema: z.object({
        summary: z.string().describe('1-sentence summary of the conversation.'),
        sentiment: z.enum(['positive', 'neutral', 'negative']).describe('Customer sentiment.'),
        intent: z.enum(['inquiry', 'purchase', 'support']).describe('Primary customer goal.'),
        valueEstimate: z.number().describe('Estimated dollar/currency value of the proposed/discussed deal. 0 if not a sale.'),
        nextStep: z.string().describe('One clear actionable instruction for the merchant.')
      }),
      messages: history.map(h => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      }))
    });

    console.log(`🧠 [AI Insights] Generated for ${phone}:`, object);

    await supabase.from('chat_insights').upsert({
      user_id: userId,
      customer_phone: phone,
      summary: object.summary,
      sentiment: object.sentiment,
      intent: object.intent,
      value_estimate: object.valueEstimate,
      next_steps: object.nextStep,
      last_interaction_at: new Date().toISOString()
    }, { onConflict: 'user_id, customer_phone' });

  } catch (err: any) {
    console.error(`🔥 [AI Insights] Computation failed:`, err.message);
  }
}

// ═══════════════════════════════════════════════════════
// Main handler (Claude Powered)
// ═══════════════════════════════════════════════════════

export async function handleAIResponse(sender: string, message: string, botId: string) {
  console.log(`🧠 [AI Engine] ⚡ CLAUDE: Processing Bot: ${botId}, Sender: ${sender}`);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch Business Context
  const { data: bot } = await supabase.from('bots').select('*').eq('id', botId).single();
  if (!bot) return null;

  const userId = bot.user_id;

  // Use flat Promise.all to fetch everything at once
  const [profileResult, productsResult, faqsResult, kbResult, sessionResult] = await Promise.all([
    supabase.from('profiles').select('business_name, contact_email').eq('id', userId).single(),
    supabase.from('products').select('*').eq('user_id', userId).eq('is_active', true).limit(20),
    supabase.from('faqs').select('*').eq('user_id', userId).limit(20),
    supabase.from('ai_knowledge_base').select('*').eq('user_id', userId).limit(10),
    supabase.from('whatsapp_sessions').select('whapi_channel_id, whapi_token').eq('user_id', userId).single()
  ]);

  const profile = profileResult.data;
  const products = productsResult.data || [];
  const faqs = faqsResult.data || [];
  const knowledgeBase = kbResult.data || [];
  const session = sessionResult.data;

  const businessName = profile?.business_name || 'Our Company';
  const channelId = session?.whapi_channel_id || 'unknown';
  const whapiToken = session?.whapi_token;

  if (!whapiToken) {
    console.warn(`❌ [AI Engine] Cannot proceed: WHAPI_TOKEN is missing for user: ${userId}`);
    return null;
  }

  // 2. Fetch Chat Memory for Context (Last 10 messages)
  const { data: history } = await supabase
    .from('chat_memory')
    .select('role, content')
    .eq('channel_id', channelId)
    .eq('customer_phone', sender)
    .order('created_at', { ascending: false })
    .limit(10);

  const contextMessages: any[] = (history || []).reverse().map(h => ({
    role: h.role === 'assistant' ? 'assistant' : 'user',
    content: h.content
  }));

  // Add the current message for Claude to see
  const chatMessages = [...contextMessages, { role: 'user', content: message }];

  // 3. Build System Prompt
  const systemPrompt = buildSystemPrompt(businessName, products, faqs, knowledgeBase);

  // 4. Trigger Claude Agent
  try {
    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'), 
      system: systemPrompt,
      messages: chatMessages,
      tools: {
        generate_checkout_link: tool({
          description: 'Generates a secure payment link for a product purchase.',
          parameters: z.object({
            product_name: z.string().describe('Product name'),
            amount: z.number().describe('Product price')
          }),
          execute: async ({ product_name, amount }) => {
            console.log(`🛠️ [Tool] Generating checkout link for ${product_name} ($${amount})`);
            const link = await generateCheckoutLink(supabase, userId, amount, sender, channelId);
            return link 
              ? `SUCCESS: Generated link for ${product_name}: ${link}` 
              : `FAILURE: Could not generate link for ${product_name}. Tell the user you will process it manually.`;
          }
        }),
        book_appointment: tool({
          description: 'Provides the scheduling link for bookings and consultations.',
          parameters: z.object({
            confirm: z.boolean().optional().describe('Set to true to confirm.')
          }),
          execute: async () => {
            const calId = profile?.contact_email ? profile.contact_email.split('@')[0] : 'chatsela';
            return `Link: https://cal.com/${calId}`;
          }
        }),
        fetch_tracking: tool({
          description: 'Checks the shipping status of an order using a tracking ID.',
          parameters: z.object({
            tracking_id: z.string().describe('Tracking number')
          }),
          execute: async ({ tracking_id }) => {
            const status = await fetchExternalTracking(supabase, userId, tracking_id);
            return status || `No tracking information found for ID ${tracking_id}.`;
          }
        })
      },
      maxSteps: 3, 
    });

    // 5. Build Final History for Insights (including this turn)
    const updatedHistory = [...chatMessages, { role: 'assistant', content: text }];

    // 6. Send Response via Whapi
    if (text) {
      console.log(`🧠 [AI Engine] 📤 Sending WhatsApp response via Whapi...`);
      await fetch(`${WHAPI_BASE_URL}/messages/text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${whapiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: sender, body: text }),
      });
    }

    // 7. Log Memory & Trigger Insights (Background)
    await Promise.all([
      supabase.from('chat_memory').insert([
        { channel_id: channelId, customer_phone: sender, role: 'user', content: message },
        { channel_id: channelId, customer_phone: sender, role: 'assistant', content: text }
      ]),
      generateChatInsight(supabase, userId, sender, updatedHistory)
    ]);

    return text;
  } catch (claudeErr: any) {
    console.error(`🔥 [AI Engine] Claude API Error: ${claudeErr.message}`);
    await supabase.from('chat_memory').insert({ channel_id: channelId, customer_phone: sender, role: 'user', content: message });
    return null;
  }
}
