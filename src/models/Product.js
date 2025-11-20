// Model: Chỉ định nghĩa structure của Product table

const ProductSchema = {
  tableName: 'products',
  columns: {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: 'uuid_generate_v4()',
      comment: 'UUID v4 primary key'
    },
    category: {
      type: 'VARCHAR(100)',
      notNull: true,
      comment: 'Danh mục sản phẩm'
    },
    name: {
      type: 'VARCHAR(200)',
      notNull: true,
      comment: 'Tên sản phẩm'
    },
    product_code: {
      type: 'VARCHAR(50)',
      notNull: true,
      unique: true,
      comment: 'Mã sản phẩm'
    },
    description: {
      type: 'TEXT',
      comment: 'Đặc điểm kỹ thuật'
    },
    unit: {
      type: 'VARCHAR(50)',
      default: "'Cây'",
      comment: 'Đơn vị tính'
    },
    price: {
      type: 'DECIMAL(10, 2)',
      notNull: true,
      check: 'price >= 0',
      comment: 'Giá bán (VNĐ)'
    },
    stock: {
      type: 'INTEGER',
      notNull: true,
      default: 0,
      check: 'stock >= 0',
      comment: 'Số lượng tồn kho'
    },
    image_url: {
      type: 'VARCHAR(500)',
      comment: 'Đường dẫn ảnh sản phẩm'
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
    { columns: ['category'] },
    { columns: ['product_code'] },
    { columns: ['price'] },
    { columns: ['created_at'] }
  ]
};

module.exports = ProductSchema;
