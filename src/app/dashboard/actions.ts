'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const WHAPI_BASE_URL = 'https://gate.whapi.cloud'
const WHAPI_MANAGER_URL = 'https://manager.whapi.cloud'

// Helper to get user's Whapi token from DB
async function getUserWhapiToken(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('whapi_token')
    .eq('user_id', userId)
    .single()
  
  return data?.whapi_token
}

/**
 * AUTOMATED PROVISIONING (Partner API)
 * Creates a new channel on Whapi.Cloud using the Partner Token.
 */
async function provisionWhapiChannel(userId: string) {
  const partnerToken = process.env.WHAPI_TOKEN // Using current token as Master for now
  const projectId = process.env.WHAPI_PROJECT_ID 

  if (!partnerToken || !projectId) {
    console.log('⚠️ Partner API NOT configured (Missing TOKEN or PROJECT_ID)');
    return null;
  }

  try {
    const response = await fetch(`${WHAPI_MANAGER_URL}/channels`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${partnerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `ChatSela User ${userId.slice(0, 8)}`,
        projectId: projectId,
      }),
    })

    const data = await response.json()
    console.log('Whapi Provisioning Code:', response.status);
    console.log('Whapi Provisioning Body:', JSON.stringify(data, null, 2));

    if (data.token && data.id) {
       return { token: data.token, channelId: data.id };
    }
    return null;
  } catch (error) {
    console.error('Whapi Provisioning Error:', error);
    return null;
  }
}

/**
 * WEBHOOK REGISTRATION
 * Registers our API route as the handler for this Whapi instance.
 */
async function registerWhapiWebhook(token: string) {
  // 1. Priority: Environment variable
  // 2. Fallback: Detection (if in server action context)
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  if (!siteUrl && typeof window === 'undefined') {
    // If we're on Render, we can sometimes infer this
    // For now, we strongly encourage the ENV, but we log the attempt
    console.log('⚠️ [Handshake] NEXT_PUBLIC_SITE_URL is missing. Check Render settings!');
  }

  if (!siteUrl) {
    console.error('❌ [Handshake] Webhook registration failed: SITE_URL not found.');
    return;
  }

  // 3. CLEAN UP (Strip trailing slash, spaces, and accidental placeholders)
  const cleanBase = siteUrl
    .trim()
    .split(' ')[0] // Take only the URL part, ignore any text after it
    .replace(/\/$/, '')
    .replace(/\(.*\)/, ''); // Remove any parentheses like (Note: ...)

  const webhookUrl = `${cleanBase}/api/webhook/whatsapp`;
  console.log(`📡 [Handshake] Registering URL: ${webhookUrl}`);

  try {
    const response = await fetch(`${WHAPI_BASE_URL}/settings`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhooks: [
          {
            url: webhookUrl,
            events: [
              { type: 'messages', method: 'post' }
            ],
            mode: 'body'
          }
        ]
      })
    });
    
    const data = await response.json();
    console.log('Whapi Webhook Response:', response.status, JSON.stringify(data));
  } catch (error) {
    console.error('Whapi Webhook Error:', error);
  }
}

