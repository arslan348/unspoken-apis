const crypto = require('crypto');
const https = require('https');

// ─── Shared HTTP helper (no extra deps) ──────────────────────
function httpPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { method: 'POST', hostname, path, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); } catch { resolve({ status: res.statusCode, body: raw }); } });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────
// SAFEPAY  (cards + internet banking + JazzCash + EasyPaisa)
// Docs: https://getsafepay.com
// Required env vars:
//   SAFEPAY_SECRET_KEY     (from Safepay dashboard)
//   SAFEPAY_PUBLIC_KEY     (from Safepay dashboard)
//   SAFEPAY_WEBHOOK_SECRET (from Safepay dashboard → Webhooks)
//   SAFEPAY_ENV            (sandbox | production)
// ─────────────────────────────────────────────────────────────
exports.initiateSafepay = async (req, res) => {
  const { orderId, amount } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ success: false, message: 'orderId and amount are required.' });
  }

  const secretKey  = process.env.SAFEPAY_SECRET_KEY;
  const publicKey  = process.env.SAFEPAY_PUBLIC_KEY;
  const isProduction = process.env.SAFEPAY_ENV === 'production';

  if (!secretKey || !publicKey) {
    return res.status(503).json({
      success: false,
      message: 'Safepay is not configured. Set SAFEPAY_SECRET_KEY and SAFEPAY_PUBLIC_KEY in .env',
    });
  }

  const hostname = isProduction ? 'api.getsafepay.com' : 'sandbox.api.getsafepay.com';
  const amountPaisa = Math.round(Number(amount) * 100);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';

  try {
    const result = await httpPost(
      hostname,
      '/order/v1/init',
      { Authorization: `Bearer ${secretKey}` },
      {
        client:      publicKey,
        environment: isProduction ? 'production' : 'sandbox',
        currency:    'PKR',
        amount:      amountPaisa,
        order_id:    orderId,
      }
    );

    const token = result.body?.data?.token;
    if (!token || result.body?.status?.message !== 'success') {
      console.error('Safepay init error:', JSON.stringify(result.body));
      return res.status(502).json({
        success: false,
        message: 'Safepay order creation failed.',
        safepay_error: result.body,
      });
    }

    const env = isProduction ? 'production' : 'sandbox';
    const params = new URLSearchParams({
      tbt:          token,
      env,
      order_id:     orderId,
      source:       'custom',
      redirect_url: `${frontendUrl}/thankyou.html?method=safepay&order=${orderId}`,
      cancel_url:   `${frontendUrl}/addtocart.html`,
    });
    const checkoutUrl = `https://${hostname}/checkout/pay?${params.toString()}`;

    res.json({ success: true, token, checkoutUrl });
  } catch (err) {
    console.error('Safepay network error:', err.message);
    res.status(502).json({ success: false, message: 'Could not reach Safepay.' });
  }
};

