/**
 * @file index.js
 * @description Controls the main admin view layout, handles user session verification, theme switches, and binds WebSocket updates.
 */

/**
 * Initializes WebSocket connection and registers message handlers.
 */
const initializeWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socketService.connect(`${protocol}//${window.location.host}/ws`);

    // Handle session force-logout signal from backend
    socketService.on('force_logout', (data) => {
        handleForceLogout(data.message, data.reason);
    });

    // Forward TikTok and Facebook Live comments or status events to fandomWar
    socketService.on('message', (message) => {
        if (message.type && (message.type.startsWith('tiktok-') || message.type.startsWith('facebook-'))) {
            if (window.fandomWar) {
                window.fandomWar.handleWebSocketMessage(message);
            }
        }
    });
};

/**
 * Perform a force logout in response to a server signal or session expiration.
 * @param {string} message - Description message shown to user
 * @param {'force_logout'|'session_expired'|'account_banned'} reason - Categorized logout cause
 */
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
    
    // Clear storage and redirect
    API.logout();
};

/**
 * Authenticates user session against the server database.
 * @returns {Promise<boolean>} True if session is valid, false otherwise
 */
const checkUserSession = async () => {
    const token = localStorage.getItem('authToken');

    if (!token) {
        alert('Bạn chưa đăng nhập. Bạn sẽ được chuyển hướng đến trang đăng nhập.');
        window.location.href = '/login.html';
        return false;
    }

    try {
        const data = await API.get('/check-session');
        
        if (data.user) {
            updateUserInfo(data.user);
        }
        return true;
    } catch (error) {
        console.error('Error checking session:', error);
        alert(error.message || 'Đã có lỗi xảy ra khi kiểm tra phiên đăng nhập.');
        API.logout();
        return false;
    }
};

/**
 * Update current user metadata display inside UI.
 * @param {Object} user - Authenticated user details
 * @param {string} user.email - User email
 * @param {string} [user.displayName] - Optional visual user label
 * @param {'user'|'admin'} user.role - User role level
 */
const updateUserInfo = (user) => {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement) {
        userInfoElement.textContent = `Xin chào, ${user.displayName || user.email}${user.role === 'admin' ? ' (Admin)' : ''}`;
    }
    
    loadUserThemes(user);
};

/**
 * Loads owned themes from user data object into the select dropdown list.
 * @param {Object} user - Current user object
 * @param {string[]} user.ownedThemes - List of owned theme keys
 * @param {string} [user.currentTheme] - Active theme ID
 */
const loadUserThemes = (user) => {
    const themeSelect = document.getElementById('themeSelect');
    if (!themeSelect || !user) return;
    
    if (!user.ownedThemes || user.ownedThemes.length === 0) {
        themeSelect.style.display = 'none';
        
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
    
    themeSelect.style.display = 'inline-block';
    const noThemesMsg = document.getElementById('noThemesMessage');
    if (noThemesMsg) {
        noThemesMsg.style.display = 'none';
    }
    
    themeSelect.innerHTML = '';
    
    user.ownedThemes.forEach(themeId => {
        const option = document.createElement('option');
        option.value = themeId;
        option.textContent = themeId.charAt(0).toUpperCase() + themeId.slice(1);
        themeSelect.appendChild(option);
    });
    
    if (user.currentTheme) {
        themeSelect.value = user.currentTheme;
    }
};

/**
 * Triggers database update when user changes their active theme.
 * @param {string} newThemeId - Target theme ID
 */
const handleThemeChange = async (newThemeId) => {
    try {
        await API.put('/user/update-theme', { currentTheme: newThemeId });
        alert('Theme đã được cập nhật thành công!');
    } catch (error) {
        console.error('Error updating theme:', error);
        alert(error.message || 'Đã có lỗi xảy ra khi cập nhật theme.');
    }
};

/**
 * Visual logout prompt to clear session cookies/caches.
 */
const triggerLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        API.logout();
    }
};

// Application Main Entrypoint IIFE
(async () => {
    const isValidSession = await checkUserSession();
    if (!isValidSession) return;

    // Connect to WebSocket using shared socketService
    initializeWebSocket();
    
    // Bind UI actions
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', triggerLogout);
    }
    
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            handleThemeChange(e.target.value);
        });
    }
    
    const guideButton = document.getElementById('guideButton');
    if (guideButton) {
        guideButton.addEventListener('click', () => {
            window.open('guide.html', '_blank');
        });
    }
})();
