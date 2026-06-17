/**
 * @file login.js
 * @description Controls login authentication flow, including force logout and device conflict dialogs.
 */

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

/** @type {Object|null} Stores credentials temporarily when device conflict occurs */
let pendingLoginData = null;

/**
 * Display a feedback message to the user for a limited time.
 * @param {string} message - Message text to display
 * @param {'success'|'error'} [type='error'] - Type of message box styling
 */
const showMessage = (message, type = 'error') => {
    messageDiv.innerHTML = `<div class="${type}-box">${message}</div>`;
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
};

/**
 * Toggle the loading state of a button element.
 * @param {HTMLButtonElement} button - The target button
 * @param {boolean} loading - True to show loading spinner/text, false to reset
 */
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

/**
 * Get or generate a persistent device ID.
 * @returns {string} The unique device identifier
 */
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

/**
 * Show a conflict notification dialog when the user is logged in elsewhere.
 * @param {Object} conflictData - Information about the conflicting session
 * @param {string} conflictData.currentDeviceId - Device ID of the active session
 * @param {string} conflictData.lastActivity - Last activity timestamp
 */
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

/**
 * Hide the conflict notification dialog and clear temporary data.
 */
const hideConflictDialog = () => {
    conflictDialog.style.display = 'none';
    pendingLoginData = null;
};

/**
 * Send credentials to the backend to authenticate.
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} deviceId - Current device ID
 * @param {boolean} [forceLogin=false] - If true, force disconnects other active sessions
 */
const attemptLogin = async (email, password, deviceId, forceLogin = false) => {
    setButtonLoading(loginBtn, true);
    
    try {
        const data = await API.post('/login', { email, password, deviceId, forceLogin });

        // Save session credentials
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('sessionId', data.sessionId);
        localStorage.setItem('userInfo', JSON.stringify(data.user));
        
        showMessage('Đăng nhập thành công!', 'success');
        
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);
            
    } catch (error) {
        // Handle device conflict status
        if (error.message && error.message.includes('Tài khoản đang được sử dụng')) {
            console.log('Conflict detected, setting pendingLoginData:', { email, password, deviceId });
            pendingLoginData = { email, password, deviceId };
            
            // Try to parse conflict info from error if possible, or fallback
            showConflictDialog({
                currentDeviceId: 'Thiết bị khác',
                lastActivity: new Date()
            });
        } else {
            console.error('Error during login:', error);
            showMessage(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
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
        const loginData = { ...pendingLoginData };
        hideConflictDialog();
        await attemptLogin(loginData.email, loginData.password, loginData.deviceId, true);
    } else {
        console.error('Invalid pendingLoginData:', pendingLoginData);
        showMessage('Dữ liệu đăng nhập không hợp lệ. Vui lòng thử lại.');
        hideConflictDialog();
    }
});

cancelLoginBtn.addEventListener('click', () => {
    hideConflictDialog();
});

// Allow Enter key navigation/submission
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

// Check session status on page load
window.addEventListener('load', async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            await API.get('/check-session');
            // Valid token exists, redirect straight to index
            window.location.href = '/index.html';
        } catch (error) {
            // Invalid session or token expired, clear localStorage credentials
            localStorage.removeItem('authToken');
            localStorage.removeItem('sessionId');
            localStorage.removeItem('userInfo');
        }
    }
});