import { createClient } from '@supabase/supabase-js';
import { buildSystemPrompt } from './prompts';

const WHAPI_BASE_URL = 'https://gate.whapi.cloud';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

async function generateCheckoutLink(supabase: any, userId: string, amount: number, customerPhone: string, channelId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('paystack_secret_enc, stripe_secret_enc, payment_currency')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  try {
    const { decrypt } = await import('../encryption');
    
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
        }),
      });

      const data = await response.json();
      if (data.status) return data.data.authorization_url;
    }

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
// Direct Anthropic API Call (No Magic)
// ═══════════════════════════════════════════════════════

async function callClaudeDirectly(payload: any) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is missing.');

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API Error (${resp.status}): ${err}`);
  }

  return await resp.json();
}

async function handleToolExecution(toolUse: any, supabase: any, userId: string, sender: string, channelId: string, profile: any) {
  const { name, input, id } = toolUse;
  console.log(`🛠️ [Tool] Executing ${name} with ID: ${id}`);

  let result = '';

  if (name === 'generate_checkout_link') {
    const link = await generateCheckoutLink(supabase, userId, input.amount, sender, channelId);
    result = link ? `SUCCESS: Generated link: ${link}` : `FAILURE: Could not generate link.`;
  } else if (name === 'book_appointment') {
    const calId = profile?.contact_email ? profile.contact_email.split('@')[0] : 'chatsela';
    result = `Link: https://cal.com/${calId}`;
  } else if (name === 'fetch_tracking') {
    const status = await fetchExternalTracking(supabase, userId, input.tracking_id);
    result = status || `No tracking info found for ID ${input.tracking_id}.`;
  }

  return {
    type: 'tool_result',
    tool_use_id: id,
    content: result
  };
}

// ═══════════════════════════════════════════════════════
// Background Insight Generator (Direct Call)
// ═══════════════════════════════════════════════════════

async function generateChatInsight(supabase: any, userId: string, phone: string, history: any[]) {
  try {
    const messages = history.map(h => ({ role: h.role, content: h.content }));
    const payload = {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 500,
      system: `Analyze chat history. Respond ONLY with a JSON object: { "summary": "...", "sentiment": "positive|neutral|negative", "intent": "inquiry|purchase|support", "valueEstimate": number, "nextStep": "..." }`,
      messages: [...messages, { role: 'user', content: 'Extract conversation insights as requested.' }]
    };

    const result = await callClaudeDirectly(payload);
    const text = result.content[0].text;
    const object = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));

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
// Main Entry Point
// ═══════════════════════════════════════════════════════

export async function handleAIResponse(sender: string, message: string, botId: string) {
  console.log(`🧠 [AI Engine] DIRECT CLAUDE: Processing Bot: ${botId}, Sender: ${sender}`);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: bot } = await supabase.from('bots').select('*').eq('id', botId).single();
  if (!bot) return null;
  const userId = bot.user_id;

  const [profileResult, productsResult, faqsResult, kbResult, sessionResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('products').select('*').eq('user_id', userId).eq('is_active', true).limit(20),
    supabase.from('faqs').select('*').eq('user_id', userId).limit(20),
    supabase.from('ai_knowledge_base').select('*').eq('user_id', userId).limit(10),
    supabase.from('whatsapp_sessions').select('*').eq('user_id', userId).single()
  ]);

  const profile = profileResult.data;
  const session = sessionResult.data;
  const whapiToken = session?.whapi_token;
  if (!whapiToken) return null;

  const { data: history } = await supabase.from('chat_memory').select('role, content').eq('customer_phone', sender).order('created_at', { ascending: false }).limit(10);
  const contextMessages = (history || []).reverse();
  const chatMessages = [...contextMessages, { role: 'user', content: message }];

  const systemPrompt = buildSystemPrompt(profile?.business_name || 'Business', productsResult.data || [], faqsResult.data || [], kbResult.data || []);

  const tools = [
    {
      name: 'generate_checkout_link',
      description: 'Generates a secure paylink for a purchase.',
      input_schema: {
        type: 'object',
        properties: {
          product_name: { type: 'string' },
          amount: { type: 'number' }
        },
        required: ['product_name', 'amount']
      }
    },
    {
      name: 'book_appointment',
      description: 'Provides the scheduling link.',
      input_schema: { type: 'object', properties: { confirm: { type: 'boolean' } }, required: ['confirm'] }
    },
    {
      name: 'fetch_tracking',
      description: 'Checks order shipping status.',
      input_schema: { type: 'object', properties: { tracking_id: { type: 'string' } }, required: ['tracking_id'] }
    }
  ];

  try {
    let payload = {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      system: systemPrompt,
      messages: chatMessages,
      tools: tools
    };

    let result = await callClaudeDirectly(payload);
    let finalContent = '';

    // Handle Tool Execution Loop (Native)
    if (result.stop_reason === 'tool_use') {
      const toolUseBlocks = result.content.filter((c: any) => c.type === 'tool_use');
      const textBlocks = result.content.filter((c: any) => c.type === 'text');
      finalContent += textBlocks.map((t: any) => t.text).join('\n');

      const toolResults = await Promise.all(toolUseBlocks.map((tu: any) => handleToolExecution(tu, supabase, userId, sender, session.whapi_channel_id, profile)));

      // Call Claude again with results
      const nextPayload = {
        ...payload,
        messages: [
          ...chatMessages,
          { role: 'assistant', content: result.content },
          { role: 'user', content: toolResults }
        ]
      };
      
      const nextResult = await callClaudeDirectly(nextPayload);
      finalContent += nextResult.content.map((c: any) => c.text).filter(Boolean).join('\n');
    } else {
      finalContent = result.content.map((c: any) => c.text).join('\n');
    }

    // Send WhatsApp Response
    if (finalContent) {
      console.log(`🧠 [AI Engine] 📤 Sending response...`);
      await fetch(`${WHAPI_BASE_URL}/messages/text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${whapiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: sender, body: finalContent }),
      });
    }

    // Log Memory & Background Insights
    await Promise.all([
      supabase.from('chat_memory').insert([
        { channel_id: session.whapi_channel_id, customer_phone: sender, role: 'user', content: message },
        { channel_id: session.whapi_channel_id, customer_phone: sender, role: 'assistant', content: finalContent }
      ]),
      generateChatInsight(supabase, userId, sender, [...chatMessages, { role: 'assistant', content: finalContent }])
    ]);

    return finalContent;

  } catch (err: any) {
    console.error(`🔥 [AI Engine] Direct Claude Failed:`, err.message);
    return null;
  }
}