// Safepay webhook — called by Safepay after payment
exports.safepayWebhook = async (req, res) => {
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-sfpy-signature'] || '';
  const rawBody = JSON.stringify(req.body);

  if (secret) {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (signature !== expected) {
      return res.status(401).json({ success: false, message: 'Invalid signature.' });
    }
  }

  const Order = require('../models/Order');
  const orderCtrl = require('./orderController');

  try {
    const event = req.body;
    const state = event?.data?.tracker?.state || event?.data?.state;
    const eventOrderId = event?.data?.tracker?.order?.id || event?.data?.order_id;

    if (!eventOrderId) return res.status(200).json({ received: true });

    const order = await Order.findById(eventOrderId);
    if (!order) return res.status(200).json({ received: true });

    if (state === 'PAID' || state === 'DELIVERED') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'confirmed';
      order.transactionRef = event?.data?.tracker?.token || event?.data?.token || '';
      await order.save();
      orderCtrl.sendOrderEmails(order).catch(() => {});
    } else if (state === 'CANCELLED' || state === 'FAILED') {
      order.paymentStatus = 'failed';
      await order.save();
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Safepay webhook error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// EASYPAISA  (hosted checkout redirect — user pays with mobile OTP)
// Docs: https://easypay.easypaisa.com.pk/
// Required env vars:
//   EASYPAISA_STORE_ID
//   EASYPAISA_HASH_KEY
//   EASYPAISA_ENV  (sandbox | production)
// ─────────────────────────────────────────────────────────────
exports.getEasyPaisaPayload = (req, res) => {
  const { orderId, amount } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ success: false, message: 'orderId and amount required.' });
  }

  const storeId = process.env.EASYPAISA_STORE_ID;
  const hashKey = process.env.EASYPAISA_HASH_KEY;
  const isProduction = process.env.EASYPAISA_ENV === 'production';

  if (!storeId || !hashKey) {
    return res.status(503).json({ success: false, message: 'EasyPaisa credentials not configured on server.' });
  }

  const orderRefNum = `EP${Date.now()}${orderId.slice(-6)}`;
  const timeStamp = String(Date.now());
  const formattedAmount = Number(amount).toFixed(2);
  const postBackURL = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/easypaisa/callback`;

  // Signature: HMAC-SHA256 of fields joined in this exact alphabetical order, Base64 encoded
  const signStr = [
    `amount=${formattedAmount}`,
    `orderRefNum=${orderRefNum}`,
    `paymentMethod=MA_WALLET`,
    `postBackURL=${postBackURL}`,
    `storeId=${storeId}`,
    `timeStamp=${timeStamp}`,
  ].join('&');

  const signature = crypto.createHmac('sha256', hashKey).update(signStr).digest('base64');

  const params = {
    storeId,
    amount: formattedAmount,
    postBackURL,
    orderRefNum,
    paymentMethod: 'MA_WALLET',
    timeStamp,
    signature,
  };

  const gatewayUrl = isProduction
    ? 'https://easypay.easypaisa.com.pk/easypay/Index.jsf'
    : 'https://easypay.easypaisa.com.pk/easypay-sandbox/Index.jsf';

  res.json({ success: true, gatewayUrl, params, orderRefNum });
};

// EasyPaisa redirects user back here after payment
exports.easyPaisaCallback = async (req, res) => {
  const Order = require('../models/Order');
  const orderCtrl = require('./orderController');
  const { orderRefNum, responseCode } = req.body;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';

  try {
    if (responseCode === '0000' && orderRefNum) {
      const order = await Order.findOne({ transactionRef: orderRefNum });
      if (order) {
        order.paymentStatus = 'paid';
        order.orderStatus = 'confirmed';
        await order.save();
        orderCtrl.sendOrderEmails(order).catch(() => {});
        return res.redirect(`${frontendUrl}/thankyou.html?order=${order._id}&method=easypaisa`);
      }
    }
    res.redirect(`${frontendUrl}/thankyou.html?error=payment_failed`);
  } catch (err) {
    console.error('EasyPaisa callback error:', err.message);
    res.redirect(`${frontendUrl}/thankyou.html?error=payment_failed`);
  }
};

// ─────────────────────────────────────────────────────────────
/**
 * JazzCash Merchant Integration
 * Docs: https://sandbox.jazzcash.com.pk/
 *
 * Required env vars:
 *   JAZZCASH_MERCHANT_ID
 *   JAZZCASH_PASSWORD
 *   JAZZCASH_INTEGRITY_SALT
 *   JAZZCASH_ENV  (sandbox | production)
 */

function padLeft(n, len, ch = '0') {
  return String(n).padStart(len, ch);
}

function jazzCashDateTime(date) {
  const d = date || new Date();
  return (
    d.getFullYear() +
    padLeft(d.getMonth() + 1, 2) +
    padLeft(d.getDate(), 2) +
    padLeft(d.getHours(), 2) +
    padLeft(d.getMinutes(), 2) +
    padLeft(d.getSeconds(), 2)
  );
}

function buildSecureHash(params, salt) {
  // Sort keys alphabetically, exclude pp_SecureHash itself
  const sorted = Object.keys(params)
    .filter((k) => k !== 'pp_SecureHash' && params[k] !== '')
    .sort()
    .map((k) => params[k])
    .join('&');

  const str = `${salt}&${sorted}`;
  return crypto.createHmac('sha256', salt).update(str).digest('hex').toUpperCase();
}

exports.getJazzCashPayload = (req, res) => {
  const { orderId, amount, description } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ success: false, message: 'orderId and amount required.' });
  }

  const merchantId = process.env.JAZZCASH_MERCHANT_ID;
  const password = process.env.JAZZCASH_PASSWORD;
  const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
  const isProduction = process.env.JAZZCASH_ENV === 'production';

  if (!merchantId || !password || !integritySalt) {
    return res
      .status(503)
      .json({ success: false, message: 'JazzCash credentials not configured on server.' });
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours

  const txnRefNo = `T${Date.now()}${orderId.slice(-6)}`;
  const amountPaisa = String(Math.round(Number(amount) * 100)); // PKR → paisa

  const params = {
    pp_Version: '1.1',
    pp_TxnType: 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: merchantId,
    pp_SubMerchantID: '',
    pp_Password: password,
    pp_BankID: 'TBANK',
    pp_ProductID: 'RETL',
    pp_TxnRefNo: txnRefNo,
    pp_Amount: amountPaisa,
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: jazzCashDateTime(now),
    pp_BillReference: `billRef${orderId.slice(-8)}`,
    pp_Description: description || 'Unspoken Flame Order',
    pp_TxnExpiryDateTime: jazzCashDateTime(expiry),
    pp_ReturnURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/jazzcash/callback`,
    pp_SecureHash: '',
  };

  params.pp_SecureHash = buildSecureHash(params, integritySalt);

  const gatewayUrl = isProduction
    ? 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
    : 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';

  res.json({ success: true, gatewayUrl, params, txnRefNo });
};
