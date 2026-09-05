const nodemailer = require('nodemailer');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function senderDetails(value) {
  const match = value?.match(/^(.+?)\s*<([^>]+)>$/);
  return match
    ? { name: match[1].trim(), email: match[2].trim() }
    : { name: 'MediStore', email: value || '' };
}

function invoiceHtml(bill, customer, items) {
  const rows = items.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.name)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${escapeHtml(item.quantity)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">₹${money(item.price)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">₹${money(item.total)}</td>
    </tr>`).join('');

  return `
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
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bill, customer, items } = request.body || {};
    if (!bill?.invoice_number || !customer?.email || !Array.isArray(items)) {
      return response.status(400).json({ error: 'Invalid invoice email data' });
    }

    const sender = senderDetails(process.env.BILLING_FROM_EMAIL || process.env.GMAIL_USER);
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || !sender.email) {
      return response.status(500).json({ error: 'Email service is not configured' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `${sender.name} <${process.env.GMAIL_USER}>`,
      to: `${customer.name} <${customer.email}>`,
      subject: `Your MediStore bill ${bill.invoice_number}`,
      html: invoiceHtml(bill, customer, items)
    });

    return response.status(200).json({ sent: true });
  } catch (error) {
    console.error('Invoice email failed:', error);
    return response.status(500).json({ error: 'Email delivery failed' });
  }
};
