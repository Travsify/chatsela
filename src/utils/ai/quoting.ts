export async function resolveCustomQuote(
  supabase: any,
  userId: string,
  params: {
    origin: string;
    destination: string;
    weight_kg: number;
    service_type: string;
    dimensions: { length: number; width: number; height: number };
  }
): Promise<string> {
  try {
    // 1. Fetch user's quote settings
    const { data: settings } = await supabase
      .from('quote_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Default to internal if no settings found
    const mode = settings?.quote_mode || 'internal_table';

    if (mode === 'external_webhook' && settings?.webhook_url) {
      // 🚀 STRATEGY A: External Webhook Mode
      console.log(`[Quote Engine] Calling external webhook for ${userId}: ${settings.webhook_url}`);
      
      const payload = {
        action: 'calculate_quote',
        weight: params.weight_kg,
        origin: params.origin,
        destination: params.destination,
        service_type: params.service_type || 'air',
        dimensions: params.dimensions || { length: 0, width: 0, height: 0 }
      };

      const headers: any = { 'Content-Type': 'application/json' };
      if (settings.webhook_secret) {
        headers['x-chatsela-signature'] = settings.webhook_secret;
      }

      const resp = await fetch(settings.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // 10s timeout so bot doesn't hang
      });

      if (!resp.ok) {
        console.error(`[Quote Engine] Webhook failed (${resp.status}):`, await resp.text());
        return 'I attempted to calculate your quote, but our pricing server is temporarily unavailable. Shall I connect you to a human agent?';
      }

      const result = await resp.json();
      
      // Parse the nested API response specifically for Globalline structure
      if (result.success && result.quote) {
         const q = result.quote;
         const finalString = `💎 **Custom Quote Ready:**\n\n- **Route:** ${params.origin} -> ${params.destination}\n- **Service:** ${q.service || 'Standard'}\n- **Chargeable Weight:** ${q.chargeable_weight_kg}kg\n- **Transit:** ${q.estimated_days} days\n- **Total Cost:** USD ${q.price_usd} ${q.vat_included ? '(VAT Included)' : ''}\n\nWould you like me to book this shipment for you now?`;
         return finalString;
      } else if (result.success && result.price !== undefined) {
         // Fallback for generic structure
         const finalString = `💎 **Custom Quote Ready:**\n\n- **Route:** ${params.origin} -> ${params.destination}\n- **Weight:** ${params.weight_kg}kg\n- **Total Cost:** ${result.currency || 'USD'} ${result.price}\n\n${result.message || 'Would you like to book this shipment now?'}`;
         return finalString;
      } else {
         return result.message || 'I could not generate a formal quote for this route right now. Let me know if you would like me to escalate this.';
      }

    } else {
      // 📦 STRATEGY B: Internal Rate Table Mode
      console.log(`[Quote Engine] Calculating via internal tables for ${userId}`);
      
      // Very basic internal engine: find a loose match on the zones
      const { data: rates } = await supabase
        .from('shipping_rates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!rates || rates.length === 0) {
        return 'We currently do not have automated shipping rates configured. Let me record your details so an agent can provide your custom quote.';
      }

      // Try to find a matching route (case-insensitive basic match)
      // For a real production app, you might use ILIKE in Postgres or exact Country Codes
      const bestMatch = rates.find((r: any) => 
        params.origin.toLowerCase().includes(r.origin_zone.toLowerCase()) && 
        params.destination.toLowerCase().includes(r.destination_zone.toLowerCase())
      );

      if (bestMatch) {
        const total = Number(bestMatch.base_fee) + (Number(bestMatch.rate_per_kg) * params.weight_kg);
        const timeStr = bestMatch.delivery_time_estimate ? `\n- **Est. Transit Time:** ${bestMatch.delivery_time_estimate}` : '';
        
        return `💎 **Custom Quote Ready:**\n\n- **Route:** ${bestMatch.origin_zone} -> ${bestMatch.destination_zone}\n- **Weight:** ${params.weight_kg}kg\n- **Total Cost:** ${bestMatch.currency} ${total.toFixed(2)}${timeStr}\n\nWould you like me to generate a secure checkout link to lock in this rate?`;
      } else {
        return `Unfortunately, I couldn't find an automatic shipping rate for the route from **${params.origin}** to **${params.destination}**. Would you like me to schedule a callback with our logistics team to get you a custom price?`;
      }
    }

  } catch (err: any) {
    console.error('[Quote Engine] Critical Failure:', err.message);
    return 'I encountered an error while trying to calculate your quote. Please try again in a moment or wait for a team member.';
  }
}
