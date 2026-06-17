const nodemailer = require('nodemailer');

class OTPEmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    async sendOTP(email, otp) {
        const displayName = email.split('@')[0];
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Mã OTP xác thực đăng ký tài khoản - Ban Pick System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2e7d32;">Ban Pick System</h1>
                        <h2 style="color: #1976d2;">Xác thực đăng ký tài khoản</h2>
                    </div>
                    
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="font-size: 16px; margin-bottom: 15px;">Xin chào <strong>${displayName}</strong>,</p>
                        <p style="font-size: 16px; margin-bottom: 15px;">
                            Bạn đã yêu cầu đăng ký tài khoản cho Ban Pick System.
                        </p>
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            <strong>Email đăng nhập:</strong> <code style="background-color: #e0e0e0; padding: 2px 6px; border-radius: 4px;">${email}</code>
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background-color: #1976d2; color: white; padding: 20px; border-radius: 8px; display: inline-block;">
                            <p style="font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">Mã OTP của bạn là:</p>
                            <h1 style="font-size: 36px; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                ${otp}
                            </h1>
                        </div>
                    </div>
                    
                    <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
                        <p style="margin: 0; color: #e65100;">
                            <strong>Lưu ý:</strong> Mã OTP này sẽ hết hiệu lực sau <strong>5 phút</strong>. 
                            Vui lòng nhập mã trong thời gian quy định.
                        </p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <p style="font-size: 14px; color: #666;">
                            Nếu bạn không yêu cầu đăng ký này, vui lòng bỏ qua email này.
                        </p>
                        <p style="font-size: 12px; color: #999; margin-top: 20px;">
                            Đây là email tự động từ Ban Pick System. Vui lòng không trả lời email này.
                        </p>
                    </div>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            // OTP email sent successfully
            return true;
        } catch (error) {
            console.error('Error sending OTP email:', error);
            return false;
        }
    }

    async verifyEmailConnection() {
        try {
            await this.transporter.verify();
            // Email service ready
            return true;
        } catch (error) {
            console.error('Email service verification failed:', error);
            return false;
        }
    }
}

module.exports = new OTPEmailService();