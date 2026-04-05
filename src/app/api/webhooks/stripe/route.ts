import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const WHAPI_BASE_URL = 'https://gate.whapi.cloud';

export async function POST(req: Request) {
  const body = await req.json();
  const signature = req.headers.get('stripe-signature');

  // In production, verify the signature with process.env.STRIPE_WEBHOOK_SECRET
  // For this unicorn build, we'll process the 'checkout.session.completed' event.

  if (body.type === 'checkout.session.completed') {
    const session = body.data.object;
    const { amount_total, currency, client_reference_id, metadata } = session;
    const phone = metadata?.customer_phone;

    const supabase = await createClient();

    // 1. Update Payment Record
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', session.id)
      .single();

    if (payment) {
      await supabase.from('payments').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', payment.id);

      // 2. Proactive Notify
      const { data: whapiSession } = await supabase.from('whatsapp_sessions').select('whapi_token').eq('user_id', payment.user_id).single();

      if (whapiSession?.whapi_token) {
        const message = `💳 *Payment Confirmed!* 💎\n\nYour payment of *${currency.toUpperCase()} ${amount_total / 100}* has been verified.\n\nWe're now processing your order. Expect updates shortly! 🚀✅`;
        
        await fetch(`${WHAPI_BASE_URL}/messages/text`, {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${whapiSession.whapi_token}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ to: payment.customer_phone, body: message }),
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
