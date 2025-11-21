const AddressService = require('../services/AddressService');

class AddressController {
  // Lấy tất cả địa chỉ của user hiện tại
  static async getMyAddresses(req, res, next) {
    try {
      const userId = req.user.id;
      const addresses = await AddressService.getUserAddresses(userId);

      res.json({
        success: true,
        data: addresses
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy địa chỉ mặc định
  static async getDefaultAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const address = await AddressService.getDefaultAddress(userId);

      res.json({
        success: true,
        data: address
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy một địa chỉ theo ID
  static async getAddressById(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const address = await AddressService.getAddressById(id, userId);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy địa chỉ'
        });
      }

      res.json({
        success: true,
        data: address
      });
    } catch (error) {
      next(error);
    }
  }

  // Tạo địa chỉ mới
  static async createAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const addressData = req.body;

      // Validate required fields
      if (!addressData.full_address || !addressData.phone) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp địa chỉ và số điện thoại'
        });
      }

      const address = await AddressService.createAddress(userId, addressData);

      res.status(201).json({
        success: true,
        message: 'Tạo địa chỉ thành công',
        data: address
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật địa chỉ
  static async updateAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const addressData = req.body;

      const address = await AddressService.updateAddress(id, userId, addressData);

      res.json({
        success: true,
        message: 'Cập nhật địa chỉ thành công',
        data: address
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa địa chỉ
  static async deleteAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await AddressService.deleteAddress(id, userId);

      res.json({
        success: true,
        message: 'Xóa địa chỉ thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // Set địa chỉ làm mặc định
  static async setDefaultAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const address = await AddressService.setDefaultAddress(id, userId);

      res.json({
        success: true,
        message: 'Đã đặt làm địa chỉ mặc định',
        data: address
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AddressController;
