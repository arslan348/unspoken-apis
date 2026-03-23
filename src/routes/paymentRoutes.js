const express = require('express');
const { getJazzCashPayload, getEasyPaisaPayload, easyPaisaCallback, initiateSafepay, safepayWebhook } = require('../controllers/paymentController');
const { jazzCashCallback } = require('../controllers/orderController');
const auth = require('../middleware/auth');

const router = express.Router();

// ── JazzCash ─────────────────────────────────────────────────
router.post('/jazzcash/initiate', auth, getJazzCashPayload);
router.post('/jazzcash/callback', jazzCashCallback);

// ── EasyPaisa (hosted checkout — mobile OTP, no screenshot) ──
router.post('/easypaisa/initiate', getEasyPaisaPayload);
router.post('/easypaisa/callback', easyPaisaCallback);

// ── Safepay (debit/credit cards + internet banking) ──────────
router.post('/safepay/initiate', initiateSafepay);
router.post('/safepay/webhook', express.json({ type: '*/*' }), safepayWebhook);

module.exports = router;
