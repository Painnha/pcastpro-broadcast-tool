/**
 * @file activate.js
 * @description Manages product/license key activation flow.
 */

document.getElementById('activateButton').addEventListener('click', async () => {
    const licenseKey = document.getElementById('licenseInput').value.trim();
    const deviceId = localStorage.getItem('deviceId') || `device-${Math.random().toString(36).substr(2, 9)}`;

    // Save deviceId locally if not already stored
    if (!localStorage.getItem('deviceId')) {
        localStorage.setItem('deviceId', deviceId);
    }

    if (!licenseKey) {
        alert('Vui lòng nhập License Key!');
        return;
    }

    await attemptActivation(licenseKey, deviceId, false);
});

/**
 * Attempts to activate the application using a license key.
 * @param {string} licenseKey - License key string
 * @param {string} deviceId - Unique device identifier
 * @param {boolean} [forceLogin=false] - Overwrite existing device session if true
 */
const attemptActivation = async (licenseKey, deviceId, forceLogin = false) => {
    console.log('Gửi yêu cầu kích hoạt với:', { licenseKey, deviceId, forceLogin });

    try {
        const data = await API.post('/activate', { licenseKey, deviceId, forceLogin });

        localStorage.setItem('authToken', data.token);
        localStorage.setItem('sessionId', data.sessionId); 
        alert('Kích hoạt thành công!');
        window.location.href = '/index.html'; 
    } catch (error) {
        // Handle device conflict status (409 equivalent)
        if (error.message && error.message.includes('xung đột')) {
            const confirmMessage = `${error.message}
            Bạn có muốn đăng xuất thiết bị kia và đăng nhập ở đây không?`;
            
            if (confirm(confirmMessage)) {
                await attemptActivation(licenseKey, deviceId, true);
            }
        } else {
            console.error('Lỗi khi kích hoạt license:', error);
            alert(error.message || 'Kích hoạt thất bại');
        }
    }
};
