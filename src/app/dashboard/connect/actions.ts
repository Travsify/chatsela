'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ── Shopify API Logic ───────────────────────────────────────────────────────
async function fetchShopifyProducts(storeUrl: string, token: string) {
  const cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${cleanUrl}/admin/api/2024-01/products.json?limit=50`;

  const resp = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    console.error('[Shopify Sync] Request failed:', errorBody);
    throw new Error('Could not connect to Shopify. Please check your URL and Token.');
  }

  const { products } = await resp.json();
  return products.map((p: any) => ({
    name: p.title,
    description: p.body_html?.replace(/<[^>]+>/g, '') || '',
    price: parseFloat(p.variants?.[0]?.price || '0'),
    currency: 'USD', // Default for Shopify if not specified, though normally we'd fetch shop currency
    image_url: p.images?.[0]?.src || '',
    is_active: true,
  }));
}

// ── WooCommerce API Logic ───────────────────────────────────────────────────
async function fetchWooProducts(storeUrl: string, ck: string, cs: string) {
  const cleanUrl = storeUrl.replace(/\/+$/, '');
  const auth = btoa(`${ck}:${cs}`);
  const url = `${cleanUrl}/wp-json/wc/v3/products?per_page=50`;

  const resp = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!resp.ok) {
    throw new Error('Could not connect to WooCommerce. Please check your keys.');
  }

  const products = await resp.json();
  return products.map((p: any) => ({
    name: p.name,
    description: p.short_description?.replace(/<[^>]+>/g, '') || '',
    price: parseFloat(p.price || '0'),
    currency: 'USD', // WooCommerce has its own but we map to start
    image_url: p.images?.[0]?.src || '',
    is_active: true,
  }));
}

// ── Custom Site Crawling Logic ─────────────────────────────────────────────
async function fetchCustomProducts(storeUrl: string) {
  const url = storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (!resp.ok) throw new Error('Could not reach website.');
    const html = await resp.text();

    // Basic heuristic: find price-like strings and nearby text
    // In a prod app, we'd use a more specialized parser or LLM here
    const products: any[] = [];
    const priceMatches = html.match(/\$\d+(\.\d{2})?|\d+(\.\d{2})?\s?(NGN|USD|EUR)/ig);
    
    if (priceMatches) {
      // Create a few mock-level detections from the page
      const titleMatch = html.match(/<title>(.*?)<\/title>/i)?.[1] || 'Web Product';
      products.push({
        name: titleMatch.split('|')[0].trim(),
        description: 'Auto-detected from website content.',
        price: parseFloat(priceMatches[0].replace(/[^0-9.]/g, '')) || 0,
        currency: priceMatches[0].includes('NGN') ? 'NGN' : 'USD',
        is_active: true
      });
    }

    return products;
  } catch (e: any) {
    console.error('[Custom Sync] failed:', e);
    throw new Error('Failed to crawl custom website. Please check the URL.');
  }
}

// ── Server Actions ──────────────────────────────────────────────────────────

export async function validateConnection(
  platform: string,
  storeUrl: string,
  token?: string,
  secret?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    // 1. Save connector credentials
    const { error: upsertErr } = await supabase
      .from('external_connectors')
      .upsert({
        user_id: user.id,
        platform,
        store_url: storeUrl,
        access_token: token || null,
        client_secret: secret || null,
        last_sync_at: new Date().toISOString(),
      }, { onConflict: 'user_id, platform' });

    if (upsertErr) throw upsertErr;

    // 2. Test Connection
    if (platform === 'shopify') await fetchShopifyProducts(storeUrl, token!);
    if (platform === 'woocommerce') await fetchWooProducts(storeUrl, token!, secret || '');
    if (platform === 'custom') await fetchCustomProducts(storeUrl);

    return { success: true };
  } catch (err: any) {
    console.error('[validateConnection] error:', err);
    return { success: false, error: err.message };
  }
}

export async function syncStoreData(platform: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: connector } = await supabase
    .from('external_connectors')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', platform)
    .single();

  if (!connector) return { success: false, error: 'No connector found.' };

  try {
    let products: any[] = [];
    if (platform === 'shopify') {
      products = await fetchShopifyProducts(connector.store_url, connector.access_token);
    } else if (platform === 'woocommerce') {
      products = await fetchWooProducts(connector.store_url, connector.access_token, connector.client_secret);
    } else if (platform === 'custom') {
      products = await fetchCustomProducts(connector.store_url);
    }

    // Upsert products into our catalog
    if (products.length > 0) {
      const payload = products.map((p) => ({ 
        ...p, 
        user_id: user.id 
      }));
      
      // Upsert by name to avoid duplicates on same store
      const { error } = await supabase.from('products').upsert(payload, { onConflict: 'user_id, name' });
      if (error) throw error;
    }

    revalidatePath('/dashboard/products');
    return { success: true, count: products.length };
  } catch (err: any) {
    console.error('[syncStoreData] error:', err);
    return { success: false, error: err.message };
  }
}

// ── Widget Management ─────────────────────────────────────────────────────────

export async function getWidgetSettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  let { data, error } = await supabase
    .from('profiles')
    .select('widget_icon_enabled, api_key, website_url, snippet_verified_at')
    .eq('id', user.id)
    .single();

  // 🔑 Auto-generate Public API Key if missing
  if (data && !data.api_key) {
    const newKey = `pk_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    await supabase.from('profiles').update({ api_key: newKey, api_key_created_at: new Date().toISOString() }).eq('id', user.id);
    data.api_key = newKey;
  }

  const { data: whatsapp } = await supabase
    .from('whatsapp_sessions')
    .select('phone_number, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { 
    success: true, 
    settings: { 
      ...data, 
      whatsapp_phone: whatsapp?.phone_number || null,
      whatsapp_status: whatsapp?.status || 'disconnected'
    } 
  };
}

