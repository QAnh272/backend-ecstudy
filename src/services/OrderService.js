const pool = require('../config/database');
const CartService = require('./CartService');
const WalletService = require('./WalletService');
const { v4: uuidv4 } = require('uuid');

class OrderService {
  static async createOrder(userId, orderData = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { 
        payment_method = 'wallet',
        shipping_address,
        phone_number
      } = orderData;

      const cartQuery = `
        SELECT ci.*, p.price, p.stock, p.name
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1
      `;
      const cartItems = await client.query(cartQuery, [userId]);

      if (cartItems.rows.length === 0) {
        throw new Error('Giỏ hàng trống');
      }

      let totalAmount = 0;
      for (const item of cartItems.rows) {
        if (item.stock < item.quantity) {
          throw new Error(`Sản phẩm "${item.name}" không đủ hàng. Còn lại: ${item.stock}`);
        }
        totalAmount += item.price * item.quantity;
      }

      if (payment_method === 'wallet') {
        const walletQuery = 'SELECT balance FROM wallets WHERE user_id = $1';
        const wallet = await client.query(walletQuery, [userId]);
        
        if (!wallet.rows[0] || wallet.rows[0].balance < totalAmount) {
          throw new Error('Số dư ví không đủ để thanh toán');
        }
      }

      const orderId = uuidv4();
      const orderQuery = `
        INSERT INTO orders (id, user_id, total_amount, payment_method, status, shipping_address, phone_number)
        VALUES ($1, $2, $3, $4, 'pending', $5, $6)
        RETURNING *
      `;
      const order = await client.query(orderQuery, [
        orderId, 
        userId, 
        totalAmount, 
        payment_method,
        shipping_address,
        phone_number
      ]);

      for (const item of cartItems.rows) {
        const subtotal = item.price * item.quantity;
        const orderItemId = uuidv4();
        const orderItemQuery = `
          INSERT INTO order_items (id, order_id, product_id, quantity, price, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await client.query(orderItemQuery, [
          orderItemId,
          order.rows[0].id,
          item.product_id,
          item.quantity,
          item.price,
          subtotal
        ]);

        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      if (payment_method === 'wallet') {
        const walletQuery = 'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE';
        const walletResult = await client.query(walletQuery, [userId]);
        
        if (!walletResult.rows[0]) {
          throw new Error('Không tìm thấy ví');
        }
        
        const wallet = walletResult.rows[0];
        const currentBalance = parseFloat(wallet.balance);
        const newBalance = currentBalance - totalAmount;
        
        if (newBalance < 0) {
          throw new Error('Số dư ví không đủ');
        }
        
        await client.query(
          'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2',
          [newBalance, userId]
        );
        
        const transactionId = uuidv4();
        await client.query(
          `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description)
           VALUES ($1, $2, $3, 'debit', $4)`,
          [transactionId, wallet.id, totalAmount, `Thanh toán đơn hàng #${orderId.slice(0, 8)}`]
        );
        
