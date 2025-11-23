const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticate, isAdmin } = require('../middlewares/auth');

// User có thể cập nhật thông tin cá nhân của chính họ
router.put('/:id', authenticate, UserController.updateUser);

// Admin quản lý users
router.get('/', authenticate, isAdmin, UserController.getAllUsers);
router.get('/:id', authenticate, isAdmin, UserController.getUserById);
router.delete('/:id', authenticate, isAdmin, UserController.deleteUser);

// Admin phân quyền
router.post('/:id/promote', authenticate, isAdmin, UserController.promoteToAdmin);
router.post('/:id/revoke', authenticate, isAdmin, UserController.revokeAdmin);

module.exports = router;
