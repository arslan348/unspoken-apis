const express = require('express');
const { getAbout, updateAbout } = require('../controllers/aboutController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public route
router.get('/', getAbout);

// Protected route
router.put('/', auth, updateAbout);

module.exports = router;