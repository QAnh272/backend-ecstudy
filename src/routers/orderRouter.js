const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { authenticate, isAdmin } = require('../middlewares/auth');

// Customer routes
router.post('/', authenticate, OrderController.createOrder);
router.get('/my-orders', authenticate, OrderController.getUserOrders);
router.get('/:id', authenticate, OrderController.getOrderById);
router.post('/:id/pay', authenticate, OrderController.payWithWallet);
router.post('/:id/cancel', authenticate, OrderController.cancelOrder);

// Admin routes
router.get('/', authenticate, isAdmin, OrderController.getAllOrders);
router.put('/:id/status', authenticate, isAdmin, OrderController.updateOrderStatus);

module.exports = router;
