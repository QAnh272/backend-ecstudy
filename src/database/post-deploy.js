/**
 * Script post-deploy để chạy sau khi deploy lên Render
 * Tự động chạy migrations và seed data
 */

const { seedProducts } = require('./seed-products');

async function postDeploy() {
  try {
    // Chỉ giữ lại log thành công và log lỗi chính
    await seedProducts();
    console.log('✅ POST-DEPLOY HOÀN TẤT!');
    
  } catch (error) {
    console.error('\n❌ LỖI POST-DEPLOY:', error);
    process.exit(1);
  }
}

// Chạy script
postDeploy();
