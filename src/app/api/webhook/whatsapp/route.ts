import { NextRequest, NextResponse } from 'next/server';
import { handleAIResponse, handleMediaAIResponse } from '@/utils/ai/engine';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'ChatSela SaaS Webhook' });
}

export async function POST(req: NextRequest) {
  console.log('📡 [Whapi Webhook] 🔥 INCOMING REQUEST RECEIVED');
  try {
    const rawBody = await req.text();
    console.log('📡 [Whapi Webhook] Raw Payload Body:', rawBody);
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('❌ [Whapi Webhook] Failed to parse JSON body!');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Whapi webhooks include "channel_id" (Instance ID)
    const channelId = body.channel_id;
    const messages = body.messages || [];

    if (!channelId) {
      console.log('⚠️ [Whapi Webhook] Received without channel_id. Skipping.');
      return NextResponse.json({ status: 'ignored' });
    }

    console.log(`📡 [Whapi Webhook] Processing messages for Channel: ${channelId}...`);

    // 1. Find the user/session for this channel
    let { data: session, error: sessionErr } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('user_id, whapi_token')
      .eq('whapi_channel_id', channelId)
      .limit(1)
      .single();

    if (sessionErr || !session) {
      console.log(`⚠️ [Whapi Webhook] No exact match for channel ${channelId}. SessionError: ${sessionErr?.message}`);
      // Fail-safe: Try to find a session that matches our internal "whapi_token" if we can infer it
      console.log(`❌ [Whapi Webhook] Direct ID lookup failed. User must click "Refresh Handshake".`);
      return NextResponse.json({ status: 'sync_required' });
    }

    const userId = session.user_id;
    console.log(`✅ [Whapi Webhook] Found User Session: ${userId}`);

    for (const msg of messages) {
      if (msg.from_me) {
        console.log('📡 [Whapi Webhook] Skipping outgoing message (from_me: true)');
        continue;
      }

      const sender = msg.from;
      let text = msg.text?.body || msg.body;
      const media = msg.image || msg.document || msg.video || msg.audio;
      const mediaType = msg.type;

      if (!text && !media) {
        console.log('📡 [Whapi Webhook] Skipping message with no text body.');
        continue;
      }

      console.log(`🚀 [Whapi Webhook] Routing Message from ${sender}: "${text}"`);

      // 2. Find the ACTIVE / LATEST bot for THIS user
      const { data: bot, error: botErr } = await supabaseAdmin
        .from('bots')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (botErr || !bot) {
        console.log(`❌ [Whapi Webhook] No active bot found for user ${userId}. Recording as gap.`);
        await supabaseAdmin.from('knowledge_gaps').insert({
          user_id: userId,
          question: `SYSTEM: Bot missing configuration for incoming message from ${sender}`,
          status: 'pending'
        });
        continue;
      }

      console.log(`🤖 [Whapi Webhook] Triggering AI Engine for Bot ID: ${bot.id}...`);

      // 3. Log incoming message
      await supabaseAdmin.from('messages').insert({
        user_id: userId,
        sender: sender,
        body: text,
        from_me: false
      });

      // 4. Fetch Profile & Check Autonomous Mode
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_autonomous')
        .eq('id', userId)
        .single();

      const isAutonomous = profile?.is_autonomous || false;

      // 5. Check Handoff Status
      const { data: handoff } = await supabaseAdmin
        .from('handoff_status')
        .select('bot_enabled')
        .eq('user_id', userId)
        .eq('contact_phone', sender)
        .single();

      // ⏸️ Universal Coverage: Bot remains active unless explicitly taken over AND autonomous mode is OFF
      const botEnabled = isAutonomous ? true : (handoff ? handoff.bot_enabled : true);

      if (botEnabled) {
        // 6. Trigger AI Logic (Using the user's specific token)
        console.log(`🧠 [Whapi Webhook] Calling AI Response Handler (Autonomous: ${isAutonomous}, Contact: ${sender})...`);
        
        let aiResponse = '';
        if (media && (mediaType === 'image' || mediaType === 'document')) {
          const mediaUrl = media.link || media.url;
          aiResponse = await handleMediaAIResponse(sender, mediaUrl, mediaType, bot.id);
        } else if (text) {
          aiResponse = (await handleAIResponse(sender, text, bot.id)) || '';
        }
        
        // 6. Log Bot's outgoing message
        if (aiResponse) {
          console.log(`✅ [Whapi Webhook] AI Response Generated and Sent: "${aiResponse.substring(0, 50)}..."`);
          await supabaseAdmin.from('messages').insert({
            user_id: userId,
            sender: sender,
            body: aiResponse,
            from_me: true
          });
        } else {
          console.log('⚠️ [Whapi Webhook] AI Engine returned empty response.');
        }
      } else {
        console.log(`⏸️ [Whapi Webhook] Bot disabled for contact ${sender}. (Human-in-the-loop Active).`);
        // Self-Healing: Log this so the user can see it in the dashboard as a handoff event
        await supabaseAdmin.from('messages').insert({
          user_id: userId,
          sender: sender,
          body: `[SYSTEM: Bot paused for human taking over chat with ${sender}]`,
          from_me: true,
          metadata: { type: 'handoff_log' }
        });
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('🔥 [Whapi Webhook] GLOBAL CRASH:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
