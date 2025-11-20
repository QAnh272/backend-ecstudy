const express = require('express');
const router = express.Router();
const CartController = require('../controllers/CartController');
const { authenticate } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', CartController.getCart);
router.post('/items', CartController.addToCart);
router.put('/items/:product_id', CartController.updateQuantity);
router.delete('/items/:product_id', CartController.removeItem);
router.delete('/', CartController.clearCart);

module.exports = router;
