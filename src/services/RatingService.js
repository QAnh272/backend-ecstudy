const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class RatingService {
  // Tạo hoặc cập nhật rating cho đơn hàng
  static async createOrUpdateRating(orderId, userId, rating) {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating phải từ 1 đến 5 sao');
    }

    // Kiểm tra order có tồn tại và thuộc về user không
    const orderQuery = 'SELECT * FROM orders WHERE id = $1 AND user_id = $2';
    const orderResult = await pool.query(orderQuery, [orderId, userId]);

    if (!orderResult.rows[0]) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    // Chỉ cho phép rating đơn hàng đã giao
    if (orderResult.rows[0].status !== 'delivered') {
      throw new Error('Chỉ có thể đánh giá đơn hàng đã giao');
    }

    // Kiểm tra xem đã có rating chưa
    const existingRatingQuery = 'SELECT * FROM order_ratings WHERE order_id = $1 AND user_id = $2';
    const existingRating = await pool.query(existingRatingQuery, [orderId, userId]);

    let result;
    if (existingRating.rows[0]) {
      // Cập nhật rating hiện có
      const updateQuery = `
        UPDATE order_ratings 
        SET rating = $1, updated_at = NOW()
        WHERE order_id = $2 AND user_id = $3
        RETURNING *
      `;
      result = await pool.query(updateQuery, [rating, orderId, userId]);
    } else {
      // Tạo rating mới
      const insertQuery = `
        INSERT INTO order_ratings (id, order_id, user_id, rating)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const ratingId = uuidv4();
      result = await pool.query(insertQuery, [ratingId, orderId, userId, rating]);
    }

    return result.rows[0];
  }

  // Lấy rating của user cho đơn hàng
  static async getUserOrderRating(orderId, userId) {
    const query = 'SELECT * FROM order_ratings WHERE order_id = $1 AND user_id = $2';
    const result = await pool.query(query, [orderId, userId]);
    return result.rows[0] || null;
  }

  // Lấy rating trung bình của đơn hàng
  static async getOrderAverageRating(orderId) {
    const query = `
      SELECT 
        AVG(rating)::NUMERIC(3,2) as average_rating,
        COUNT(*) as rating_count
      FROM order_ratings
      WHERE order_id = $1
    `;
    const result = await pool.query(query, [orderId]);
    return {
      average_rating: result.rows[0].average_rating ? parseFloat(result.rows[0].average_rating) : null,
      rating_count: parseInt(result.rows[0].rating_count)
    };
  }

  // Lấy tất cả ratings của một đơn hàng (admin)
  static async getOrderRatings(orderId) {
    const query = `
      SELECT 
        r.*,
        u.username,
        u.email
      FROM order_ratings r
      JOIN users u ON r.user_id = u.id
      WHERE r.order_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query, [orderId]);
    return result.rows;
  }

  // Xóa rating (admin hoặc chính user đó)
  static async deleteRating(orderId, userId, isAdmin = false) {
    let query;
    let params;

    if (isAdmin) {
      query = 'DELETE FROM order_ratings WHERE order_id = $1 RETURNING *';
      params = [orderId];
    } else {
      query = 'DELETE FROM order_ratings WHERE order_id = $1 AND user_id = $2 RETURNING *';
      params = [orderId, userId];
    }

    const result = await pool.query(query, params);
    
    if (!result.rows[0]) {
      throw new Error('Không tìm thấy rating để xóa');
    }

    return result.rows[0];
  }
}

module.exports = RatingService;
