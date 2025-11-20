// Model: Chỉ định nghĩa structure của Wallet table và Wallet Transactions

const WalletSchema = {
  tableName: 'wallets',
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
      unique: true,
      references: {
        table: 'users',
        column: 'id',
        onDelete: 'CASCADE'
      }
    },
    balance: {
      type: 'DECIMAL(10, 2)',
      notNull: true,
      default: 0.00,
      check: 'balance >= 0',
      comment: 'Số dư ví (VNĐ)'
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
    { columns: ['user_id'], unique: true }
  ]
};

const WalletTransactionSchema = {
  tableName: 'wallet_transactions',
  columns: {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: 'uuid_generate_v4()',
      comment: 'UUID v4 primary key'
    },
    wallet_id: {
      type: 'UUID',
      notNull: true,
      references: {
        table: 'wallets',
        column: 'id',
        onDelete: 'CASCADE'
      }
    },
    amount: {
      type: 'DECIMAL(10, 2)',
      notNull: true,
      check: 'amount > 0',
      comment: 'Số tiền giao dịch (VNĐ)'
    },
    type: {
      type: 'VARCHAR(20)',
      notNull: true,
      check: "type IN ('credit', 'debit')",
      comment: 'credit = nạp tiền, debit = trừ tiền'
    },
    description: {
      type: 'TEXT',
      comment: 'Mô tả giao dịch'
    },
    created_at: {
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP'
    }
  },
  indexes: [
    { columns: ['wallet_id'] },
    { columns: ['created_at'] }
  ]
};

module.exports = {
  WalletSchema,
  WalletTransactionSchema
};
