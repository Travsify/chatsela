import { createClient } from '@supabase/supabase-js';
import { buildSystemPrompt } from './prompts';
import { getPaymentStatus } from '@/app/dashboard/bot/actions';

const WHAPI_BASE_URL = 'https://gate.whapi.cloud';
const CHATSZELA_CORE_KEY = process.env.OPENAI_API_KEY;

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
// ChatSela Intelligence Engine (Core)
// ═══════════════════════════════════════════════════════

export async function executeChatSelaIntelligence(payload: any) {
  if (!CHATSZELA_CORE_KEY) throw new Error('ChatSela Intelligence Key is missing on Render. Please add it to environment variables.');

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CHATSZELA_CORE_KEY.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body = await resp.json();
  if (!resp.ok) {
    throw new Error(`ChatSela Core Error (${resp.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

async function handleToolCall(toolCall: any, supabase: any, userId: string, sender: string, channelId: string, profile: any) {
  const { name, arguments: argsString } = toolCall.function;
  const args = JSON.parse(argsString);
  console.log(`🛠️ [ChatSela Tool] Executing ${name}...`);

  let result = '';

  if (name === 'generate_checkout_link') {
    const link = await generateCheckoutLink(supabase, userId, args.amount, sender, channelId);
    result = link ? `SUCCESS: Generated link: ${link}` : `FAILURE: Could not generate link.`;
  } else if (name === 'book_appointment') {
    // Lead Capture logic: Record the intent even if link provided
    const bookingTime = args.time || 'requested';
    const bookingDetails = args.details || 'ChatSela Lead';
    
    await supabase.from('bookings').insert({
      user_id: userId,
      customer_phone: sender,
      customer_name: args.name || 'WhatsApp Customer',
      proposed_time: bookingTime,
      details: bookingDetails
    });

    if (profile?.booking_url) {
      result = `SUCCESS: I've recorded your interest and you can also pick a specific slot here: ${profile.booking_url}`;
    } else {
      result = `SUCCESS: I've recorded your requested slot for ${bookingTime}. Our team will confirm with you shortly! ✅`;
    }
  } else if (name === 'fetch_tracking') {
    const status = await fetchExternalTracking(supabase, userId, args.tracking_id);
    result = status || `No tracking info found for ID ${args.tracking_id}.`;
  } else if (name === 'verify_payment') {
    const res = await getPaymentStatus(sender);
    if (res.success && res.payment) {
      const p = res.payment;
      result = `SUCCESS: I've verified the payment. Status: *${p.status.toUpperCase()}*. Amount: *${p.currency} ${p.amount}*. Reference: ${p.reference}.`;
    } else {
      result = `FAILURE: I could not find a confirmed payment for your phone number (${sender}). Please ensure you've completed the checkout!`;
    }
  }

  return {
    tool_call_id: toolCall.id,
    role: 'tool',
    name: name,
    content: result
  };
}

// ═══════════════════════════════════════════════════════
// Background Insight Generator
// ═══════════════════════════════════════════════════════

