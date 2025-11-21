/**
 * Script để cập nhật image_url cho các sản phẩm trong database
 * Tự động map tên file với product_code
 */

const pool = require('./src/config/database');
const fs = require('fs');
const path = require('path');

// Mapping category sang folder
const categoryFolders = {
  'Bút': 'pen',
  'Bút bi': 'pen',
  'Sách vở': 'book',
  'Tập vở': 'book',
  'Bút chì': 'pencil',
  'Thước kẻ': 'ruler',
  'Thước': 'ruler',
  'Tẩy': 'eraser',
  'Gôm tẩy': 'eraser',
  'Bút màu': 'crayon',
  'Máy tính': 'computer'
};

async function updateProductImages() {
  try {
    console.log('===== BẮT ĐẦU CẬP NHẬT HÌNH ẢNH SẢN PHẨM =====\n');
    
    // Lấy tất cả sản phẩm
    const result = await pool.query('SELECT id, name, category, product_code, image_url FROM products ORDER BY category, name');
    const products = result.rows;
    
    console.log(`📦 Tìm thấy ${products.length} sản phẩm trong database\n`);
    
    let updated = 0;
    let notFound = 0;
    let skipped = 0;
    
    for (const product of products) {
      const folder = categoryFolders[product.category];
      
      if (!folder) {
        console.log(`⚠️  Không tìm thấy folder cho category: ${product.category} (${product.name})`);
        notFound++;
        continue;
      }
      
      const uploadPath = path.join(__dirname, 'uploads', folder);
      
      if (!fs.existsSync(uploadPath)) {
        console.log(`⚠️  Folder không tồn tại: ${uploadPath}`);
        notFound++;
        continue;
      }
      
      // Lấy danh sách file trong folder
      const files = fs.readdirSync(uploadPath);
      
      // Tìm file khớp với product_code
      // Loại bỏ tất cả ký tự đặc biệt và khoảng trắng để so sánh
      const productCode = product.product_code.replace(/[\s\-_\/]/g, '').toLowerCase();
      
      let matchedFile = null;
      
      // Thử tìm file có tên chứa product_code (bỏ qua ký tự đặc biệt)
      matchedFile = files.find(file => {
        const fileNameWithoutExt = file.replace(/\.[^/.]+$/, ''); // Bỏ extension
        const fileName = fileNameWithoutExt.replace(/[\s\-_\/]/g, '').toLowerCase();
        return fileName === productCode || fileName.includes(productCode) || productCode.includes(fileName);
      });
      
      if (matchedFile) {
        const newImageUrl = `/products/images/${folder}/${matchedFile}`;
        
        // Kiểm tra nếu đã có image_url giống rồi thì skip
        if (product.image_url === newImageUrl) {
          skipped++;
          continue;
        }
        
        // Update database
        await pool.query(
          'UPDATE products SET image_url = $1 WHERE id = $2',
          [newImageUrl, product.id]
        );
        
        console.log(`✅ ${product.name} (${product.product_code})`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Image: ${newImageUrl}\n`);
        updated++;
      } else {
        console.log(`❌ Không tìm thấy ảnh cho: ${product.name} (${product.product_code})`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Folder: ${folder} (${files.length} files)\n`);
        notFound++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 KẾT QUẢ CẬP NHẬT:');
    console.log('='.repeat(70));
    console.log(`✅ Đã cập nhật:     ${updated} sản phẩm`);
    console.log(`⏭️  Đã có ảnh:       ${skipped} sản phẩm`);
    console.log(`❌ Không tìm thấy:  ${notFound} sản phẩm`);
    console.log(`📦 Tổng số:         ${products.length} sản phẩm`);
    console.log('='.repeat(70));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ LỖI:', error);
    process.exit(1);
  }
}

// Chạy script
console.log('\n🚀 Script cập nhật hình ảnh sản phẩm');
console.log('=' .repeat(70));
updateProductImages();
