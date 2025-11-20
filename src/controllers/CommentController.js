const CommentService = require('../services/CommentService');

class CommentController {
  // Lấy comments của sản phẩm
  static async getProductComments(req, res, next) {
    try {
      const { product_id } = req.params;
      const { rating, limit, offset } = req.query;

      const options = {
        rating: rating ? parseInt(rating) : undefined,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      const comments = await CommentService.getProductComments(product_id, options);

      res.json({
        success: true,
        count: comments.length,
        data: comments
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy rating trung bình
  static async getAverageRating(req, res, next) {
    try {
      const { product_id } = req.params;

      const rating = await CommentService.getAverageRating(product_id);

      res.json({
        success: true,
        data: {
          ...rating,
          average_rating: parseFloat(rating.average_rating)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Tạo comment mới
  static async createComment(req, res, next) {
    try {
      const userId = req.user.id;
      const { product_id, order_id, rating, content } = req.body;

      // Validation
      if (!product_id || !content) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp product_id và content'
        });
      }

      const comment = await CommentService.createComment({
        product_id,
        user_id: userId,
        order_id,
        content,
        rating
      });

      res.status(201).json({
        success: true,
        message: 'Đánh giá thành công',
        data: comment
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật comment
  static async updateComment(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { content, rating } = req.body;

      const comment = await CommentService.updateComment(id, userId, {
        content,
        rating
      });

      res.json({
        success: true,
        message: 'Cập nhật đánh giá thành công',
        data: comment
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa comment
  static async deleteComment(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await CommentService.deleteComment(id, userId);

      res.json({
        success: true,
        message: 'Xóa đánh giá thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy comments của user
  static async getUserComments(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit, offset } = req.query;

      const options = {
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0
      };

      const comments = await CommentService.getUserComments(userId, options);

      res.json({
        success: true,
        count: comments.length,
        data: comments
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy tất cả comments (Admin)
  static async getAllComments(req, res, next) {
    try {
      const { limit, offset } = req.query;

      const options = {
        limit: limit ? parseInt(limit) : 100,
        offset: offset ? parseInt(offset) : 0
      };

      const comments = await CommentService.getAllComments(options);

      res.json({
        success: true,
        count: comments.length,
        data: comments
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CommentController;
