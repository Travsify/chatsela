import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponseOnly } from '@/utils/ai/engine';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, message, contactId } = await req.json();

    if (!userId || !message) {
      return NextResponse.json({ error: 'Missing userId or message' }, { status: 400 });
    }

    // 1. Fetch Bot for user
    const { data: bot } = await supabaseAdmin
      .from('bots')
      .select('id, name')
      .eq('user_id', userId)
      .maybeSingle();

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // 2. We use a synthetic 'sender' for web chat (e.g. web_uuid)
    const sender = contactId || `web_${userId.slice(0,8)}`;

    // 3. Trigger AI Engine (Thinking Only)
    const aiResponse = await generateAIResponseOnly(sender, message, bot.id);

    // 4. Log interaction for dashboard visibility
    await supabaseAdmin.from('bot_activity').insert({
      user_id: userId,
      event_type: 'web_chat_received',
      message: `Web Chat from ${sender}: ${message.substring(0, 50)}...`,
      contact_phone: sender
    });
    
    return NextResponse.json({ success: true, response: aiResponse });

  } catch (error: any) {
    console.error('🔥 [Web Chat API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
