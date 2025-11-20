// Model: Chỉ định nghĩa structure của Comment table

const CommentSchema = {
  tableName: 'comments',
  columns: {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: 'uuid_generate_v4()',
      comment: 'UUID v4 primary key'
    },
    product_id: {
      type: 'UUID',
      notNull: true,
      references: {
        table: 'products',
        column: 'id',
        onDelete: 'CASCADE'
      },
      comment: 'Sản phẩm được đánh giá'
    },
    user_id: {
      type: 'UUID',
      notNull: true,
      references: {
        table: 'users',
        column: 'id',
        onDelete: 'CASCADE'
      },
      comment: 'Khách hàng đánh giá'
    },
    content: {
      type: 'TEXT',
      notNull: true,
      comment: 'Nội dung bình luận'
    },
    rating: {
      type: 'INTEGER',
      check: 'rating >= 1 AND rating <= 5',
      comment: 'Đánh giá sao (1-5)'
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
    { columns: ['product_id'] },
    { columns: ['user_id'] },
    { columns: ['rating'] }
  ]
};

module.exports = CommentSchema;
