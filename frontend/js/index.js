
const initializeWebSocket = (token) => {
    const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

    ws.onopen = () => {
        // WebSocket connected
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // Xử lý force logout
            if (data.type === 'force_logout') {
                handleForceLogout(data.message, data.reason);
                return;
            }
            
            // Forward TikTok Live messages to FandomWar
            if (data.type && data.type.startsWith('tiktok-')) {
                if (window.fandomWar) {
                    window.fandomWar.handleWebSocketMessage(data);
                }
                return;
            }
            
        } catch (error) {
            console.error('WebSocket error:', error);
        }
    };

    ws.onclose = () => {
        // WebSocket closed
    };

    ws.onerror = (error) => {
        console.error('WebSocket connection error:', error);
    };
    
    return ws;
};

// Xử lý force logout
const handleForceLogout = (message, reason) => {
    let alertMessage = message;
    
    switch(reason) {
        case 'force_logout':
            alertMessage += '\n\nBạn sẽ được chuyển hướng để đăng nhập lại.';
            break;
        case 'session_expired':
            alertMessage = 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
            break;
        case 'account_banned':
            alertMessage = 'Tài khoản của bạn đã bị khóa. Liên hệ quản trị viên.';
            break;
        default:
            alertMessage = 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
    }
    
    alert(alertMessage);
    
    // Xóa token và chuyển hướng
    localStorage.removeItem('authToken');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userInfo');
    window.location.href = '/login.html';
};


// Xác thực đăng nhập
const checkUserSession = async () => {
    const token = localStorage.getItem('authToken');

    if (!token) {
        alert('Bạn chưa đăng nhập. Bạn sẽ được chuyển hướng đến trang đăng nhập.');
        window.location.href = '/login.html';
        return false;
    }

    try {
        const response = await fetch('http://localhost:3000/check-session', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
            const data = await response.json();
            
            // Hiển thị thông tin user
            if (data.user) {
                updateUserInfo(data.user);
            }
            
            return true;
        } else {
            const data = await response.json();
            
            // Xử lý force logout
            if (data.forceLogout) {
                handleForceLogout(data.message, 'session_invalid');
                return false;
            }
            
            alert(data.message || 'Phiên đăng nhập không hợp lệ. Bạn sẽ được chuyển hướng đến trang đăng nhập.');
            localStorage.removeItem('authToken');
            localStorage.removeItem('sessionId');
            localStorage.removeItem('userInfo');
            window.location.href = '/login.html';
            return false;
        }
    } catch (error) {
        console.error('Error checking session:', error);
        alert('Đã có lỗi xảy ra khi kiểm tra phiên đăng nhập. Bạn sẽ được chuyển hướng đến trang đăng nhập.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('userInfo');
        window.location.href = '/login.html';
        return false;
    }
};

// Cập nhật thông tin user trên giao diện
const updateUserInfo = (user) => {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement) {
        userInfoElement.textContent = `Xin chào, ${user.displayName || user.email}${user.role === 'admin' ? ' (Admin)' : ''}`;
    }
    
    // Load user themes
    loadUserThemes(user);
};

// Load user's owned themes into dropdown
const loadUserThemes = (user) => {
    const themeSelect = document.getElementById('themeSelect');
    if (!themeSelect || !user) return;
    
    // Check if user has owned themes
    if (!user.ownedThemes || user.ownedThemes.length === 0) {
        // Hide dropdown and show message
        themeSelect.style.display = 'none';
        
        // Create or update no themes message
        let noThemesMsg = document.getElementById('noThemesMessage');
        if (!noThemesMsg) {
            noThemesMsg = document.createElement('span');
            noThemesMsg.id = 'noThemesMessage';
            noThemesMsg.className = 'no-themes-message';
            themeSelect.parentNode.appendChild(noThemesMsg);
        }
        noThemesMsg.textContent = 'chưa sở hữu theme nào';
        noThemesMsg.style.display = 'inline';
        return;
    }
    
    // Show dropdown and hide no themes message
    themeSelect.style.display = 'inline-block';
    const noThemesMsg = document.getElementById('noThemesMessage');
    if (noThemesMsg) {
        noThemesMsg.style.display = 'none';
    }
    
    // Clear existing options
    themeSelect.innerHTML = '';
    
    // Add owned themes
    user.ownedThemes.forEach(themeId => {
        const option = document.createElement('option');
        option.value = themeId;
        option.textContent = themeId.charAt(0).toUpperCase() + themeId.slice(1);
        themeSelect.appendChild(option);
    });
    
    // Set current theme
    if (user.currentTheme) {
        themeSelect.value = user.currentTheme;
    }
};

// Handle theme change
const handleThemeChange = async (newThemeId) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
        const response = await fetch('http://localhost:3000/user/update-theme', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currentTheme: newThemeId })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Theme updated successfully:', newThemeId);
            alert('Theme đã được cập nhật thành công!');
        } else {
            const data = await response.json();
            console.error('Failed to update theme:', data.message);
            alert('Không thể cập nhật theme: ' + data.message);
        }
    } catch (error) {
        console.error('Error updating theme:', error);
        alert('Đã có lỗi xảy ra khi cập nhật theme.');
    }
};

// Xử lý đăng xuất
const logout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('userInfo');
        window.location.href = '/login.html';
    }
};

(async () => {
    const isValidSession = await checkUserSession();
    if (!isValidSession) return;

    const token = localStorage.getItem('authToken');
    if (token) {
        initializeWebSocket(token); 
    }
    
    // Setup logout button
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // Setup theme dropdown
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            handleThemeChange(e.target.value);
        });
    }
    
    // Setup guide button
    const guideButton = document.getElementById('guideButton');
    if (guideButton) {
        guideButton.addEventListener('click', () => {
            window.open('guide.html', '_blank');
        });
    }

})();
