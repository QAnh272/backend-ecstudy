const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 5000, // 5 giây
  greetingTimeout: 5000,
  socketTimeout: 5000
});

const sendResetPasswordEmail = async (email, resetToken, username) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://ecstudy.vercel.app';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  const mailOptions = {
    from: `"EC Study" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Đặt lại mật khẩu - EC Study',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1e40af; text-align: center; margin-bottom: 20px;">Đặt lại mật khẩu</h2>
          
          <p style="color: #333; font-size: 16px;">Xin chào <strong>${username}</strong>,</p>
          
          <p style="color: #666; line-height: 1.6;">
            Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. 
            Nhấp vào nút bên dưới để đặt lại mật khẩu:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #1e40af; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Đặt lại mật khẩu
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Hoặc copy link sau vào trình duyệt:
          </p>
          <p style="color: #1e40af; word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
            ${resetUrl}
          </p>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <strong>Lưu ý:</strong> Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, 
            vui lòng bỏ qua email này.
          </p>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 20px;">
            © ${new Date().getFullYear()} EC Study. All rights reserved.
          </p>
        </div>
      </div>
    `
  };

  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email not configured. EMAIL_USER or EMAIL_PASS is missing.');
    // Return success để không block user, nhưng log warning
    return { success: true, messageId: 'email-not-configured', warning: 'Email credentials not configured' };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // ...existing code...
    throw new Error(`Không thể gửi email: ${error.message}`);
  }
};

module.exports = {
  sendResetPasswordEmail
};
