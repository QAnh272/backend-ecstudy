const express = require('express');
const router = express.Router();
const AddressController = require('../controllers/AddressController');
const { authenticate } = require('../middlewares/auth');

// Tất cả routes yêu cầu authentication
router.use(authenticate);

// CRUD địa chỉ - đặt route cụ thể trước route dynamic
router.get('/default', AddressController.getDefaultAddress);
router.post('/:id/set-default', AddressController.setDefaultAddress);
router.get('/', AddressController.getMyAddresses);
router.get('/:id', AddressController.getAddressById);
router.post('/', AddressController.createAddress);
router.put('/:id', AddressController.updateAddress);
router.delete('/:id', AddressController.deleteAddress);

module.exports = router;
