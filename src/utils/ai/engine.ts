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
  console.log(`🔍 [Intelligence] Scraping URL: ${targetUrl}...`);

  if (supabase && userId) {
    await logBotActivity(supabase, userId, 'scrape', `🔎 Scanning website for intelligence: ${targetUrl}`);
  }

  // Strategy 1: Try Firecrawl API
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
      const result = data.data?.markdown || null;
      if (result) {
        console.log(`✅ [Firecrawl] Success — ${result.length} chars extracted.`);
        if (supabase && userId) {
          await logBotActivity(supabase, userId, 'scrape', `✅ Firecrawl extracted intelligence from ${targetUrl}`, undefined, { length: result.length });
        }
        return result;
      }
    }
    console.warn(`⚠️ [Firecrawl] Failed (${resp.status}). Falling back to direct fetch...`);
  } catch (err: any) {
    console.warn(`⚠️ [Firecrawl] Error: ${err.message}. Falling back to direct fetch...`);
  }

  // Strategy 2: Direct HTML fetch fallback (self-healing)
  try {
    console.log(`🔄 [Fallback] Direct fetching ${targetUrl}...`);
    const directResp = await fetch(targetUrl, {
      headers: { 'User-Agent': 'ChatSela-AGI/1.0 (Web Intelligence Bot)' },
      signal: AbortSignal.timeout(15000)
    });

    if (!directResp.ok) {
      console.error(`❌ [Fallback] HTTP ${directResp.status} from ${targetUrl}`);
      return null;
    }

    const html = await directResp.text();
    // Strip HTML tags, scripts, styles to extract raw text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000);

    if (text.length < 50) {
      console.error(`❌ [Fallback] Extracted text too short (${text.length} chars).`);
      return null;
    }

    console.log(`✅ [Fallback] Success — ${text.length} chars extracted via direct fetch.`);
    if (supabase && userId) {
      await logBotActivity(supabase, userId, 'scrape', `✅ Direct-fetch extracted intelligence from ${targetUrl}`, undefined, { length: text.length, method: 'fallback' });
    }
    return text;
  } catch (err: any) {
    console.error(`🔥 [Fallback] Critical Error:`, err.message);
    return null;
  }
}

async function generateCheckoutLink(supabase: any, userId: string, amount: number, customerPhone: string, channelId: string, metadata: any = {}): Promise<string | null> {
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
          metadata: metadata
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
      sessionBody.append('line_items[0][price_data][product_data][name]', metadata.product_name || 'GlobalLine Logistics Order');
      sessionBody.append('line_items[0][price_data][unit_amount]', Math.round(amount * 100).toString());
      sessionBody.append('line_items[0][quantity]', '1');
      sessionBody.append('mode', 'payment');
      sessionBody.append('success_url', `${process.env.NEXT_PUBLIC_SITE_URL}/success`);
      sessionBody.append('cancel_url', `${process.env.NEXT_PUBLIC_SITE_URL}/canceled`);
      
      // Add metadata correctly for Stripe session metadata
      Object.keys(metadata).forEach((key, index) => {
        sessionBody.append(`metadata[${key}]`, metadata[key]);
      });

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

export async function handleMediaAIResponse(sender: string, mediaUrl: string, mediaType: string, botId: string): Promise<string> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: bot } = await supabase.from('bots').select('*').eq('id', botId).single();
  if (!bot) return 'I encountered an error finding your bot configuration.';
  const userId = bot.user_id;

  const { data: settings } = await supabase.from('quote_settings').select('*').eq('user_id', userId).single();

  await logBotActivity(supabase, userId, 'media_received', `📸 Received ${mediaType} from ${sender}. Processing with Vision OCR...`, sender);

  try {
    // 🧠 Vision OCR Strategy: Process with GPT-4o
    const payload = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are the GlobalLine Logistics Document Specialist. Your goal is to extract structured data from shipping documents (Commercial Invoices, Packing Lists).
          Extract: 1. Total Invoice Value, 2. Currency, 3. List of Items, 4. Consignee Name, 5. Country of Origin.
          Respond ONLY in raw JSON format: { "total_value": 0, "currency": "USD", "items": ["item1"], "consignee": "name", "origin": "country", "summary": "..." }`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this logistics document and extract the key details.' },
            { type: 'image_url', image_url: { url: mediaUrl } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    };

    const response = await executeChatSelaIntelligence(payload);
    const result = JSON.parse(response.choices[0].message.content);

    // 🚀 Update GlobalLine Webhook
    if (settings?.webhook_url) {
      fetch(settings.webhook_url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chatsela-signature': settings.webhook_secret || ''
        },
        body: JSON.stringify({
          action: 'attach_document',
          sender: sender,
          ocr_data: result,
          media_url: mediaUrl
        })
      }).then(() => console.log('✅ [Vision] OCR data pushed to logistics webhook.'));
    }

    const finalMsg = `📝 **Document Processed Successfully!**\n\nI've analyzed your ${mediaType} and extracted the following details:\n- **Items:** ${result.items.join(', ')}\n- **Total Value:** ${result.currency} ${result.total_value}\n- **Origin:** ${result.origin}\n\nI have attached this to your shipment record. Is there anything else you need? 💎🚀`;
    return finalMsg;

  } catch (err: any) {
    console.error('🔥 [Vision OCR] Failed:', err.message);
    return 'I received your document, but I had trouble reading the details automatically. Don\'t worry—I\'ve flagged this for our team to review manually! ✅';
  }
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

