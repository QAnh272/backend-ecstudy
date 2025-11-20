// Model: Chỉ định nghĩa structure của Cart (cart_items) table

const CartSchema = {
  tableName: 'cart_items',
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
    product_id: {
      type: 'UUID',
      notNull: true,
      references: {
        table: 'products',
        column: 'id',
        onDelete: 'CASCADE'
      }
    },
    quantity: {
      type: 'INTEGER',
      notNull: true,
      default: 1,
      check: 'quantity > 0',
      comment: 'Số lượng sản phẩm trong giỏ'
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
  constraints: [
    { type: 'UNIQUE', columns: ['user_id', 'product_id'] }
  ],
  indexes: [
    { columns: ['user_id'] },
    { columns: ['product_id'] }
  ]
};

module.exports = CartSchema;
