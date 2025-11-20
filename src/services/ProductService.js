const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ProductService {
  // Tạo sản phẩm mới
  static async createProduct(productData) {
    const { name, description, price, stock = 0, category, image_url, product_code } = productData;
    
    // Validate product_code
    if (!product_code) {
      throw new Error('Mã sản phẩm (product_code) là bắt buộc');
    }
    
    const productId = uuidv4();
    
    const query = `
      INSERT INTO products (id, name, description, price, stock, category, image_url, product_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [productId, name, description, price, stock, category, image_url, product_code];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Lấy tất cả sản phẩm với filter và pagination
  static async getAllProducts(options = {}) {
    const { limit = 50, offset = 0, category, minPrice, maxPrice, inStock } = options;
    
    let query = `
      SELECT p.*,
        COALESCE(AVG(r.rating)::NUMERIC(3,2), 0) as average_rating,
        COUNT(DISTINCT r.id)::INTEGER as rating_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
      LEFT JOIN order_ratings r ON o.id = r.order_id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (category) {
      query += ` AND p.category = $${paramCount}`;
      values.push(category);
      paramCount++;
    }

    if (minPrice !== undefined) {
      query += ` AND p.price >= $${paramCount}`;
      values.push(minPrice);
      paramCount++;
    }

    if (maxPrice !== undefined) {
      query += ` AND p.price <= $${paramCount}`;
      values.push(maxPrice);
      paramCount++;
    }

    if (inStock) {
      query += ` AND p.stock > 0`;
    }

    query += ` 
      GROUP BY p.id
      ORDER BY p.created_at DESC 
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows.map(row => ({
      ...row,
      average_rating: parseFloat(row.average_rating) || 0,
      rating_count: parseInt(row.rating_count) || 0
    }));
  }

  // Tìm sản phẩm theo ID
  static async findById(id) {
    const query = `
      SELECT p.*,
        COALESCE(AVG(r.rating)::NUMERIC(3,2), 0) as average_rating,
        COUNT(DISTINCT r.id)::INTEGER as rating_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
      LEFT JOIN order_ratings r ON o.id = r.order_id
      WHERE p.id = $1
      GROUP BY p.id
    `;
    const result = await pool.query(query, [id]);
    
    if (!result.rows[0]) return null;
    
    return {
      ...result.rows[0],
      average_rating: parseFloat(result.rows[0].average_rating) || 0,
      rating_count: parseInt(result.rows[0].rating_count) || 0
    };
  }

  // Tìm kiếm sản phẩm theo tên
  static async searchProducts(searchTerm, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const query = `
      SELECT * FROM products 
      WHERE name ILIKE $1 OR description ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [`%${searchTerm}%`, limit, offset]);
    return result.rows;
  }

  // Cập nhật sản phẩm (partial update)
  static async updateProduct(id, productData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['name', 'description', 'price', 'stock', 'category', 'image_url'];
    
    allowedFields.forEach(field => {
      if (productData[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(productData[field]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('Không có field nào để update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE products 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Xóa sản phẩm
  static async deleteProduct(id) {
    const query = 'DELETE FROM products WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Cập nhật tồn kho
  static async updateStock(id, quantity) {
    const query = `
      UPDATE products 
      SET stock = stock + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [quantity, id]);
    return result.rows[0];
  }

  // Lấy sản phẩm theo category
  static async getByCategory(category, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const query = `
      SELECT * FROM products 
      WHERE category = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [category, limit, offset]);
    return result.rows;
  }

  // Kiểm tra tồn kho
  static async checkStock(id, quantity) {
    const query = 'SELECT stock FROM products WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (!result.rows[0]) {
      return { available: false, message: 'Sản phẩm không tồn tại' };
    }

    const stock = result.rows[0].stock;
    if (stock < quantity) {
      return { 
        available: false, 
        message: `Không đủ hàng. Còn lại: ${stock}`,
        currentStock: stock
      };
    }

    return { available: true, currentStock: stock };
  }

  // Lấy danh sách categories
  static async getCategories() {
    const query = 'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category';
    const result = await pool.query(query);
    return result.rows.map(row => row.category);
  }
}

module.exports = ProductService;
