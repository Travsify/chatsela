const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const WEBHOOK_URL = process.env.NEXT_PUBLIC_SITE_URL + '/api/webhook/whatsapp';

async function checkWebhook() {
  if (!WHAPI_TOKEN) {
    console.error("WHAPI_TOKEN is missing.");
    return;
  }

  console.log("Checking Whapi Webhook configuration...");
  try {
    const resp = await fetch('https://gate.whapi.cloud/settings', {
      headers: { 'Authorization': `Bearer ${WHAPI_TOKEN}` }
    });
    const settings = await resp.json();
    console.log("Current Whapi Settings:", JSON.stringify(settings, null, 2));
    
    console.log("Expected Webhook URL:", WEBHOOK_URL);
    
    if (settings.webhooks && settings.webhooks.url !== WEBHOOK_URL) {
      console.log("⚠️ Webhook URL mismatch or missing.");
    } else {
      console.log("✅ Webhook URL matches.");
    }
  } catch (err: any) {
    console.error("Error checking Whapi settings:", err.message);
  }
}

checkWebhook();
