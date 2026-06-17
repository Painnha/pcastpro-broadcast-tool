let currentStep = 1;
let countdownTimer = null;
let currentEmail = '';
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

// Utility functions
const showStep = (step) => {
    steps.forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    currentStep = step;
};

const showError = (message) => {
    errorMessage.innerHTML = `<div class="error-box">${message}</div>`;
    setTimeout(() => {
        errorMessage.innerHTML = '';
    }, 5000);
};

const showSuccess = (message) => {
    errorMessage.innerHTML = `<div class="success-box">${message}</div>`;
    setTimeout(() => {
        errorMessage.innerHTML = '';
    }, 5000);
};

const setButtonLoading = (button, loading) => {
    if (loading) {
        button.disabled = true;
        button.textContent = 'Đang xử lý...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
};

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
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Định dạng email không hợp lệ!');
        return;
    }
    
    // Validate password
    if (password.length < 6) {
        showError('Mật khẩu phải ít nhất 6 ký tự!');
        return;
    }
    
    // Validate password match
    if (password !== confirmPassword) {
        showError('Mật khẩu xác nhận không khớp!');
        return;
    }
    
    currentEmail = email;
    currentPassword = password;
    
    sendOtpBtn.dataset.originalText = sendOtpBtn.textContent;
    setButtonLoading(sendOtpBtn, true);
    
    try {
        const response = await fetch('http://localhost:3000/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            sentEmail.textContent = email;
            showStep(2);
            startCountdown(5);
            showSuccess(data.message);
        } else {
            showError(data.message || 'Không thể gửi mã OTP');
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        showError('Đã xảy ra lỗi khi gửi OTP. Vui lòng thử lại.');
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
        const response = await fetch('http://localhost:3000/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: currentEmail,
                otp 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            clearInterval(countdownTimer);
            successEmail.textContent = currentEmail;
            successDisplayName.textContent = data.displayName || currentEmail.split('@')[0];
            showStep(3);
            showSuccess(data.message);
        } else {
            showError(data.message || 'Xác thực OTP thất bại');
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        showError('Đã xảy ra lỗi khi xác thực OTP. Vui lòng thử lại.');
    } finally {
        setButtonLoading(verifyOtpBtn, false);
    }
});

resendOtpBtn.addEventListener('click', async () => {
    resendOtpBtn.dataset.originalText = resendOtpBtn.textContent;
    setButtonLoading(resendOtpBtn, true);
    
    try {
        const response = await fetch('http://localhost:3000/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: currentEmail,
                password: currentPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            clearInterval(countdownTimer);
            startCountdown(5);
            countdown.style.color = '#ff9800';
            otpInput.value = '';
            showSuccess('Mã OTP mới đã được gửi!');
        } else {
            showError(data.message || 'Không thể gửi lại mã OTP');
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        showError('Đã xảy ra lỗi khi gửi lại OTP. Vui lòng thử lại.');
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