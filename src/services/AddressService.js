const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AddressService {
  // Lấy tất cả địa chỉ của user
  static async getUserAddresses(userId) {
    const query = `
      SELECT * FROM user_addresses 
      WHERE user_id = $1 
      ORDER BY is_default DESC, created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Lấy địa chỉ mặc định của user
  static async getDefaultAddress(userId) {
    const query = `
      SELECT * FROM user_addresses 
      WHERE user_id = $1 AND is_default = true 
      LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  // Lấy một địa chỉ theo ID
  static async getAddressById(addressId, userId = null) {
    let query = 'SELECT * FROM user_addresses WHERE id = $1';
    const params = [addressId];
    
    if (userId) {
      query += ' AND user_id = $2';
      params.push(userId);
    }
    
    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  // Tạo địa chỉ mới
  static async createAddress(userId, addressData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { 
        label, 
        full_address, 
        recipient_name, 
        phone, 
        is_default = false 
      } = addressData;

      // Nếu đây là địa chỉ mặc định, bỏ default của các địa chỉ khác
      if (is_default) {
        await client.query(
          'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
          [userId]
        );
      }

      // Nếu user chưa có địa chỉ nào, tự động set làm mặc định
      const countQuery = 'SELECT COUNT(*) as count FROM user_addresses WHERE user_id = $1';
      const countResult = await client.query(countQuery, [userId]);
      const shouldBeDefault = is_default || parseInt(countResult.rows[0].count) === 0;

      const addressId = uuidv4();
      const insertQuery = `
        INSERT INTO user_addresses 
        (id, user_id, label, full_address, recipient_name, phone, is_default)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        addressId,
        userId,
        label,
        full_address,
        recipient_name,
        phone,
        shouldBeDefault
      ]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Cập nhật địa chỉ
  static async updateAddress(addressId, userId, addressData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Kiểm tra quyền sở hữu
      const checkQuery = 'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2';
      const checkResult = await client.query(checkQuery, [addressId, userId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Không tìm thấy địa chỉ hoặc bạn không có quyền chỉnh sửa');
      }

      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = ['label', 'full_address', 'recipient_name', 'phone', 'is_default'];
      
      for (const field of allowedFields) {
        if (addressData[field] !== undefined) {
          fields.push(`${field} = $${paramCount}`);
          values.push(addressData[field]);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('Không có thông tin nào để cập nhật');
      }

      // Nếu set làm mặc định, bỏ default của các địa chỉ khác
      if (addressData.is_default === true) {
        await client.query(
          'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND id != $2',
          [userId, addressId]
        );
      }

      fields.push('updated_at = NOW()');
      values.push(addressId, userId);

      const updateQuery = `
        UPDATE user_addresses 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Xóa địa chỉ
  static async deleteAddress(addressId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Kiểm tra xem có phải địa chỉ mặc định không
      const checkQuery = 'SELECT is_default FROM user_addresses WHERE id = $1 AND user_id = $2';
      const checkResult = await client.query(checkQuery, [addressId, userId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Không tìm thấy địa chỉ');
      }

      const wasDefault = checkResult.rows[0].is_default;

      // Xóa địa chỉ
      const deleteQuery = 'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING *';
      const result = await client.query(deleteQuery, [addressId, userId]);

      // Nếu xóa địa chỉ mặc định, set địa chỉ khác làm mặc định
      if (wasDefault) {
        await client.query(
          `UPDATE user_addresses 
           SET is_default = true 
           WHERE user_id = $1 
           AND id = (
             SELECT id FROM user_addresses 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 1
           )`,
          [userId]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Set địa chỉ làm mặc định
  static async setDefaultAddress(addressId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Kiểm tra quyền sở hữu
      const checkQuery = 'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2';
      const checkResult = await client.query(checkQuery, [addressId, userId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Không tìm thấy địa chỉ');
      }

      // Bỏ default của tất cả địa chỉ
      await client.query(
        'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
        [userId]
      );

      // Set địa chỉ này làm mặc định
      const updateQuery = `
        UPDATE user_addresses 
        SET is_default = true, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      const result = await client.query(updateQuery, [addressId, userId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = AddressService;
