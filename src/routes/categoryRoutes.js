const express = require('express');
const {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public
router.get('/', getAllCategories);
router.get('/:id', getCategory);

// Protected
router.post('/', auth, createCategory);
router.put('/:id', auth, updateCategory);
router.delete('/:id', auth, deleteCategory);

module.exports = router;
