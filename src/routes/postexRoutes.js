const express = require('express');
const auth = require('../middleware/auth');
const {
  getCities,
  getPickupAddresses,
  createShipment,
  trackShipment,
  cancelShipment,
} = require('../controllers/postexController');

const router = express.Router();

// All routes require admin auth
router.get('/cities',                  auth, getCities);
router.get('/pickup-addresses',        auth, getPickupAddresses);
router.post('/create-shipment',        auth, createShipment);
router.get('/track/:trackingNumber',   auth, trackShipment);
router.put('/cancel',                  auth, cancelShipment);

module.exports = router;
