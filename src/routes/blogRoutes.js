const express = require('express');
const {
  getAllBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAllBlogs);
router.get('/:id', getBlog);

// Protected routes (require authentication)
router.post('/', auth, createBlog);
router.put('/:id', auth, updateBlog);
router.delete('/:id', auth, deleteBlog);

module.exports = router;
