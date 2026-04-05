'use server';

import { createClient } from '@/utils/supabase/server';

// ─── Industry classifier ────────────────────────────────────────────────────
function classifyIndustry(text: string): string {
  // Clean text: remove HTML tags so attribute names like "property" or "content" don't trigger keywords
  const t = text.replace(/<[^>]+>/g, ' ').toLowerCase();

  // Word boundary helper for generic terms
  const w = (regex: string) => new RegExp(`\\b(${regex})\\b`, 'i');

  // Specific industries first
  if (/fashion|cloth|wear|apparel|shoes|boutique|dress|outfit|jewelry/.test(t)) return 'fashion';
  if (/restaurant|food|cafe|pizza|burger|eat|kitchen|dine|menu|bakery|coffee/.test(t)) return 'restaurant';
  if (/logistics|freight|shipping|cargo|transport|courier|delivery|warehouse/.test(t)) return 'logistics';
  if (/real.?estate|property|home|apartment|rent|lease|mortgage|realtor/.test(t)) {
    if (/\breal.?estate|property|apartment|rent|lease|mortgage|realtor\b/.test(t)) return 'realestate';
  }
  if (/fitness|gym|workout|coach|trainer|yoga|pilates|wellness/.test(t)) return 'fitness';
  if (/health|clinic|dental|medical|hospital|care|doctor|pharma|dentist/.test(t)) return 'health';
  if (/agency|consult|market|studio|design|brand|creative|advertising|service/.test(t)) return 'agency';
  if (/school|learn|course|tutor|education|academy|class|university|college/.test(t)) return 'education';
  if (/hotel|resort|hostel|accommodation|stay|room|lodge|booking/.test(t)) return 'hospitality';
  if (/beauty|salon|spa|hair|nail|skincare|makeup/.test(t)) return 'beauty';
  if (/law|legal|attorney|lawyer|firm|counsel|solicitor/.test(t)) return 'legal';

  if (w('software|saas|app|tech|platform|develo|startup|ai|tool|digital').test(t)) return 'tech';

  return 'generic';
}

// ─── Industry sequences ───────────────────────────────────────────────────
// These are multi-step flows that the bot will execute automatically.
export type SequenceStep = {
  id: string;
  prompt: string;
  save_to?: string; // name of the field to save the user's answer to
  is_last?: boolean;
};

export type SequenceFlow = {
  intent: string;
  steps: SequenceStep[];
};

const DEFAULT_SEQUENCES: Record<string, SequenceFlow[]> = {
  fashion: [
    {
      intent: 'order',
      steps: [
        { id: 'item', prompt: 'Which item from our collection would you like to order? 👗', save_to: 'order_item' },
        { id: 'size', prompt: 'Perfect! And what size do you need (Small, Medium, Large)? 📏', save_to: 'order_size' },
        { id: 'address', prompt: 'Lastly, please provide your full delivery address. 🛵', save_to: 'order_address', is_last: true },
      ]
    }
  ],
  logistics: [
    {
      intent: 'track',
      steps: [
        { id: 'tracking_num', prompt: 'Please enter your 10-digit tracking number: 📦', save_to: 'tracking_id', is_last: true },
      ]
    },
    {
      intent: 'quote',
      steps: [
        { id: 'origin', prompt: 'Where is the shipment coming from? 📍', save_to: 'shipment_origin' },
        { id: 'destination', prompt: 'And where is it heading to? 🏁', save_to: 'shipment_dest' },
        { id: 'weight', prompt: 'What is the estimated weight in KG? ⚖️', save_to: 'shipment_weight', is_last: true },
      ]
    }
  ],
  restaurant: [
    {
      intent: 'order',
      steps: [
        { id: 'food_item', prompt: 'Hungry? 😋 What would you like to order from our menu?', save_to: 'order_item' },
        { id: 'delivery_addr', prompt: 'Great choice! Where should we deliver that to?', save_to: 'order_address', is_last: true },
      ]
    }
  ],
  legal: [
    {
      intent: 'consultation',
      steps: [
        { id: 'case_type', prompt: 'I\'ll help you book a consultation. ⚖️ What type of legal matter is this (Personal, Corporate, Property)?', save_to: 'legal_matter' },
        { id: 'brief', prompt: 'Understood. Please provide a brief summary of your situation.', save_to: 'legal_brief' },
        { id: 'datetime', prompt: 'What is your preferred date and time for a call? 📞', save_to: 'preferred_time', is_last: true },
      ]
    }
  ],
  agency: [
    {
      intent: 'quote',
      steps: [
        { id: 'service', prompt: 'Which of our services are you interested in (Design, Marketing, Development)? 💼', save_to: 'agency_service' },
        { id: 'budget', prompt: 'What is your estimated budget or scale for this project? 💰', save_to: 'agency_budget' },
        { id: 'contact', prompt: 'Excellent. What\'s your business email so we can send a custom proposal? 📧', save_to: 'agency_email', is_last: true },
      ]
    }
  ],
  beauty: [
    {
      intent: 'booking',
      steps: [
        { id: 'service', prompt: 'I\'d love to get you on our schedule! ✨ Which service (Hair, Nails, Spa)?', save_to: 'beauty_service' },
        { id: 'staff', prompt: 'Do you have a preferred stylist or would you like any available? 💇', save_to: 'beauty_staff' },
        { id: 'time', prompt: 'Lastly, what day and time works best for you? 📅', save_to: 'booking_time', is_last: true },
      ]
    }
  ],
  tech: [
    {
      intent: 'demo',
      steps: [
        { id: 'email', prompt: 'I\'d love to schedule a demo for you! What\'s your best business email? 📧', save_to: 'demo_email' },
        { id: 'company_size', prompt: 'Got it. And how many people are on your team? 🚀', save_to: 'team_size', is_last: true },
      ]
    }
  ],
  generic: [
    {
      intent: 'contact',
      steps: [
        { id: 'name', prompt: 'I\'ll connect you with someone right away. What is your name? 🤝', save_to: 'contact_name' },
        { id: 'query', prompt: 'And what is your inquiry about?', save_to: 'contact_query', is_last: true },
      ]
    }
  ]
};

