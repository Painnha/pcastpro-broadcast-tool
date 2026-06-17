// DOM Elements
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const rememberDeviceCheckbox = document.getElementById('rememberDevice');
const loginBtn = document.getElementById('loginBtn');
const conflictDialog = document.getElementById('conflictDialog');
const conflictMessage = document.getElementById('conflictMessage');
const forceLoginBtn = document.getElementById('forceLoginBtn');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const messageDiv = document.getElementById('message');

let pendingLoginData = null;

// Utility functions
const showMessage = (message, type = 'error') => {
    messageDiv.innerHTML = `<div class="${type}-box">${message}</div>`;
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
};

const setButtonLoading = (button, loading) => {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = 'Đang xử lý...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
};

const generateOrGetDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId || !rememberDeviceCheckbox.checked) {
        deviceId = `device-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
        if (rememberDeviceCheckbox.checked) {
            localStorage.setItem('deviceId', deviceId);
        }
    }
    return deviceId;
};

const showConflictDialog = (conflictData) => {
    const lastActivity = new Date(conflictData.lastActivity).toLocaleString('vi-VN');
    conflictMessage.innerHTML = `
        Tài khoản đang đăng nhập trên thiết bị khác.<br>
        <strong>Thiết bị hiện tại:</strong> ${conflictData.currentDeviceId}<br>
        <strong>Hoạt động cuối:</strong> ${lastActivity}<br><br>
        Bạn có muốn đăng xuất thiết bị kia và đăng nhập ở đây không?
    `;
    conflictDialog.style.display = 'block';
};

const hideConflictDialog = () => {
    conflictDialog.style.display = 'none';
    pendingLoginData = null;
};

const attemptLogin = async (email, password, deviceId, forceLogin = false) => {
    setButtonLoading(loginBtn, true);
    
    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, deviceId, forceLogin })
        });

        const data = await response.json();

        if (response.ok) {
            // Đăng nhập thành công
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('sessionId', data.sessionId);
            localStorage.setItem('userInfo', JSON.stringify(data.user));
            
            showMessage('Đăng nhập thành công!', 'success');
            
            // Chuyển hướng đến trang chính
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
            
        } else if (response.status === 409) {
            // Xung đột thiết bị
            console.log('Conflict detected, setting pendingLoginData:', { email, password, deviceId });
            pendingLoginData = { email, password, deviceId };
            showConflictDialog(data);
            
        } else {
            // Lỗi đăng nhập
            showMessage(data.message || 'Đăng nhập thất bại');
        }
    } catch (error) {
        console.error('Error during login:', error);
        showMessage('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
        setButtonLoading(loginBtn, false);
    }
};

// Event Listeners
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
        showMessage('Vui lòng nhập đầy đủ email và mật khẩu!');
        return;
    }
    
    const deviceId = generateOrGetDeviceId();
    await attemptLogin(email, password, deviceId, false);
});

forceLoginBtn.addEventListener('click', async () => {
    console.log('Force login clicked, pendingLoginData:', pendingLoginData);
    
    if (pendingLoginData && pendingLoginData.email && pendingLoginData.password && pendingLoginData.deviceId) {
        // Store data locally before hiding dialog (which sets pendingLoginData to null)
        const loginData = {
            email: pendingLoginData.email,
            password: pendingLoginData.password,
            deviceId: pendingLoginData.deviceId
        };
        
        hideConflictDialog();
        
        await attemptLogin(
            loginData.email, 
            loginData.password, 
            loginData.deviceId, 
            true
        );
    } else {
        console.error('Invalid pendingLoginData:', pendingLoginData);
        showMessage('Dữ liệu đăng nhập không hợp lệ. Vui lòng thử lại.');
        hideConflictDialog();
    }
});

cancelLoginBtn.addEventListener('click', () => {
    hideConflictDialog();
});

// Allow Enter key to submit
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginBtn.click();
    }
});

emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        passwordInput.focus();
    }
});

// Check if user is already logged in
window.addEventListener('load', () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Verify token is still valid
        fetch('http://localhost:3000/check-session', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => {
            if (response.ok) {
                // Already logged in, redirect to main page
                window.location.href = '/index.html';
            } else {
                // Token invalid, clear storage
                localStorage.removeItem('authToken');
                localStorage.removeItem('sessionId');
                localStorage.removeItem('userInfo');
            }
        })
        .catch(error => {
            console.error('Error checking session:', error);
            // Clear storage on error
            localStorage.removeItem('authToken');
            localStorage.removeItem('sessionId');
            localStorage.removeItem('userInfo');
        });
    }
});