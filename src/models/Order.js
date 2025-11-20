// Model: Chỉ định nghĩa structure của Order và OrderItems tables

const OrderSchema = {
  tableName: 'orders',
  columns: {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: 'uuid_generate_v4()',
      comment: 'UUID v4 primary key'
    },
    user_id: {
      type: 'UUID',
      notNull: true,
      references: {
        table: 'users',
        column: 'id',
        onDelete: 'CASCADE'
      }
    },
    total_amount: {
      type: 'DECIMAL(10, 2)',
      notNull: true,
      check: 'total_amount >= 0',
      comment: 'Tổng giá trị đơn hàng (VNĐ)'
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')",
      comment: 'Trạng thái đơn hàng'
    },
    payment_method: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'wallet',
      comment: 'Phương thức thanh toán'
    },
    created_at: {
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP'
    },
    updated_at: {
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP'
    }
  },
  indexes: [
    { columns: ['user_id'] },
    { columns: ['status'] },
    { columns: ['created_at'] }
  ]
};

const OrderItemSchema = {
  tableName: 'order_items',
  columns: {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: 'uuid_generate_v4()',
      comment: 'UUID v4 primary key'
    },
    order_id: {
      type: 'UUID',
      notNull: true,
      references: {
        table: 'orders',
        column: 'id',
        onDelete: 'CASCADE'
      }
    },
    product_id: {
      type: 'UUID',
      notNull: true,
      references: {
        table: 'products',
        column: 'id'
      }
    },
    quantity: {
      type: 'INTEGER',
      notNull: true,
      check: 'quantity > 0',
      comment: 'Số lượng mua'
    },
    price: {
      type: 'DECIMAL(10, 2)',
      notNull: true,
      check: 'price >= 0',
      comment: 'Giá tại thời điểm mua (VNĐ)'
    },
    subtotal: {
      type: 'DECIMAL(10, 2)',
      notNull: true,
      check: 'subtotal >= 0',
      comment: 'Thành tiền (quantity * price)'
    },
    created_at: {
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP'
    }
  },
  indexes: [
    { columns: ['order_id'] },
    { columns: ['product_id'] }
  ]
};

module.exports = {
  OrderSchema,
  OrderItemSchema
};

