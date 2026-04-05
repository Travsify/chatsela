import { createClient } from '@supabase/supabase-js';

const WHAPI_BASE_URL = 'https://gate.whapi.cloud';

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

function buildWelcomeMessage(welcomeMsg: string, menuOptions: string[]): string {
  if (!welcomeMsg || !menuOptions?.length) {
    return `👋 Hi! How can I help you today?\n\n1️⃣ Browse Products\n2️⃣ FAQs\n3️⃣ Talk to a Human\n\n_Reply with a number or type your question!_`;
  }
  const list = menuOptions.map((opt, i) => `${i + 1}️⃣ ${opt}`).join('\n');
  return `${welcomeMsg}\n\n${list}\n\n_Reply with a number or just type your question!_`;
}

function buildMenuRepeat(menuOptions: string[]): string {
  const opts = menuOptions?.length ? menuOptions : ['Browse Products', 'FAQs', 'Talk to a Human'];
  const list = opts.map((opt, i) => `${i + 1}️⃣ ${opt}`).join('\n');
  return `I didn't quite get that 😅 Here's what I can help with:\n\n${list}\n\n_Reply with a number or type your question!_`;
}

function resolveMenuChoice(msg: string, menuOptions: string[]): number {
  const trimmed = msg.trim().replace(/\.$/, '');
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= menuOptions.length) return num - 1;

  const clean = menuOptions.map((o) => o.replace(/\p{Emoji}/gu, '').toLowerCase().trim());
  const msgLower = msg.toLowerCase();

  for (let i = 0; i < clean.length; i++) {
    if (clean[i] && (msgLower.includes(clean[i]) || clean[i].includes(msgLower))) return i;
    const words = clean[i].split(/\s+/).filter((w) => w.length > 3);
    if (words.length && words.some((w) => msgLower.includes(w))) return i;
  }
  return -1;
}

