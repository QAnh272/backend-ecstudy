const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class UserService {
  // Tạo user mới (có hash password)
  static async createUser(userData) {
    const { username, email, password, role = 'customer' } = userData;

    // Generate UUID
    const userId = uuidv4();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (id, username, email, password, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role, created_at
    `;
    const values = [userId, username, email, hashedPassword, role];
    const result = await pool.query(query, values);
    
    // Tạo ví cho user mới
    const walletId = uuidv4();
    await pool.query(
      'INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 0)',
      [walletId, userId]
    );

    return result.rows[0];
  }

  // Tìm user theo email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  // Tìm user theo username
  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  // Tìm user theo ID (không trả password)
  static async findById(id) {
    const query = 'SELECT id, username, email, role, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Lấy tất cả users với filter và pagination
  static async getAllUsers(options = {}) {
    const { role, limit = 50, offset = 0 } = options;
    
    let query = 'SELECT id, username, email, role, created_at FROM users WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount}`;
      values.push(role);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Cập nhật user (partial update)
  static async updateUser(id, userData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['username', 'email'];
    
    for (const field of allowedFields) {
      if (userData[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(userData[field]);
        paramCount++;
      }
    }

    // Nếu có update password, hash trước
    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      fields.push(`password = $${paramCount}`);
      values.push(hashedPassword);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('Không có field nào để update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, role, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Xóa user
  static async deleteUser(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Check user tồn tại
  static async checkUserExists(email, username) {
    const query = 'SELECT id FROM users WHERE email = $1 OR username = $2';
    const result = await pool.query(query, [email, username]);
    return result.rows.length > 0;
  }

  // Cấp quyền admin cho user (chỉ admin mới gọi được)
  static async promoteToAdmin(userId) {
    const query = `
      UPDATE users 
      SET role = 'admin', updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, email, role, updated_at
    `;
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      throw new Error('Không tìm thấy user');
    }
    
    return result.rows[0];
  }

  // Thu hồi quyền admin (chuyển về customer)
  static async revokeAdmin(userId) {
    const query = `
      UPDATE users 
      SET role = 'customer', updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, email, role, updated_at
    `;
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      throw new Error('Không tìm thấy user');
    }
    
    return result.rows[0];
  }

  // Tạo password reset token
  static async createPasswordResetToken(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('Email không tồn tại');
    }

    // Tạo reset token (UUID)
    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    const query = `
      UPDATE users 
      SET reset_token = $1, reset_token_expires = $2
      WHERE id = $3
      RETURNING id, email
    `;
    const result = await pool.query(query, [resetToken, resetTokenExpires, user.id]);
    
    return { user: result.rows[0], resetToken };
  }

  // Xác thực reset token
  static async validateResetToken(token) {
    const query = `
      SELECT id, email, reset_token_expires 
      FROM users 
      WHERE reset_token = $1
    `;
    const result = await pool.query(query, [token]);
    
    if (result.rows.length === 0) {
      throw new Error('Token không hợp lệ');
    }

    const user = result.rows[0];
    if (new Date() > new Date(user.reset_token_expires)) {
      throw new Error('Token đã hết hạn');
    }

    return user;
  }

  // Reset password với token
  static async resetPassword(token, newPassword) {
    const user = await this.validateResetToken(token);
    
    // Hash password mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const query = `
      UPDATE users 
      SET password = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email
    `;
    const result = await pool.query(query, [hashedPassword, user.id]);
    return result.rows[0];
  }
}

module.exports = UserService;
