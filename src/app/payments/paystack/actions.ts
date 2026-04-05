'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function createPaystackSession(amount: number, email: string, plan: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      amount: amount * 100, // Paystack uses kobo (subunits)
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=success`,
      metadata: {
        userId: user.id,
        plan: plan,
      },
    }),
  })

  const data = await response.json()

  if (data.status && data.data.authorization_url) {
    redirect(data.data.authorization_url)
  }
}