// ─── Industry templates ─────────────────────────────────────────────────────
function getIndustryTemplate(
  industry: string,
  brandName: string,
  contextHint: string
): { 
  botName: string; 
  welcomeMessage: string; 
  menuOptions: string[]; 
  promptSuffix: string;
  sequences: SequenceFlow[];
} {
  const b = brandName;
  const flows = DEFAULT_SEQUENCES[industry] || DEFAULT_SEQUENCES['generic'];

  switch (industry) {
    case 'fashion':
      return {
        botName: `${b} Style Assistant`,
        welcomeMessage: `Welcome to *${b}* 👗\nFind your perfect look today. What can I help you with?`,
        menuOptions: ['👗 Shop Collection', '📏 Sizing Guide', '🛵 Track My Order', '💬 Talk to Stylist'],
        promptSuffix: 'Help customers find the right fit, recommend products, and guide them to checkout.',
        sequences: flows
      };
    case 'restaurant':
      return {
        botName: `${b} Order Bot`,
        welcomeMessage: `Hey! Welcome to *${b}* 🍽️\nHungry? We've got you covered. What would you like?`,
        menuOptions: ['📜 View Menu', '🛵 Order Delivery', '🗺️ Location & Hours', '📞 Call Us'],
        promptSuffix: 'Help customers view the menu, place orders, and find location/hours.',
        sequences: flows
      };
    case 'tech':
      return {
        botName: `${b} Support Bot`,
        welcomeMessage: `Hi there! Welcome to *${b}* 🚀\nReady to level up? Choose an option below:`,
        menuOptions: ['🚀 Start Free Trial', '💰 View Pricing', '📚 Documentation', '🧑‍💻 Book a Demo'],
        promptSuffix: 'Answer technical questions, explain features, and convert prospects to free trial sign-ups.',
        sequences: flows
      };
    case 'realestate':
      return {
        botName: `${b} Property Advisor`,
        welcomeMessage: `Hello! Welcome to *${b}* 🏡\nLooking for your dream property? Let's find it together!`,
        menuOptions: ['🏘️ View Listings', '📅 Book a Viewing', '❓ Buying/Renting Info', '🧑‍💼 Connect to Agent'],
        promptSuffix: 'Collect budget preferences, describe available properties, and book viewings.',
        sequences: flows
      };
    case 'fitness':
      return {
        botName: `${b} Fitness Coach`,
        welcomeMessage: `Hey champ! Welcome to *${b}* 💪\nReady to crush your goals? Let's go!`,
        menuOptions: ['🏋️ View Memberships', '📅 Class Schedule', '📍 Find Us', '👤 Talk to Trainer'],
        promptSuffix: 'Motivate prospects, explain membership plans, and book first sessions.',
        sequences: flows
      };
    case 'health':
      return {
        botName: `${b} Care Coordinator`,
        welcomeMessage: `Hello! Welcome to *${b}* 🏥\nHow can we support your health today?`,
        menuOptions: ['📅 Book Appointment', '📋 Our Services', '📞 Emergency/Urgent', '🗺️ Find Our Clinic'],
        promptSuffix: 'Help patients understand services and book appointments compassionately.',
        sequences: flows
      };
    case 'logistics':
      return {
        botName: `${b} Logistics Bot`,
        welcomeMessage: `Welcome to *${b}* 🚢\nHow can we assist with your shipment today?`,
        menuOptions: ['📦 Track Shipment', '✈️ Air Freight', '🚢 Ocean Freight', '📄 Get a Quote'],
        promptSuffix: 'Help customers track shipments, request freight quotes, and understand transit times.',
        sequences: flows
      };
    case 'legal':
      return {
        botName: `${b} Legal Assistant`,
        welcomeMessage: `Hello. Welcome to *${b}* Law Firm. ⚖️\nHow can we assist you with your legal needs today?`,
        menuOptions: ['⚖️ Book Consultation', '📋 Our Practice Areas', '🗺️ Find Our Office', '🤝 Talk to Staff'],
        promptSuffix: 'Guide clients to book consultations, explain legal services, and collect case briefs.',
        sequences: flows
      };
    case 'agency':
      return {
        botName: `${b} Project Lead`,
        welcomeMessage: `Hi! Welcome to *${b}* 🤝\nLooking to grow your brand? Choose an option below:`,
        menuOptions: ['💼 Get a Quote', '📂 Our Portfolio', '🚀 Services & Pricing', '💬 Connect with us'],
        promptSuffix: 'Present portfolio, gather project requirements for quotes, and answer service inquiries.',
        sequences: flows
      };
    case 'beauty':
      return {
        botName: `${b} Beauty Concierge`,
        welcomeMessage: `Hello gorgeous! ✨ Welcome to *${b}*\nReady for some pampering?`,
        menuOptions: ['📅 Book Appointment', '✨ Our Services', '📸 Our Work', '📞 Contact Us'],
        promptSuffix: 'Guide clients through booking, explain beauty services, and show off portfolio work.',
        sequences: flows
      };
    default:
      return {
        botName: `${b} Assistant`,
        welcomeMessage: `Hi! Welcome to *${b}* ✨\nI'm here to help you. What can I assist you with?`,
        menuOptions: ['📦 Our Products & Services', '💰 Pricing', '❓ FAQs', '📞 Contact Us'],
        promptSuffix: 'Provide excellent customer service and guide customers through products, pricing and inquiries.',
        sequences: flows
      };
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateBotConfig(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return { success: false };

  let brandName = 'My Business';
  let contextSummary = trimmed;
  let industry = '';
  let scrapedMenuOptions: string[] = [];

  // ── URL path ──────────────────────────────────────────────────────────────
  const isUrl = /^(https?:\/\/|www\.)|^[a-z0-9][\w\-]*\.[a-z]{2,5}($|\/)/i.test(trimmed);

  if (isUrl) {
    // Build absolute URL
    const targetUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

    // Extract domain hint for brand name
    try {
      const parsed = new URL(targetUrl);
      brandName = parsed.hostname.replace(/^www\./, '').split('.')[0];
      brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
    } catch {}

    // Fetch the page
    try {
      const resp = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(9000),
      });

      if (resp.ok) {
        const html = await resp.text();

        // ── Brand Name from <title> or og:site_name ──────────────────────────
        const siteName = html.match(
          /property=['"']og:site_name['"'][^>]*content=['"']([^'"]+)['"]/i
        )?.[1];
        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

        if (siteName) {
          brandName = siteName.trim();
        } else if (titleTag) {
          brandName = titleTag.split(/\s*[-|–—]\s*/)[0].trim() || brandName;
        }

        const metaDesc =
          html.match(/name=['"]description['"]\s+content=['"]([^'"]+)['"]/i)?.[1] ||
          html.match(/content=['"]([^'"]+)['"]\s+name=['"]description['"]/i)?.[1] ||
          html.match(/property=['"]og:description['"]\s+content=['"]([^'"]+)['"]/i)?.[1] ||
          '';

        contextSummary = `Brand: ${brandName}. ${metaDesc}`;

        // ── Navigation extraction ────────────────────────────────────
        const navBlock = html.match(/<nav[\s\S]{0,3000}<\/nav>/i)?.[0] || html;
        const linkTexts = new Set<string>();
        const anchorRe = /<a[^>]*>([\s\S]{0,80}?)<\/a>/gi;
        let m;
        while ((m = anchorRe.exec(navBlock)) !== null) {
          const raw = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          if (raw.length >= 2 && raw.length <= 28 && !/login|sign.?in|sign.?up|register|search|cart|account|copyright|cookie|privacy|terms/i.test(raw)) {
            linkTexts.add(raw);
          }
        }
        const actionKwds = ['shop', 'product', 'service', 'about', 'contact', 'faq', 'price', 'pricing', 'book', 'schedule', 'demo', 'catalog', 'order', 'portfolio', 'gallery', 'work', 'offer', 'course', 'class', 'menu', 'delivery'];
        const prioritised: string[] = [];
        for (const t of linkTexts) {
          if (actionKwds.some((k) => t.toLowerCase().includes(k))) prioritised.push(t);
        }
        scrapedMenuOptions = [...new Set(prioritised)].slice(0, 5);

        industry = classifyIndustry(html.substring(0, 5000) + ' ' + contextSummary);
      }
    } catch (e) {
      console.error('[generateBotConfig] fetch failed:', e);
      industry = classifyIndustry(targetUrl);
    }
  } else {
    industry = classifyIndustry(trimmed);
    const quoted = trimmed.match(/["']([^"']{2,40})["']/)?.[1];
    const calledMatch = trimmed.match(/(?:called|named|is)\s+([A-Z][A-Za-z0-9\s]{1,25})/);
    if (quoted) brandName = quoted;
    else if (calledMatch) brandName = calledMatch[1].trim();
    contextSummary = trimmed;
  }

  // Get template
  const tpl = getIndustryTemplate(industry, brandName, contextSummary);

  // Menu mapping
  let finalMenuOptions = tpl.menuOptions;
  if (scrapedMenuOptions.length >= 2) {
    const emojiMap: Record<string, string> = {
      shop: '🛍️', product: '📦', service: '💼', about: 'ℹ️', contact: '📞',
      faq: '❓', price: '💰', pricing: '💰', book: '📅', schedule: '📅',
      demo: '🚀', catalog: '📋', order: '🛒', portfolio: '📂', gallery: '🖼️',
      work: '💼', offer: '✨', course: '📚', class: '📚', delivery: '🚚',
    };
    finalMenuOptions = scrapedMenuOptions.slice(0, 4).map((opt) => {
      if (/\p{Emoji}/u.test(opt.charAt(0))) return opt;
      const key = Object.keys(emojiMap).find((k) => opt.toLowerCase().includes(k));
      return key ? `${emojiMap[key]} ${opt}` : `◾ ${opt}`;
    });
  }
  const hasHuman = finalMenuOptions.some((o) => /human|agent|contact|support|team|call|speak/i.test(o));
  if (!hasHuman) finalMenuOptions.push('👤 Talk to a Human');
  finalMenuOptions = finalMenuOptions.slice(0, 7);

  // Structured prompt
  const prompt = [
    `You are "${tpl.botName}", the AI sales assistant for ${brandName}.`,
    `Context: ${contextSummary.substring(0, 400)}.`,
    `Goal: ${tpl.promptSuffix}`,
    `Menu: ${finalMenuOptions.join(', ')}.`,
    `When customers pick a menu item, standard sequence flows will trigger automatically.`,
    `Always be warm, concise, and professional.`,
  ].join('\n');

  return {
    success: true,
    botName: tpl.botName,
    prompt,
    welcomeMessage: tpl.welcomeMessage,
    menuOptions: finalMenuOptions,
    sequences: tpl.sequences,
    brandName,
    industry,
  };
}

export async function getBotSettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('bots')
    .select('name, prompt, welcome_message, menu_options, sequences')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching bot:', error);
    return { success: false, error: 'Failed to fetch bot settings' };
  }

  return { success: true, bot: data };
}

export async function saveBotSettings(
  name: string,
  prompt: string,
  welcome_message: string,
  menu_options: string[],
  sequences?: SequenceFlow[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: existing } = await supabase
    .from('bots')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const payload = { 
    name, 
    prompt, 
    welcome_message, 
    menu_options, 
    sequences: sequences || [],
    status: 'active' 
  };

  let error;
  if (existing) {
    const res = await supabase.from('bots').update(payload).eq('id', existing.id);
    error = res.error;
  } else {
    const res = await supabase.from('bots').insert({ ...payload, user_id: user.id });
    error = res.error;
  }

  if (error) {
    console.error('Error saving bot:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