export async function getWhatsAppQR() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let token = await getUserWhapiToken(user.id);
  
  // 1. If NO token, ALWAYS try AUTOMATED PROVISIONING
  if (!token) {
    console.log(`🚀 Provisioning automated WhatsApp instance for user ${user.id}...`);
    const newChannel = await provisionWhapiChannel(user.id);
    
    if (newChannel) {
      token = newChannel.token;
      // Save it immediately
      // Check if session exists
      const { data: existingSession } = await supabase
        .from('whatsapp_sessions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let upsertErr;
      if (existingSession) {
        const { error } = await supabase.from('whatsapp_sessions').update({
          whapi_token: token,
          whapi_channel_id: newChannel.channelId,
          status: 'pending'
        }).eq('user_id', user.id);
        upsertErr = error;
      } else {
        const { error } = await supabase.from('whatsapp_sessions').insert({
          user_id: user.id,
          whapi_token: token,
          whapi_channel_id: newChannel.channelId,
          status: 'pending'
        });
        upsertErr = error;
      }
      
      if (upsertErr) {
        try {
          require('fs').appendFileSync('provisioning.log', `[${new Date().toISOString()}] DB SAVE ERROR: ${upsertErr.message} | ${upsertErr.details}\n`);
        } catch (e) {}
      }

      // NEW: Wait for channel initialization (Whapi takes ~5-10s to be ready for QR)
      console.log('⏳ Waiting 5s for channel to initialize...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  if (!token) {
    return { error: 'Automated provisioning failed. Please check your account configuration.' }
  }

  // 2. Poll for QR (Initial setup can take 10-45s)
  let attempts = 0;
  const maxAttempts = 10; // Total 50 seconds

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${WHAPI_BASE_URL}/users/login`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store'
      })

      const data = await response.json()
      // File logging for deep diagnostic
      try {
        require('fs').appendFileSync('provisioning.log', `[${new Date().toISOString()}] Poll #${attempts + 1} | Status: ${response.status} | Body: ${JSON.stringify(data)}\n`);
      } catch (e) {}

      if (data.error?.code === 409) {
        await registerWhapiWebhook(token);
        return { authenticated: true };
      }
      if ((data.status === 200 || data.status === 'OK') && (data.base64 || data.qr)) {
        return { qr: data.base64 || data.qr };
      }
      
      // If we got a 200 but no QR/base64, it's still initializing
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error: any) {
      try {
        require('fs').appendFileSync('provisioning.log', `[${new Date().toISOString()}] Poll Error: ${error.message}\n`);
      } catch (e) {}
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return { error: 'Connection sequence timed out. Please try again in a few moments.' }
}

export async function getWhatsAppStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const token = await getUserWhapiToken(user.id);
  if (!token) return { authenticated: false };

  try {
    const response = await fetch(`${WHAPI_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })

    const data = await response.json()
    
    // Log for debugging
    try {
      const fs = require('fs');
      fs.appendFileSync('status_check.log', `[${new Date().toISOString()}] Token: ${token.substring(0, 10)}... | Status: ${response.status} | Body: ${JSON.stringify(data)}\n`);
    } catch (e) {}
    
    // Improved detection: Whapi might return status "AUTH" in different places
    const isAuth = 
      data.status?.value === 'AUTH' || 
      data.status?.text === 'AUTH' ||
      data.authenticated === true || 
      data.status === 'AUTH' ||
      response.status === 409; 
    
    if (isAuth) {
      console.log(`✅ [Handshake] Authenticated Status: ${response.status}. Syncing Channel ID...`);
      // REGISTER WEBHOOK ONCE CONNECTED
      await registerWhapiWebhook(token);

      const channelId = data.id || data.channel_id || (data.status?.channel_id);

      await supabase
        .from('whatsapp_sessions')
        .update({ 
          status: 'connected', 
          whapi_channel_id: channelId,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
      
      console.log(`✅ [Handshake] Synced Channel ID: ${channelId}`);
    }

    return { authenticated: isAuth }
  } catch (error) {
    return { error: 'Failed to fetch status' }
  }
}

/**
 * PAIRING CODE (Phone Number)
 * Generates an 8-character code for linking via phone number instead of QR.
 */
export async function getWhatsAppPairingCode(phone: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Use the same logic as QR to find/provision token
  let token = await getUserWhapiToken(user.id);
  if (!token) {
    const newChannel = await provisionWhapiChannel(user.id);
    if (newChannel) {
      token = newChannel.token;
      // Check if session exists
      const { data: existingSession } = await supabase
        .from('whatsapp_sessions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let upsertErr;
      if (existingSession) {
        const { error } = await supabase.from('whatsapp_sessions').update({
          whapi_token: token,
          whapi_channel_id: newChannel.channelId,
          status: 'pending'
        }).eq('user_id', user.id);
        upsertErr = error;
      } else {
        const { error } = await supabase.from('whatsapp_sessions').insert({
          user_id: user.id,
          whapi_token: token,
          whapi_channel_id: newChannel.channelId,
          status: 'pending'
        });
        upsertErr = error;
      }
      
      if (upsertErr) {
        try {
          require('fs').appendFileSync('pairing.log', `[${new Date().toISOString()}] DB SAVE ERROR: ${upsertErr.message} | ${upsertErr.details}\n`);
        } catch (e) {}
      }
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  if (!token) return { error: 'Service temporarily unavailable.' }

  // Get channel_id for the Manager API
  let { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('whapi_channel_id')
    .eq('user_id', user.id)
    .single()

  const cleanPhone = phone.replace(/\D/g, '')

  try {
    // 1. Try Gateway GET API with Phone Number in path (Common)
    let response = await fetch(`${WHAPI_BASE_URL}/users/login/${cleanPhone}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })

    let data = await response.json()
    
    // 2. If path fails (500), try Query Parameter (Alternative)
    if (response.status === 500) {
      response = await fetch(`${WHAPI_BASE_URL}/users/login?phone=${cleanPhone}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      })
      data = await response.json()
    }
    
    // Log for debugging
    try {
      const fs = require('fs');
      fs.appendFileSync('pairing.log', `[${new Date().toISOString()}] Phone: ${cleanPhone} | Status: ${response.status} | Body: ${JSON.stringify(data)}\n`);
    } catch (e) {}

    if (data.code) return { code: data.code };
    if (data.error?.code === 409 || response.status === 409) {
      await registerWhapiWebhook(token);
      return { authenticated: true };
    }

    return { error: `Connection failed: ${data.message || data.error?.message || 'Internal Error. Try QR instead.'}` }
  } catch (error) {
    return { error: 'Network error. Please try again.' }
  }
}
/**
 * DASHBOARD INTELLIGENCE STATS
 * Fetches real-time pipeline value and lead sentiment distribution.
 */
export async function getDashboardStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: insights } = await supabase
    .from('chat_insights')
    .select('value_estimate, sentiment')
    .eq('user_id', user.id);

  const { data: kbCount } = await supabase
    .from('ai_knowledge_base')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const totalValue = insights?.reduce((acc, lead) => acc + (Number(lead.value_estimate) || 0), 0) || 0;
  const hotLeads = insights?.filter(i => i.sentiment === 'positive').length || 0;
  
  return {
    totalValue,
    hotLeads,
    kbCount: kbCount || 0,
    totalInsights: insights?.length || 0
  };
}

/**
 * DISCONNECT WHATSAPP
 * Deletes the WhatsApp session and logs out the device from Whapi.
 */
export async function disconnectWhatsApp() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const token = await getUserWhapiToken(user.id);
  if (token) {
    try {
       // Log out the device from Whapi
       await fetch(`${WHAPI_BASE_URL}/users/logout`, {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${token}` }
       });
    } catch(e) {}
  }

  await supabase.from('whatsapp_sessions').delete().eq('user_id', user.id);
  revalidatePath('/dashboard');
  return { success: true };
}
