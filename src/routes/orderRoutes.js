const express = require('express');
const {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrderStatus,
  jazzCashCallback,
} = require('../controllers/orderController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public — customers place orders
router.post('/', createOrder);

// Protected — admin only
router.get('/', auth, getAllOrders);
router.get('/:id', auth, getOrder);
router.put('/:id/status', auth, updateOrderStatus);

module.exports = router;