function categoriseMenuOption(label: string): string {
  const l = label.toLowerCase();
  if (/product|catalog|shop|item|collection|service|offer|inventory|stock|buy|purchase/.test(l)) return 'products';
  if (/faq|question|help|info|know|about|learn|details|understand/.test(l)) return 'faqs';
  if (/human|agent|support|team|speak|call|contact|staff|person|real people/.test(l)) return 'human';
  if (/price|pric|cost|fee|rate|plan|subscri|package|how much|amount/.test(l)) return 'pricing';
  if (/book|appoint|schedule|meet|session|demo|slot|reserv|consult/.test(l)) return 'booking';
  if (/order|buy|purchase|checkout|cart|pay|bill/.test(l)) return 'order';
  if (/track|status|find|where|deliver|shipping/.test(l)) return 'tracking';
  if (/logistics|freight|cargo|shipping|quote|origin|destination|weight/.test(l)) return 'logistics';
  if (/course|class|enrol|learn|educat|lesson|training/.test(l)) return 'education';
  if (/portfolio|work|project|gallery|case|examples/.test(l)) return 'portfolio';
  return 'generic';
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
    const { decrypt } = await import('../encryption'); // Dynamic import for edge
    
    // 1. Try Paystack if available
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
          amount: Math.round(amount * 100), // Subunits
          currency: 'NGN',
          metadata: { userId, customerPhone, channelId, source: 'whatsapp_bot' }
        }),
      });

      const data = await response.json();
      if (data.status) return data.data.authorization_url;
    }

    // 2. Fallback to Stripe if available
    if (profile.stripe_secret_enc) {
      const secret = decrypt(profile.stripe_secret_enc);
      const sessionBody = new URLSearchParams();
      sessionBody.append('payment_method_types[]', 'card');
      sessionBody.append('line_items[0][price_data][currency]', profile.payment_currency || 'usd');
      sessionBody.append('line_items[0][price_data][product_data][name]', 'WhatsApp Order');
      sessionBody.append('line_items[0][price_data][unit_amount]', Math.round(amount * 100).toString());
      sessionBody.append('line_items[0][quantity]', '1');
      sessionBody.append('mode', 'payment');
      sessionBody.append('success_url', `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?status=success`);
      sessionBody.append('cancel_url', `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?status=cancel`);
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
// Main handler
// ═══════════════════════════════════════════════════════

export async function handleAIResponse(sender: string, message: string, botId: string) {
  console.log(`🧠 [AI Engine] ⚡ Processing request for Bot: ${botId}, Sender: ${sender}`);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: bot, error: botErr } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .single();

  if (botErr || !bot) {
    console.error(`❌ [AI Engine] Bot not found! Error: ${botErr?.message}`);
    return null;
  }

  const userId = bot.user_id;

  // Fetch profile separately for business name robustness
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', userId)
    .single();

  const businessName = profile?.business_name || 'Our Company';
  const botName = bot.name || 'Sales Assistant';
  const menuOptions = bot.menu_options || [];
  const sequences = bot.sequences || [];
  const msg = message.trim();
  const msgLower = msg.toLowerCase();

  const { data: session, error: sessionErr } = await supabase
    .from('whatsapp_sessions')
    .select('whapi_channel_id, whapi_token')
    .eq('user_id', userId)
    .single();

  if (sessionErr || !session) {
    console.error(`❌ [AI Engine] Session/Token not found for User: ${userId}! Error: ${sessionErr?.message}`);
  }

  const channelId = session?.whapi_channel_id || 'unknown';
  console.log(`🧠 [AI Engine] Linked to Channel ID: ${channelId}`);

  // 1. Get Conversation State
  const { data: lastMemory, error: memErr } = await supabase
    .from('chat_memory')
    .select('current_step, step_data')
    .eq('channel_id', channelId)
    .eq('customer_phone', sender)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (memErr && memErr.code !== 'PGRST116') {
     console.error(`⚠️ [AI Engine] Memory fetch error: ${memErr.message}`);
  }

  let responseText = '';
  let nextStep = null;
  let nextStepData = lastMemory?.step_data || {};

  console.log(`🧠 [AI Engine] Current Step: ${lastMemory?.current_step || 'NONE'}`);

  // ── 2a. In Sequence? ───────────────────────────────────────────────────
  if (lastMemory?.current_step) {
    const [intent, stepId] = lastMemory.current_step.split(':');
    const flow = sequences.find((s: any) => s.intent === intent);
    
    if (flow) {
      console.log(`🧠 [AI Engine] Continuing Flow: ${intent}`);
      const currentStepObj = flow.steps.find((s: any) => s.id === stepId);
      if (currentStepObj?.save_to) nextStepData[currentStepObj.save_to] = msg;

      // Special handling for Tracking
      if (intent === 'tracking' || intent === 'logistics') {
        const extStatus = await fetchExternalTracking(supabase, userId, msg);
        if (extStatus) {
           responseText = extStatus + `\n\nAnything else I can help with?`;
           nextStep = null;
        }
      }

      if (!responseText) {
        const currentIdx = flow.steps.findIndex((s: any) => s.id === stepId);
        const nextStepObj = flow.steps[currentIdx + 1];

        if (nextStepObj) {
          responseText = nextStepObj.prompt;
          nextStep = `${intent}:${nextStepObj.id}`;
          console.log(`🧠 [AI Engine] Moving to next step: ${nextStep}`);
        } else {
          // Sequence Complete! Trigger Final Action
          console.log(`🧠 [AI Engine] Flow Complete: ${intent}`);
          if (intent === 'order' || intent === 'products' || intent === 'pricing') {
             // Forcing a checkout/catalog loop
             const { data: products } = await supabase.from('products').select('*').eq('user_id', userId).eq('is_active', true);
             if (products?.length) {
                const list = products.slice(0, 5).map((p:any, i:number) => `${i + 1}. *${p.name}* — ${p.currency === 'NGN' ? '₦' : '$'}${Number(p.price).toLocaleString()}`).join('\n\n');
                responseText = `Excellent choice! 🛍️ Here's our catalog again. You can complete your purchase securely via the link below:\n\n${list}\n\n_Reply with a number to get a checkout link instantly!_`;
             } else {
               responseText = `Thanks for sharing those details! 🤝 I've noted your interest. Anything else I can help you with right now?`;
             }
          } else {
            responseText = `Thanks for sharing those details! 🤝 I've noted everything down. What else can I help you finalize today?`;
          }
          nextStep = null; 
        }
      }
    } else {
      console.log(`⚠️ [AI Engine] Flow "${intent}" no longer exists. Resetting.`);
      nextStep = null;
    }
  }

  // ── 2b. Start New Sequence or Handle New Intent? ───────────────────────────
  if (!responseText) {
    const isGreeting = /^(hi|hello|hey|start|menu|help|hola|yo|sup|good (morning|evening|afternoon))$/i.test(msgLower);
    const isDigit = /^\d+$/.test(msg.trim());

    if (isGreeting) {
      console.log(`🧠 [AI Engine] Handling Greeting...`);
      responseText = buildWelcomeMessage(bot.welcome_message, menuOptions);
      nextStep = null;
    } else if (isDigit) {
      const idx = parseInt(msg.trim()) - 1;
      console.log(`🧠 [AI Engine] User sent digit: ${idx + 1}. Checking product context...`);
      
      const { data: products } = await supabase.from('products').select('*').eq('user_id', userId).eq('is_active', true);
      if (products && products[idx]) {
        const p = products[idx];
        const checkoutLink = await generateCheckoutLink(supabase, userId, Number(p.price), sender, channelId);
        responseText = `Excellent choice! 🛍️ *${p.name}* is one of our favorites. \n\nYou can complete your purchase securely here:\n\n${checkoutLink || 'Link pending. Our team will verify and send it shortly.'}\n\nWe'll notify you once payment is received! ✨`;
      } else {
        responseText = buildMenuRepeat(menuOptions);
      }
      nextStep = null;
    } else {
      const choiceIdx = resolveMenuChoice(msgLower, menuOptions);
      
      if (choiceIdx !== -1) {
        const chosenLabel = menuOptions[choiceIdx];
        const intent = categoriseMenuOption(chosenLabel);
        console.log(`🧠 [AI Engine] User picked menu option: ${chosenLabel} (Intent: ${intent})`);
        const flow = sequences.find((s: any) => s.intent === intent);
        
        if (flow && flow.steps?.length > 0) {
          const firstStep = flow.steps[0];
          responseText = firstStep.prompt;
          nextStep = `${intent}:${firstStep.id}`;
          nextStepData = {};
          console.log(`🧠 [AI Engine] Starting Flow: ${nextStep}`);
        } else {
          responseText = await handleIntentOffline(supabase, userId, intent, chosenLabel, sender, channelId);
          nextStep = null;
        }
      } else {
        console.log(`🧠 [AI Engine] No menu match. Attempting SmartMatch...`);
        responseText = await aiSmartMatch(supabase, userId, msg, menuOptions, botName, businessName);
        nextStep = null;
      }
    }
  }

  // 3. Log memory with state
  console.log(`🧠 [AI Engine] Saving memory for Sender: ${sender}`);
  await supabase.from('chat_memory').insert({
    channel_id: channelId,
    customer_phone: sender,
    role: responseText ? 'assistant' : 'user',
    content: responseText || msg,
    current_step: nextStep,
    step_data: nextStepData
  });

  // 4. Send via Whapi
  const token = session?.whapi_token;
  if (!token) console.warn(`❌ [AI Engine] Cannot send response: WHAPI_TOKEN is missing!`);
  if (!responseText) console.warn(`⚠️ [AI Engine] No response generated for message.`);

  if (token && responseText) {
    console.log(`🧠 [AI Engine] 📤 Sending WhatsApp response via Whapi...`);
    try {
      const resp = await fetch(`${WHAPI_BASE_URL}/messages/text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: sender, body: responseText }),
      });
      console.log(`🧠 [AI Engine] Whapi Push Status: ${resp.status}`);
      if (!resp.ok) {
        const errData = await resp.json();
        console.error(`❌ [AI Engine] Whapi Push Failed: ${JSON.stringify(errData)}`);
      }
    } catch (whapiErr: any) {
      console.error(`🔥 [AI Engine] Whapi Network Error: ${whapiErr.message}`);
    }
  }

  return responseText;
}

async function handleIntentOffline(supabase: any, userId: string, intent: string, label: string, sender: string, channelId: string): Promise<string> {
  switch (intent) {
    case 'products':
    case 'pricing':
    case 'order': {
      const { data: products } = await supabase.from('products').select('*').eq('user_id', userId).eq('is_active', true);
      if (products?.length) {
        const list = products.slice(0, 5).map((p:any, i:number) => `${i + 1}. *${p.name}* — ${p.currency === 'NGN' ? '₦' : '$'}${Number(p.price).toLocaleString()}`).join('\n\n');
        return `📦 *${label}*\n\nHere are our top offers:\n\n${list}\n\n_Which one would you like to order? Send the number!_`;
      }
      return `We're updating our ${label} right now! 🚀 Check back in a few minutes, or type another question and I'll help you immediately.`;
    }
    case 'faqs': {
      const { data: faqs } = await supabase.from('faqs').select('*').eq('user_id', userId).limit(5);
      if (faqs?.length) {
        const list = faqs.map((f:any, i:number) => `*Q: ${f.question}*\n💡 ${f.answer}`).join('\n\n');
        return `❓ *Common Questions*\n\n${list}\n\nAnything else you'd like to know?`;
      }
      return `I'm ready to answer any questions! 😊 Just type what's on your mind and I'll find the information for you.`;
    }
    case 'booking': {
      // Logic for closing a service booking
      return `📅 *Booking & Consultation*\n\nI can help you secure a spot right now! Please tell me your preferred date and time, or ask about our availability.`;
    }
    case 'human': {
      // Instead of handing off, we try to solve it first
      return `🧑‍💼 *Priority Support*\n\nI understand you'd like to speak with a person. To help our team resolve this instantly, could you briefly describe what you need? (e.g., Refund, Custom Order, or Technical Issue). I might be able to solve it for you right now! 🦾`;
    }
    default: return `Great choice! I'm an expert in *${label}*. How can I help you get started with this today? 😊`;
  }
}

async function aiSmartMatch(
  supabase: any,
  userId: string,
  message: string,
  menuOptions: string[],
  botName: string,
  businessName: string
): Promise<string> {
  const msgLower = message.toLowerCase();
  
  // 1. Direct Pricing match
  if (/price|cost|how.?much|amount|pay|bill|buy/.test(msgLower)) {
    const { data: ps } = await supabase.from('products').select('name, price, currency').eq('user_id', userId).eq('is_active', true);
    if (ps?.length) {
       const list = ps.map((p:any) => `• *${p.name}* — ${p.currency === 'NGN' ? '₦' : '$'}${Number(p.price).toLocaleString()}`).join('\n');
       return `💰 *Our Current Pricing*\n\n${list}\n\n_Type the name of any product to get a secure checkout link!_`;
    }
  }

  // 2. Help/Support match
  if (/help|support|manual|guide|work/.test(msgLower)) {
     return `💡 *I'm here to help!* You can use our menu to browse products, track orders, or get FAQs. Just reply with a number or tell me what you're looking for!`;
  }

  return buildMenuRepeat(menuOptions);
}
