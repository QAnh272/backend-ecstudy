const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticate, isAdmin } = require('../middlewares/auth');

// Tất cả routes yêu cầu authentication và admin role
router.use(authenticate, isAdmin);

// Admin quản lý users
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

// Admin phân quyền
router.post('/:id/promote', UserController.promoteToAdmin);
router.post('/:id/revoke', UserController.revokeAdmin);

module.exports = router;
