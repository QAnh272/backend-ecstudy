// Model: Chễ định nghĩa structure của User table
// Không chứa business logic hay queries

const UserSchema = {
  tableName: 'users',
  columns: {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: 'uuid_generate_v4()',
      comment: 'UUID v4 primary key'
    },
    username: {
      type: 'VARCHAR(50)',
      notNull: true,
      unique: true
    },
    email: {
      type: 'VARCHAR(100)',
      notNull: true,
      unique: true
    },
    password: {
      type: 'VARCHAR(255)',
      notNull: true
    },
    role: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'customer',
      check: "role IN ('admin', 'customer')"
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
    { columns: ['email'], unique: true },
    { columns: ['username'], unique: true }
  ]
};

module.exports = UserSchema;