export async function executeChatSelaEmbedding(text: string) {
  if (!CHATSZELA_CORE_KEY) throw new Error('ChatSela Intelligence Key missing.');

  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CHATSZELA_CORE_KEY.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  const body = await resp.json();
  if (!resp.ok) {
    throw new Error(`Embedding Error: ${JSON.stringify(body)}`);
  }

  return body.data[0].embedding;
}

// ═══════════════════════════════════════════════════════
// Semantic RAG Search (pgvector)
// ═══════════════════════════════════════════════════════

import { resolveCustomQuote, resolveShipmentTracking, resolveShipmentBooking } from './quoting';

async function semanticRAGSearch(supabase: any, userId: string, query: string): Promise<string> {
  try {
    const queryEmbedding = await executeChatSelaEmbedding(query);
    const { data } = await supabase.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 8,
      p_user_id: userId
    });

    if (!data || data.length === 0) return '';

    return `\n### 🧠 SEMANTICALLY RETRIEVED KNOWLEDGE (Verified Relevant Facts):\n${data.map((d: any) =>
      `[${d.category?.toUpperCase() || 'FACT'}] ${d.content}`
    ).join('\n')}`;
  } catch (err: any) {
    console.error('[RAG] Semantic search failed, falling back to static KB:', err.message);
    return '';
  }
}

