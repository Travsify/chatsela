import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executeChatSelaEmbedding } from '@/utils/ai/engine';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to extract clean facts from JSON-LD patterns
function extractFactsFromJsonLd(jsonLd: any[]): string[] {
  const facts: string[] = [];
  jsonLd.forEach(obj => {
    try {
      // Handle array of objects or single object
      const items = Array.isArray(obj) ? obj : [obj];
      items.forEach(item => {
        if (item['@type'] === 'Product') {
          facts.push(`Product: ${item.name}. Price: ${item.offers?.priceCurrency || ''} ${item.offers?.price || ''}. Description: ${item.description || 'No description'}.`);
        } else if (item['@type'] === 'Service') {
          facts.push(`Service: ${item.name}. Description: ${item.description || 'No description'}.`);
        } else if (item['@type'] === 'Organization') {
          facts.push(`Business Name: ${item.name}. Description: ${item.description || ''}.`);
        }
      });
    } catch (e) {}
  });
  return facts.filter(f => f.length > 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, url, title, description, jsonLd } = body;

    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 400 });

    // 1. Authenticate the Bot owner
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (!profile) return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });

    const userId = profile.id;
    const now = new Date().toISOString();

    // 2. Prepare Intelligence Chunks (God-Mode Logic)
    const rawFacts = [
      `Website Page: ${title}. URL: ${url}. Meta Description: ${description}`,
      ...extractFactsFromJsonLd(jsonLd || [])
    ];

    // Filter out duplicates and empty strings
    const facts = [...new Set(rawFacts.filter(f => f && f.trim().length > 5))];

    // 3. Upsert into Knowledge Base (Vectorized for RAG)
    for (const content of facts) {
      let embedding = null;
      try {
        embedding = await executeChatSelaEmbedding(content);
      } catch (e) {
        console.warn(`[Widget Sync] Embedding generation failed for: "${content.substring(0, 30)}..."`);
      }

      await supabaseAdmin.from('ai_knowledge_base').upsert({
        user_id: userId,
        content: content,
        category: 'widget_sync',
        source_type: 'url',
        source_url: url,
        embedding: embedding,
        metadata: { synced_at: now, depth: 'god-mode' }
      }, { onConflict: 'user_id, content' });
    }

    // 4. Update Connector Heartbeat (Verify installation)
    const origin = new URL(url).origin;
    await supabaseAdmin.from('external_connectors').upsert({
      user_id: userId,
      platform: 'custom',
      store_url: origin,
      last_sync_at: now
    }, { onConflict: 'user_id, platform' });

    // 5. Successful Response with appropriate CORS headers
    return NextResponse.json({ success: true }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  } catch (err: any) {
    console.error('🔥 [Widget Sync] Global Crash:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 🌐 Handle Preflight CORS Requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
