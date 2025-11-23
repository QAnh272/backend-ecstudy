/**
 * Script seed data products vào database
 * Tự động chạy khi deploy lên Render
 */

const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

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

// Hàm tạo product_code từ tên sản phẩm
function generateProductCode(name, category) {
  // Lấy 3 chữ cái đầu của category
  const categoryCode = category.substring(0, 3).toUpperCase();
  // Lấy 3 chữ cái đầu của từ đầu tiên trong tên
  const nameCode = name.split(' ')[0].substring(0, 3).toUpperCase();
  // Thêm số ngẫu nhiên
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${categoryCode}-${nameCode}${randomNum}`;
}

// Hàm tìm ảnh phù hợp
function findImageForProduct(productName, productCode, category) {
  const folder = categoryFolders[category];
  
  if (!folder) {
    return null;
  }
  
  const uploadPath = path.join(__dirname, '../../uploads', folder);
  
  if (!fs.existsSync(uploadPath)) {
    console.log(`⚠️  Folder không tồn tại: ${uploadPath}`);
    return null;
  }
  
  const files = fs.readdirSync(uploadPath);
  
  if (files.length === 0) {
    return null;
  }
  
  // Thử tìm theo product_code
  const codeNormalized = productCode.replace(/[\s\-_\/]/g, '').toLowerCase();
  let matchedFile = files.find(file => {
    const fileNameWithoutExt = file.replace(/\.[^/.]+$/, '');
    const fileName = fileNameWithoutExt.replace(/[\s\-_\/]/g, '').toLowerCase();
    return fileName === codeNormalized || fileName.includes(codeNormalized) || codeNormalized.includes(fileName);
  });
  
  // Nếu không tìm thấy, lấy file đầu tiên
  if (!matchedFile && files.length > 0) {
    matchedFile = files[0];
  }
  
  if (matchedFile) {
    return `/uploads/${folder}/${matchedFile}`;
  }
  
  return null;
}

async function seedProducts() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Bắt đầu seed products...\n');
    
    await client.query('BEGIN');
    
    // Đọc file CSV
    const csvPath = path.join(__dirname, '../../products.csv');
    
    if (!fs.existsSync(csvPath)) {
        // console.log('⚠️  File products.csv không tồn tại');
      await client.query('ROLLBACK');
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const record of records) {
      const { name, description, price, stock, category, product_code, unit } = record;
      
      // Validate required fields
      if (!name || !price || !category) {
          // console.log(`⚠️  Bỏ qua sản phẩm thiếu thông tin: ${name || 'Unknown'}`);
        skipped++;
        continue;
      }
      
      // Tạo product_code nếu chưa có
      const finalProductCode = product_code || generateProductCode(name, category);
      
      // Tìm ảnh phù hợp
      const imageUrl = findImageForProduct(name, finalProductCode, category);
      
      // Parse giá (loại bỏ dấu phẩy nếu có)
      const parsedPrice = parseFloat(price.toString().replace(/,/g, ''));
      const parsedStock = parseInt(stock) || 0;
      
      // Kiểm tra sản phẩm đã tồn tại chưa
      const existingProduct = await client.query(
        'SELECT id FROM products WHERE product_code = $1',
        [finalProductCode]
      );
      
      if (existingProduct.rows.length > 0) {
        // Update sản phẩm đã tồn tại
        await client.query(
          `UPDATE products 
           SET name = $1, description = $2, price = $3, stock = $4, 
               category = $5, unit = $6, image_url = $7, updated_at = NOW()
           WHERE product_code = $8`,
          [name, description, parsedPrice, parsedStock, category, unit || 'Cây', imageUrl, finalProductCode]
        );
        console.log(`🔄 Đã cập nhật: ${name} (${finalProductCode})`);
        updated++;
      } else {
        // Insert sản phẩm mới
        await client.query(
          `INSERT INTO products (category, name, product_code, description, unit, price, stock, image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [category, name, finalProductCode, description, unit || 'Cây', parsedPrice, parsedStock, imageUrl]
        );
        console.log(`✅ Đã thêm: ${name} (${finalProductCode})`);
        if (imageUrl) {
          console.log(`   📸 Image: ${imageUrl}`);
        }
        inserted++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 KẾT QUẢ SEED DATA:');
    console.log('='.repeat(70));
    console.log(`✅ Đã thêm mới:     ${inserted} sản phẩm`);
    console.log(`🔄 Đã cập nhật:     ${updated} sản phẩm`);
    console.log(`⏭️  Đã bỏ qua:      ${skipped} sản phẩm`);
    console.log(`📦 Tổng số:         ${records.length} sản phẩm`);
    console.log('='.repeat(70));
    
    console.log('\n✅ Seed products thành công!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ LỖI khi seed products:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  seedProducts()
    .then(() => {
      console.log('\n✅ Hoàn tất!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Lỗi:', error);
      process.exit(1);
    });
}

module.exports = { seedProducts };
