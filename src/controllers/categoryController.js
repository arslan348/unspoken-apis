const Category = require('../models/Category');
const Product = require('../models/Product');

// Get all categories (flat list with parent populated)
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('createdBy', 'name email')
      .populate('parent', 'name slug')
      .sort({ name: 1 });
    res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single category
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('parent', 'name slug');
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, parent } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    // Validate parent exists if provided
    if (parent) {
      const parentCat = await Category.findById(parent);
      if (!parentCat) {
        return res.status(400).json({ success: false, message: 'Parent category not found' });
      }
      // Prevent nesting more than one level deep
      if (parentCat.parent) {
        return res.status(400).json({ success: false, message: 'Subcategories cannot have subcategories' });
      }
    }

    const category = await Category.create({
      name,
      description,
      parent: parent || null,
      createdBy: req.user.id,
    });

    await category.populate('parent', 'name slug');
    res.status(201).json({ success: true, message: 'Category created successfully', data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, description, parent } = req.body;

    // Validate new parent if provided
    if (parent) {
      if (parent === req.params.id) {
        return res.status(400).json({ success: false, message: 'A category cannot be its own parent' });
      }
      const parentCat = await Category.findById(parent);
      if (!parentCat) {
        return res.status(400).json({ success: false, message: 'Parent category not found' });
      }
      if (parentCat.parent) {
        return res.status(400).json({ success: false, message: 'Subcategories cannot have subcategories' });
      }
    }

    // If making a category a parent, ensure it has no parent itself
    if (parent === null || parent === '') {
      // Check if this category has children — if so, it can't become a sub itself
      // (it's being made top-level, which is fine)
    }

    category.name = name || category.name;
    category.description = description !== undefined ? description : category.description;
    category.parent = parent !== undefined ? (parent || null) : category.parent;
    await category.save();
    await category.populate('parent', 'name slug');

    res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Block if products use this category
    const productCount = await Product.countDocuments({ category: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${productCount} product(s) are assigned to this category.`,
      });
    }

    // Block if it has subcategories
    const childCount = await Category.countDocuments({ parent: req.params.id });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${childCount} subcategorie(s) belong to this category.`,
      });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
