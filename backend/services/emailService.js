const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    async sendDeviceLogoutNotification(email, deviceInfo) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Thiết bị của bạn đã bị đăng xuất - Ban Pick System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #d32f2f;">Thông báo đăng xuất thiết bị</h2>
                    <p>Xin chào,</p>
                    <p>Tài khoản License của bạn đã được đăng nhập từ một thiết bị khác. Thiết bị hiện tại đã bị đăng xuất để đảm bảo bảo mật.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Thông tin thiết bị bị đăng xuất:</h3>
                        <p><strong>Device ID:</strong> ${deviceInfo.deviceId}</p>
                        <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                        <p><strong>Lý do:</strong> Đăng nhập từ thiết bị mới</p>
                    </div>
                    
                    <p>Nếu đây không phải là bạn, vui lòng liên hệ với quản trị viên ngay lập tức.</p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Đây là email tự động từ Ban Pick System. Vui lòng không trả lời email này.
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            // Email sent successfully
        } catch (error) {
            console.error('Error sending device logout notification:', error);
        }
    }

    async sendLoginAlert(email, loginInfo) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Đăng nhập mới vào Ban Pick System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2e7d32;">Thông báo đăng nhập mới</h2>
                    <p>Xin chào,</p>
                    <p>Tài khoản License của bạn vừa được đăng nhập từ một thiết bị mới.</p>
                    
                    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Thông tin đăng nhập:</h3>
                        <p><strong>Device ID:</strong> ${loginInfo.deviceId}</p>
                        <p><strong>IP Address:</strong> ${loginInfo.ipAddress}</p>
                        <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                        <p><strong>User Agent:</strong> ${loginInfo.userAgent}</p>
                    </div>
                    
                    <p>Nếu đây không phải là bạn, vui lòng liên hệ với quản trị viên ngay lập tức.</p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Đây là email tự động từ Ban Pick System. Vui lòng không trả lời email này.
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            // Email sent successfully
        } catch (error) {
            console.error('Error sending login alert:', error);
        }
    }
}

module.exports = new EmailService();