class Order {
  // Tạo đơn hàng mới từ giỏ hàng
  static async create(userId, orderData = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { payment_method = 'wallet' } = orderData;

      // Lấy items từ giỏ hàng
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

      // Tính tổng tiền (VNĐ)
      let totalAmount = 0;
      for (const item of cartItems.rows) {
        // Kiểm tra tồn kho
        if (item.stock < item.quantity) {
          throw new Error(`Sản phẩm "${item.name}" không đủ hàng. Còn lại: ${item.stock}`);
        }
        totalAmount += item.price * item.quantity;
      }

      // Tạo đơn hàng
      const orderQuery = `
        INSERT INTO orders (user_id, total_amount, payment_method, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING *
      `;
      const order = await client.query(orderQuery, [userId, totalAmount, payment_method]);

      // Thêm items vào đơn hàng
      for (const item of cartItems.rows) {
        const subtotal = item.price * item.quantity;
        const orderItemQuery = `
          INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(orderItemQuery, [
          order.rows[0].id,
          item.product_id,
          item.quantity,
          item.price,
          subtotal
        ]);

        // Giảm tồn kho
        const updateStockQuery = `
          UPDATE products 
          SET stock = stock - $1
          WHERE id = $2
        `;
        await client.query(updateStockQuery, [item.quantity, item.product_id]);
      }

      // Xóa giỏ hàng
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      await client.query('COMMIT');
      return order.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Lấy đơn hàng theo ID (có items)
  static async findById(orderId) {
    const orderQuery = `
      SELECT o.*, u.username, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;
    const order = await pool.query(orderQuery, [orderId]);

    if (!order.rows[0]) {
      return null;
    }

    // Lấy items của đơn hàng
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

  // Lấy tất cả đơn hàng của user
  static async findByUserId(userId, options = {}) {
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
    return result.rows;
  }

  // Lấy tất cả đơn hàng (admin)
  static async findAll(options = {}) {
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
    return result.rows;
  }

  // Cập nhật trạng thái đơn hàng
  static async updateStatus(orderId, status) {
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

  // Thanh toán đơn hàng bằng ví
  static async payWithWallet(orderId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lấy thông tin đơn hàng
      const orderQuery = 'SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE';
      const order = await client.query(orderQuery, [orderId, userId]);

      if (!order.rows[0]) {
        throw new Error('Không tìm thấy đơn hàng');
      }

      if (order.rows[0].status !== 'pending') {
        throw new Error(`Đơn hàng đã ${order.rows[0].status}, không thể thanh toán`);
      }

      // Lấy thông tin ví
      const walletQuery = 'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE';
      const wallet = await client.query(walletQuery, [userId]);

      if (!wallet.rows[0]) {
        throw new Error('Không tìm thấy ví');
      }

      const balance = parseFloat(wallet.rows[0].balance);
      const totalAmount = parseFloat(order.rows[0].total_amount);

      if (balance < totalAmount) {
        throw new Error(
          `Số dư không đủ. Cần: ${totalAmount.toLocaleString('vi-VN')} VNĐ, ` +
          `Hiện có: ${balance.toLocaleString('vi-VN')} VNĐ`
        );
      }

      // Trừ tiền từ ví
      const newBalance = balance - totalAmount;
      const updateWalletQuery = `
        UPDATE wallets 
        SET balance = $1, updated_at = NOW()
        WHERE user_id = $2
      `;
      await client.query(updateWalletQuery, [newBalance, userId]);

      // Lưu lịch sử giao dịch
      const transactionQuery = `
        INSERT INTO wallet_transactions (wallet_id, amount, type, description)
        VALUES ($1, $2, 'debit', $3)
      `;
      await client.query(transactionQuery, [
        wallet.rows[0].id,
        totalAmount,
        `Thanh toán đơn hàng #${orderId}: -${totalAmount.toLocaleString('vi-VN')} VNĐ`
      ]);

      // Cập nhật trạng thái đơn hàng
      const updateOrderQuery = `
        UPDATE orders 
        SET status = 'paid', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const updatedOrder = await client.query(updateOrderQuery, [orderId]);

      await client.query('COMMIT');
      return updatedOrder.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Hủy đơn hàng (hoàn lại kho và tiền nếu đã thanh toán)
  static async cancel(orderId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lấy thông tin đơn hàng
      const orderQuery = 'SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE';
      const order = await client.query(orderQuery, [orderId, userId]);

      if (!order.rows[0]) {
        throw new Error('Không tìm thấy đơn hàng');
      }

      if (['delivered', 'cancelled'].includes(order.rows[0].status)) {
        throw new Error(`Không thể hủy đơn hàng đã ${order.rows[0].status}`);
      }

      // Lấy items để hoàn lại kho
      const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';
      const items = await client.query(itemsQuery, [orderId]);

      // Hoàn lại tồn kho
      for (const item of items.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Nếu đã thanh toán, hoàn tiền
      if (order.rows[0].status === 'paid') {
        const totalAmount = parseFloat(order.rows[0].total_amount);
        
        const walletQuery = 'SELECT * FROM wallets WHERE user_id = $1';
        const wallet = await client.query(walletQuery, [userId]);

        if (wallet.rows[0]) {
          // Hoàn tiền vào ví
          await client.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
            [totalAmount, userId]
          );

          // Lưu lịch sử
          await client.query(
            `INSERT INTO wallet_transactions (wallet_id, amount, type, description)
             VALUES ($1, $2, 'credit', $3)`,
            [
              wallet.rows[0].id,
              totalAmount,
              `Hoàn tiền đơn hàng #${orderId}: +${totalAmount.toLocaleString('vi-VN')} VNĐ`
            ]
          );
        }
      }

      // Cập nhật trạng thái
      const updateQuery = `
        UPDATE orders 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query(updateQuery, [orderId]);

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

module.exports = Order;
