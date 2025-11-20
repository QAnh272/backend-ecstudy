const ProductService = require('../services/ProductService');

class ProductController {
  // Lấy tất cả sản phẩm
  static async getAllProducts(req, res, next) {
    try {
      const { category, minPrice, maxPrice, inStock, limit, offset } = req.query;

      const options = {
        category,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        inStock: inStock === 'true',
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      const products = await ProductService.getAllProducts(options);

      res.json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy sản phẩm theo ID
  static async getProductById(req, res, next) {
    try {
      const { id } = req.params;

      const product = await ProductService.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  // Tìm kiếm sản phẩm
  static async searchProducts(req, res, next) {
    try {
      const { q, limit, offset } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp từ khóa tìm kiếm (q)'
        });
      }

      const options = {
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0
      };

      const products = await ProductService.searchProducts(q, options);

      res.json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (error) {
      next(error);
    }
  }

  // Tạo sản phẩm mới (Admin only)
  static async createProduct(req, res, next) {
    try {
      const { category, name, product_code, description, unit, price, stock, image_url } = req.body;

      // Validation
      if (!category || !name || !product_code || !price) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ: danh mục, tên, mã sản phẩm và giá'
        });
      }

      const product = await ProductService.createProduct({
        category,
        name,
        product_code,
        description,
        unit: unit || 'Cây',
        price,
        stock: stock || 0,
        image_url
      });

      res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm thành công',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật sản phẩm (Admin only)
  static async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const product = await ProductService.updateProduct(id, updateData);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật sản phẩm thành công',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa sản phẩm (Admin only)
  static async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;

      const product = await ProductService.deleteProduct(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
      }

      res.json({
        success: true,
        message: 'Xóa sản phẩm thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách categories
  static async getCategories(req, res, next) {
    try {
      const categories = await ProductService.getCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;
