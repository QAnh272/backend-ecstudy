const WalletService = require('../services/WalletService');

class WalletController {
  // Lấy thông tin ví
  static async getWallet(req, res, next) {
    try {
      const userId = req.user.id;

      const wallet = await WalletService.getWallet(userId);

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy ví'
        });
      }

      res.json({
        success: true,
        data: {
          ...wallet,
          balance: parseFloat(wallet.balance)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Nạp tiền vào ví
  static async deposit(req, res, next) {
    try {
      const userId = req.user.id;
      const { amount, description } = req.body;

      // Validation
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền phải lớn hơn 0'
        });
      }

      const wallet = await WalletService.deposit(userId, amount, description);

      res.json({
        success: true,
        message: `Nạp ${parseFloat(amount).toLocaleString('vi-VN')} VNĐ thành công`,
        data: {
          ...wallet,
          balance: parseFloat(wallet.balance)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy lịch sử giao dịch
  static async getTransactionHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { type, limit, offset } = req.query;

      const options = {
        type,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      const transactions = await WalletService.getTransactionHistory(userId, options);

      res.json({
        success: true,
        count: transactions.length,
        data: transactions.map(t => ({
          ...t,
          amount: parseFloat(t.amount)
        }))
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WalletController;
