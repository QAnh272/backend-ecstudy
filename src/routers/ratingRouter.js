const express = require('express');
const router = express.Router();
const RatingController = require('../controllers/RatingController');
const { authenticate, isAdmin } = require('../middlewares/auth');

// Customer routes
router.post('/orders/:orderId', authenticate, RatingController.createOrUpdateRating);
router.get('/orders/:orderId/my-rating', authenticate, RatingController.getUserOrderRating);
router.get('/orders/:orderId/average', RatingController.getOrderAverageRating);
router.delete('/orders/:orderId', authenticate, RatingController.deleteRating);

// Admin routes
router.get('/orders/:orderId', authenticate, isAdmin, RatingController.getOrderRatings);

module.exports = router;
