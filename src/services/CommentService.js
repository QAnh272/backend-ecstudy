const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class CommentService {
  // Tạo comment mới (đánh giá sản phẩm)
  static async createComment(commentData) {
    const { product_id, user_id, order_id, content, rating } = commentData;
    
    // Validate rating (1-5 sao)
    if (rating && (rating < 1 || rating > 5)) {
      throw new Error('Rating phải từ 1 đến 5 sao');
    }

    // Kiểm tra sản phẩm tồn tại
    const productCheck = await pool.query(
      'SELECT id FROM products WHERE id = $1',
      [product_id]
    );

    if (!productCheck.rows[0]) {
      throw new Error('Sản phẩm không tồn tại');
    }

    const commentId = uuidv4();
    const query = `
      INSERT INTO comments (id, product_id, user_id, order_id, content, rating)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [commentId, product_id, user_id, order_id, content, rating];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Lấy tất cả comments của 1 sản phẩm
  static async getProductComments(productId, options = {}) {
    const { limit = 50, offset = 0, rating } = options;
    
    let query = `
      SELECT 
        c.id,
        c.product_id,
        c.user_id,
        c.content,
        c.rating,
        c.created_at,
        c.updated_at,
        u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.product_id = $1
    `;
    
    const values = [productId];
    let paramCount = 2;

    // Filter theo rating nếu có
    if (rating && rating >= 1 && rating <= 5) {
      query += ` AND c.rating = $${paramCount}`;
      values.push(rating);
      paramCount++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Lấy comments của 1 user
  static async getUserComments(userId, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const query = `
      SELECT c.*, p.name as product_name, p.image_url as product_image
      FROM comments c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  // Tìm comment theo ID
  static async findById(id) {
    const query = `
      SELECT c.*, u.username, p.name as product_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      JOIN products p ON c.product_id = p.id
      WHERE c.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Cập nhật comment (chỉ update các field được truyền vào)
  static async updateComment(id, userId, commentData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (commentData.content !== undefined) {
      fields.push(`content = $${paramCount}`);
      values.push(commentData.content);
      paramCount++;
    }

    if (commentData.rating !== undefined) {
      if (commentData.rating < 1 || commentData.rating > 5) {
        throw new Error('Rating phải từ 1 đến 5 sao');
      }
      fields.push(`rating = $${paramCount}`);
      values.push(commentData.rating);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('Không có field nào để update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, userId);

    const query = `
      UPDATE comments 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (!result.rows[0]) {
      throw new Error('Comment không tồn tại hoặc bạn không có quyền sửa');
    }

    return result.rows[0];
  }

  // Xóa comment
  static async deleteComment(id, userId) {
    const query = 'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id';
    const result = await pool.query(query, [id, userId]);
    
    if (!result.rows[0]) {
      throw new Error('Comment không tồn tại hoặc bạn không có quyền xóa');
    }

    return result.rows[0];
  }

  // Lấy rating trung bình của sản phẩm
  static async getAverageRating(productId) {
    const query = `
      SELECT 
        COALESCE(ROUND(AVG(rating), 1), 0) as average_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM comments
      WHERE product_id = $1
    `;
    const result = await pool.query(query, [productId]);
    return result.rows[0];
  }

  // Kiểm tra user đã comment sản phẩm chưa
  static async hasUserCommented(userId, productId) {
    const query = 'SELECT id FROM comments WHERE user_id = $1 AND product_id = $2';
    const result = await pool.query(query, [userId, productId]);
    return result.rows.length > 0;
  }
}

module.exports = CommentService;