async function generateChatInsight(supabase: any, userId: string, phone: string, history: any[]) {
  try {
    const messages = history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));
    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Analyze the conversation. Respond ONLY with raw JSON: { "summary": "...", "sentiment": "positive|neutral|negative", "intent": "inquiry|purchase|support", "valueEstimate": number, "nextStep": "..." }` },
        ...messages,
        { role: 'user', content: 'Generate insights for this conversation.' }
      ],
      response_format: { type: "json_object" }
    };

    const result = await executeChatSelaIntelligence(payload);
    const object = JSON.parse(result.choices[0].message.content);

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
    console.error(`🔥 [ChatSela Insights] Intelligence failed:`, err.message);
  }
}

// ═══════════════════════════════════════════════════════
// Main Entry Point (ChatSela Engine)
// ═══════════════════════════════════════════════════════

export async function handleAIResponse(sender: string, message: string, botId: string) {
  console.log(`🧠 [ChatSela Engine] Processing Bot: ${botId}, Sender: ${sender}`);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: bot } = await supabase.from('bots').select('*').eq('id', botId).single();
  if (!bot) return null;
  const userId = bot.user_id;

  const [profileResult, productsResult, faqsResult, kbResult, servicesResult, sessionResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('products').select('*').eq('user_id', userId).eq('is_active', true).limit(20),
    supabase.from('faqs').select('*').eq('user_id', userId).limit(20),
    supabase.from('ai_knowledge_base').select('*').eq('user_id', userId).limit(100),
    supabase.from('services').select('*').eq('user_id', userId).eq('is_active', true),
    supabase.from('whatsapp_sessions').select('*').eq('user_id', userId).single()
  ]);

  const servicesData = servicesResult.data || [];

  const profile = profileResult.data;
  const session = sessionResult.data;
  const whapiToken = session?.whapi_token;
  if (!whapiToken) return null;

  const { data: history } = await supabase.from('chat_memory').select('role, content').eq('customer_phone', sender).order('created_at', { ascending: false }).limit(10);
  const chatMessages: any[] = (history || []).reverse().map(h => ({
    role: h.role === 'assistant' ? 'assistant' : 'user',
    content: h.content
  }));
  chatMessages.push({ role: 'user', content: message });

  const systemPrompt = buildSystemPrompt(
    profile?.business_name || 'Business', 
    productsResult.data || [], 
    faqsResult.data || [], 
    kbResult.data || []
  );

  // 💎 Structured Service Ledger Injection
  const serviceLedgerSnippet = servicesData.length > 0 
    ? `\n### 💎 VERIFIED SERVICE PRICING LEDGER:\n${servicesData.map(s => `- ${s.name}: ${s.currency} ${s.price} ${s.unit} (${s.description || 'Verified'})`).join('\n')}`
    : '';

  // 🌍 Global Currency Context Injection
  const currencyContext = `
  ### 🌍 GLOBAL CURRENCY CONTEXT:
  - Base Currency: ${profile?.base_currency || 'USD'}
  - Target/Local Currency: ${profile?.target_currency || 'NGN'}
  - Exchange Rate (1 ${profile?.base_currency || 'USD'} = ${profile?.exchange_rate || 1600.0} ${profile?.target_currency || 'NGN'})
  
  ### 🦁 THE INTERACTIVITY DIRECTIVE (MANDATORY):
  - For ANY shipping or logistics quote, you MUST ask for: 1. Weight, 2. Dimensions, 3. Pickup City, 4. Destination City/Region. 
  - Never give a final price without these. 
  - Be THRILLING but ACCURATE. 🛡️
  `.trim();

  const tools = [
    {
      type: 'function',
      function: {
        name: 'verify_payment',
        description: 'Checks if the customer has a successful payment in the system.',
        parameters: { type: 'object', properties: {} }
      }
    },
    {
      type: 'function',
      function: {
        name: 'generate_checkout_link',
        description: 'Generates a secure paylink for a purchase.',
        parameters: {
          type: 'object',
          properties: {
            product_name: { type: 'string', description: 'Name of the product' },
            amount: { type: 'number', description: 'Price amount' }
          },
          required: ['product_name', 'amount']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'book_appointment',
        description: 'Records an appointment request and provides a scheduling link.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Client name' },
            time: { type: 'string', description: 'Proposed date/time' },
            details: { type: 'string', description: 'Purpose of booking' }
          },
          required: ['name', 'time']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'fetch_tracking',
        description: 'Checks order shipping status from tracking ID.',
        parameters: {
          type: 'object',
          properties: {
            tracking_id: { type: 'string', description: 'Tracking or Order ID' }
          },
          required: ['tracking_id']
        }
      }
    }
  ];

  try {
    let payload: any = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt + serviceLedgerSnippet + "\n" + currencyContext }, ...chatMessages],
      tools: tools,
      tool_choice: 'auto'
    };

    let response = await executeChatSelaIntelligence(payload);
    let finalContent = '';
    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      finalContent = responseMessage.content || '';
      
      const toolResults = await Promise.all(
        responseMessage.tool_calls.map((tc: any) => handleToolCall(tc, supabase, userId, sender, session.whapi_channel_id, profile))
      );

      const nextPayload = {
        ...payload,
        messages: [
          ...payload.messages,
          responseMessage,
          ...toolResults
        ]
      };

      const nextResponse = await executeChatSelaIntelligence(nextPayload);
      finalContent += (nextResponse.choices[0].message.content || '');
    } else {
      finalContent = responseMessage.content;
    }

    if (finalContent) {
      await fetch(`${WHAPI_BASE_URL}/messages/text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${whapiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: sender, body: finalContent }),
      });
    }

    await Promise.all([
      supabase.from('chat_memory').insert([
        { channel_id: session.whapi_channel_id, customer_phone: sender, role: 'user', content: message },
        { channel_id: session.whapi_channel_id, customer_phone: sender, role: 'assistant', content: finalContent }
      ]),
      generateChatInsight(supabase, userId, sender, [...chatMessages, { role: 'assistant', content: finalContent }])
    ]);

    return finalContent;

  } catch (err: any) {
    console.error(`🔥 [ChatSela Engine] Execution Failed:`, err.message);
    return null;
  }
}