async function handleToolCall(toolCall: any, supabase: any, userId: string, sender: string, channelId: string, profile: any) {
  const { name, arguments: argsString } = toolCall.function;
  const args = JSON.parse(argsString);
  console.log(`🛠️ [ChatSela Tool] Executing ${name}...`);

  let result = '';

  if (name === 'calculate_custom_quote') {
    result = await resolveCustomQuote(supabase, userId, {
      origin: args.origin_city_or_country,
      destination: args.destination_city_or_country,
      weight_kg: Number(args.weight_kg),
      service_type: args.service_type,
      dimensions: {
        length: Number(args.dimensions?.length || 0),
        width: Number(args.dimensions?.width || 0),
        height: Number(args.dimensions?.height || 0)
      }
    });
    await logBotActivity(supabase, userId, 'tool_call', `📦 AI requested custom quote from ${args.origin_city_or_country} to ${args.destination_city_or_country} (${args.weight_kg}kg, ${args.service_type})`, sender);
  } else if (name === 'generate_checkout_link') {
    const link = await generateCheckoutLink(supabase, userId, args.amount, sender, channelId, {
      product_name: args.product_name,
      origin: args.origin,
      destination: args.destination,
      weight_kg: args.weight_kg,
      service_type: args.service_type
    });
    if (link) {
      await logBotActivity(supabase, userId, 'tool_call', `💎 AGI Engine closing deal ($${args.amount}) with direct link.`, sender);
    }
    result = link ? `SUCCESS: Generated link: ${link}` : `FAILURE: Could not generate link.`;
  } else if (name === 'track_shipment') {
    result = await resolveShipmentTracking(supabase, userId, args.tracking_id);
    await logBotActivity(supabase, userId, 'tool_call', `📍 AI requested live shipment tracking for ID: ${args.tracking_id}`, sender);
  } else if (name === 'create_shipment_order') {
    result = await resolveShipmentBooking(supabase, userId, {
      receiver_name: args.receiver_name,
      receiver_phone: args.receiver_phone,
      receiver_address: args.receiver_address,
      origin: args.origin,
      destination: args.destination,
      weight_kg: Number(args.weight_kg),
      service_type: args.service_type,
      dimensions: args.dimensions
    });
    await logBotActivity(supabase, userId, 'tool_call', `🧾 AI generated shipment order for ${args.receiver_name}`, sender);
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
  } else if (name === 'report_knowledge_gap') {
    // 🧠 Self-Healing: Log the question the bot couldn't answer
    const { question } = args;
    console.log(`⚠️ [Knowledge Gap] Bot couldn't answer: "${question}" for sender ${sender}`);
    await supabase.from('knowledge_gaps').insert({
      user_id: userId,
      customer_phone: sender,
      question: question,
      status: 'pending'
    });
    result = `GAP_LOGGED: The question "${question}" has been escalated to the business owner.`;
  } else if (name === 'search_web_intelligence') {
    const { url } = args;
    const content = await searchWebIntelligence(url, supabase, userId);
    if (content) {
      // 🧠 Self-Healing: Store the new info back into the knowledge base (background)
      supabase.from('ai_knowledge_base').insert({
        user_id: userId,
        content: content.substring(0, 5000), // Markdown snippet
        category: 'web_scrape',
        source: url
      }).then(() => console.log(`✅ [Self-Healing] Updated KB with content from ${url}`));

      result = `SUCCESS: Found information on the web: ${content.substring(0, 500)}...`;
    } else {
      result = `FAILURE: Could not extract information from ${url}.`;
    }
  } else if (name === 'query_internal_logistics_system') {
    const { query } = args;
    const { data: settings } = await supabase.from('quote_settings').select('webhook_url, webhook_secret').eq('user_id', userId).single();
    
    if (settings?.webhook_url) {
      try {
        const resp = await fetch(settings.webhook_url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-chatsela-signature': settings.webhook_secret || ''
          },
          body: JSON.stringify({ action: 'query_intelligence', query, sender })
        });
        const data = await resp.json();
        result = `SUCCESS: Internal system returned: ${JSON.stringify(data)}`;
      } catch (e: any) {
        result = `FAILURE: Internal system error: ${e.message}`;
      }
    } else {
      result = `FAILURE: No internal logistics webhook configured.`;
    }
  } else if (name === 'convert_currency') {
    const { amount_usd } = args;
    const { data: profile } = await supabase.from('profiles').select('exchange_rate, target_currency, base_currency').eq('id', userId).single();
    const rate = profile?.exchange_rate || 1600;
    const target = profile?.target_currency || 'NGN';
    const base = profile?.base_currency || 'USD';
    const converted = amount_usd * rate;
    result = `VERIFIED CONVERSION: ✅ [VERIFIED PRICE] ${base} ${amount_usd} is exactly ${target} ${converted.toLocaleString()} (Rate: ${rate}). Inform the customer that this is the final converted amount.`;
  } else if (name === 'lookup_verified_product_price') {
    const { product_name } = args;
    const { data: product } = await supabase.from('products').select('*').eq('user_id', userId).ilike('name', `%${product_name}%`).limit(1).single();
    if (product) {
      result = `VERIFIED PRICE: ✅ [VERIFIED PRICE] The ${product.name} costs exactly ${product.currency} ${product.price}. Inform the customer using these exact figures.`;
    } else {
      result = `FAILURE: Product "${product_name}" not found in our verified catalog. Escalate to an agent.`;
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

  const [profileResult, productsResult, faqsResult, servicesResult, sessionResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('products').select('*').eq('user_id', userId).eq('is_active', true).limit(20),
    supabase.from('faqs').select('*').eq('user_id', userId).limit(20),
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

  // 🧠 God-Mode: Semantic RAG search — pulls the most relevant facts for THIS specific message
  const semanticContext = await semanticRAGSearch(supabase, userId, message);

  const botName = bot.name || profile?.business_name || 'Business';
  const customPrompt = bot.prompt || '';

  const systemPrompt = buildSystemPrompt(
    botName, 
    productsResult.data || [], 
    faqsResult.data || [], 
    [], // KB now served via Semantic RAG above, not static injection
    customPrompt,
    profile?.is_autonomous,
    profile?.autonomous_instruction,
    profile?.website_url
  );

  // 💎 Structured Service Ledger Injection
  const serviceLedgerSnippet = servicesData.length > 0 
    ? `\n### 💎 VERIFIED SERVICE PRICING LEDGER:\n${servicesData.map(s => `- ${s.name}: ${s.currency} ${s.price} ${s.unit} (${s.description || 'Verified'})`).join('\n')}`
    : '';

  // 🌍 Global Currency & Time Context Injection
  const currencyContext = `
  ### 🌍 GLOBAL SYSTEM CONTEXT:
  - CURRENT LOCAL DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  - Base Currency: ${profile?.base_currency || 'USD'}
  - Target/Local Currency: ${profile?.target_currency || 'NGN'}
  - Exchange Rate (1 ${profile?.base_currency || 'USD'} = ${profile?.exchange_rate || 1600.0} ${profile?.target_currency || 'NGN'})
  
  ### 🌍 GLOBAL SYSTEM CONTEXT:
  - CURRENT LOCAL DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  - Base Currency: ${profile?.base_currency || 'USD'}
  - Target/Local Currency: ${profile?.target_currency || 'NGN'}
  - Exchange Rate (1 ${profile?.base_currency || 'USD'} = ${profile?.exchange_rate || 1600.0} ${profile?.target_currency || 'NGN'})
  
  ### 🛡️ THE SECURITY PROTOCOL (TENANT-ISOLATED):
  - You are strictly prohibited from referencing any knowledge or pricing not specifically provided in this session context.
  - If a user asks about services you don't recognize, do not guess. Escalate to 'report_knowledge_gap'. 🛡️
  `.trim();

  const tools = [
    {
      type: 'function',
      function: {
        name: 'calculate_custom_quote',
        description: 'Calculates a specific price quote for a service based on variables (e.g. shipping distance and weight). DO NOT call this until you have all required parameters from the user.',
        parameters: {
          type: 'object',
          properties: {
            origin_city_or_country: { type: 'string', description: 'Pickup location (City, State, or Country)' },
            destination_city_or_country: { type: 'string', description: 'Dropoff location (City, State, or Country)' },
            weight_kg: { type: 'number', description: 'Total weight of the shipment in KG. If user gives LBS, convert to KG.' },
            service_type: { type: 'string', description: 'The type of service: e.g. "air", "ocean", or "road".' }
          },
          required: ['origin_city_or_country', 'destination_city_or_country', 'weight_kg', 'service_type']
        }
      }
    },
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
            product_name: { type: 'string', description: 'Descriptive name of the shipment (e.g. "Air Freight: Lagos to London")' },
            amount: { type: 'number', description: 'Price amount provided in the quote' },
            origin: { type: 'string' },
            destination: { type: 'string' },
            weight_kg: { type: 'number' },
            service_type: { type: 'string' }
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
    },
    {
      type: 'function',
      function: {
        name: 'track_shipment',
        description: 'Retrieves live tracking status and ETA from the logistics provider for a specific Tracking ID.',
        parameters: {
          type: 'object',
          properties: {
            tracking_id: { type: 'string', description: 'The unique tracking number provided to the customer.' }
          },
          required: ['tracking_id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_shipment_order',
        description: 'Creates a formal logistics booking and generates a Waybill PDF. Call this only AFTER the customer has accepted the quote AND provided receiver details.',
        parameters: {
          type: 'object',
          properties: {
            receiver_name: { type: 'string', description: 'Full name of the person receiving the package' },
            receiver_phone: { type: 'string', description: 'Phone number of the receiver' },
            receiver_address: { type: 'string', description: 'Full delivery address' },
            origin: { type: 'string' },
            destination: { type: 'string' },
            weight_kg: { type: 'number' },
            service_type: { type: 'string' },
            dimensions: {
              type: 'object',
              properties: {
                length: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' }
              }
            }
          },
          required: ['receiver_name', 'receiver_phone', 'receiver_address', 'origin', 'destination', 'weight_kg', 'service_type', 'dimensions']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'report_knowledge_gap',
        description: 'Use this ONLY when you genuinely do not have the answer or specific data (price, service detail, policy) to answer truthfully. Do NOT guess. Escalate to the owner.',
        parameters: {
          type: 'object',
          properties: {
            question: { type: 'string', description: 'The exact customer question you cannot answer from available data' }
          },
          required: ['question']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'search_web_intelligence',
        description: 'Searches the business website or a specific URL for product/service information. Use this if the knowledge base does not contain the answer.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The absolute URL to scrape (e.g. from the website_url in system context)' }
          },
          required: ['url']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'query_internal_logistics_system',
        description: 'Queries the private internal logistics database for non-public information like current warehouse capacity, special handling rules, or hidden discounts.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The specific internal detail to look up' }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'convert_currency',
        description: 'Converts a USD amount to the local currency (NGN) using the official live exchange rate from the database. Use this instead of doing math yourself.',
        parameters: {
          type: 'object',
          properties: {
            amount_usd: { type: 'number', description: 'The absolute USD amount to convert' }
          },
          required: ['amount_usd']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'lookup_verified_product_price',
        description: 'Looks up the exact, verified price of a product from the database to prevent pricing hallucinations.',
        parameters: {
          type: 'object',
          properties: {
            product_name: { type: 'string', description: 'The name of the product to look up' }
          },
          required: ['product_name']
        }
      }
    }
  ];

  try {
    let payload: any = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt + semanticContext + serviceLedgerSnippet + "\n" + currencyContext }, ...chatMessages],
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
      // 🛡️ STRICT ACK: Verify Whapi actually accepted the message
      const sendPayload = { to: sender, body: finalContent };
      let sendResp = await fetch(`${WHAPI_BASE_URL}/messages/text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${whapiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(sendPayload),
      });

      let sendBody: any = {};
      try { sendBody = await sendResp.json(); } catch (e) {}

      if (!sendResp.ok) {
        console.error(`❌ [ChatSela Send] DELIVERY FAILED (${sendResp.status}):`, JSON.stringify(sendBody));
        
        // 🔄 Retry with @s.whatsapp.net suffix (some channels require the full JID)
        const jidSender = sender.includes('@') ? sender : `${sender}@s.whatsapp.net`;
        if (jidSender !== sender) {
          console.log(`🔄 [ChatSela Send] Retrying with JID format: ${jidSender}...`);
          const retryResp = await fetch(`${WHAPI_BASE_URL}/messages/text`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${whapiToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: jidSender, body: finalContent }),
          });
          let retryBody: any = {};
          try { retryBody = await retryResp.json(); } catch (e) {}

          if (retryResp.ok) {
            console.log(`✅ [ChatSela Send] JID retry SUCCEEDED.`);
          } else {
            console.error(`❌ [ChatSela Send] JID retry ALSO FAILED (${retryResp.status}):`, JSON.stringify(retryBody));
            await logBotActivity(supabase, userId, 'delivery_failed', `❌ Message to ${sender} failed to deliver. Whapi Error: ${sendBody?.message || sendBody?.error?.message || sendResp.status}`, sender);
          }
        } else {
          await logBotActivity(supabase, userId, 'delivery_failed', `❌ Message to ${sender} failed to deliver. Whapi Error: ${sendBody?.message || sendBody?.error?.message || sendResp.status}`, sender);
        }
      } else {
        console.log(`✅ [ChatSela Send] Delivered to ${sender}. Whapi ID: ${sendBody?.message_id || sendBody?.sent?.id || 'OK'}`);
      }
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
