document.getElementById('activateButton').addEventListener('click', async () => {
    const licenseKey = document.getElementById('licenseInput').value;
    const deviceId = localStorage.getItem('deviceId') || `device-${Math.random().toString(36).substr(2, 9)}`;

    // Lưu deviceId nếu chưa có
    if (!localStorage.getItem('deviceId')) {
        localStorage.setItem('deviceId', deviceId);
    }

    if (!licenseKey) {
        alert('Vui lòng nhập License Key!');
        return;
    }

    await attemptActivation(licenseKey, deviceId, false);
});

const attemptActivation = async (licenseKey, deviceId, forceLogin = false) => {
    console.log('Gửi yêu cầu kích hoạt với:', { licenseKey, deviceId, forceLogin });

    try {
        const response = await fetch('http://localhost:3000/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licenseKey, deviceId, forceLogin })
        });

        console.log('Phản hồi từ máy chủ:', response);

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('sessionId', data.sessionId); 
            alert('Kích hoạt thành công!');
            window.location.href = '/index.html'; 
        } else if (response.status === 409) {
            // Xử lý xung đột thiết bị
            const error = await response.json();
            const confirmMessage = `${error.message}

Thiết bị hiện tại: ${error.currentDeviceId}
Hoạt động cuối: ${new Date(error.lastActivity).toLocaleString('vi-VN')}

Bạn có muốn đăng xuất thiết bị kia và đăng nhập ở đây không?`;
            
            if (confirm(confirmMessage)) {
                // Người dùng đồng ý force login
                await attemptActivation(licenseKey, deviceId, true);
            }
        } else {
            const error = await response.json();
            alert(error.message || 'Kích hoạt thất bại');
        }
    } catch (error) {
        console.error('Lỗi khi kích hoạt license:', error);
        alert('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
};
