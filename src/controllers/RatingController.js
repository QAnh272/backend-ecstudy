const RatingService = require('../services/RatingService');

class RatingController {
  // Tạo hoặc cập nhật rating cho đơn hàng
  static async createOrUpdateRating(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;
      const { rating } = req.body;

      if (!rating) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp rating (1-5 sao)'
        });
      }

      const result = await RatingService.createOrUpdateRating(orderId, userId, parseInt(rating));

      res.json({
        success: true,
        message: 'Đánh giá thành công',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy rating của user cho đơn hàng
  static async getUserOrderRating(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;

      const rating = await RatingService.getUserOrderRating(orderId, userId);

      res.json({
        success: true,
        data: rating
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy rating trung bình của đơn hàng
  static async getOrderAverageRating(req, res, next) {
    try {
      const { orderId } = req.params;

      const result = await RatingService.getOrderAverageRating(orderId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy tất cả ratings của đơn hàng (admin)
  static async getOrderRatings(req, res, next) {
    try {
      const { orderId } = req.params;

      const ratings = await RatingService.getOrderRatings(orderId);

      res.json({
        success: true,
        count: ratings.length,
        data: ratings
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa rating
  static async deleteRating(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;
      const isAdmin = req.user.role === 'admin';

      const result = await RatingService.deleteRating(orderId, userId, isAdmin);

      res.json({
        success: true,
        message: 'Xóa đánh giá thành công',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RatingController;
