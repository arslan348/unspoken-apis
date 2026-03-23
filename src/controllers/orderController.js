const Order = require('../models/Order');
const nodemailer = require('nodemailer');

// ─── Email helper ─────────────────────────────────────────────
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function itemsHtml(items) {
  return items
    .map(
      (it) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${it.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${it.scent || '-'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.qty}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">Rs.${Number(it.price * it.qty).toLocaleString('en-PK', { minimumFractionDigits: 2 })} PKR</td>
        </tr>`
    )
    .join('');
}

function paymentLabel(method) {
  const map = {
    cod: 'Cash on Delivery',
    jazzcash: 'JazzCash',
    easypaisa: 'EasyPaisa',
    bank_transfer: 'Bank Transfer',
  };
  return map[method] || method;
}

async function sendOrderEmails(order) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const transporter = getTransporter();
  const fmt = (n) =>
    `Rs.${Number(n).toLocaleString('en-PK', { minimumFractionDigits: 2 })} PKR`;

  const baseHtml = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#1a1a1a;padding:24px 32px;">
        <h2 style="color:#fff;margin:0;font-size:1.1rem;font-weight:600;">Unspoken Flame Candles &amp; Co</h2>
      </div>
      <div style="padding:32px;">
        <h3 style="margin-top:0;">Order Confirmed — ${order.orderNumber}</h3>
        <p style="color:#6b7280;font-size:0.9rem;">Payment: <strong>${paymentLabel(order.paymentMethod)}</strong></p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:0.9rem;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500;">Product</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500;">Scent</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Qty</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:500;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml(order.items)}</tbody>
        </table>

        <div style="border-top:1px solid #e5e7eb;padding-top:12px;font-size:0.9rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:#6b7280;">Subtotal</span><span>${fmt(order.subtotal)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:#6b7280;">Delivery</span><span>${fmt(order.deliveryCharges)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1rem;margin-top:8px;">
            <span>Total</span><span>${fmt(order.total)}</span>
          </div>
        </div>

        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-top:20px;font-size:0.875rem;">
          <strong>Delivery To:</strong><br>
          ${order.customer.name}<br>
          ${order.customer.address}, ${order.customer.city}<br>
          ${order.customer.phone}
          ${order.customer.notes ? `<br><em>Note: ${order.customer.notes}</em>` : ''}
        </div>
      </div>
      <div style="background:#f9fafb;padding:16px 32px;text-align:center;color:#9ca3af;font-size:0.8rem;">
        Unspoken Flame Candles &amp; Co • customers@unspokenflame.com
      </div>
    </div>`;

  // Email to admin
  await transporter.sendMail({
    from: `"Unspoken Flame" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `New Order ${order.orderNumber} — ${paymentLabel(order.paymentMethod)}`,
    html: baseHtml,
  });

  // Email to customer
  if (order.customer.email) {
    await transporter.sendMail({
      from: `"Unspoken Flame" <${process.env.EMAIL_USER}>`,
      to: order.customer.email,
      subject: `Your Order ${order.orderNumber} is Confirmed!`,
      html: baseHtml,
    });
  }
}

exports.sendOrderEmails = sendOrderEmails;

// ─── Create Order ─────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { customer, items, subtotal, deliveryCharges, total, paymentMethod, transactionRef } =
      req.body;

    if (!customer || !items || !items.length || !paymentMethod) {
      return res
        .status(400)
        .json({ success: false, message: 'Customer, items, and paymentMethod are required.' });
    }

    const order = await Order.create({
      customer,
      items,
      subtotal,
      deliveryCharges: deliveryCharges || 200,
      total,
      paymentMethod,
      transactionRef: transactionRef || '',
      paymentStatus: paymentMethod === 'jazzcash' ? 'pending' : 'pending',
      orderStatus: 'pending',
    });

    // Send emails in background (non-blocking)
    sendOrderEmails(order).catch((err) => console.error('Email error:', err));

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get All Orders (admin) ───────────────────────────────────
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Single Order ─────────────────────────────────────────
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update Order Status (admin) ─────────────────────────────
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── JazzCash callback (server-side verification) ────────────
exports.jazzCashCallback = async (req, res) => {
  try {
    const { pp_TxnRefNo, pp_ResponseCode, pp_Amount } = req.body;

    // pp_ResponseCode '000' means success
    const paid = pp_ResponseCode === '000';

    // Find order by transactionRef
    const order = await Order.findOne({ transactionRef: pp_TxnRefNo });
    if (order) {
      order.paymentStatus = paid ? 'paid' : 'failed';
      if (paid) order.orderStatus = 'confirmed';
      await order.save();

      if (paid) {
        sendOrderEmails(order).catch((err) => console.error('Email error:', err));
      }
    }

    // JazzCash expects a redirect back to your site
    const redirectUrl = paid
      ? `${process.env.FRONTEND_URL || 'http://localhost:5500'}/thankyou.html?order=${order?._id}`
      : `${process.env.FRONTEND_URL || 'http://localhost:5500'}/addtocart.html?payment=failed`;

    res.redirect(302, redirectUrl);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
