const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class CartService {
  // Thêm sản phẩm vào giỏ hàng
  static async addItem(userId, productId, quantity = 1) {
    // Kiểm tra tồn kho
    const productCheck = await pool.query(
      'SELECT stock FROM products WHERE id = $1',
      [productId]
    );

    if (!productCheck.rows[0]) {
      throw new Error('Sản phẩm không tồn tại');
    }

    if (productCheck.rows[0].stock < quantity) {
      throw new Error(`Không đủ hàng. Còn lại: ${productCheck.rows[0].stock}`);
    }

    // Kiểm tra xem sản phẩm đã có trong giỏ chưa
    const checkQuery = 'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2';
    const existing = await pool.query(checkQuery, [userId, productId]);

    if (existing.rows.length > 0) {
      // Nếu đã có thì cộng thêm số lượng
      const newQuantity = existing.rows[0].quantity + quantity;
      
      // Check lại tồn kho với số lượng mới
      if (productCheck.rows[0].stock < newQuantity) {
        throw new Error(`Không đủ hàng. Còn lại: ${productCheck.rows[0].stock}`);
      }

      const updateQuery = `
        UPDATE cart_items 
        SET quantity = $1, updated_at = NOW()
        WHERE user_id = $2 AND product_id = $3
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [newQuantity, userId, productId]);
      return result.rows[0];
    } else {
      // Nếu chưa có thì thêm mới
      const cartItemId = uuidv4();
      const insertQuery = `
        INSERT INTO cart_items (id, user_id, product_id, quantity)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [cartItemId, userId, productId, quantity]);
      return result.rows[0];
    }
  }

  // Lấy giỏ hàng của user (với thông tin sản phẩm và tính toán VNĐ)
  static async getCart(userId) {
    const query = `
      SELECT 
        ci.id,
        ci.user_id,
        ci.product_id,
        ci.quantity,
        ci.created_at,
        ci.updated_at,
        p.name,
        p.price,
        p.image_url,
        p.stock,
        (ci.quantity * p.price) as subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Tính tổng giá trị giỏ hàng (VNĐ)
  static async getCartTotal(userId) {
    const query = `
      SELECT 
        COALESCE(SUM(ci.quantity * p.price), 0) as total,
        COUNT(ci.id) as item_count
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  // Cập nhật số lượng sản phẩm trong giỏ
  static async updateQuantity(userId, productId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    // Kiểm tra tồn kho
    const productCheck = await pool.query(
      'SELECT stock FROM products WHERE id = $1',
      [productId]
    );

    if (!productCheck.rows[0]) {
      throw new Error('Sản phẩm không tồn tại');
    }

    if (productCheck.rows[0].stock < quantity) {
      throw new Error(`Không đủ hàng. Còn lại: ${productCheck.rows[0].stock}`);
    }

    const query = `
      UPDATE cart_items 
      SET quantity = $1, updated_at = NOW()
      WHERE user_id = $2 AND product_id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [quantity, userId, productId]);
    return result.rows[0];
  }

  // Xóa 1 sản phẩm khỏi giỏ
  static async removeItem(userId, productId) {
    const query = 'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *';
    const result = await pool.query(query, [userId, productId]);
    return result.rows[0];
  }

  // Xóa toàn bộ giỏ hàng
  static async clearCart(userId) {
    const query = 'DELETE FROM cart_items WHERE user_id = $1 RETURNING *';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Validate giỏ hàng trước khi checkout
  static async validateCart(userId) {
    const cartItems = await this.getCart(userId);
    const errors = [];

    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        errors.push({
          product: item.name,
          message: `Không đủ hàng. Còn lại: ${item.stock}, Bạn muốn: ${item.quantity}`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = CartService;
