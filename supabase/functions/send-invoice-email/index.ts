const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value: unknown): string {
  return Number(value || 0).toFixed(2);
}

function senderDetails(value: string | undefined): { name: string; email: string } {
  const match = value?.match(/^(.+?)\s*<([^>]+)>$/);
  return match
    ? { name: match[1].trim(), email: match[2].trim() }
    : { name: 'MediStore', email: value || '' };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bill, customer, items } = await request.json();
    if (!bill?.invoice_number || !customer?.email || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: 'Invalid invoice email data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const rows = items.map((item: Record<string, unknown>) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.name)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${escapeHtml(item.quantity)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">₹${money(item.price)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">₹${money(item.total)}</td>
      </tr>`).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937">
        <h1 style="color:#0f766e">MediStore</h1>
        <p>Dear ${escapeHtml(customer.name)},</p>
        <p>Thank you for your purchase. Your electronic bill is below.</p>
        <p><strong>Invoice:</strong> ${escapeHtml(bill.invoice_number)}<br>
        <strong>Date:</strong> ${escapeHtml(new Date(bill.created_at || Date.now()).toLocaleString())}</p>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f3f4f6"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px">Qty</th><th style="padding:8px;text-align:right">Price</th><th style="padding:8px;text-align:right">Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="text-align:right;margin-top:16px">
          <p>Subtotal: ₹${money(bill.subtotal)}</p>
          <p>Discount: ₹${money(bill.discount_amount)}</p>
          <p style="font-size:18px"><strong>Total: ₹${money(bill.total)}</strong></p>
        </div>
        <p>Get well soon!</p>
      </div>`;

    const sender = senderDetails(Deno.env.get('BILLING_FROM_EMAIL'));
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const providerUrl = brevoApiKey
      ? 'https://api.brevo.com/v3/smtp/email'
      : 'https://api.resend.com/emails';
    const providerHeaders = brevoApiKey
      ? { 'Content-Type': 'application/json', 'api-key': brevoApiKey }
      : {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`
        };
    const providerBody = brevoApiKey
      ? {
          sender,
          to: [{ email: customer.email, name: customer.name }],
          subject: `Your MediStore bill ${bill.invoice_number}`,
          htmlContent: html
        }
      : {
          from: Deno.env.get('BILLING_FROM_EMAIL'),
          to: [customer.email],
          subject: `Your MediStore bill ${bill.invoice_number}`,
          html
        };

    const resendResponse = await fetch(providerUrl, {
      method: 'POST',
      headers: providerHeaders,
      body: JSON.stringify(providerBody)
    });

    if (!resendResponse.ok) {
      const details = await resendResponse.text();
      throw new Error(`Email provider rejected the message: ${details}`);
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Email delivery failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});