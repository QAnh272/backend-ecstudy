const CartService = require('../services/CartService');

class CartController {
  // Lấy giỏ hàng của user
  static async getCart(req, res, next) {
    try {
      const userId = req.user.id;

      const cart = await CartService.getCart(userId);
      const total = await CartService.getCartTotal(userId);

      res.json({
        success: true,
        data: {
          items: cart,
          total: parseFloat(total.total),
          item_count: parseInt(total.item_count)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Thêm sản phẩm vào giỏ
  static async addToCart(req, res, next) {
    try {
      const userId = req.user.id;
      const { product_id, quantity } = req.body;

      // Validation
      if (!product_id) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp product_id'
        });
      }

      const item = await CartService.addItem(
        userId,
        product_id,
        quantity || 1
      );

      res.status(201).json({
        success: true,
        message: 'Thêm vào giỏ hàng thành công',
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật số lượng
  static async updateQuantity(req, res, next) {
    try {
      const userId = req.user.id;
      const { product_id } = req.params;
      const { quantity } = req.body;

      // Validation
      if (!quantity || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Số lượng không hợp lệ'
        });
      }

      const item = await CartService.updateQuantity(userId, product_id, quantity);

      res.json({
        success: true,
        message: 'Cập nhật số lượng thành công',
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa sản phẩm khỏi giỏ
  static async removeItem(req, res, next) {
    try {
      const userId = req.user.id;
      const { product_id } = req.params;

      await CartService.removeItem(userId, product_id);

      res.json({
        success: true,
        message: 'Đã xóa sản phẩm khỏi giỏ hàng'
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa toàn bộ giỏ hàng
  static async clearCart(req, res, next) {
    try {
      const userId = req.user.id;

      await CartService.clearCart(userId);

      res.json({
        success: true,
        message: 'Đã xóa toàn bộ giỏ hàng'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CartController;
