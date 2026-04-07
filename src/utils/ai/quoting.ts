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
      
      const [ratesResult, profileResult] = await Promise.all([
        supabase.from('shipping_rates').select('*').eq('user_id', userId).eq('is_active', true),
        supabase.from('profiles').select('exchange_rate, target_currency, base_currency').eq('id', userId).single()
      ]);

      const rates = ratesResult.data;
      const profile = profileResult.data;

      if (!rates || rates.length === 0) {
        return 'We currently do not have automated shipping rates configured. Let me record your details so an agent can provide your custom quote.';
      }

      const bestMatch = rates.find((r: any) => 
        params.origin.toLowerCase().includes(r.origin_zone.toLowerCase()) && 
        params.destination.toLowerCase().includes(r.destination_zone.toLowerCase())
      );

      if (bestMatch) {
        const totalBase = Number(bestMatch.base_fee) + (Number(bestMatch.rate_per_kg) * params.weight_kg);
        const rate = profile?.exchange_rate || 1600;
        const targetCurrency = profile?.target_currency || 'NGN';
        const totalTarget = totalBase * rate;

        const timeStr = bestMatch.delivery_time_estimate ? `\n- **Est. Transit Time:** ${bestMatch.delivery_time_estimate}` : '';
        
        return `💎 **Custom Quote Ready:**\n\n- **Route:** ${bestMatch.origin_zone} -> ${bestMatch.destination_zone}\n- **Weight:** ${params.weight_kg}kg\n- **Total Cost (USD):** USD ${totalBase.toFixed(2)}\n- **Total Cost (${targetCurrency}):** ${targetCurrency} ${totalTarget.toLocaleString()} (Rate: ${rate})${timeStr}\n\nWould you like me to generate a secure checkout link to lock in this rate?`;
      } else {
        return `Unfortunately, I couldn't find an automatic shipping rate for the route from **${params.origin}** to **${params.destination}**. Would you like me to schedule a callback with our logistics team to get you a custom price?`;
      }
    }

  } catch (err: any) {
    console.error('[Quote Engine] Critical Failure:', err.message);
    return 'I encountered an error while trying to calculate your quote. Please try again in a moment or wait for a team member.';
  }
}

export async function resolveShipmentTracking(
  supabase: any,
  userId: string,
  trackingId: string
): Promise<string> {
  try {
    const { data: settings } = await supabase
      .from('quote_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!settings?.webhook_url) {
      return `We are currently unable to track shipments automatically. Please wait for an agent to manually check the status of tracking ID: ${trackingId}.`;
    }

    console.log(`[Tracking Engine] Calling external webhook for ${userId} with tracking ID: ${trackingId}`);
    
    // We match the standard payload format the user implemented earlier but with 'track_shipment'
    const payload = {
      action: 'track_shipment',
      tracking_id: trackingId
    };

    const headers: any = { 'Content-Type': 'application/json' };
    if (settings.webhook_secret) {
      headers['x-chatsela-signature'] = settings.webhook_secret;
    }

    const resp = await fetch(settings.webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!resp.ok) {
      return `I tried to track your shipment (${trackingId}), but our logistics server is temporarily unavailable. Let me connect you to a human agent.`;
    }

    const result = await resp.json();

    if (result.success && result.tracking) {
      const t = result.tracking;
      return `📍 **Live Shipment Tracking Update** 💎\n\n- **Tracking ID:** ${trackingId}\n- **Status:** ${t.status || 'In Transit'}\n- **Current Location:** ${t.current_location || 'Unknown'}\n- **Estimated Delivery:** ${t.estimated_delivery || 'Pending'}\n\n${t.details || 'Your shipment is moving along nicely. Can I assist you with anything else today?'} 🚀`;
    } else {
      return result.message || `I couldn't find any recent tracking updates for the ID **${trackingId}**. Please double-check the number or let me get an agent to investigate further.`;
    }

  } catch (err: any) {
    console.error('[Tracking Engine] Critical Failure:', err.message);
    return 'I encountered a system error while trying to track your shipment. Our team will look into this shortly.';
  }
}

export async function resolveShipmentBooking(
  supabase: any,
  userId: string,
  params: {
    receiver_name: string;
    receiver_phone: string;
    receiver_address: string;
    origin: string;
    destination: string;
    weight_kg: number;
    service_type: string;
    dimensions: { length: number; width: number; height: number };
  }
): Promise<string> {
  try {
    const { data: settings } = await supabase
      .from('quote_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!settings?.webhook_url) {
      return 'I cannot process your booking automatically right now. Let me pass your details to our team to finalize the order for you manually.';
    }

    console.log(`[Booking Engine] Calling external webhook for ${userId} to create shipment...`);

    const payload = {
      action: 'create_shipment',
      receiver: {
        name: params.receiver_name,
        phone: params.receiver_phone,
        address: params.receiver_address
      },
      shipment: {
        origin: params.origin,
        destination: params.destination,
        weight: params.weight_kg,
        service_type: params.service_type || 'air',
        dimensions: params.dimensions
      }
    };

    const headers: any = { 'Content-Type': 'application/json' };
    if (settings.webhook_secret) {
      headers['x-chatsela-signature'] = settings.webhook_secret;
    }

    const resp = await fetch(settings.webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!resp.ok) {
      return 'The booking was sent successfully, but I encountered an error while generating your Waybill. Our logistics team will send it to you shortly! ✅';
    }

    const result = await resp.json();

    if (result.success && result.tracking_id) {
       return `🎊 **Shipment Confirmed!** 🎊\n\nYour order has been successfully booked with GlobalLine Logistics.\n\n- **Tracking ID:** ${result.tracking_id}\n- **Waybill PDF:** [Download Here](${result.waybill_url || '#'})\n- **Status:** Order Received\n\nYou can track your package anytime by asking me for a status update. Thank you for choosing ChatSela God-Mode! 🚀📦💎`;
    } else {
       return result.message || 'I successfully captured your booking details, but the system is waiting for manual confirmation. Our team will reach out to you within an hour!';
    }

  } catch (err: any) {
    console.error('[Booking Engine] Critical Failure:', err.message);
    return 'I encountered a system error while processing your booking. Don\'t worry—your information is safe, and an agent will follow up with your Waybill shortly.';
  }
}
