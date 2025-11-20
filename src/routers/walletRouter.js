const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/WalletController');
const { authenticate } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', WalletController.getWallet);
router.post('/deposit', WalletController.deposit);
router.get('/transactions', WalletController.getTransactionHistory);

module.exports = router;
