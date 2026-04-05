import { NextRequest, NextResponse } from 'next/server';
import { handleAIResponse } from '@/utils/ai/engine';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'ChatSela SaaS Webhook' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📡 [Whapi Webhook] Incoming Payload:', JSON.stringify(body, null, 2));

    // Whapi webhooks include "channel_id" (Instance ID)
    const channelId = body.channel_id;
    const messages = body.messages || [];

    if (!channelId) {
      console.log('⚠️ [Whapi Webhook] Received without channel_id. Skipping.');
      return NextResponse.json({ status: 'ignored' });
    }

    // 1. Find the user/session for this channel
    let { data: session } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('user_id, whapi_token')
      .eq('whapi_channel_id', channelId)
      .limit(1)
      .single();

    if (!session) {
      console.log(`⚠️ [Whapi Webhook] No exact match for channel ${channelId}. Attempting fail-safe lookup...`);
      // Fail-safe: Try to find a session that matches our internal "whapi_token" if we can infer it
      // For now, we log the failure clearly so the user can "Refresh Status" to sync the ID.
      console.log(`❌ [Whapi Webhook] Direct ID lookup failed. Please click "Refresh Status" in your dashboard to sync IDs.`);
      return NextResponse.json({ status: 'sync_required' });
    }

    const userId = session.user_id;
    console.log(`✅ [Whapi Webhook] Found User Session: ${userId}`);

    for (const msg of messages) {
      if (msg.from_me) continue;

      const sender = msg.from;
      const text = msg.text?.body || msg.body;
      if (!text) continue;

      console.log(`📩 [User ${userId}] Message from ${sender}: ${text}`);

      // 2. Find the bot for THIS user
      const { data: bot } = await supabaseAdmin
        .from('bots')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!bot) {
        console.log(`⚠️ No bot configured for user ${userId}.`);
        continue;
      }

      // 3. Log incoming message
      await supabaseAdmin.from('messages').insert({
        user_id: userId,
        sender: sender,
        body: text,
        from_me: false
      });

      // 4. Check Handoff Status
      const { data: handoff } = await supabaseAdmin
        .from('handoff_status')
        .select('bot_enabled')
        .eq('user_id', userId)
        .eq('contact_phone', sender)
        .single();

      const botEnabled = handoff ? handoff.bot_enabled : true;

      if (botEnabled) {
        // 5. Trigger AI Logic (Using the user's specific token)
        const aiResponse = await handleAIResponse(sender, text, bot.id);
        
        // 6. Log Bot's outgoing message
        if (aiResponse) {
          await supabaseAdmin.from('messages').insert({
            user_id: userId,
            sender: sender,
            body: aiResponse,
            from_me: true
          });
        }
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
