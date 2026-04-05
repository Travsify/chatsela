import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27' as any,
  });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const paystackSig = req.headers.get('x-paystack-signature');

  try {
    let userId: string | undefined;
    let customerPhone: string | undefined;
    let channelId: string | undefined;
    let isBotSale = false;

    // ── 1. Handle Stripe ──────────────────────────────────────────────────
    if (sig) {
      const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        userId = session.metadata?.userId;
        customerPhone = session.metadata?.customerPhone;
        channelId = session.metadata?.channelId;
        isBotSale = session.metadata?.source === 'whatsapp_bot';

        // Platform Subscription Logic
        if (!isBotSale && userId) {
          await supabaseAdmin.from('profiles').update({ billing_tier: 'professional' }).eq('id', userId);
        }
      }
    } 

    // ── 2. Handle Paystack ────────────────────────────────────────────────
    if (paystackSig) {
      const payload = JSON.parse(body);
      if (payload.event === 'charge.success') {
        userId = payload.data.metadata.userId;
        customerPhone = payload.data.metadata.customerPhone;
        channelId = payload.data.metadata.channelId;
        isBotSale = payload.data.metadata.source === 'whatsapp_bot';

        // Platform Subscription Logic
        if (!isBotSale && userId) {
          const plan = payload.data.metadata.plan || 'professional';
          await supabaseAdmin.from('profiles').update({ billing_tier: plan }).eq('id', userId);
        }
      }
    }

    // ── 3. Route Merchant Bot Sale Confirmation ───────────────────────────
    if (isBotSale && userId && customerPhone) {
      // 1. Get Merchant's Whapi Token
      const { data: session } = await supabaseAdmin
        .from('whatsapp_sessions')
        .select('whapi_token')
        .eq('user_id', userId)
        .single();

      if (session?.whapi_token) {
        // 2. Send 'Payment Confirmed' message to customer
        await fetch('https://gate.whapi.cloud/messages/text', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.whapi_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            to: customerPhone, 
            body: `✅ *Payment Confirmed!*\n\nThank you for your purchase. Our team has been notified and we are now processing your order. we'll update you here shortly! 🚀`
          }),
        });

        // 3. (Optional) Log this success in chat_memory
        await supabaseAdmin.from('chat_memory').insert({
          channel_id: channelId || 'system',
          customer_phone: customerPhone,
          role: 'assistant',
          content: '✅ Payment Confirmed and acknowledged via webhook.',
          current_step: null
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Payment Webhook Error]:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }
}
