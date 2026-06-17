/**
 * @file register.js
 * @description Manages registration flow including multi-step layout, OTP trigger and verification.
 */

/** @type {number} Current visual step in register wizard */
let currentStep = 1;

/** @type {number|null} Countdown interval reference for OTP timer */
let countdownTimer = null;

/** @type {string} Email entered in step 1 */
let currentEmail = '';

/** @type {string} Password entered in step 1 */
let currentPassword = '';

// DOM Elements
const steps = document.querySelectorAll('.step');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const otpInput = document.getElementById('otpInput');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const resendOtpBtn = document.getElementById('resendOtpBtn');
const backBtn = document.getElementById('backBtn');
const errorMessage = document.getElementById('errorMessage');
const sentEmail = document.getElementById('sentEmail');
const countdown = document.getElementById('countdown');
const successEmail = document.getElementById('successEmail');
const successDisplayName = document.getElementById('successDisplayName');

/**
 * Display a specific step card and hide others.
 * @param {number} step - Step index (1 to 3)
 */
const showStep = (step) => {
    steps.forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    currentStep = step;
};

/**
 * Show error toast message box.
 * @param {string} message - Error text
 */
const showError = (message) => {
    errorMessage.innerHTML = `<div class="error-box">${message}</div>`;
    setTimeout(() => {
        errorMessage.innerHTML = '';
    }, 5000);
};

/**
 * Show success toast message box.
 * @param {string} message - Success text
 */
const showSuccess = (message) => {
    errorMessage.innerHTML = `<div class="success-box">${message}</div>`;
    setTimeout(() => {
        errorMessage.innerHTML = '';
    }, 5000);
};

/**
 * Change button status to loading or back to normal.
 * @param {HTMLButtonElement} button - Target button
 * @param {boolean} loading - True to show loading, false to restore
 */
const setButtonLoading = (button, loading) => {
    if (loading) {
        button.disabled = true;
        button.textContent = 'Đang xử lý...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
};

/**
 * Start visual countdown timer for remaining OTP time.
 * @param {number} [minutes=5] - Expire duration in minutes
 */
const startCountdown = (minutes = 5) => {
    let timeLeft = minutes * 60;
    
    const updateCountdown = () => {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        countdown.textContent = `Mã OTP sẽ hết hiệu lực sau: ${mins}:${secs.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            countdown.textContent = 'Mã OTP đã hết hiệu lực. Vui lòng gửi lại mã mới.';
            countdown.style.color = '#f44336';
        }
        
        timeLeft--;
    };
    
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000);
};

// Event Listeners
sendOtpBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    
    if (!email || !password || !confirmPassword) {
        showError('Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Định dạng email không hợp lệ!');
        return;
    }
    
    if (password.length < 6) {
        showError('Mật khẩu phải ít nhất 6 ký tự!');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Mật khẩu xác nhận không khớp!');
        return;
    }
    
    currentEmail = email;
    currentPassword = password;
    
    sendOtpBtn.dataset.originalText = sendOtpBtn.textContent;
    setButtonLoading(sendOtpBtn, true);
    
    try {
        const data = await API.post('/send-otp', { email, password });
        sentEmail.textContent = email;
        showStep(2);
        startCountdown(5);
        showSuccess(data.message);
    } catch (error) {
        console.error('Error sending OTP:', error);
        showError(error.message || 'Đã xảy ra lỗi khi gửi OTP. Vui lòng thử lại.');
    } finally {
        setButtonLoading(sendOtpBtn, false);
    }
});

verifyOtpBtn.addEventListener('click', async () => {
    const otp = otpInput.value.trim();
    
    if (!otp || otp.length !== 6) {
        showError('Vui lòng nhập đầy đủ 6 chữ số OTP!');
        return;
    }
    
    verifyOtpBtn.dataset.originalText = verifyOtpBtn.textContent;
    setButtonLoading(verifyOtpBtn, true);
    
    try {
        const data = await API.post('/verify-otp', { 
            email: currentEmail,
            otp 
        });
        
        clearInterval(countdownTimer);
        successEmail.textContent = currentEmail;
        successDisplayName.textContent = data.displayName || currentEmail.split('@')[0];
        showStep(3);
        showSuccess(data.message);
    } catch (error) {
        console.error('Error verifying OTP:', error);
        showError(error.message || 'Xác thực OTP thất bại');
    } finally {
        setButtonLoading(verifyOtpBtn, false);
    }
});

resendOtpBtn.addEventListener('click', async () => {
    resendOtpBtn.dataset.originalText = resendOtpBtn.textContent;
    setButtonLoading(resendOtpBtn, true);
    
    try {
        const data = await API.post('/send-otp', { 
            email: currentEmail,
            password: currentPassword
        });
        
        clearInterval(countdownTimer);
        startCountdown(5);
        countdown.style.color = '#ff9800';
        otpInput.value = '';
        showSuccess('Mã OTP mới đã được gửi!');
    } catch (error) {
        console.error('Error resending OTP:', error);
        showError(error.message || 'Không thể gửi lại mã OTP');
    } finally {
        setButtonLoading(resendOtpBtn, false);
    }
});

backBtn.addEventListener('click', () => {
    clearInterval(countdownTimer);
    showStep(1);
});

// Auto-format OTP input
otpInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// Auto-submit when OTP is complete
otpInput.addEventListener('input', (e) => {
    if (e.target.value.length === 6) {
        setTimeout(() => {
            verifyOtpBtn.click();
        }, 500);
    }
});