const express = require('express');
const router = express.Router();
const CommentController = require('../controllers/CommentController');
const { authenticate, optionalAuth, isAdmin } = require('../middlewares/auth');

// Public route (product comments)
router.get('/products/:product_id', CommentController.getProductComments);
router.get('/products/:product_id/rating', CommentController.getAverageRating);

// Protected routes
router.post('/', authenticate, CommentController.createComment);
router.get('/my-comments', authenticate, CommentController.getUserComments);
router.put('/:id', authenticate, CommentController.updateComment);
router.delete('/:id', authenticate, CommentController.deleteComment);

// Admin routes
router.get('/', authenticate, isAdmin, CommentController.getAllComments);

module.exports = router;
