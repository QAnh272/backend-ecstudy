const UserService = require('../services/UserService');

class UserController {
  // Lấy danh sách tất cả users (Admin only)
  static async getAllUsers(req, res, next) {
    try {
      const { role, limit, offset } = req.query;

      const options = {
        role,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      const users = await UserService.getAllUsers(options);

      res.json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy user theo ID (Admin only)
  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;

      const user = await UserService.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy user'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // Cấp quyền admin cho user (Admin only)
  static async promoteToAdmin(req, res, next) {
    try {
      const { id } = req.params;

      const user = await UserService.promoteToAdmin(id);

      res.json({
        success: true,
        message: `Đã cấp quyền admin cho user ${user.username}`,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // Thu hồi quyền admin (Admin only)
  static async revokeAdmin(req, res, next) {
    try {
      const { id } = req.params;

      const user = await UserService.revokeAdmin(id);

      res.json({
        success: true,
        message: `Đã thu hồi quyền admin của user ${user.username}`,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật thông tin user (User tự cập nhật hoặc Admin)
  static async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Nếu không phải admin, chỉ được update chính mình
      if (req.user.role !== 'admin' && req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật thông tin user khác'
        });
      }

      // Nếu không phải admin, không cho phép thay đổi role
      if (req.user.role !== 'admin' && updateData.role) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thay đổi vai trò'
        });
      }

      const user = await UserService.updateUser(id, updateData);

      res.json({
        success: true,
        message: 'Cập nhật thông tin thành công',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa user (Admin only)
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      // Không cho xóa chính mình
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa chính mình'
        });
      }

      await UserService.deleteUser(id);

      res.json({
        success: true,
        message: 'Xóa user thành công'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
