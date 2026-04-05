'use server';

import { createClient } from '@/utils/supabase/server';
import { encrypt } from '@/utils/encryption';
import { revalidatePath } from 'next/cache';

export async function getMerchantKeysStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('paystack_secret_enc, stripe_secret_enc, payment_currency')
    .eq('id', user.id)
    .single();

  return {
    success: true,
    hasPaystack: !!profile?.paystack_secret_enc,
    hasStripe: !!profile?.stripe_secret_enc,
    currency: profile?.payment_currency || 'USD'
  };
}

export async function saveMerchantKeys(payload: { paystackSecret?: string, stripeSecret?: string, currency: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const updatePayload: any = { payment_currency: payload.currency };
  if (payload.paystackSecret) updatePayload.paystack_secret_enc = encrypt(payload.paystackSecret);
  if (payload.stripeSecret) updatePayload.stripe_secret_enc = encrypt(payload.stripeSecret);

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id);

  if (error) {
    console.error('[saveMerchantKeys] error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings/payments');
  return { success: true };
}

export async function testMerchantConnection(gateway: 'paystack' | 'stripe', secret: string) {
  // Simple check: Hitting a 'fetch info' endpoint to confirm key validity
  try {
    if (gateway === 'paystack') {
      const resp = await fetch('https://api.paystack.co/balance', {
        headers: { Authorization: `Bearer ${secret}` }
      });
      return { success: resp.ok };
    } else {
      const resp = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${secret}` }
      });
      return { success: resp.ok };
    }
  } catch (e) {
    return { success: false };
  }
}
