const UserService = require('../services/UserService');
const jwt = require('jsonwebtoken');
const { sendResetPasswordEmail } = require('../config/email');

class AuthController {
  // Đăng ký user mới (Customer only - không cho đăng ký Admin)
  static async register(req, res, next) {
    try {
      const { username, email, password } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin: username, email, password'
        });
      }

      // Kiểm tra user đã tồn tại
      const existingUser = await UserService.checkUserExists(email, username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email hoặc username đã được sử dụng'
        });
      }

      // Tạo user mới - mặc định role là 'customer'
      const user = await UserService.createUser({ 
        username, 
        email, 
        password, 
        role: 'customer' // Force customer role cho đăng ký public
      });

      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // Đăng nhập
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp email và password'
        });
      }

      // Tìm user
      const user = await UserService.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc password không đúng'
        });
      }

      // Verify password
      const isValidPassword = await UserService.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc password không đúng'
        });
      }

      // Tạo JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thông tin user hiện tại
  static async getCurrentUser(req, res, next) {
    try {
      const user = await UserService.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin user'
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

  // Logout (client-side xử lý xóa token, endpoint này để tracking nếu cần)
  static async logout(req, res, next) {
    try {
      // Trong JWT stateless, logout thường xử lý ở client (xóa token)
      // Có thể thêm blacklist token nếu cần
      res.json({
        success: true,
        message: 'Đăng xuất thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // Forgot password - gửi reset token
  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp email'
        });
      }

      console.log('🔍 Forgot password request for email:', email);
      
      const { user, resetToken } = await UserService.createPasswordResetToken(email);
      console.log('✅ Reset token created for user:', user.username);

      const emailResult = await sendResetPasswordEmail(user.email, resetToken, user.username);
      console.log('📧 Email send result:', emailResult);
      
      res.json({
        success: true,
        message: 'Link reset password đã được gửi đến email',
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.json({
        success: true,
        message: 'Nếu email tồn tại, link reset password đã được gửi'
      });
    }
  }

  // Reset password với token
  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp token và password mới'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password phải có ít nhất 6 ký tự'
        });
      }

      await UserService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: 'Đổi password thành công'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