        await client.query(
          'UPDATE orders SET status = $1 WHERE id = $2',
          ['paid', orderId]
        );
      }

      await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      await client.query('COMMIT');
      
      const finalOrder = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      return finalOrder.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getOrderById(orderId, userId = null) {
    const orderQuery = `
      SELECT o.*, u.username, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1 ${userId ? 'AND o.user_id = $2' : ''}
    `;
    const params = userId ? [orderId, userId] : [orderId];
    const order = await pool.query(orderQuery, params);

    if (!order.rows[0]) {
      return null;
    }

    const itemsQuery = `
      SELECT oi.*, p.name, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
    const items = await pool.query(itemsQuery, [orderId]);

    return {
      ...order.rows[0],
      items: items.rows
    };
  }

  static async getUserOrders(userId, options = {}) {
    const { status, limit = 20, offset = 0 } = options;
    
    let query = `
      SELECT o.*, 
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      WHERE o.user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 2;

    if (status) {
      query += ` AND o.status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    
    const ordersWithItems = await Promise.all(
      result.rows.map(async (order) => {
        const itemsQuery = `
          SELECT oi.*, p.name as product_name
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
          ORDER BY oi.created_at ASC
        `;
        const itemsResult = await pool.query(itemsQuery, [order.id]);
        
        const userRatingQuery = `
          SELECT rating FROM order_ratings 
          WHERE order_id = $1 AND user_id = $2
        `;
        const userRatingResult = await pool.query(userRatingQuery, [order.id, userId]);
        
        const avgRatingQuery = `
          SELECT 
            AVG(rating)::NUMERIC(3,2) as average_rating,
            COUNT(*) as rating_count
          FROM order_ratings
          WHERE order_id = $1
        `;
        const avgRatingResult = await pool.query(avgRatingQuery, [order.id]);
        
        return {
          ...order,
          items: itemsResult.rows,
          user_rating: userRatingResult.rows[0]?.rating || null,
          average_rating: avgRatingResult.rows[0].average_rating ? parseFloat(avgRatingResult.rows[0].average_rating) : null,
          rating_count: parseInt(avgRatingResult.rows[0].rating_count)
        };
      })
    );
    
    return ordersWithItems;
  }

  static async getAllOrders(options = {}) {
    const { status, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT o.*, u.username, u.email,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 1;

    if (status) {
      query += ` AND o.status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    const ordersWithItems = await Promise.all(
      result.rows.map(async (order) => {
        const itemsQuery = `
          SELECT oi.*, p.name as product_name, p.image_url
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
          ORDER BY oi.created_at ASC
        `;
        const itemsResult = await pool.query(itemsQuery, [order.id]);
        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    return ordersWithItems;
  }

  static async updateOrderStatus(orderId, status) {
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Trạng thái không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(', ')}`);
    }

    const query = `
      UPDATE orders 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, orderId]);
    return result.rows[0];
  }

  static async payWithWallet(orderId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderQuery = 'SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE';
      const order = await client.query(orderQuery, [orderId, userId]);

      if (!order.rows[0]) {
        throw new Error('Không tìm thấy đơn hàng');
      }

      if (order.rows[0].status !== 'pending') {
        throw new Error(`Đơn hàng đã ${order.rows[0].status}, không thể thanh toán`);
      }

      const totalAmount = parseFloat(order.rows[0].total_amount);

      const walletQuery = 'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE';
      const wallet = await client.query(walletQuery, [userId]);

      if (!wallet.rows[0]) {
        throw new Error('Không tìm thấy ví');
      }

      const balance = parseFloat(wallet.rows[0].balance);

      if (balance < totalAmount) {
        throw new Error(
          `Số dư không đủ. Cần: ${totalAmount.toLocaleString('vi-VN')} VNĐ, ` +
          `Hiện có: ${balance.toLocaleString('vi-VN')} VNĐ`
        );
      }

      const newBalance = balance - totalAmount;
      await client.query(
        'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2',
        [newBalance, userId]
      );

      const transactionId = uuidv4();
      await client.query(
        `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description)
         VALUES ($1, $2, $3, 'debit', $4)`,
        [
          transactionId,
          wallet.rows[0].id,
          totalAmount,
          `Thanh toán đơn hàng #${orderId}: -${totalAmount.toLocaleString('vi-VN')} VNĐ`
        ]
      );

      const updatedOrder = await client.query(
        `UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [orderId]
      );

      await client.query('COMMIT');
      return updatedOrder.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async cancelOrder(orderId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderQuery = 'SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE';
      const order = await client.query(orderQuery, [orderId, userId]);

      if (!order.rows[0]) {
        throw new Error('Không tìm thấy đơn hàng');
      }

      if (['delivered', 'cancelled'].includes(order.rows[0].status)) {
        throw new Error(`Không thể hủy đơn hàng đã ${order.rows[0].status}`);
      }

      const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';
      const items = await client.query(itemsQuery, [orderId]);

      for (const item of items.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      if (order.rows[0].status === 'paid') {
        const totalAmount = parseFloat(order.rows[0].total_amount);
        
        const walletQuery = 'SELECT * FROM wallets WHERE user_id = $1';
        const wallet = await client.query(walletQuery, [userId]);

        if (wallet.rows[0]) {
          await client.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
            [totalAmount, userId]
          );

          const transactionId = uuidv4();
          await client.query(
            `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description)
             VALUES ($1, $2, $3, 'credit', $4)`,
            [
              transactionId,
              wallet.rows[0].id,
              totalAmount,
              `Hoàn tiền đơn hàng #${orderId}: +${totalAmount.toLocaleString('vi-VN')} VNĐ`
            ]
          );
        }
      }

      const result = await client.query(
        `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [orderId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getOrderStats(userId = null) {
    let query = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_revenue
      FROM orders
      ${userId ? 'WHERE user_id = $1' : ''}
      GROUP BY status
    `;
    
    const params = userId ? [userId] : [];
    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = OrderService;
