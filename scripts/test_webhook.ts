/**
 * 🧪 Local Webhook Simulator
 * This script pings your local dev server with a simulated WhatsApp message.
 * Use it to verify that your AI Engine and Database lookups are working.
 */

const LOCAL_WEBHOOK_URL = 'http://localhost:3000/api/webhook/whatsapp';

async function simulateMessage(channelId: string, from: string, text: string) {
  console.log(`🧪 [Simulator] Sending simulated message from ${from}...`);
  
  const payload = {
    channel_id: channelId,
    messages: [
      {
        from: from,
        from_me: false,
        text: { body: text },
        type: 'text',
        timestamp: Math.floor(Date.now() / 1000)
      }
    ]
  };

  try {
    const resp = await fetch(LOCAL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await resp.json();
    console.log(`🧪 [Simulator] Server Response (${resp.status}):`, JSON.stringify(result, null, 2));
    
    if (resp.ok) {
      console.log('✅ [Simulator] SUCCESS: Webhook reached the server and processed.');
    } else {
      console.error('❌ [Simulator] FAILED: Server returned an error.');
    }
  } catch (err: any) {
    console.error('🔥 [Simulator] CRITICAL ERROR: Could not reach local server. Is "npm run dev" running?', err.message);
  }
}

// Check for arguments or use defaults
const args = process.argv.slice(2);
const channelId = args[0] || 'REPLACE_WITH_YOUR_CHANNEL_ID'; // Find this in your whatsapp_sessions table
const from = args[1] || '2348000000000';
const text = args[2] || 'Hello';

if (channelId === 'REPLACE_WITH_YOUR_CHANNEL_ID') {
  console.warn('⚠️  [Simulator] WARNING: You are using the default channel ID. This will likely fail the DB lookup.');
}

simulateMessage(channelId, from, text);
