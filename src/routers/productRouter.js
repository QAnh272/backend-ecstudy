const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authenticate, isAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const fs = require('fs');
const path = require('path');

// Upload image route - PHẢI ĐẶT TRƯỚC /:id
router.post('/upload-image', authenticate, isAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được upload' });
    }
    
    const oldImageUrl = req.body.oldImageUrl;
    if (oldImageUrl) {
      try {
        const filename = oldImageUrl.split('/uploads/products/').pop();
        if (filename) {
          const oldFilePath = path.join(__dirname, '../../uploads/products', filename);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      } catch (deleteError) {
        console.error('Error deleting old image:', deleteError);
      }
    }
    
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/products/${req.file.filename}`;
    
    res.json({ 
      message: 'Upload ảnh thành công',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Lỗi khi upload ảnh' });
  }
});

// Public routes
router.get('/', ProductController.getAllProducts);
router.get('/search', ProductController.searchProducts);
router.get('/categories', ProductController.getCategories);
router.get('/:id', ProductController.getProductById);

// Admin only routes
router.post('/', authenticate, isAdmin, ProductController.createProduct);
router.put('/:id', authenticate, isAdmin, ProductController.updateProduct);
router.delete('/:id', authenticate, isAdmin, ProductController.deleteProduct);

module.exports = router;
