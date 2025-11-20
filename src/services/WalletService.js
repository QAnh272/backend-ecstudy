const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class WalletService {
  // Tạo ví cho user mới (số dư ban đầu = 0 VNĐ)
  static async createWallet(userId, initialBalance = 0) {
    const walletId = uuidv4();
    const query = `
      INSERT INTO wallets (id, user_id, balance)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [walletId, userId, initialBalance]);
    return result.rows[0];
  }

  // Lấy thông tin ví theo user ID
  static async getWallet(userId) {
    const query = 'SELECT * FROM wallets WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  // Kiểm tra số dư ví (VNĐ)
  static async checkBalance(userId) {
    const query = 'SELECT balance FROM wallets WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0]?.balance || 0;
  }

  // Nạp tiền vào ví (credit)
  static async deposit(userId, amount, description = null) {
    if (amount <= 0) {
      throw new Error('Số tiền phải lớn hơn 0');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lấy thông tin ví và lock row
      const walletQuery = 'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE';
      const wallet = await client.query(walletQuery, [userId]);

      if (!wallet.rows[0]) {
        throw new Error('Không tìm thấy ví');
      }

      const currentBalance = parseFloat(wallet.rows[0].balance);
      const newBalance = currentBalance + parseFloat(amount);

      // Cập nhật số dư
      const updateQuery = `
        UPDATE wallets 
        SET balance = $1, updated_at = NOW()
        WHERE user_id = $2
        RETURNING *
      `;
      const result = await client.query(updateQuery, [newBalance, userId]);

      // Lưu lịch sử giao dịch
      const transactionId = uuidv4();
      const transactionQuery = `
        INSERT INTO wallet_transactions (id, wallet_id, amount, type, description)
        VALUES ($1, $2, $3, 'credit', $4)
        RETURNING *
      `;
      await client.query(transactionQuery, [
        transactionId,
        wallet.rows[0].id,
        amount,
        description || `Nạp tiền: +${parseFloat(amount).toLocaleString('vi-VN')} VNĐ`
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

  // Trừ tiền từ ví (debit)
  static async withdraw(userId, amount, description = null) {
    if (amount <= 0) {
      throw new Error('Số tiền phải lớn hơn 0');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lấy thông tin ví và lock row
      const walletQuery = 'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE';
      const wallet = await client.query(walletQuery, [userId]);

      if (!wallet.rows[0]) {
        throw new Error('Không tìm thấy ví');
      }

      const currentBalance = parseFloat(wallet.rows[0].balance);
      const withdrawAmount = parseFloat(amount);

      if (currentBalance < withdrawAmount) {
        throw new Error(
          `Số dư không đủ. Hiện tại: ${currentBalance.toLocaleString('vi-VN')} VNĐ, ` +
          `Cần: ${withdrawAmount.toLocaleString('vi-VN')} VNĐ`
        );
      }

      const newBalance = currentBalance - withdrawAmount;

      // Cập nhật số dư
      const updateQuery = `
        UPDATE wallets 
        SET balance = $1, updated_at = NOW()
        WHERE user_id = $2
        RETURNING *
      `;
      const result = await client.query(updateQuery, [newBalance, userId]);

      // Lưu lịch sử giao dịch
      const transactionId = uuidv4();
      const transactionQuery = `
        INSERT INTO wallet_transactions (id, wallet_id, amount, type, description)
        VALUES ($1, $2, $3, 'debit', $4)
        RETURNING *
      `;
      await client.query(transactionQuery, [
        transactionId,
        wallet.rows[0].id,
        withdrawAmount,
        description || `Thanh toán: -${withdrawAmount.toLocaleString('vi-VN')} VNĐ`
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

  // Lấy lịch sử giao dịch
  static async getTransactionHistory(userId, options = {}) {
    const { limit = 50, offset = 0, type } = options;
    
    let query = `
      SELECT wt.* 
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      WHERE w.user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 2;

    if (type && ['credit', 'debit'].includes(type)) {
      query += ` AND wt.type = $${paramCount}`;
      values.push(type);
      paramCount++;
    }

    query += ` ORDER BY wt.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Kiểm tra xem có đủ tiền không
  static async hasEnoughBalance(userId, amount) {
    const balance = await this.checkBalance(userId);
    return balance >= amount;
  }
}

module.exports = WalletService;
