const https = require('https');

/**
 * PostEx COD API Integration
 * Docs: PostEx Merchant API Integration Guide v4.1.9
 *
 * Required env var:
 *   POSTEX_TOKEN   (merchant token from PostEx dashboard)
 */

const BASE_HOST = 'api.postex.pk';

// ─── Shared HTTPS helper ────────────────────────────────────
function postexRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      hostname: BASE_HOST,
      path,
      headers: { token, 'Content-Type': 'application/json' },
    };

    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Get Operational Cities ─────────────────────────────────
exports.getCities = async (req, res) => {
  const token = process.env.POSTEX_TOKEN;
  if (!token) return res.status(503).json({ success: false, message: 'PostEx not configured.' });

  try {
    const result = await postexRequest(
      'GET',
      '/services/integration/api/order/v2/get-operational-city',
      token
    );
    res.json({ success: true, data: result.body });
  } catch (err) {
    console.error('PostEx cities error:', err.message);
    res.status(502).json({ success: false, message: 'Could not reach PostEx.' });
  }
};

// ─── Get Pickup Addresses ───────────────────────────────────
exports.getPickupAddresses = async (req, res) => {
  const token = process.env.POSTEX_TOKEN;
  if (!token) return res.status(503).json({ success: false, message: 'PostEx not configured.' });

  try {
    const result = await postexRequest(
      'GET',
      '/services/integration/api/order/v1/get-merchant-address',
      token
    );
    res.json({ success: true, data: result.body });
  } catch (err) {
    res.status(502).json({ success: false, message: 'Could not reach PostEx.' });
  }
};

// ─── Create PostEx Shipment from order ──────────────────────
exports.createShipment = async (req, res) => {
  const token = process.env.POSTEX_TOKEN;
  if (!token) return res.status(503).json({ success: false, message: 'PostEx not configured.' });

  const Order = require('../models/Order');
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, message: 'orderId is required.' });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    // Build order detail from items
    const orderDetail = order.items
      .map((it) => `${it.name} (${it.scent || '-'}) x${it.qty}`)
      .join(', ');

    // Format phone: ensure 03xxxxxxxxx format
    let phone = (order.customer.phone || '').replace(/[\s-]/g, '');
    if (phone.startsWith('+92')) phone = '0' + phone.slice(3);

    const postexPayload = {
      cityName:         order.customer.city,
      customerName:     order.customer.name,
      customerPhone:    phone,
      deliveryAddress:  order.customer.address,
      invoiceDivision:  1,
      invoicePayment:   order.total,
      items:            order.items.reduce((sum, it) => sum + it.qty, 0),
      orderDetail:      orderDetail,
      orderRefNumber:   order.orderNumber,
      orderType:        'Normal',
      transactionNotes: order.customer.notes || '',
    };

    const result = await postexRequest(
      'POST',
      '/services/integration/api/order/v3/create-order',
      token,
      postexPayload
    );

    if (result.body?.statusCode === '200' && result.body?.dist?.trackingNumber) {
      const trackingNumber = result.body.dist.trackingNumber;

      // Save tracking number to order
      order.postexTrackingNumber = trackingNumber;
      order.orderStatus = 'shipped';
      await order.save();

      return res.json({
        success: true,
        trackingNumber,
        message: 'Shipment created on PostEx.',
        postex: result.body.dist,
      });
    }

    console.error('PostEx create-order error:', JSON.stringify(result.body));
    res.status(502).json({
      success: false,
      message: result.body?.statusMessage || 'PostEx order creation failed.',
      postex_error: result.body,
    });
  } catch (err) {
    console.error('PostEx shipment error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Track PostEx Shipment ──────────────────────────────────
exports.trackShipment = async (req, res) => {
  const token = process.env.POSTEX_TOKEN;
  if (!token) return res.status(503).json({ success: false, message: 'PostEx not configured.' });

  const { trackingNumber } = req.params;
  if (!trackingNumber) {
    return res.status(400).json({ success: false, message: 'trackingNumber is required.' });
  }

  try {
    const result = await postexRequest(
      'GET',
      `/services/integration/api/order/v1/track-order/${encodeURIComponent(trackingNumber)}`,
      token
    );
    res.json({ success: true, data: result.body });
  } catch (err) {
    res.status(502).json({ success: false, message: 'Could not reach PostEx.' });
  }
};

// ─── Cancel PostEx Order ────────────────────────────────────
exports.cancelShipment = async (req, res) => {
  const token = process.env.POSTEX_TOKEN;
  if (!token) return res.status(503).json({ success: false, message: 'PostEx not configured.' });

  const { trackingNumber } = req.body;
  if (!trackingNumber) {
    return res.status(400).json({ success: false, message: 'trackingNumber is required.' });
  }

  try {
    const result = await postexRequest(
      'PUT',
      '/services/integration/api/order/v1/cancel-order',
      token,
      { trackingNumber }
    );

    if (result.status === 200) {
      // Also update local order
      const Order = require('../models/Order');
      const order = await Order.findOne({ postexTrackingNumber: trackingNumber });
      if (order) {
        order.orderStatus = 'cancelled';
        await order.save();
      }
    }

    res.json({ success: result.status === 200, data: result.body });
  } catch (err) {
    res.status(502).json({ success: false, message: 'Could not reach PostEx.' });
  }
};