export async function saveWidgetSettings(enabled: boolean, websiteUrl?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { error } = await supabase
    .from('profiles')
    .update({ 
      widget_icon_enabled: enabled,
      website_url: websiteUrl || null
    })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function verifySnippetConnection() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: connector } = await supabase
    .from('external_connectors')
    .select('last_sync_at')
    .eq('user_id', user.id)
    .eq('platform', 'custom')
    .maybeSingle();

  if (connector?.last_sync_at) {
    const lastSync = new Date(connector.last_sync_at);
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    
    // ✅ Verified if seen in last 24 hours
    if (diff < 86400000) { 
      await supabase.from('profiles').update({ snippet_verified_at: now.toISOString() }).eq('id', user.id);
      return { success: true, last_seen: connector.last_sync_at };
    } else {
      return { success: false, error: `Connection detected, but it's older than 24 hours. Please refresh your website to re-sync.` };
    }
  }

  return { success: false, error: 'No recent connection detected. Ensure the snippet is added to your website and you have visited a page.' };
}

export async function getSyncHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Fetch unique URLs synced by the widget
  const { data: rawPages, error: err1 } = await supabase
    .from('ai_knowledge_base')
    .select('source_url, metadata')
    .eq('user_id', user.id)
    .eq('category', 'widget_sync')
    .order('created_at' as any, { ascending: false })
    .limit(50);

  // Group by unique URL to show unique pages
  const uniqueUrls = Array.from(new Set((rawPages || []).map(p => p.source_url)));
  const pages = uniqueUrls.slice(0, 10).map(url => {
    const entry = rawPages?.find(p => p.source_url === url);
    return { url, synced_at: entry?.metadata?.synced_at || new Date().toISOString() };
  });

  // Fetch a sample of knowledge "facts"
  const { data: facts, error: err2 } = await supabase
    .from('ai_knowledge_base')
    .select('content, category, metadata')
    .eq('user_id', user.id)
    .eq('category', 'widget_sync')
    .order('created_at' as any, { ascending: false })
    .limit(20);

  if (err1 || err2) return { success: false, error: (err1 || err2)?.message };
  return { success: true, pages, facts };
}
